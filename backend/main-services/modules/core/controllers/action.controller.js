const Action = require('../models/action');
const validator = require('validator');
const async = require('async');
const consts = require('../../../../config/consts');
const { merge } = require('../../../../libs/utils');
const ModuleAction = require('../models/module-action');
const Permission = require('../models/permission');

const listActions = (req, returnData, callback) => {
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

    Action
        .find()
        .where(query)
        .sort({dateCreated: -1})
        .skip(page*size)
        .limit(size)
        .exec((err, results) => {
            if (err) return callback(err);
            // calculate count
            Action.aggregate([{
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

const getAction = (req, returnData, callback) => {
    let id = req.params.id;

    Action
        .findOne({ _id: id })
        .exec((err, data) => {
            if (err) return callback(err);
            if (!data) return callback(consts.ERRORS.ERROR_ACTION_NOT_FOUND);
            returnData.set(data);
            callback();
        })
}

const addAction = (req, returnData, callback) => {
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
            Action
                .findOne()
                .where({ code, is_delete: false })
                .exec((err, data) => {
                    if (err) {
                        cb(err);
                    }
                    if (data) {
                        cb(consts.ERRORS.ERROR_ACTION_EXIST);
                    }
                    else cb();
                })
        },
        function (cb) {
            let newAction = new Action({
                title,
                description,
                code,
                creator: creator._id,
                status: 1
            })
            newAction.save((err, result) => {
                if (err) cb(err);
                else {
                    cb(null, result);
                }
            })
        }
    ], (err, data) => {
        if (err) return callback(err);
        returnData.set(data[1]);
        callback();
    })

}

const updateAction = (req, returnData, callback) => {
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

    Action.findOne({code}).exec((errFind, existCode) => {
        if(errFind) callback(errFind);
        else {
            if(existCode && existCode._id.toString() != _id) callback(consts.ERRORS.ERROR_ACTION_EXIST);
            else {
                Action
                    .findOne()
                    .where({ _id })
                    .exec((err, result) => {
                        if (err) {
                            return callback(err);
                        }
                        if (!result) {
                            return callback(consts.ERRORS.ERROR_ACTION_NOT_FOUND);
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

const deleteAction = (req, returnData, callback) => {
    let { ids } = req.params;
    if (validator.isNull(ids)) {
        return callback(consts.ERRORS.ERROR_IDS_MISSING);
    }
    if(!Array.isArray(ids)){
        return callback(consts.ERRORS.ERROR_IDS_NOT_ARRAY)
    }
    checkDelete(ids).then(() => {
        Action
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

const checkDelete = ids => {    
    if (validator.isNull(ids)) {
        return callback(consts.ERRORS.ERROR_IDS_MISSING);
    }
    if(!Array.isArray(ids)){
        return callback(consts.ERRORS.ERROR_IDS_NOT_ARRAY)
    }
    return new Promise((resolve, reject) => {
        async.waterfall([
            cb => {
                ModuleAction.find({actions: {$elemMatch: {$in : ids}}}).exec((errFindModule, moduleActions) => {
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
                            const attachedActionIds = ids.filter(id => moduleActions.find(ma => ma.actions.includes(id)));
                            Action.find({_id: {$in: attachedActionIds}}).exec((errFindAction, actions) => {
                                if(errFindAction) cb(errFindAction);
                                else {
                                    cb({actionNames: actions.map(m => m.title), permissionNames: permissions.map(p => p.title)});
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
                if(err.actionNames && err.permissionNames){
                    const {actionNames, permissionNames} = err;
                    reject(`Các hành động '${actionNames.join(',')}' không thể xóa do đang được sử dụng bởi các quyền sau: ${permissionNames.join(',')}`);
                } else reject(err);
            } else {
                resolve();
            }
        })
    })
}

const changeStatusAction = (req, returnData, callback) => {
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

    Action
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

const getActionsByIds = (req, returnData, callback) => {
    const { ids } = req.params;
    if(ids.find(id => !validator.isMongoId(id)) || !Array.isArray(ids)){
        return callback(consts.ERRORS.ERROR_IDS_NOT_ARRAY);
    }
    Action.find({
        _id: { $in: ids }
    }).exec((err, data) => {
        if(err) return callback(err);
        returnData.set({results: data});
        callback();
    })
}

exports.deleteAction = deleteAction;
exports.listActions = listActions;
exports.addAction = addAction;
exports.getAction = getAction;
exports.updateAction = updateAction;
exports.changeStatusAction = changeStatusAction;
exports.getActionsByIds = getActionsByIds;