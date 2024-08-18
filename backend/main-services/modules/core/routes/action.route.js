'use strict';

var consts = require(__config_path + '/consts');

module.exports = function() {
    // Root routing
    var controller = require('../controllers/action.controller.js');

    consts.registerApi('action:delete-many', controller.deleteAction, { systemApi: true });
    consts.registerApi('action:get-list', controller.listActions, { systemApi: true });
    consts.registerApi('action:create', controller.addAction, { systemApi: true });
    consts.registerApi('action:get-one', controller.getAction, { systemApi: true });
    consts.registerApi('action:get-many', controller.getActionsByIds, { systemApi: true });
    consts.registerApi('action:update', controller.updateAction, { systemApi: true });
    consts.registerApi('action:update-status', controller.changeStatusAction, { systemApi: true });
};
