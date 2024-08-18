'use strict';

var consts = require(__config_path + '/consts');

module.exports = function () {
    // Root routing
    var controller = require('../controllers/budget.controller.js');

    consts.registerApi('budget:create', controller.addBudget, { systemApi: true });
    consts.registerApi('budget:delete', controller.deleteBudget, { systemApi: true });
    consts.registerApi('budget:get-one', controller.getBudget, { systemApi: true });
    consts.registerApi('budget:list', controller.listBudgets, { systemApi: true });
    consts.registerApi('budget:update', controller.updateBudget, { systemApi: true });
};
