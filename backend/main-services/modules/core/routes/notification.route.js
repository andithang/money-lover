'use strict';

var consts = require(__config_path + '/consts');

module.exports = function() {
    // Root routing
    var controller = require('../controllers/notification.controller.js');

    consts.registerApi('notification:get-list', controller.list, { anyAuth: true });
    consts.registerApi('notification:no-repeat', controller.markNoRepeat, { anyAuth: true });
    consts.registerApi('notification:mark-as-read', controller.markReadList, { anyAuth: true });
};
