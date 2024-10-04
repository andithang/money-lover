const consts = require('../../../../config/consts');

module.exports = () => {
    const controller = require('../controllers/tree-module.controler');
    consts.registerApi('tree-modules:get-tree', controller.getTree, { systemApi: true });
    consts.registerApi('tree-modules:update-tree', controller.updateTree, { systemApi: true });
}