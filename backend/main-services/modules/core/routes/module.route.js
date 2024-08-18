'use strict';

var consts = require(__config_path + '/consts');

module.exports = function() {
    // Root routing
    var controller = require('../controllers/module.controller.js');

    consts.registerApi('module:delete-many', controller.deleteModule, { systemApi: true });
    consts.registerApi('module:get-list', controller.listModules, { systemApi: true });
    consts.registerApi('module:create', controller.addModule, { systemApi: true });
    consts.registerApi('module:get-one', controller.getModule, { systemApi: true });
    consts.registerApi('module:update', controller.updateModule, { systemApi: true });
    consts.registerApi('module:get-many', controller.getModulesByIds, { systemApi: true });
    consts.registerApi('module:update-status', controller.changeStatusModule, { systemApi: true });
};
