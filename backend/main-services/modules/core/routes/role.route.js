'use strict';

var consts = require(__config_path + '/consts');

module.exports = function() {
    // Root routing
    var controller = require('../controllers/role.controller.js');

    consts.registerApi('role:delete-many', controller.deleteRole, { systemApi: true });
    consts.registerApi('role:update-status', controller.changeStatusRole, { systemApi: true });
    consts.registerApi('role:get-list', controller.listRoles, { systemApi: true });
    consts.registerApi('role:create', controller.addRole, { systemApi: true });
    consts.registerApi('role:get-one', controller.getRole, { systemApi: true });
    consts.registerApi('role:get-many', controller.getRolesByIds, { systemApi: true });
    consts.registerApi('role:update', controller.updateRole, { systemApi: true });
};
