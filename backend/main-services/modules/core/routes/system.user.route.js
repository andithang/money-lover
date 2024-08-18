'use strict';

const consts = require(__config_path + '/consts');

module.exports = function() {
    // Root routing
    const controller = require('../controllers/system.user.controller.js');
    const userSettingCtl = require('../controllers/user-setting.controller.js');

    consts.registerApi('users:deactivate', controller.deactivateUsers, { systemApi: true });
    consts.registerApi('users:unlock', controller.unlockUsers, { systemApi: true });
    consts.registerApi('users:get-list', controller.list, { systemApi: true });
    consts.registerApi('users:check-email-exist', controller.checkEmailExist, { systemApi: true });
    consts.registerApi('users:login', controller.login, { notAuth: true });
    consts.registerApi('users:get-one', controller.getUser, { systemApi: true });
    consts.registerApi('users:reset-password', controller.resetPassword, { systemApi: true });
    consts.registerApi('users:signup', controller.signUp, { notAuth: true });
    consts.registerApi('users:signup-by-oauth', controller.createUserOAuth, { notAuth: true });
    consts.registerApi('users:delete-temp-many', controller.deleteUsers, { systemApi: true });
    consts.registerApi('users:delete-temp-one', controller.deleteSingleUser, { systemApi: true });
    consts.registerApi('users:restore-many', controller.restoreUsers, { systemApi: true });
    consts.registerApi('users:delete-many-forever', controller.deletePermanently, { systemApi: true });
    consts.registerApi('users:update', controller.updateUser, { anyAuth: true });
    consts.registerApi('users:get-key-session', controller.encryptSessionAndUrl, { anyAuth: true });
    consts.registerApi('users:check-get-session', controller.authenticateKeyUrl, { anyAuth: true });
    consts.registerApi('users:check-tfa', controller.checkUserTFA, { notAuth: true });
    consts.registerApi('users:generate-otp', controller.generateOTP, { notAuth: true });
    consts.registerApi('users:update-user-role', controller.updateUserRole, { systemApi: true });
    consts.registerApi('users:post-to-connection', controller.postToConnectionLambda, { notAuth: true });
    consts.registerApi('users:send-email-change-password', controller.sendEmailToChangePass, { anyAuth: true });
    consts.registerApi('users:change-password', controller.handleChangePassToken, { anyAuth: true });
    consts.registerApi('users:check-change-password-url', controller.checkChangepasswordUrl, { anyAuth: true });
    consts.registerApi('usersetting:get', userSettingCtl.getUsetSetting, { anyAuth: true });
    consts.registerApi('usersetting:set', userSettingCtl.updateSetting, { anyAuth: true });
    consts.registerApi('users:send-fotgot-password-request', controller.sentForgotPasswordRequest, { notAuth: true });
    consts.registerApi('users:hanlde-forgot-password-request', controller.handleForgotPasswordRequest, { notAuth: true });
};
