const Module = require('../models/module');
const validator = require('validator');
const async = require('async');
const consts = require('../../../../config/consts');
const { merge } = require('../../../../libs/utils');
const ModuleAction = require('../models/module-action');
const Permission = require('../models/permission');
const { translate } = require('../../../../libs/translate');

const listModules = (req, returnData, callback) => {
    const { search, status, page, size, is_delete } = req.params;

    const query = {
        $or: [{
            title: new RegExp(search, 'i')
        }, {
            code: new RegExp(search, 'i')
        }]
    };
    if (!validator.isNull(status)) {
        query['status'] = status;
    }
    if (validator.isNull(page)) {
        page = 0;
    }
    if (validator.isNull(size)) {
        size = consts.page_size;
    }
    if (validator.isNull(is_delete)) {
        query['is_delete'] = false;
    } else {
        query['is_delete'] = is_delete;
    }

    Module
        .find()
        .where(query)
        .sort({dateCreated: -1})
        .skip(page*size)
        .limit(size)
        .exec((err, results) => {
            if (err) return callback(err);
            // calculate count
            Module.aggregate([{
                $match: query
            }, {
                $count: "total"
            }])
            .exec((errCount, result) => {
                if(errCount){
                    return callback(errCount);
                }
                returnData.set({results, total: result[0] ? result[0].total: 0});
                callback();
            })
        })
}

const getModule = (req, returnData, callback) => {
    let id = req.params.id;

    Module
        .findOne({ _id: id })
        .exec((err, data) => {
            if (err) return callback(err);
            if (!data) return callback(consts.ERRORS.ERROR_MODULE_NOT_FOUND);
            returnData.set(data);
            callback();
        })
}

const addModule = (req, returnData, callback) => {
    const { title, description, code } = req.params;
    const creator = req.user;

    if (validator.isNull(title)) {
        return callback(consts.ERRORS.ERROR_TITLE_MISSING);
    }
    if (validator.isNull(code)) {
        return callback(consts.ERRORS.ERROR_CODE_MISSING);
    }

    async.series([
        function (cb) {
            Module
                .findOne()
                .where({ code, is_delete: false })
                .exec((err, data) => {
                    if (err) {
                        cb(err);
                    }
                    if (data) {
                        cb(consts.ERRORS.ERROR_MODULE_EXIST);
                    }
                    else cb();
                })
        },
        function (cb) {
            let newModule = new Module({
                title,
                description,
                code,
                creator: creator._id,
                status: 1
            })
            newModule.save((err, result) => {
                if (err) cb(err);
                else {
                    cb(null, result);
                }
            })
        }
    ], (err, data) => {
        if (err) return callback(err);
        returnData.set(data);
        callback();
    })

}

const updateModule = (req, returnData, callback) => {
    let { title, description, _id, status, code } = req.params;

    if (validator.isNull(title)) {
        return callback(consts.ERRORS.ERROR_TITLE_MISSING);
    }
    if (validator.isNull(code)) {
        return callback(consts.ERRORS.ERROR_CODE_MISSING);
    }
    if (!validator.isMongoId(_id)) {
        return callback(consts.ERRORS.ERROR_ID_MISSING);
    }

    Module.findOne({code}).exec((errFind, existCode) => {
        if(errFind) callback(errFind);
        else {
            if(existCode && existCode._id.toString() != _id) callback(consts.ERRORS.ERROR_MODULE_EXIST);
            else {            
                Module
                    .findOne()
                    .where({ _id })
                    .exec((err, result) => {
                        if (err) {
                            return callback(err);
                        }
                        if (!result) {
                            return callback(consts.ERRORS.ERROR_MODULE_NOT_FOUND);
                        }
                        else {
                            merge(result, { title, description, code, status: status ? 1: 0 });
                            result.save(function (error, data) {
                                if (error) return callback(error);
                                returnData.set(data);
                                callback();
                            });
                        }
                    })
            }
        }
    })

}

const deleteModule = (req, returnData, callback) => {
    let { ids } = req.params;
    if (validator.isNull(ids)) {
        return callback(consts.ERRORS.ERROR_IDS_MISSING);
    }
    if(!Array.isArray(ids)){
        return callback(consts.ERRORS.ERROR_IDS_NOT_ARRAY)
    }
    checkDelete(ids).then(() => {
        Module
        .updateMany({
            _id: {
                $in: ids
            }
        }, {
            $set: {
                is_delete: true,
                dateDeleted: new Date(),
                status: 0
            }
        }, (err, data) => {
            if (err) return callback(err);
            returnData.set(data)
            callback();
        })
    }).catch(err => callback(err));
}

const checkDelete = (ids) => {
    if (validator.isNull(ids)) {
        return callback(consts.ERRORS.ERROR_IDS_MISSING);
    }
    if(!Array.isArray(ids)){
        return callback(consts.ERRORS.ERROR_IDS_NOT_ARRAY)
    }
    return new Promise((resolve, reject) => {
        async.waterfall([
            cb => {
                ModuleAction.find({module: {$in : ids}}).exec((errFindModule, moduleActions) => {
                    if(errFindModule) cb(errFindModule);
                    else cb(null, moduleActions);
                })
            },
            (moduleActions, cb) => {
                if(moduleActions && moduleActions.length){
                    let moduleActionIds = moduleActions.map(ma => ma._id);
                    Permission.find({
                        moduleAction: {
                            $elemMatch: { $in: moduleActionIds }
                        }, 
                        is_delete: false
                    }).exec((errFindPermission, permissions) => {
                        if(errFindPermission) cb(errFindPermission);
                        else {
                            const attachedModuleIds = ids.filter(id => moduleActions.find(ma => ma.module == id));
                            Module.find({_id: {$in: attachedModuleIds}}).exec((errFindModule, modules) => {
                                if(errFindModule) cb(errFindModule);
                                else {
                                    cb({moduleNames: modules.map(m => m.title), permissionNames: permissions.map(p => p.title)});
                                }
                            })
                        }
                    })
                } else {
                    cb();
                }
            }
        ], (err, _) => {
            if(err) {
                if(err.moduleNames && err.permissionNames){
                    const {moduleNames, permissionNames} = err;
                    reject(translate('module.delete-module-permission-attached', process.env.SYSTEM_LANG, {
                        moduleNames: moduleNames.join(', '),
                        permissionNames: permissionNames.join(', ')
                    }));
                } else reject(err);
            } else {
                resolve();
            }
        })
    })
}

const changeStatusModule = (req, returnData, callback) => {
    let { ids, status } = req.params;
    if (validator.isNull(ids)) {
        return callback(consts.ERRORS.ERROR_IDS_MISSING);
    }
    if(!Array.isArray(ids)){
        return callback(consts.ERRORS.ERROR_IDS_NOT_ARRAY)
    }
    if(status !== 0 && status !== 1){
        return callback(consts.ERRORS.ERROR_STATUS_INVALID)
    }

    Module
    .updateMany({
        _id: {
            $in: ids
        }
    }, {
        $set: {
            status,
            dateUpdated: new Date()
        }
    }, (err, data) => {
        if (err) return callback(err);
        returnData.set({...data})
        callback();
    })
}

const getModulesByIds = (req, returnData, callback) => {
    const { ids } = req.params;
    if(ids.find(id => !validator.isMongoId(id)) || !Array.isArray(ids)){
        return callback(consts.ERRORS.ERROR_IDS_NOT_ARRAY);
    }
    Module.find({
        _id: { $in: ids }
    }).exec((err, data) => {
        if(err) return callback(err);
        returnData.set({results: data});
        callback();
    })
}

exports.deleteModule = deleteModule;
exports.listModules = listModules;
exports.addModule = addModule;
exports.getModule = getModule;
exports.updateModule = updateModule;
exports.changeStatusModule = changeStatusModule;
exports.getModulesByIds = getModulesByIds;