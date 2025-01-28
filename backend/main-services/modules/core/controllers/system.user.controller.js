let mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId,
    User = require('../models/user'),
    Role = require('../models/role'),
    validator = require('validator');
const { sendMailPromise } = require(__libs_path + '/aws-ses');
const redis = require(__libs_path + '/redis');
const bcrypt = require('bcrypt');
const UserSecurityQuestion = require('../models/user-security-question');
const winstonLogger = require(__libs_path + '/winston');
const speakesay = require('speakeasy');
const { wsSendJSON } = require('../../../../socket/ws-lambda-client');
const { saveLoginHistory } = require('./login-history.controller');
const mailTransporter = require(__libs_path + '/mailer');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");
const consts = require('../../../../config/consts');
const utils = require('../../../../libs/utils');
const async = require('async');
const { createDefaultUserSettingIfNeeded } = require('./user-setting.controller');
const { translate } = require('../../../../libs/translate');

const list = (req, returnData, callback) => {
    let { search, status, isDelete, page, size } = req.params;
    let query = {};
    if (!validator.isNull(status)) {
        query['status'] = status;
    }
    if (!validator.isNull(isDelete)) {
        query['status'] = isDelete;
    }
    if (validator.isNull(page)) {
        page = 0;
    }
    if (validator.isNull(size)) {
        size = consts.page_size;
    }

    query = {
        ...query,
        $and: [
            {
                $or: [
                    {
                        username: new RegExp(search, 'i')
                    },
                    {
                        firstname: new RegExp(search, 'i')
                    },
                    {
                        lastname: new RegExp(search, 'i')
                    },
                    {
                        address: new RegExp(search, 'i')
                    },
                    {
                        email: new RegExp(search, 'i')
                    },
                ]
            }
        ]
    }

    User
        .find()
        .where(query)
        .sort({ dateCreated: -1 })
        .skip(page*size)
        .limit(size)
        .exec((err, results) => {
            if (err) {
                winstonLogger.error(`Error searching users: ${JSON.stringify(err)}`)
                return callback(err);
            }
            // calculate count
            User.aggregate([{
                $match: query
            }, {
                $count: "total"
            }])
            .exec((errCount, result) => {
                if(errCount){
                    winstonLogger.error(`Error searching users when arregate total: ${errCount ? JSON.stringify(errCount) : 'result with total empty'}`)
                    return callback(errCount);
                }
                returnData.set({results, total: result[0] ? result[0].total: 0});
                callback();
            })
        })
}

const login = (req, returnData, callback) => {
    let { username, password, platform } = req.params;

    // validate input
    if (validator.isNull(username))
        return callback(consts.ERRORS.ERROR_USERNAME_MISSING);
    if (validator.isNull(password))
        return callback(`${consts.ERRORS.ERROR_PASSWORD_MISSING}`);

    let userQuery = {
        username
    }

    User
        .findOne()
        .where(userQuery)
        .populate('role')
        .exec((err, user) => {
            if (err) {
                return callback(err);
            }
            if (!user) {
                return callback(consts.ERRORS.ERROR_USERNAME_PASSWORD_INCORRECT);
            }
            else {
                if (user.status === 0) {
                    return callback(consts.ERRORS.ERROR_USER_LOCK);
                }
                else if (!user.authenticate(password)) {
                    return callback(consts.ERRORS.ERROR_PASSWORD_INCORRECT)
                }
                else {
                    const randomKey = utils.randomstring(50) + ObjectId().toString().replace('-', '');
                    winstonLogger.info(`User ${username} logged in with platform: ${JSON.stringify(platform)}`);                    
                    switch (user.tfaMethod) {
                        case 'email':
                            redis.SET(randomKey, user.email, errSaveRedis => {
                                if(errSaveRedis){
                                    winstonLogger.error(`Error when saving random key when login with otp by email ${user.email}:` + JSON.stringify(errSaveRedis));
                                    return callback(consts.ERRORS.ERROR_SAVE_REDIS_RANDOM_KEY)
                                }
                                redis.EXPIRE(randomKey, consts.otpExpiredTime);
                                returnData.set({email: user.email, rd: randomKey});
                                callback();
                            });
                            break;                    
                        default:
                            if (validator.isNull(user.token)) {
                                user.token = utils.randomstring(50) + ObjectId().toString().replace('-', '');
                            }
                            user.save((err, result) => {
                                if (err) {
                                    return callback(err);
                                }
                                // set model để module khác dùng lại
                                returnData.model = result;
                                // convert từ model sang object
                                var jsonData = result.toObject();
                                generateConnectionKey(jsonData);
                                setUserCache(jsonData, (err) => {
                                    if(err){
                                        return callback(err);
                                    }
                                    returnData.data = jsonData;
                                    saveLoginHistory(user._id, platform);
                                    notifyLogin(user, platform, jsonData.cKey);
                                    callback();
                                })
                                createDefaultUserSettingIfNeeded(user._id, () => {});
                            })                    
                            break;
                    }
                }
            }
        })
}

/**
 * - generate a connection key for current logged in user
 * - used when a user just login will not receive warning-login notification
 */
const generateConnectionKey = (jsonData) => {
    jsonData.cKey = utils.randomstring(50);
}

/**
 * save notification to DB and notify login to sessions with the same user
 */
const notifyLogin = (user, platform, connectionKey) => {
    wsSendJSON(consts.wsRoute.notification, consts.wsRoute.loginWarningTopic, {
        user: user._id,
        type: "user",
        priority: 1,
        description: translate('system-user.login-detect-description', process.env.SYSTEM_LANG, { platformName: `${platform ? platform.description: "Unknown"}` }),
        title: translate('system-user.login-detect-title', process.env.SYSTEM_LANG),
        link: `${process.env.ML_MY_DOMAIN}/auth/session-management`,
        connectionKey
    })
}

/**
 * generate otp
 */
const generateOTP = (req, returnData, callback) => {
    const { email, rd } = req.params;
    redis.GET(rd, (errorGetRandom, resultEmail) => {
        if(errorGetRandom){
            winstonLogger.error(`Error while getting random key from redis: ${JSON.stringify(errorGetRandom)}`);
            return callback(consts.ERRORS.ERROR_GET_RANDOM_KEY);
        }
        if(resultEmail != email){
            return callback(consts.ERRORS.ERROR_EMAIL_RD_NOT_PAIRED);
        }
        User.findOne().where({email: email}).exec((errFindUser, user) => {
            if(errFindUser){
                winstonLogger.error('Error find user with email: ' + JSON.stringify(errFindUser));
                return callback(consts.ERRORS.ERROR_FIND_USER_WITH_EMAIL);
            }
            if(!user){
                winstonLogger.error('Error find user with email: User not found');
                return callback(consts.ERRORS.ERROR_USER_NOT_FOUND);
            }
            const secret = speakesay.generateSecret().base32;
            redis.DEL(rd);
            const token = speakesay.totp({secret, encoding: 'base32', window: 10}); // otp is valid within +-10*30secs from now
            // save user with key = secret
            redis.SET(secret, JSON.stringify(user), (err) => {
                if (err) {
                    winstonLogger.error('Redis saved tfa key failed: '+JSON.stringify(err));
                    return callback(err);
                }
                redis.EXPIRE(secret, consts.otpExpiredTime); // expire after 5min
                // encrypt secret with token and save to redis
                const salt = Number(process.env.SALT_ENCRYPT_SECRET_OTP);
                const r = bcrypt.hashSync(secret, salt);
                redis.SET(r, JSON.stringify({secret, count: consts.maxCountOTP}));
                redis.EXPIRE(r, consts.otpExpiredTime); // expire after 5min
                returnData.set({redirect: r});
                // send token via email to user
                mailTransporter.sendMail({
                    from: process.env.MAIL_USERNAME,
                    to: user.email,
                    text: translate('system-user.tfa.otp-generate', process.env.SYSTEM_LANG, { username: user.username, token }),
                    subject: translate('system-user.tfa.otp-generate-subject', process.env.SYSTEM_LANG)
                }).then(() => {
                    winstonLogger.info(`TFA token sent to email: ${user.email}`);
                })
                .catch(errEmail => {
                    winstonLogger.error(`Sent tfa token failed: ${errEmail}`);
                    redis.DEL(consts.redis_key.tfa, secret);
                })
                callback();
            })
        })
    })
}

/**
 * if user use two factor authentication, use this function to check otp sent from client
 */
const checkUserTFA = (req, returnData, callback) => {
    const { r: hashedSecret, t: token, platform} = req.params;
    redis.GET(hashedSecret, (err, secretData) => {
        if(err){
            winstonLogger.error(`Redis error get key ${hashedSecret}: ${JSON.stringify(err)}`);
            callback(consts.ERRORS.ERROR_REDIS_GET_KEY);
        }
        else {
            if(!secretData){
                callback(consts.ERRORS.ERROR_REDIS_KEY_NOT_EXIST);
            }
            else {
                const {secret, count} = JSON.parse(secretData);
                const hashedCheck = bcrypt.compareSync(secret, hashedSecret);
                if(!hashedCheck){
                    return callback(consts.ERRORS.ERROR_OTP_INVALID);
                }
                const isValid = speakesay.totp.verify({
                    secret, token, encoding: 'base32', window: 10
                });
                if(isValid){
                    redis.GET(secret, (errUser, userStr) => {
                        if(errUser){
                            winstonLogger.error(`Redis error get key for user ${secret}: ${JSON.stringify(errUser)}`);
                            callback(consts.ERRORS.ERROR_REDIS_GET_KEY_USER);
                        }
                        else {
                            const userId = JSON.parse(userStr)._id;
                            User.findOne().where({_id: userId})
                            .exec((errGetUser, dataUser) => {
                                if (errGetUser) {
                                    winstonLogger.error('Error get user: ' + JSON.stringify(errGetUser));
                                    return callback(errGetUser);
                                }
                                if (validator.isNull(dataUser.token)) {
                                    dataUser.token = utils.randomstring(50) + ObjectId().toString().replace('-', '');
                                }
                                dataUser.save((errSave, result) => {
                                    if (errSave) {
                                        winstonLogger.error('Error save user: ' + JSON.stringify(errSave));
                                        return callback(errSave);
                                    }
                                    // set model để module khác dùng lại
                                    returnData.model = result;
                                    // convert từ model sang object
                                    var jsonData = result.toObject();
                                    generateConnectionKey(jsonData);
                                    redis.DEL(secret);
                                    redis.DEL(hashedSecret);
                                    setUserCache(jsonData, (err) => {
                                        if(err){
                                            return callback(err);
                                        }
                                        saveLoginHistory(userId, platform);
                                        notifyLogin(dataUser, platform, jsonData.cKey);
                                        returnData.data = jsonData;
                                        callback();
                                    })
                                    createDefaultUserSettingIfNeeded(userId, () => {});
                                })         
                            })
                        }
                    })
                }
                else {
                    winstonLogger.error(`Wrong OTP for user ${JSON.stringify({hashedSecret, token})}`);
                    if(count == 0){
                        redis.DEL(hashedSecret);
                        redis.DEL(secret);
                        winstonLogger.error(`Max count invalid OTP for user ${JSON.stringify({hashedSecret, token})}`);
                        callback(consts.ERRORS.ERROR_MAX_COUNT_INVALID_OTP);
                    }
                    else {
                        redis.SET(hashedSecret, JSON.stringify({secret, count: count - 1}));
                        callback(consts.ERRORS.ERROR_OTP_INCORRECT);
                    }
                }
            }
        }
    })
}

/**
 * set User to Cache for authorization
 * @param {*} jsonData User data
 * @param {*} callback callback when finish
 */
const setUserCache = (jsonData, callback) => {
    // xóa đi trường hashed_password
    delete jsonData.hashed_password;
    delete jsonData.salt;
    var cacheUser = {
        _id: jsonData._id,
        token: jsonData.token,
        fullname: jsonData.firstname + ' ' + jsonData.lastname,
        username: jsonData.username,
        avatar: jsonData.avatar,
        level: jsonData.level,
    };

    // lưu memcache
    redis.HSET(consts.redis_key.user, cacheUser.token, JSON.stringify(cacheUser), function (err) {
        if (err) {
            return callback(err);
        }
        callback();
    });
}

const checkEmailExist = (req, returnData, callback) => {
    let email = req.params.email;

    if (validator.isNull(email))
        return callback(consts.ERRORS.ERROR_EMAIL_MISSING);

    User.findOne()
        .where({
            email: email
        })
        .exec((err, data) => {
            if (err) return callback(err);
            // trả về lỗi nếu mã cửa hàng không tồn tại
            if (data)
                return callback(consts.ERRORS.ERROR_EMAIL_EXISTS);
            callback();
        });
}

const getUser = (req, returnData, callback) => {
    var user = req.user;
    User.findOne()
        .where({
            _id: user._id
        })
        .select('-hashed_password -salt')
        .exec(function (err, data) {
            if (err) return callback(err);
            if (!data) {
                return callback(consts.ERRORS.ERROR_USER_NOT_EXISTS);
            } else {
                returnData.set(data);
                return callback();
            }
        });
};

const sendEmailToChangePass = (req, returnData, callback) => {
    const { email } = req.params;
    if(validator.isNull(email)){
        return callback(consts.ERRORS.ERROR_EMAIL_MISSING);
    }
    User.findOne({ email }).exec((err, user) => {
        if(err){
            return callback(consts.ERRORS.ERROR_FIND_USER)
        }
        if(!user){
            return callback(consts.ERRORS.ERROR_CANNOT_FIND_USER)
        }
        redis.EXISTS(consts.redis_key.change_password, email, (err, isExist) => {
            if(err){
                return callback(consts.ERRORS.ERROR_FIND_USER)
            }
            if(isExist){
                return callback(consts.ERRORS.ERROR_USER_BEING_CHANGE_PASSWORD);
            }
            else {
                const token = utils.randomstring(50) + ObjectId().toString().replace('-', '');
                redis.SET(`${consts.redis_key.change_password}.${email}`, token, (err) => {
                    if(err){
                        return callback(consts.ERRORS.ERROR_REDIS);
                    }
                    redis.EXPIRE(`${consts.redis_key.change_password}.${email}`, consts.changePassTokenTime)
                    mailTransporter.sendMail({
                        from: process.env.MAIL_USERNAME,
                        to: email,
                        text: translate('system-user.change-password.change-password-description-link', process.env.SYSTEM_LANG, {
                            email,
                            link: `${process.env.ML_MY_DOMAIN}/auth/change-password?email=${email}&t=${token}`
                        }),
                        subject: translate('system-user.change-password.change-password-title', process.env.SYSTEM_LANG)
                    }).then(() => {
                        winstonLogger.info(`Change password token sent to email: ${email}`);
                    })
                    .catch(errEmail => {
                        winstonLogger.error(`Sent change password token failed: ${errEmail}`);
                    })
                    returnData.set({ ok: true });
                    callback();
                })
            }
        })
    })
}

/**
 * check if user enter a random string for email and t (token) on the url to try to open the change-password page
 */
const checkChangepasswordUrl = (req, returnData, callback) => {
    const { email, t } = req.params;
    if (validator.isNull(email)) {
        return callback(consts.ERRORS.ERROR_EMAIL_MISSING);
    }
    if (validator.isNull(t)) {
        return callback(consts.ERRORS.ERROR_FIND_USER);
    }
    redis.GET(`${consts.redis_key.change_password}.${email}`, (err, exist) => {
        if(err){
            return callback(consts.ERRORS.ERROR_REDIS);
        }
        if(!exist){
            return callback(consts.ERRORS.ERROR_FIND_USER);
        }
        returnData.set({ok: true});
        return callback();
    })
}

const handleChangePassToken = (req, returnData, callback) => {
    const { email, t, newPass, confirmNewPass, oldPass } = req.params;
    if (validator.isNull(email)) {
        return callback(consts.ERRORS.ERROR_EMAIL_MISSING);
    }
    if (validator.isNull(t)) {
        return callback(consts.ERRORS.ERROR_FIND_USER);
    }
    if (validator.isNull(newPass)) {
        return callback(consts.ERRORS.ERROR_NEWPASS_MISSING);
    }
    if (validator.isNull(confirmNewPass)) {
        return callback(consts.ERRORS.ERROR_CONFIRMPASS_MISSING);
    }
    if(newPass !== confirmNewPass){
        return callback(consts.ERRORS.ERROR_CONFIRM_PASS_NOT_MATCH)
    }
    redis.GET(`${consts.redis_key.change_password}.${email}`, (err, exist) => {
        if(err){
            return callback(consts.ERRORS.ERROR_REDIS);
        }
        if(!exist){
            return callback(consts.ERRORS.ERROR_FIND_USER);
        }
        else {
            if(exist != t){
                return callback(consts.ERRORS.ERROR_TOKEN_NOT_MATCH)
            }
            else {
                redis.DEL(`${consts.redis_key.change_password}.${email}`);  
                User.findOne({ email }).exec((err, user) => {
                    if(err || !user){
                        return callback(consts.ERRORS.ERROR_FIND_USER);
                    }
                    else if (!user.authenticate(oldPass)) {
                        return callback(consts.ERRORS.ERROR_OLDPASSWORD_INCORRECT)
                    }
                    user.password = newPass;
                    user.defaultPassword = false;
                    user.save((errSave, newUser) => {
                        if(errSave){
                            return callback(consts.ERRORS.ERROR_SAVE_USER);
                        }
                        returnData.set({ok: true});
                        callback();
                    })
                })
            }
        }
    })
}

const deactivateUsers = (req, returnData, callback) => {
    let { ids } = req.params;

    if (validator.isNull(ids)) {
        return callback(consts.ERRORS.ERROR_IDS_MISSING);
    }
    if(!Array.isArray(ids)){
        return callback(consts.ERRORS.ERROR_IDS_NOT_ARRAY)
    }

    User
        .updateMany({
            _id: {
                $in: ids
            }
        }, {
            $set: {
                status: 0
            }
        }, (err, data) => {
            if (err) return callback(err);
            returnData.set({data})
            callback();
        })
}

const deleteUsers = (req, returnData, callback) => {
    let { ids } = req.params;
    const userId = req.user._id;
    if (validator.isNull(ids)) {
        return callback(consts.ERRORS.ERROR_IDS_MISSING);
    }
    if(!Array.isArray(ids)){
        return callback(consts.ERRORS.ERROR_IDS_NOT_ARRAY)
    }
    if(ids.includes(userId)){
        return callback(consts.ERRORS.ERROR_DEL_CURR_USER);
    }

    User
        .updateMany({
            _id: {
                $in: ids
            }
        }, {
            $set: {
                is_delete: true,
                dateDeleted: new Date(),
                status: 0
            }
        }, (err, data) => {
            if (err) return callback(err);
            returnData.set({...data})
            callback();
        })
}

const signUp = (req, returnData, callback) => {
    let {
        username,
        firstname,
        lastname,
        email,
        password,
        level,
        questions,
        answers
    } = req.params;

    if (validator.isNull(username)) {
        return callback(consts.ERRORS.ERROR_USERNAME_MISSING);
    }
    if (validator.isNull(password)) {
        return callback(`${consts.ERRORS.ERROR_PASSWORD_MISSING}`);
    }
    if (validator.isNull(email)) {
        return callback(consts.ERRORS.ERROR_EMAIL_MISSING);
    }
    if (validator.isNull(firstname)) {
        return callback(consts.ERRORS.ERROR_FIRSTNAME_MISSING);
    }
    if (validator.isNull(lastname)) {
        return callback(consts.ERRORS.ERROR_LASTNAME_MISSING);
    }
    if (validator.isNull(level)) {
        return callback(consts.ERRORS.ERROR_LEVEL_MISSING);
    }

    let query = {
        "$or": [
            {
                username: username
            },
            {
                email: email
            }
        ],
        "$and": [
            {
                is_delete: false
            }
        ]
    }

    User
        .findOne()
        .where(query)
        .exec((err, data) => {
            if (err) {
                return callback(err);
            }
            if (data) {
                return callback(consts.ERRORS.ERROR_USER_EXIST);
            }

            let newUser = new User();
            utils.merge(newUser, { username, firstname, lastname, email, password, level });
            newUser.token = utils.randomstring(50) + ObjectId().toString().replace('-', '');
            newUser.save((err1, result) => {
                if (err1) {
                    return callback(err1);
                }
                // create questions security
                let answerHashes = answers.map(ans => {
                    return bcrypt.hashSync(ans, consts.saltRounds);
                });
                const models = answerHashes.map((hash, ind) => {
                    let newUserQuesAns = new UserSecurityQuestion({
                        question: questions[ind],
                        user: result._id,
                        answer: hash
                    });
                    return newUserQuesAns;
                });
                UserSecurityQuestion.insertMany(models, (errQuestion, resultQuestion) => {
                    let error = null;
                    if (err) {
                        error = consts.ERRORS.ERROR_INSERT_USER_QUESTION;
                    }
                    returnData.set({result, error});
                    callback();
                })
            })
        })
}

const unlockUsers = (req, returnData, callback) => {
    let { ids } = req.params;

    if (validator.isNull(ids)) {
        return callback(consts.ERRORS.ERROR_IDS_MISSING);
    }
    if(!Array.isArray(ids)){
        return callback(consts.ERRORS.ERROR_IDS_NOT_ARRAY)
    }

    User
        .updateMany({
            _id: {
                $in: ids
            }
        }, {
            $set: {
                status: 1
            }
        }, (err, data) => {
            if (err) return callback(err);
            returnData.set({data})
            callback();
        })
}

const createUserOAuth = (req, returnData, callback) => {
    let {
        username,
        firstname,
        lastname,
        email,
        password,
        level,
        authId
    } = req.params;

    if (validator.isNull(username)) {
        return callback(consts.ERRORS.ERROR_USERNAME_MISSING);
    }
    if (validator.isNull(password)) {
        return callback(`${consts.ERRORS.ERROR_PASSWORD_MISSING}`);
    }
    if (validator.isNull(email)) {
        return callback(consts.ERRORS.ERROR_EMAIL_MISSING);
    }
    if (validator.isNull(firstname)) {
        return callback(consts.ERRORS.ERROR_FIRSTNAME_MISSING);
    }
    if (validator.isNull(lastname)) {
        return callback(consts.ERRORS.ERROR_LASTNAME_MISSING);
    }
    if (validator.isNull(level)) {
        return callback(consts.ERRORS.ERROR_LEVEL_MISSING);
    }
    if (validator.isNull(authId)) {
        return callback(consts.ERRORS.ERROR_AUTHID_MISSING);
    }

    let query = {
            username: username.toLowerCase(),
            authId: authId.toString()
        }

    User
        .findOne()
        .where(query)
        .exec((err, data) => {
            if (err) {
                return callback(err);
            }
            if (data) {
                const jsonData = data.toObject();
                setUserCache(jsonData, err => {
                    if (err) {
                        return callback(err);
                    }
                    if(!jsonData.status){
                        return callback(consts.ERRORS.ERROR_USER_LOCK);
                    }
                    sendMailPromise([
                        'andithang.work@gmail.com'
                    ], [], 'Test SES', 'Warning login from My Money Lover', (err, resData) => {
                        if(err){
                            winstonLogger.error(JSON.stringify({
                                code: err.code,
                                message: err.message,
                            }))
                        }
                        else {
                            console.log(resData);
                        }
                    })
                    returnData.set({...jsonData});
                    callback();
                })
                return;
            }

            let newUser = new User();
            utils.merge(newUser, { username, firstname, lastname, email, password, level, authId: authId.toString() });
            newUser.token = utils.randomstring(50) + ObjectId().toString().replace('-', '');
            newUser.save((err1, result) => {
                if (err1) {
                    return callback(err1);
                }
                const jsonData = result.toObject();
                setUserCache(jsonData, err => {
                    if (err) {
                        return callback(err);
                    }
                    returnData.set({...jsonData});
                    callback();
                })
            })
        })
}

const updateUserRole = (req, returnData, callback) => {
    const { role, userId } = req.params;
    if(!validator.isMongoId(role)){
        return callback(consts.ERRORS.ERROR_NOT_AN_ID('role'));
    }
    async.series([cb => {
        Role.findOne({_id: role}).exec((err, role) => {
            if(err) return cb(err);
            else if(!role){
                return cb(consts.ERRORS.ERROR_ROLE_NOT_FOUND);
            }
            else {
                return cb(null, role);
            }
        })
    }, cb => {
        User.findOne({ _id: userId })
            .exec((err, data) => {
                if (err) {
                    return cb(consts.ERRORS.ERROR_CANNOT_FIND_USER);
                }
                if (!data) {
                    return cb(consts.ERRORS.ERROR_USER_NOT_EXIST);
                }
                User.findOneAndUpdate({ _id: userId }, {
                    $set: {
                        role
                    }
                })
                    .exec((errSave, dataSave) => {
                        if (errSave) {
                            return cb(consts.ERRORS.ERROR_CANNOT_UPDATE_USER);
                        }
                        cb(null, {...dataSave._doc});
                    })
            })
    }], (err, results) => {
        if(err) return callback(err);
        returnData.set(results[1]);
        callback();
    })
}

const updateUser = (req, returnData, callback) => {
    const {username, email, firstname, lastname, mobile, tfaMethod} = req.params;
    const userId = req.user._id;

    if (validator.isNull(username)) {
        return callback(consts.ERRORS.ERROR_USERNAME_MISSING);
    }
    if (validator.isNull(email)) {
        return callback(consts.ERRORS.ERROR_EMAIL_MISSING);
    }
    if (validator.isNull(firstname)) {
        return callback(consts.ERRORS.ERROR_FIRSTNAME_MISSING);
    }
    if (validator.isNull(lastname)) {
        return callback(consts.ERRORS.ERROR_LASTNAME_MISSING);
    }
    if (validator.isNull(mobile)) {
        return callback(consts.ERRORS.ERROR_MOBILE_MISSING);
    }

    User.findOne({ _id: userId })
        .exec((err, data) => {
            if (err) {
                return callback(consts.ERRORS.ERROR_CANNOT_FIND_USER);
            }
            if (!data) {
                return callback(consts.ERRORS.ERROR_USER_NOT_EXIST);
            }
            User.findOne({ email }).exec((errExist, userExist) => {
                if(errExist){
                    return callback(consts.ERRORS.ERROR_ERROR_FIND_USER_EMAIL_EXIST);
                }
                if(userExist && userExist._id.toString() != userId){
                    return callback("ERRROR_EMAIL_EXIST");
                }
                User.findOneAndUpdate({ _id: userId }, {
                    $set: {
                        username: username,
                        email: email,
                        firstname: firstname,
                        lastname: lastname,
                        mobile,
                        tfaMethod
                    }
                })
                    .exec((errSave, dataSave) => {
                        if (errSave) {
                            return callback(consts.ERRORS.ERROR_CANNOT_UPDATE_USER);
                        }
                        returnData.set({...dataSave._doc})
                        callback();
                    })
            })
        })
}

const encryptSessionAndUrl = (req, returnData, callback) => {
    const {url} = req.params;
    if(url.startsWith('http')){
        return callback(consts.ERRORS.ERROR_URL_INVALID);
    }
    const currTime = new Date().getTime();
    const userId = req.user._id;
    const salt = Number(process.env.SALT_ENCRYPT_SESSION_URL);
    const hashedKey = bcrypt.hashSync(JSON.stringify({userId, url}), salt); // this key can only be used in 5min
    returnData.set({k: hashedKey, endTime: currTime + consts.timeKeyExpired, url });
    callback();
}

const authenticateKeyUrl = (req, returnData, callback) => {
    const {k, endTime, url} = req.params;
    if(url.startsWith('http')){
        return callback(consts.ERRORS.ERROR_URL_INVALID);
    }
    if(new Date().getTime() > endTime){
        return callback(consts.ERRORS.ERROR_KEY_EXPIRED);
    }
    const userId = req.user._id;
    const isValid = bcrypt.compareSync(JSON.stringify({userId, url}), k);
    returnData.set({isValid});
    callback();
}

const sentForgotPasswordRequest = (req, returnData, callback) => {
    const { email } = req.params;
    if (validator.isNull(email)) {
        return callback(consts.ERRORS.ERROR_EMAIL_MISSING);
    }
    User.findOne({ email }).exec((errFindUser, user) => {
        if(errFindUser || !user){
            return callback(consts.ERRORS.ERROR_FIND_USER);
        }
        const newPassword = utils.randomstring(10), token = utils.randomstring(10) + ObjectId().toString().replace('-', '');
        // temporary set new password, wait until user click the link sent to email then discard it
        redis.SET(`${consts.redis_key.forgot_password}.${token}`, newPassword,  errSaveRedis => {
            if(errSaveRedis){
                winstonLogger.error(`Error when saving new password when forgot by email ${user.email}:` + JSON.stringify(errSaveRedis));
                return callback(consts.ERRORS.ERROR_SAVE_REDIS_FORGOT_PASSWORD);
            }
            redis.EXPIRE(`${consts.redis_key.forgot_password}.${token}`, consts.changePassTokenTime);
            // send token via email to user
            mailTransporter.sendMail({
                from: process.env.MAIL_USERNAME,
                to: user.email,
                text: `Bạn đã yêu cầu reset mật khẩu của tài khoản có email: ${user.email}. Sử dụng đường link sau đây để lấy mật khẩu mới: ${process.env.ML_MY_DOMAIN}/auth/forgot-password?email=${user.email}&t=${token}. Xin lưu ý: Đường link sẽ bị vô hiệu trong vòng 5 phút kể từ khi được gửi đi. Nếu đó không phải là bạn, vui lòng liên hệ quản trị viên để được hỗ trợ kịp thời.`,
                subject: '[My ML] - Quên mật khẩu'
            }).then(() => {
                winstonLogger.info(`Forgot password request sent to email: ${user.email}`);
                returnData.set({ email: user.email, t: token});
                return callback();
            })
            .catch(errEmail => {
                winstonLogger.error(`Forgot password request sent failed: ${errEmail}`);
                redis.DEL(`${consts.redis_key.forgot_password}.${token}`);
                return callback(consts.ERRORS.ERROR_SENT_MAIL_FORGOT_PASSWORD);
            })
        })
    })
}

const handleForgotPasswordRequest = (req, returnData, callback) => {
    const { t, email } = req.params;
    redis.GET(`${consts.redis_key.forgot_password}.${t}`, (errRedis, newPassword) => {
        if(errRedis || !newPassword){
            return callback(consts.ERRORS.ERROR_FIND_USER);
        }
        User.findOne({ email }).exec((errFindUser, user) => {
            if(errFindUser || !user){
                return callback(consts.ERRORS.ERROR_FIND_USER);
            }
            user.password = newPassword;
            user.defaultPassword = true;
            user.save((errSave, _) => {
                if (errSave) {
                    winstonLogger.error('Error save user: ' + JSON.stringify(errSave));
                    return callback(errSave);
                }
                returnData.set({np: newPassword});
                redis.DEL(`${consts.redis_key.forgot_password}.${t}`);
                callback();
            })
        })
    })
}

const postToConnectionLambda = (req, returnData, callback) => {
    const { connId, notification, endpoint } = req.params;
    // let the asynchronous process happen, the lambda function should receive {statusCode: 200} for not wasting resources
    handlePostToConnectionFromLambda(connId, notification, endpoint);
    returnData.set({statusCode: 200});
    callback();
}

/**
 * - receive a request from lambda function in the VPC
 * - do the request outside to the Internet, cause the lambda cannot
 * @param {*} connId connectionId
 * @param {*} notification object notification that is saved to the DB
 * @param {*} endpoint WS Api Gateway endpoint
 */
const handlePostToConnectionFromLambda = async (connId, notification, endpoint) => {
    const client = new ApiGatewayManagementApiClient({
        endpoint,
        region: "us-east-1"
    });
    const input = { // PostToConnectionRequest
        Data: JSON.stringify({ topic: consts.NOTTIFY_LOGIN, notification }),
        ConnectionId: connId, 
    };
    const command = new PostToConnectionCommand(input);
    try {
        const response = await client.send(command);        
        console.log(`PostToConnection succedded with response: `, response);
    } catch (error) {
        console.error(`Error PostToConnection: `, error);
    }
}

const resetPassword = (req, returnData, callback) => {
    const { i: userId } = req.params;
    const currUserId = req.user._id;
    if(currUserId == userId){
        return callback(consts.ERRORS.ERROR_SELF_RESET_PASSWORD);
    }
    const newPassword = utils.randomstring(10);
    User
        .findOne({_id: userId})
        .exec((err, data) => {
            if (err) {
                return callback(err);
            }
            if (!data) {
                return callback(consts.ERRORS.ERROR_USER_NOT_EXIST);
            }
            data.password = newPassword;
            data.save((err, result) => {
                if(err){
                    return callback(err);
                }
                mailTransporter.sendMail({
                    from: process.env.MAIL_USERNAME,
                    to: data.email,
                    text: `Mật khẩu cho tài khoản có email ${data.email} của bạn đã được reset. Mật khẩu mới là: ${newPassword}. Xin lưu ý: Để đảm bảo bảo mật cho tài khoản của bạn, hãy thay đổi mật khẩu thành mật khẩu mới của bạn qua: Click icon avatar > Chọn Profile > Đổi mật khẩu . Cảm ơn bạn đã sử dụng hệ thống của chúng tôi.`,
                    subject: '[My ML] - Yêu cầu reset mật khẩu'
                }).then(() => {
                    winstonLogger.info(`Reset password token sent to email: ${data.email}`);
                })
                .catch(errEmail => {
                    winstonLogger.error(`Sent reset password token failed: ${errEmail}`);
                })
                returnData.set({ok: true, result});
                callback();
            })
        })
}

const deleteSingleUser = (req, returnData, callback) => {
    const {i: userId} = req.params;
    const currUserId = req.user._id;
    if(userId == currUserId){
        return callback(consts.ERRORS.ERROR_DEL_CURR_USER);
    }
    User.findOne({_id: userId}).exec((err, data) => {
        if(err) return callback(consts.ERRORS.ERROR_FIND_USER);
        data.is_delete = true;
        data.status = 0;
        data.dateDeleted = new Date();
        data.save((errSave, result) => {
            if(errSave) return callback(consts.ERRORS.ERROR_SAVE_USER);
            returnData.set({ok: true, result});
            callback();
        })
    })
}

const restoreUsers =  (req, returnData, callback) => {
    const { ids } = req.params;
    if(!Array.isArray(ids)){
        return callback(consts.ERRORS.ERROR_IDS_NOT_ARRAY);
    }
    User.updateMany({_id: {
        $in: ids
    }}, {
        $set: {
            status: 1,
            is_delete: false,
            dateDeleted: null
        }
    }).exec((err, data) => {
        if(err) return callback(consts.ERRORS.ERROR_FIND_USER);
        returnData.set({ok: true, data});
        callback();
    })
}

const deletePermanently = (req, returnData, callback) => {
    const { ids } = req.params;
    User.find({_id: { $in: ids }}).exec((err, data) => {
        if(err) return callback(err);
        if(!data.length){
            return callback(consts.ERRORS.ERROR_FIND_USER);
        }
        if(data.find(u => u.status || !u.is_delete)) return callback(consts.ERRORS.ERROR_NOT_ALL_DEL_TEMP)
        User.deleteOne({_id: { $in: ids }}).exec((errDel, result) => {
            if(errDel) return callback(errDel);
            returnData.set({ok: true, result});
            callback();
        })
    })
}

exports.deactivateUsers = deactivateUsers;
exports.list = list;
exports.checkEmailExist = checkEmailExist;
exports.login = login;
exports.getUser = getUser;
exports.signUp = signUp;
exports.deleteUsers = deleteUsers;
exports.unlockUsers = unlockUsers;
exports.createUserOAuth = createUserOAuth;
exports.updateUser = updateUser;
exports.encryptSessionAndUrl = encryptSessionAndUrl;
exports.authenticateKeyUrl = authenticateKeyUrl;
exports.checkUserTFA = checkUserTFA;
exports.generateOTP = generateOTP;
exports.sendEmailToChangePass = sendEmailToChangePass;
exports.handleChangePassToken = handleChangePassToken;
exports.checkChangepasswordUrl = checkChangepasswordUrl;
exports.sentForgotPasswordRequest = sentForgotPasswordRequest;
exports.handleForgotPasswordRequest = handleForgotPasswordRequest;
exports.postToConnectionLambda = postToConnectionLambda;
exports.resetPassword = resetPassword;
exports.deleteSingleUser = deleteSingleUser;
exports.restoreUsers = restoreUsers;
exports.deletePermanently = deletePermanently;
exports.updateUserRole = updateUserRole;