export const APP_ACTIONS = {
    "role": {
        "get-many": "role:get-many",
        "get-one": "role:get-one",
        "get-list": "role:get-list",
        "update-status": "role:update-status",
        "delete-many": "role:delete-many",
        "delete-one": "role:delete-one",
        "update": "role:update",
        "create": "role:create"
    },
    "permission": {
        "get-one": "permission:get-one",
        "get-moduleactions-by-permission": "permission:get-moduleactions-by-permission",
        "get-actions-by-module": "permission:get-actions-by-module",
        "get-actions-by-module-action": "permission:get-actions-by-module-action",
        "get-list": "permission:get-list",
        "update-status": "permission:update-status",
        "delete-many": "permission:delete-many",
        "delete-one": "permission:delete-one",
        "update": "permission:update",
        "create": "permission:create"
    },
    "notification": {
        "mark-as-read": "notification:mark-as-read",
        "no-repeat": "notification:no-repeat",
        "get-list": "notification:get-list"
    },
    "module": {
        "get-many": "module:get-many",
        "get-one": "module:get-one",
        "get-list": "module:get-list",
        "update-status": "module:update-status",
        "delete-many": "module:delete-many",
        "delete-one": "module:delete-one",
        "update": "module:update",
        "create": "module:create"
    },
    "action": {
        "get-many": "action:get-many",
        "get-one": "action:get-one",
        "update-status": "action:update-status",
        "delete-many": "action:delete-many",
        "delete": "action:delete",
        "update": "action:update",
        "get-list": "action:get-list",
        "create": "action:create"
    },
    "users": {
        "hanlde-forgot-password-request": "users:hanlde-forgot-password-request",
        "send-fotgot-password-request": "users:send-fotgot-password-request",
        "check-change-password-url": "users:check-change-password-url",
        "change-password": "users:change-password",
        "send-email-change-password": "users:send-email-change-password",
        "post-to-connection": "users:post-to-connection",
        "update-user-role": "users:update-user-role",
        "generate-otp": "users:generate-otp",
        "check-tfa": "users:check-tfa",
        "check-get-session": "users:check-get-session",
        "get-key-session": "users:get-key-session",
        "signup-by-oauth": "users:signup-by-oauth",
        "login": "users:login",
        "signup": "users:signup",
        "get-one": "users:get-one",
        "check-email-exist": "users:check-email-exist",
        "unlock": "users:unlock",
        "deactivate": "users:deactivate",
        "delete-temp-one": "users:delete-temp-one",
        "delete-temp-many": "users:delete-temp-many",
        "delete-many-forever": "users:delete-many-forever",
        "get-list": "users:get-list",
        "restore-many": "users:restore-many",
        "reset-password": "users:reset-password"
    },
    "category": {
        "create-admin": "category:create-admin",
        "delete-admin": "category:delete-admin",
        "update-admin": "category:update-admin",
        "update": "category:update",
        "list": "category:list",
        "get-one": "category:get-one",
        "delete": "category:delete",
        "create": "category:create"
    },
    "icon": {
        "upload": "icon:upload",
        "list": "icon:list",
        "get-by-path": "icon:get-by-path",
        "get-one": "icon:get-one",
        "delete": "icon:delete",
        "insert-all": "icon:insert-all"
    },
    "report": {
        "overall": "report:overall",
        "average-month": "report:average-month"
    },
    "transaction": {
        "update": "transaction:update",
        "list": "transaction:list",
        "get-one": "transaction:get-one",
        "delete": "transaction:delete",
        "create": "transaction:create"
    },
    "wallettype": {
        "list": "wallettype:list",
        "get-many": "wallettype:get-many",
        "get-one": "wallettype:get-one",
        "delete": "wallettype:delete",
        "create": "wallettype:create",
        "update": "wallettype:update",
    },
    "wallet": {
        "update": "wallet:update",
        "list": "wallet:list",
        "get-one": "wallet:get-one",
        "delete": "wallet:delete",
        "create": "wallet:create"
    },
    "usersetting": {
        "set": "usersetting:set",
        "get": "usersetting:get"
    }
}