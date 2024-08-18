'use strict';

var consts = require(__config_path + '/consts');

module.exports = function () {
    // Root routing
    var controller = require('../controllers/transaction.controller.js');

    consts.registerApi('transaction:create', controller.addTransaction, { anyAuthApi: true });
    consts.registerApi('transaction:delete', controller.deleteTransaction, { anyAuthApi: true });
    consts.registerApi('transaction:get-one', controller.getTransaction, { anyAuthApi: true });
    consts.registerApi('transaction:list', controller.listTransactions, { anyAuthApi: true });
    consts.registerApi('transaction:update', controller.updateTransaction, { anyAuthApi: true });
};
