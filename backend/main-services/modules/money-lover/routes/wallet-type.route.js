'use strict';

var consts = require(__config_path + '/consts');

module.exports = function () {
    // Root routing
    var controller = require('../controllers/wallet-type.controller.js');

    consts.registerApi('wallettype:create', controller.addWalletType, { systemApi: true });
    consts.registerApi('wallettype:delete', controller.deleteWalletType, { systemApi: true });
    consts.registerApi('wallettype:get-one', controller.getWalletType, { systemApi: true });
    consts.registerApi('wallettype:get-many', controller.getWalletTypesByIds, { systemApi: true });
    consts.registerApi('wallettype:list', controller.listWalletTypes, { anyAuthApi: true });
    consts.registerApi('wallettype:update', controller.updateWalletType, { systemApi: true });
};
