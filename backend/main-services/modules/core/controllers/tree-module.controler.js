const Module = require('../models/module');
const TreeModule = require('../models/tree-module');
const validator = require('validator');
const async = require('async');
const consts = require('../../../../config/consts');
const { merge } = require('../../../../libs/utils');
const winstonLogger = require('../../../../libs/winston');
const { useMongooseTransaction } = require('../../../../libs/mongoose-transaction');

const getTree = (req, returnData, cb) => {
    const { _id: userId } = req.user;
    if(validator.isNull(userId)) {
        return callback(consts.ERRORS.ERROR_USER_NOT_FOUND);
    }    
    // find highest level
    TreeModule.find({}).sort({ level: -1 }).limit(1).exec((err, highestLevelNode) => {
        if(err || !highestLevelNode[0]) return cb(consts.ERRORS.ERROR_FIND_MAX_LEVEL);
        // perform populate until reach that highest level
        const populateQuery = [], highestLevel = highestLevelNode[0].level; 
        let currPointer = populateQuery;
        for (let lv = 0; lv <= highestLevel; lv++) {
            currPointer.push({ path: 'module' }, { path: 'children' });
            if (lv != highestLevel) {
                let newPointer = [];
                currPointer[1]['populate'] = newPointer;
                currPointer = newPointer;
            }
        }
        TreeModule
            .find({ level: 0 })
            .populate(populateQuery)
            .exec((errFindAll, dataAll) => {
                if(errFindAll) return cb(errFindAll);
                returnData.set(dataAll);
                cb();
            })
    });
}

const validateDataFlatten = (dataFlatten) => {
    // level 0 exist?

    // are there any children with ids that are not in the list?
    return true;
}

/** Save the flat nodes, but with their children */
const updateTree = (req, returnData, cb) => {
    const { dataFlatten } = req.params;
    const user = req.user;
    if(validateDataFlatten(dataFlatten)) {
        useMongooseTransaction(async session => {
            // delete old tree-modules
            await TreeModule.deleteMany({}, { session });
            // create new ones
            // find the highest level (greatest level prop)
            let highestLevel = 0, nodeLevelMap = new Map();
            dataFlatten.forEach(node => {
                // group by levels
                // with children, only keep the _id (from the req) for faster check when inserting and look back
                if(nodeLevelMap.has(node.level)) nodeLevelMap.set(node.level, [...nodeLevelMap.get(node.level), {...node, children: node.children.map(c => c._id)}]);
                else nodeLevelMap.set(node.level, [{...node, children: node.children.map(c => c._id)}]);
                if(node.level > highestLevel) highestLevel = node.level;
            });
            // insert each group of level from maximum to 0
            const insertEachGroupLevel = async (level) => {
                const savedTreeModules = nodeLevelMap.get(level).map(node => {
                    let foundChildren = [];
                    if(node.level != highestLevel) {
                        foundChildren = nodeLevelMap.get(node.level + 1).filter(childNode => node.children.includes(childNode._id)).map(child => child.insertedId);
                    }
                    let treeNode = new TreeModule({
                        module: node.module._id,
                        children: foundChildren,
                        userCreated: user._id,
                        level: node.level
                    });
                    // add a field called insertedId, it the _id saved in the DB, used for the 'children' of their parents
                    node.insertedId = treeNode._id.toString();
                    return treeNode;
                });
                await TreeModule.insertMany(savedTreeModules, { session });
            }
            const levels = Array.from(nodeLevelMap.keys()), asyncLevelInsertion = [];
            levels.sort((a,b) => a > b ? -1: 1);
            levels.forEach(level => {
                asyncLevelInsertion.push(insertEachGroupLevel(level));
            })
            await Promise.all(asyncLevelInsertion);
            returnData.set({data: Array.from(nodeLevelMap.values())});
            cb();
        }, err => cb(err));
    } else cb(consts.ERRORS.ERROR_DATA_TREE_INVALID);
}

module.exports = {
    getTree,
    updateTree
}