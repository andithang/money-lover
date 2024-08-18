/**
 * Authorization middleware module
 */
var dataDb = require(__db_path + '/system-db');
var validator = require('validator');
var redis = require('../libs/redis');
const winstonLogger = require('../libs/winston');
var consts = require(__config_path + "/consts");
//  var log = require(__libs_path + '/log');
var config = require(__config_path + '/config');
const Role = require('../main-services/modules/core/models/role');
const Permission = require('../main-services/modules/core/models/permission');

/**
 * This method is check tokken for every api request
 * return 403 NotAuthorizedError when token param is missing or not correct, else next
 *
 * @param request
 * @param response
 * @param next method
 */
exports.checkToken = function (req, res, next) {
    // check for bypass apis
    if (Array.isArray(consts.ignoreAuthorization) && consts.ignoreAuthorization.find(url => url == req.url)) {
        return next();
    }
    var api_name = req.params.api_name;
    winstonLogger.info(`${req.headers['origin']}: ${req.method}: ${JSON.stringify(req.params)}`);
    if (!api_name) {
        winstonLogger.error(`${req.headers['origin']}: ${consts.ERRORS.ERROR_API_NAME_MISSING}`);
        return res.send(400, {
            code: 400,
            message: consts.ERRORS.ERROR_API_NAME_MISSING
        });
    }
    api_name = api_name.toLowerCase();
    //  if (config.mode !== 'test') {
    //      log.info({
    //          'api_name': api_name,
    //          'ip': req.params.ip,
    //          'lang': req.params.lang,
    //          'agent': req.headers['user-agent']
    //      });
    //  }
    var apiNotAuth = consts.not_auth_api.indexOf(api_name) > -1;
    var apiForSystem = consts.system_api.indexOf(api_name) > -1;
    var apiForAnyAuth = consts.any_auth_api.indexOf(api_name) > -1;

    var token = req.headers.authorization;
    if (apiNotAuth) {
        return next();
    } else if (!validator.isNull(token)) {
        let sToken = token.split(" ");
        // phân tách token
        sToken = token.split(" ");
        if (sToken.length !== 2) {
            winstonLogger.error(`${req.headers['origin']}: ${consts.ERRORS.ERROR_ACCESS_RESTRICTED}: sToken.length !== 2`);
            return res.send(403, {
                code: 403,
                message: `${consts.ERRORS.ERROR_ACCESS_RESTRICTED}`
            });
        } else {
            token = sToken[1];
            // Having token, query user with token
            redis.HEXISTS(consts.redis_key.user, token, function (err, exists) {
                if (err) {
                    return res.send(403, {
                        code: 400,
                        message: err.toString()
                    });
                }
                if (exists === 1) {
                    redis.HGET(consts.redis_key.user, token, function (err, userData) {
                        // kiểm tra api chỉ dùng cho user hệ thống
                        if (err) {
                            winstonLogger.error(`${req.headers['origin']}: ${consts.ERRORS.ERROR_ACCESS_RESTRICTED}: consts.redis_key.user == null`);
                            return res.send(403, {
                                code: 403,
                                message: `${consts.ERRORS.ERROR_ACCESS_RESTRICTED}`
                            });
                        } else {
                            var user = JSON.parse(userData);
                            if (!apiForAnyAuth && apiForSystem && user.level !== consts.user_roles.ADMIN && user.level !== consts.user_roles.SYSTEM_USER) {
                                winstonLogger.error(`${req.headers['origin']}: ${consts.ERRORS.ERROR_ACCESS_RESTRICTED}: !apiForAnyAuth && apiForSystem && user.level !== consts.user_roles.ADMIN && user.level !== consts.user_roles.SYSTEM_USER`);
                                return res.send(403, {
                                    code: 403,
                                    message: `${consts.ERRORS.ERROR_ACCESS_RESTRICTED}`
                                });
                            } else if (!apiForAnyAuth && !apiForSystem && (user.level === consts.user_roles.admin || user.level === consts.user_roles.system_user)) {
                                winstonLogger.error(`${req.headers['origin']}: ${consts.ERRORS.ERROR_ACCESS_RESTRICTED}: !apiForAnyAuth && !apiForSystem && (user.level === consts.user_roles.admin || user.level === consts.user_roles.system_user)`);
                                return res.send(403, {
                                    code: 403,
                                    message: `${consts.ERRORS.ERROR_ACCESS_RESTRICTED}`
                                });
                            }
                            req.user = user;
                            return next();
                        }
                    });
                } else {
                    winstonLogger.error(`${req.headers['origin']}: ${consts.ERRORS.ERROR_ACCESS_RESTRICTED}`);
                    return res.send(403, {
                        code: 403,
                        message: `${consts.ERRORS.ERROR_ACCESS_RESTRICTED}`
                    });
                }
            });
        }
    } else {
        winstonLogger.error(`${req.headers['origin']}: ${consts.ERRORS.ERROR_ACCESS_RESTRICTED}`);
        return res.send(403, {
            code: 403,
            message: `${consts.ERRORS.ERROR_ACCESS_RESTRICTED}`
        });
    }
};

/**
 * - prepare a map between a role and the actions that role can perform, when the server starts.
 * - allow a fast query when users are calling any API and check for their permission
 * - any updates to permission, roles, actions should update this map
 * - THIS SHOULD BE A LAMBDA FUNCTION IN PRODUCTION ENVIRONMENT!
 */
exports.mappingRoleActions = async () => {
    winstonLogger.info(`Preparing mapper between roles and the actions they can perform....`);
    // foreach role
    // get permissions that allows, permissions that denies
    // get actions along with them
    // save them to redis: roleId: [...actionIds] ---> only the allowed actions are saved
    try {
        const roles = await Role.find({ status: 1, is_delete: 0 });
        const allowedPermissionPromises = [], deniedPermissionsPromises = [];
        roles.forEach(role => {
            allowedPermissionPromises.push(new Promise((resolve) => {
                Permission.find({ status: 1, is_delete: 0, allow: true, role: role._id }).populate('moduleAction').then(listAllowed => resolve(listAllowed));
            }))
            deniedPermissionsPromises.push(new Promise((resolve) => {
                Permission.find({ status: 1, is_delete: 0, allow: false, role: role._id }).populate('moduleAction').then(listDenied => resolve(listDenied));
            }))
        });
        const allowedActions = await Promise.all(allowedPermissionPromises), deniedActions = await Promise.all(deniedPermissionsPromises);
        roles.forEach((role, ind) => {
            // deny first
            const moduleActionsDenied = deniedActions[ind].map(per => per._doc.moduleAction);
            const actionsDenied = new Set(); // to avoid duplicate items
            moduleActionsDenied.reduce((pre, curr) => ([...pre, ...curr]), []).forEach((modAct) => {
                modAct._doc.actions.forEach(actObjId => {
                    actionsDenied.add(actObjId.toString());
                })
            });
            // allow after
            const moduleActionsAllowed = allowedActions[ind].map(per => per._doc.moduleAction);
            const actionsAllowed = new Set(); // to avoid duplicate items
            moduleActionsAllowed.reduce((pre, curr) => ([...pre, ...curr]), []).forEach((modAct) => {
                modAct._doc.actions.forEach(actObjId => {
                    if(!actionsDenied.has(actObjId.toString())) actionsAllowed.add(actObjId.toString());
                })
            });                        
            redis.HSET(consts.redis_key.role_permission, role._id.toString(), JSON.stringify(Array.from(actionsAllowed.values())));
        });
        winstonLogger.info(`Roles permission mapped`);
    } catch (error) {
        winstonLogger.error(`Error when mapping roles and actions: `, error);
    }
}