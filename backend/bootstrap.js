const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports = function (app) {
    let routeRegisters = [];

    let loadModules = (pack) => {
        // lấy danh sách router
        let files = fs.readdirSync(_modules_path + '/' + pack + '/routes');
        for (let i = 0; i < files.length; i++) {
            var routeFile = files[i];
            if (~routeFile.indexOf('.js')) {
                var routePath = _modules_path + '/' + pack + '/routes/' + routeFile;
                if (routeRegisters.indexOf(routePath) === -1) {
                    routeRegisters.push(routePath);
                }
            }
        }
    }

    // config middleware authentication
    app.use(require(__config_path + '/authorization').checkToken);
    // detect environment
    let mode = 'prod';
    if (process.argv.length > 2) {
        mode = process.argv[2];
    }
    mode = process.env.NODE_ENV || mode;
    if(mode == 'prod') {
        
    }
    else require('./config/authorization').mappingRoleActions();
    
    // config routes
    require('./routes')(app);

    var listModules = fs.readdirSync(_modules_path);
    for (let i = 0; i < listModules.length; i++) {
        loadModules(listModules[i]);
    }
    routeRegisters.forEach((route, i) => {
        console.info(chalk.green('Load route ' + path.basename(routeRegisters[i])));
        require(route)();
    });
    
}