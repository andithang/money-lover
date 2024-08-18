'use strict';

var consts = require(__config_path + '/consts');

module.exports = function () {
    // Root routing
    var controller = require('../controllers/file.controller.js');

    consts.registerApi('file:read-import-money-lover', controller.readMoneyLoverReport, { anyAuthApi: true });
};
