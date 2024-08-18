'use strict';

var consts = require(__config_path + '/consts');

module.exports = function() {
    // Root routing
    var controller = require('../controllers/permission.controller.js');

    consts.registerApi('permission:delete-many', controller.deletePermission, { systemApi: true });
    consts.registerApi('permission:get-list', controller.listPermissions, { systemApi: true });
    consts.registerApi('permission:create', controller.addPermission, { systemApi: true });
    consts.registerApi('permission:get-one', controller.getPermission, { systemApi: true });
    consts.registerApi('permission:update', controller.updatePermission, { systemApi: true });
    consts.registerApi('permission:get-actions-by-module-action', controller.getActionsForModuleAction, { systemApi: true });
    consts.registerApi('permission:get-actions-by-module', controller.getActionsOnModule, { anyAuth: true });
    consts.registerApi('permission:get-moduleactions-by-permission', controller.getModuleActionsForPermission, { systemApi: true });
    consts.registerApi('permission:update-status', controller.changeStatusPermission, { systemApi: true });
};
