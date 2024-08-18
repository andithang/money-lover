'use strict';

var consts = require(__config_path + '/consts');

module.exports = function () {
    // Root routing
    var controller = require('../controllers/report.controller.js');

    consts.registerApi('report:average-month', controller.getAveragePerMonth, { anyAuth: true });
    consts.registerApi('report:overall', controller.getOverallEveryMonth, { anyAuth: true });
};
