'use strict';

var consts = require(__config_path + '/consts');

module.exports = function () {
    // Root routing
    var controller = require('../controllers/category.controller.js');

    consts.registerApi('category:create', controller.addCategory, { anyAuthApi: true });
    consts.registerApi('category:create-admin', controller.addCategory, { anyAuthApi: true });
    consts.registerApi('category:delete', controller.deleteCategory, { anyAuthApi: true });
    consts.registerApi('category:delete-admin', controller.deleteCategory, { anyAuthApi: true });
    consts.registerApi('category:get-one', controller.getCategory, { anyAuthApi: true });
    consts.registerApi('category:list', controller.listCategorys, { anyAuthApi: true });
    consts.registerApi('category:update', controller.updateCategory, { anyAuthApi: true });
    consts.registerApi('category:update-admin', controller.updateCategory, { anyAuthApi: true });
};
