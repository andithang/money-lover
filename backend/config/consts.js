module.exports = {
    // declare schema options to show virtual field when use JSON stringify
    schemaOptions: {
        toObject: {
            virtuals: true
        },
        toJSON: {
            virtuals: true
        }
    },
    // dùng để đăng ký controller ứng với api v1 name
    api: {},

    // array url not authorize
    not_auth_api: [],
    system_api: [],
    any_auth_api: [],
    api_logging: {},

    /**
     * Đăng ký API Route với hệ thống
     *
     * @param  {[type]} apiName   [Api name]
     * @param  {[type]} func      [function or list of function]
     * @param  {[type]} options   [options {notAuth, systemApi}]
     * @return {[type]}           [description]
     */
    registerApi: function (apiName, func, options) {
        if (!func) return;
        if (options) {
            var notAuth = options.notAuth;
            var systemApi = options.systemApi;
            var anyAuthApi = options.anyAuthApi;
        }
        if (Array.isArray(func)) {
            this.api[apiName] = func;
        } else {
            if (!this.api[apiName])
                this.api[apiName] = [];
            this.api[apiName].push(func);
        }

        if (notAuth) {
            this.not_auth_api.push(apiName);
        }

        if (systemApi) {
            this.system_api.push(apiName);
        }

        if (anyAuthApi) {
            this.any_auth_api.push(apiName);
        }
    },
    // phương thức hash để mã hóa mật khẩu
    hash_method: 'sha256',

    // redis consts
    redis_key: {
        user: "redis_user_key",
        server: "redis_server",
        icon: "redis_icon_key",
        tfa: "redis_tfa_key", // two factor authentication
        forgot_password: "redis_forgot_password",
        change_password: "redis_change_password",
        role_permission: "role_permission"
    },

    user_roles: {
        ADMIN: 'ADMIN',
        SYSTEM_USER: 'SYSTEM',
        USER: 'USER'
    },

    icon_prefix: "data:image/png;base64,",

    enableCORS: true,
    page_size: 10,
    icon_type: '.png',
    type_income: 1,
    type_outcome: 0,
    months: [
        "Tháng 1",
        "Tháng 2",
        "Tháng 3",
        "Tháng 4",
        "Tháng 5",
        "Tháng 6",
        "Tháng 7",
        "Tháng 8",
        "Tháng 9",
        "Tháng 10",
        "Tháng 11",
        "Tháng 12",
    ],
    saltRounds: 10,
    timeKeyExpired: 180000,
    maxCountOTP: 5,
    /**
     * expired time for keys saved for otp check (in sec)
     */
    otpExpiredTime: 3000,
    /**
     * expired time for change password token
     */
    changePassTokenTime: 3000,
    /**
     * paths that ignore authorization checks
     */
    ignoreAuthorization: ['/api/health-check'],
    wsRoute: {
        notification: "notification",
        loginWarningTopic: "notify-login"
    },
    reconnectWS: 5000, // reconnect after 5s
    NOTTIFY_LOGIN: "notify-login",
    ERRORS: {
        ERROR_ACCESS_RESTRICTED: 'ERROR_ACCESS_RESTRICTED',
        ERROR_PASSWORD_MISSING: 'ERROR_PASSWORD_MISSING',
        ERROR_PASSWORD_INCORRECT: 'ERROR_PASSWORD_INCORRECT',
        ERROR_SAVE_REDIS_RANDOM_KEY: 'ERROR_SAVE_REDIS_RANDOM_KEY',
        ERROR_GET_RANDOM_KEY: 'ERROR_GET_RANDOM_KEY',
        ERROR_EMAIL_RD_NOT_PAIRED: 'ERROR_EMAIL_RD_NOT_PAIRED',
        ERROR_FIND_USER_WITH_EMAIL: 'ERROR_FIND_USER_WITH_EMAIL',
        ERROR_USER_NOT_FOUND: 'ERROR_USER_NOT_FOUND',
        ERROR_REDIS_GET_KEY: 'ERROR_REDIS_GET_KEY',
        ERROR_OTP_INVALID: 'ERROR_OTP_INVALID',
        ERROR_REDIS_KEY_NOT_EXIST: 'ERROR_REDIS_KEY_NOT_EXIST',
        ERROR_REDIS_GET_KEY_USER: 'ERROR_REDIS_GET_KEY_USER',
        ERROR_MAX_COUNT_INVALID_OTP: 'ERROR_MAX_COUNT_INVALID_OTP',
        ERROR_OTP_INCORRECT: 'ERROR_OTP_INCORRECT',
        ERROR_EMAIL_EXISTS: 'ERROR_EMAIL_EXISTS',
        ERROR_EMAIL_MISSING: 'ERROR_EMAIL_MISSING',
        ERROR_USER_NOT_EXISTS: 'ERROR_USER_NOT_EXISTS',
        ERROR_FIND_USER: 'ERROR_FIND_USER',
        ERROR_CANNOT_FIND_USER: 'ERROR_CANNOT_FIND_USER',
        ERROR_USER_BEING_CHANGE_PASSWORD: 'ERROR_USER_BEING_CHANGE_PASSWORD',
        ERROR_REDIS: 'ERROR_REDIS',
        ERROR_NEWPASS_MISSING: 'ERROR_NEWPASS_MISSING',
        ERROR_CONFIRMPASS_MISSING: 'ERROR_CONFIRMPASS_MISSING',
        ERROR_CONFIRM_PASS_NOT_MATCH: 'ERROR_CONFIRM_PASS_NOT_MATCH',
        ERROR_TOKEN_NOT_MATCH: 'ERROR_TOKEN_NOT_MATCH',
        ERROR_OLDPASSWORD_INCORRECT: 'ERROR_OLDPASSWORD_INCORRECT',
        ERROR_SAVE_USER: 'ERROR_SAVE_USER',
        ERROR_IDS_MISSING: 'ERROR_IDS_MISSING',
        ERROR_IDS_NOT_ARRAY: 'ERROR_IDS_NOT_ARRAY',
        ERROR_DEL_CURR_USER: 'ERROR_DEL_CURR_USER',
        ERROR_USERNAME_MISSING: 'ERROR_USERNAME_MISSING',
        ERROR_FIRSTNAME_MISSING: 'ERROR_FIRSTNAME_MISSING',
        ERROR_LASTNAME_MISSING: 'ERROR_LASTNAME_MISSING',
        ERROR_LEVEL_MISSING: 'ERROR_LEVEL_MISSING',
        ERROR_USER_EXIST: 'ERROR_USER_EXIST',
        ERROR_INSERT_USER_QUESTION: 'ERROR_INSERT_USER_QUESTION',
        ERROR_AUTHID_MISSING: 'ERROR_AUTHID_MISSING',
        ERROR_USER_LOCK: 'ERROR_USER_LOCK',
        ERROR_MOBILE_MISSING: 'ERROR_MOBILE_MISSING',
        ERROR_CANNOT_UPDATE_USER: 'ERROR_CANNOT_UPDATE_USER',
        ERROR_URL_INVALID: 'ERROR_URL_INVALID',
        ERROR_KEY_EXPIRED: 'ERROR_KEY_EXPIRED',
        ERROR_ERROR_FIND_USER_EMAIL_EXIST: 'ERROR_ERROR_FIND_USER_EMAIL_EXIST',
        ERROR_SAVE_REDIS_FORGOT_PASSWORD: 'ERROR_SAVE_REDIS_FORGOT_PASSWORD',
        ERROR_SENT_MAIL_FORGOT_PASSWORD: 'ERROR_SENT_MAIL_FORGOT_PASSWORD',
        ERROR_SELF_RESET_PASSWORD: 'ERROR_SELF_RESET_PASSWORD',
        ERROR_USER_NOT_EXIST: 'ERROR_USER_NOT_EXIST',
        ERROR_ROLE_TITLE_MISSING: 'ERROR_ROLE_TITLE_MISSING',
        ERROR_ROLE_DESCRIPTION_MISSING: 'ERROR_ROLE_DESCRIPTION_MISSING',
        ERROR_API_NAME_MISSING: "ERROR_API_NAME_MISSING",
        ERROR_USERNAME_PASSWORD_INCORRECT: "ERROR_USERNAME_PASSWORD_INCORRECT",
        ERROR_NOT_ALL_DEL_TEMP: "ERROR_NOT_ALL_DEL_TEMP",
        ERROR_ROLE_CODE_MISSING: "ERROR_ROLE_CODE_MISSING",
        ERROR_ROLE_NOT_FOUND: "ERROR_ROLE_NOT_FOUND",
        ERROR_TITLE_MISSING: "ERROR_TITLE_MISSING",
        ERROR_ROLE_EXIST: "ERROR_ROLE_EXIST",
        ERROR_ID_MISSING: "ERROR_ID_MISSING",
        ERROR_CODE_MISSING: "ERROR_CODE_MISSING",
        ERROR_DESCRIPTION_MISSING: "ERROR_DESCRIPTION_MISSING",
        ERROR_STATUS_INVALID: "ERROR_STATUS_INVALID",
        ERROR_ACTION_TITLE_MISSING: 'ERROR_ACTION_TITLE_MISSING',
        ERROR_ACTION_NOT_FOUND: 'ERROR_ACTION_NOT_FOUND',
        ERROR_ACTION_CODE_MISSING: 'ERROR_ACTION_CODE_MISSING',
        ERROR_ACTION_EXIST: 'ERROR_ACTION_EXIST',
        ERROR_ACTION_DESCRIPTION_MISSING: 'ERROR_ACTION_DESCRIPTION_MISSING',
        ERROR_MODULE_TITLE_MISSING: 'ERROR_MODULE_TITLE_MISSING',
        ERROR_MODULE_NOT_FOUND: 'ERROR_MODULE_NOT_FOUND',
        ERROR_MODULE_CODE_MISSING: 'ERROR_MODULE_CODE_MISSING',
        ERROR_MODULE_EXIST: 'ERROR_MODULE_EXIST',
        ERROR_MODULE_DESCRIPTION_MISSING: 'ERROR_MODULE_DESCRIPTION_MISSING',
        ERROR_PERMISSION_TITLE_MISSING: 'ERROR_PERMISSION_TITLE_MISSING',
        ERROR_PERMISSION_NOT_FOUND: 'ERROR_PERMISSION_NOT_FOUND',
        ERROR_PERMISSION_CODE_MISSING: 'ERROR_PERMISSION_CODE_MISSING',
        ERROR_PERMISSION_EXIST: 'ERROR_PERMISSION_EXIST',
        ERROR_PERMISSION_DESCRIPTION_MISSING: 'ERROR_PERMISSION_DESCRIPTION_MISSING',
        ERROR_PERMISSION_ROLE_MISSING: 'ERROR_PERMISSION_ROLE_MISSING',
        ERROR_PERMISSION_ALLOW_MISSING: 'ERROR_PERMISSION_ALLOW_MISSING',
        ERROR_PERMISSION_MODULE_ACTION_MISSING: 'ERROR_PERMISSION_MODULE_ACTION_MISSING',
        ERROR_NOT_A_NUMBER: 'ERROR_NOT_A_NUMBER',
        ERRROR_EMAIL_EXIST: 'ERRROR_EMAIL_EXIST',
        ERROR_NOT_AN_ID: (field) => `${field.toUpperCase()}_IS_NOT_A_VALID_ID`
    }
}