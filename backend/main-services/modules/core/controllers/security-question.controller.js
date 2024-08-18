const SecurityQuestion = require('../models/security-question');
const validator = require('validator');
const async = require('async');
const bcrypt = require('bcrypt');
const consts = require(__config_path + '/consts');
const UserSecurityQuestion = require('../models/user-security-question'),
utils = require(__libs_path + '/utils');

const listSecurityQuestions = (req, returnData, callback) => {
    let { search, isDelete, page, size } = req.params;

    const query = {
        question: new RegExp(search, 'i')
    };
    if (!validator.isNull(isDelete)) {
        query['isDelete'] = isDelete;
    }
    else {
        query['isDelete'] = false;
    }
    if (validator.isNull(page)) {
        page = 0;
    }
    if (validator.isNull(size)) {
        size = consts.page_size;
    }

    SecurityQuestion
        .find()
        .where(query)
        .sort({dateCreated: -1})
        .skip(page*size)
        .limit(size)
        .exec(async (err, results) => {
            if (err) return callback(err);
            const countArrPromises = results.map(q => {
                return UserSecurityQuestion.where({question: q._id}).distinct("user").count();
            });
            const total = await SecurityQuestion.where(query).count();
            Promise.all(countArrPromises)
            .then((responses) => {
                const data = results.map((quesModel, ind) => ({
                    ...quesModel.toObject(),
                    currentUsage: responses[ind]
                }));
                returnData.set({data, total});
                callback();
            })
        })
}

const getSecurityQuestion = (req, returnData, callback) => {
    let id = req.params._id;

    SecurityQuestion
        .findOne({ _id: id })
        .exec((err, data) => {
            if (err) return callback(err);
            if (!data) return callback('ERROR_QUESTION_NOT_FOUND');
            returnData.set(data);
            callback();
        })
}

const addSecurityQuestion = (req, returnData, callback) => {
    const { question } = req.params;
    const creator = req.user;

    if (validator.isNull(question)) {
        return callback('ERROR_QUESTION_CONTENT_MISSING');
    }

    async.series([
        function (cb) {
            SecurityQuestion
                .findOne()
                .where({ question: question })
                .exec((err, data) => {
                    if (err) {
                        cb(err);
                    }
                    if (data) {
                        cb('ERROR_QUESTION_EXIST');
                    }
                    else cb();
                })
        },
        function (cb) {
            let newSecurityQuestion = new SecurityQuestion({
                question,
                creator: creator._id
            })
            newSecurityQuestion.save((err, result) => {
                if (err) cb(err);
                else {
                    cb(null, result);
                }
            })
        }
    ], (err, data) => {
        if (err) return callback(err);
        returnData.set(data);
        callback();
    })

}

const updateSecurityQuestion = (req, returnData, callback) => {
    let { _id, question } = req.params;

    if (validator.isNull(question)) {
        return callback('ERROR_QUESTION_CONTENT_MISSING');
    }
    if (!validator.isMongoId(_id)) {
        return callback('ERROR_ID_MISSING');
    }

    checkIfQuestionCanBeModified([_id], canBeModified => {
        if (canBeModified) {
            SecurityQuestion
                .findOne()
                .where({ _id })
                .exec((err, result) => {
                    if (err) {
                        return callback(err);
                    }
                    if (!result && result._id.toString() != _id) {
                        return callback('ERROR_QUESTION_NOT_FOUND');
                    }
                    else {
                        utils.merge(result, { question });
                        result.save(function (error, data) {
                            if (error) return callback(error);
                            returnData.set(data);
                            callback();
                        });
                    }
                })
        }
        else {
            return callback("ERROR_QUESTION_CANNOT_BE_MODIFIED");
        }
    })
}

const checkIfQuestionCanBeModified = (ids, callback) => {
    UserSecurityQuestion.findOne({
        question: {$in: ids}
    }, (err, result) => {
        if (err) {
            callback(true);
        }
        else {
            if(result){
                callback(false);
            }
            else {
                callback(true);
            }
        }
    })
}

const deleteSecurityQuestion = (req, returnData, callback) => {
    let ids = req.params.ids;

    if (!Array.isArray(ids)) {
        return callback('ERROR_ID_MISSING');
    }
    checkIfQuestionCanBeModified(ids, canBeModified => {
        if (canBeModified) {
            SecurityQuestion
                .updateMany({
                    _id: {$in: ids}
                }, {
                    $set: {
                        isDelete: true
                    }
                }, (err, data) => {
                    if (err) return callback(err);
                    callback();
                })
        }
        else {
            return callback("ERROR_QUESTION_CANNOT_BE_MODIFIED");
        }
    })
}

const cleanOldUserQues = (userId, callback) => {
    UserSecurityQuestion.deleteMany({ user: userId }, (err, result) => {
        callback(err, result);
    });
}

/**
 * handle when user update their security questions, NOT when creating account
 */
const handleUserAnswerQuestion = (req, returnData, callback) => {
    let { questions, answers } = req.params;
    const user = req.user;
    if(!Array.isArray(questions)){
        return callback("ERROR_MISSING_QUESTIONS");
    }
    if(!Array.isArray(answers)){
        return callback("ERROR_MISSING_ANSWERS");
    }
    cleanOldUserQues(user._id, (err, delRes) => {
        if (err) {
            return callback("ERROR_DELETE_OLD_USER_QUESTION")
        }
        let answerHashes = answers.map(ans => {
            return bcrypt.hashSync(ans, consts.saltRounds);
        });
        const models = answerHashes.map((hash, ind) => {
            let newUserQuesAns = new UserSecurityQuestion({
                question: questions[ind],
                user: user._id,
                answer: hash
            });
            return newUserQuesAns;
        });
        UserSecurityQuestion.insertMany(models, (err, result) => {
            if (err) {
                // delete whatever were inserted
                cleanOldUserQues(user._id, (err, delRes2) => {
                    if (err) {
                        return callback("ERROR_DEL_WHEN_INSERT_USER_QUESTION");
                    }
                    return callback("ERROR_INSERT_USER_QUESTION")
                })
                return;
            }
            returnData.set(result);
            callback();
        })
    })
}

const authUserByCheckSecurityQuestion = (req, returnData, callback) => {
    const {questions, answers} = req.params;
    if(!Array.isArray(questions)){
        return callback("ERROR_MISSING_QUESTIONS");
    }
    if(!Array.isArray(answers)){
        return callback("ERROR_MISSING_ANSWERS");
    }
    const userId = req.user._id;
    UserSecurityQuestion.find({user: userId})
    .exec((err, data) => {
        if(err){
            return callback("ERROR_AUTH_USER_QUESTION")
        }
        let isAuth = true;
        let dbUserQues = data.map(model => model.toObject());
        if(dbUserQues.length == 0){
            return callback("ERROR_USER_NOT_SET_QUESTIONS")
        }
        for (let index = 0; index < dbUserQues.length; index++) {
            const userQues = dbUserQues[index];
            if(!bcrypt.compareSync(answers[index], userQues.answer) || questions[index] != userQues.question){
                isAuth = false;
                break;
            }            
        }
        returnData.set({isAuth});
        callback();
    })
}

exports.deleteSecurityQuestion = deleteSecurityQuestion;
exports.listSecurityQuestions = listSecurityQuestions;
exports.addSecurityQuestion = addSecurityQuestion;
exports.getSecurityQuestion = getSecurityQuestion;
exports.updateSecurityQuestion = updateSecurityQuestion;
exports.handleUserAnswerQuestion = handleUserAnswerQuestion;
exports.authUserByCheckSecurityQuestion = authUserByCheckSecurityQuestion;