'use strict';

var consts = require(__config_path + '/consts');

module.exports = function () {
    // Root routing
    var controller = require('../controllers/icon.controller.js');

    consts.registerApi('icon:insert-all', controller.insertAllIcons);
    consts.registerApi('icon:delete', controller.deleteIcon);
    consts.registerApi('icon:get-one', controller.getIcon);
    consts.registerApi('icon:get-by-path', controller.getIconByPath);
    consts.registerApi('icon:list', controller.listIcons);
    consts.registerApi('icon:upload', controller.uploadIcon);
};
