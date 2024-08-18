'use strict';

var consts = require(__config_path + '/consts');

module.exports = function () {
    // Root routing
    var controller = require('../controllers/wallet.controller.js');

    consts.registerApi('wallet:create', controller.addWallet, { anyAuthApi: true });
    consts.registerApi('wallet:delete', controller.deleteWallet, { anyAuthApi: true });
    consts.registerApi('wallet:get-one', controller.getWallet, { anyAuthApi: true });
    consts.registerApi('wallet:list', controller.listWallets, { anyAuthApi: true });
    consts.registerApi('wallet:update', controller.updateWallet, { anyAuthApi: true });
};
