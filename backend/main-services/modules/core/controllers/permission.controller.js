const Permission = require('../models/permission');
const ModuleAction = require('../models/module-action');
const User = require('../models/user');
const validator = require('validator');
const async = require('async');
const consts = require('../../../../config/consts');
const { merge } = require('../../../../libs/utils');
const { useMongooseTransaction } = require('../../../../libs/mongoose-transaction');

const listPermissions = (req, returnData, callback) => {
    let { search, status, page, size, is_delete, role, module: moduleId, action } = req.params;

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
    if (!validator.isNull(role)) {
        query['role'] = role;
    }
    
    let queryModuleAction = {};
    if(validator.isMongoId(moduleId)){
        queryModuleAction['module'] = moduleId;
    }
    if(validator.isMongoId(action)){
        queryModuleAction['actions'] = {
            $elemMatch: {
                $eq: action
            }
        };
    }
    ModuleAction
        .find()
        .where(queryModuleAction)
        .exec((errMa, moduleActions) => {
            if(errMa) cb(errMa);
            if(moduleActions.length){
                query['moduleAction'] = {
                    $elemMatch: {
                        $in: moduleActions.map(ma => ma._id.toString())
                    }
                }
                Permission
                    .find()
                    .where(query)
                    .sort({dateCreated: -1})
                    .skip(page*size)
                    .limit(size)
                    .populate('role')
                    // .populate({
                    //     path: 'moduleAction',
                    //     populate: [
                    //         {
                    //             path: "module"
                    //         },
                    //         {
                    //             path: "actions"
                    //         }
                    //     ]
                    // })
                    .exec((errPermission, resultPermission) => {
                        if(errPermission) return callback(errPermission);
                        Permission.aggregate([{
                            $match: query
                        }, {
                            $count: "total"
                        }])
                        .exec((errCount, result) => {
                            if(errCount){
                                return callback(errCount);
                            }
                            returnData.set({results: resultPermission, total: result[0] ? result[0].total: 0});
                            callback();
                        })
                    })
            } else {
                returnData.set({results: [], total: 0});
                callback();
            }
        })
        
        
}

const getPermission = (req, returnData, callback) => {
    let id = req.params.id;

    Permission
        .findOne({ _id: id })
        .populate('role')
        .populate({
            path: 'moduleAction',
            populate: [
                {
                    path: "module"
                },
                {
                    path: "actions"
                }
            ]
        })
        .exec((err, data) => {
            if (err) return callback(err);
            if (!data) return callback(consts.ERRORS.ERROR_PERMISSION_NOT_FOUND);
            returnData.set(data);
            callback();
        })
}

const getActionsForModuleAction = (req, returnData, callback) => {
    let { _id, page, size } = req.params;
    if(!validator.isMongoId(_id)){
        return callback(consts.ERRORS.ERROR_ID_MISSING);
    }
    if(isNaN(page)){
        page = 0;
    }
    if(isNaN(size)){
        size = consts.page_size;
    }
    ModuleAction.findOne({ _id }, { actions: { $slice: [page*size, (page+1)*size] } }).populate('actions').exec((err, data) => {
        if(err) return callback(err);
        ModuleAction.findOne({ _id }).exec((errFind, ma) => {
            if(errFind) return callback(errFind);
            returnData.set({results: data.actions, total: ma.actions.length});
            callback();
        })
    })
}

const getModuleActionsForPermission = (req, returnData, callback) => {
    const { _id, page, size } = req.params;
    if(!validator.isMongoId(_id)){
        return callback(consts.ERRORS.ERROR_ID_MISSING);
    }
    if(isNaN(page) || isNaN(size)){
        return callback(consts.ERRORS.ERROR_NOT_A_NUMBER);
    }
    Permission.findOne({ _id }, { moduleAction: { $slice: [page*size, (page+1)*size] } })
        .populate({ 
            path: 'moduleAction',
            populate: [{
                path: "module"
            },
            {
                path: "actions"
            }]
         }).exec((err, data) => {
            if(err) return callback(err);
            Permission.findOne({ _id }).exec((errFind, pms) => {
                if(errFind) return callback(errFind);
                returnData.set({results: data.moduleAction, total: pms.moduleAction.length});
                callback();
            })
        })
}

const addPermission = (req, returnData, callback) => {
    const { title, description, code, role, allow, moduleAction } = req.params;
    const creator = req.user;

    if (validator.isNull(title)) {
        return callback(consts.ERRORS.ERROR_TITLE_MISSING);
    }
    if (validator.isNull(code)) {
        return callback(consts.ERRORS.ERROR_CODE_MISSING);
    }
    if (!validator.isMongoId(role)) {
        return callback(consts.ERRORS.ERROR_PERMISSION_ROLE_MISSING);
    }
    if (!validator.isBoolean(allow)) {
        return callback(consts.ERRORS.ERROR_PERMISSION_ALLOW_MISSING);
    }
    if (validator.isNull(moduleAction) || !Array.isArray(moduleAction)) {
        return callback(consts.ERRORS.ERROR_PERMISSION_MODULE_ACTION_MISSING);
    }

    async.series([
        function (cb) {
            Permission
                .findOne()
                .where({ code, is_delete: false })
                .exec((err, data) => {
                    if (err) {
                        cb(err);
                    }
                    if (data) {
                        cb(consts.ERRORS.ERROR_PERMISSION_EXIST);
                    }
                    else cb();
                })
        },
        function (cb) {
            let newModuleActions = moduleAction.map(ma => {
                let newModuleAction = new ModuleAction({
                    module: ma.module,
                    actions: ma.actions,
                    dateCreated: new Date(),
                    userCreated: creator._id
                })
                return newModuleAction;
            })
            ModuleAction.insertMany(newModuleActions, (err, result) => {
                if (err) cb(err);
                else {
                    cb(null, result); // [{moduleAction}]
                }
            })
        }
    ], (err, data) => {
        if (err) return callback(err);
        let newPermission = new Permission({
            title,
            description,
            code,
            creator: creator._id,
            role,
            allow,
            status: 1,
            moduleAction: data[1].map(ma => ma._id)
        })
        newPermission.save((err, result) => {
            if (err) cb(err);
            else {
                returnData.set(result);
                callback();
            }
        })
        
    })

}

const updatePermission = (req, returnData, callback) => {
    let { title, description, _id, status, code, role, moduleAction, allow } = req.params;
    const creator = req.user;

    if (validator.isNull(title)) {
        return callback(consts.ERRORS.ERROR_TITLE_MISSING);
    }
    if (validator.isNull(code)) {
        return callback(consts.ERRORS.ERROR_CODE_MISSING);
    }
    if (!validator.isMongoId(_id)) {
        return callback(consts.ERRORS.ERROR_ID_MISSING);
    }
    if (!validator.isMongoId(role)) {
        return callback(consts.ERRORS.ERROR_PERMISSION_ROLE_MISSING);
    }
    if (!validator.isBoolean(allow)) {
        return callback(consts.ERRORS.ERROR_PERMISSION_ALLOW_MISSING);
    }
    if (validator.isNull(moduleAction) || !Array.isArray(moduleAction)) {
        return callback(consts.ERRORS.ERROR_PERMISSION_MODULE_ACTION_MISSING);
    }

    Permission.findOne({code}).exec((errFind, existCode) => {
        if(errFind) callback(errFind);
        else {
            if(existCode && existCode._id.toString() != _id) callback(consts.ERRORS.ERROR_PERMISSION_EXIST);
            else {                
                Permission
                    .findOne()
                    .where({ _id })
                    .exec((err, permission) => {
                        if (err) {
                            return callback(err);
                        }
                        if (!permission) {
                            return callback(consts.ERRORS.ERROR_PERMISSION_NOT_FOUND);
                        }
                        else {
                            useMongooseTransaction(async (session) => {
                                // delete old module-actions
                                await ModuleAction.deleteMany({ _id: { $in: permission.moduleAction } }, { session });
                                // throw new Error('test')
                                // create new module-actions
                                let newModuleActions = moduleAction.map(ma => {
                                    let newModuleAction = new ModuleAction({
                                        module: ma.module,
                                        actions: ma.actions,
                                        dateCreated: new Date(),
                                        userCreated: creator._id
                                    })
                                    return newModuleAction;
                                })
                                const savedNewModuleActions = await ModuleAction.insertMany(newModuleActions, { session });
                                // update original permission
                                merge(permission, { title, description, code, role, status: status ? 1: 0, moduleAction: savedNewModuleActions.map(ma => ma._id) });
                                const data = await permission.save({ session });
                                returnData.set(data);
                                callback();
                            }, err => {
                                return callback(err);
                            })
                        }
                    })
            }
        }
    })

}

const deletePermission = (req, returnData, callback) => {
    let { ids } = req.params;
    if (validator.isNull(ids)) {
        return callback(consts.ERRORS.ERROR_IDS_MISSING);
    }
    if(!Array.isArray(ids)){
        return callback(consts.ERRORS.ERROR_IDS_NOT_ARRAY)
    }

    Permission
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
}

const changeStatusPermission = (req, returnData, callback) => {
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

    Permission
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

const getActionsOnModule = (req, returnData, callback) => {
    const { path } = req.params;
    const { _id: userId } = req.user;
    User.findOne({_id: userId}).exec((errUser, userData) => {
        if(errUser) return callback(consts.ERRORS.ERROR_FIND_USER);
        // DENY >>>>>> ALLOW
        if(userData.role && validator.isMongoId(userData.role)){
            // get list permission assigned to current role
            Permission.find({ role: userData.role })
                .populate({ 
                    path: 'moduleAction',
                    populate: [{
                        path: "module",
                        match: {
                            code: path
                        }
                    },
                    {
                        path: "actions"
                    }]
                })
                .exec((errPermission, foundPermission) => {
                    if(errPermission) return callback(errPermission);
                    // check if user is granted to enter this module
                    // filter only the module action that assigned to the asking module
                    const allowPermissions = foundPermission.filter(per => per.allow); 
                    const deniedPermissions = foundPermission.filter(per => !per.allow);
                    let allowActions = [], deniedActions = [];
                    allowPermissions.forEach(permission => {
                        permission.moduleAction.forEach(ma => {
                            if(ma.module && ma.module.code == path){
                                allowActions.push(...ma.actions);
                            }
                        })
                    })
                    deniedPermissions.forEach(permission => {
                        permission.moduleAction.forEach(ma => {
                            if(ma.module && ma.module.code == path){
                                deniedActions.push(...ma.actions);
                            }
                        })
                    })
                    // if the action was added to allowed, but appeared in denied, delete it
                    allowActions = allowActions.filter(action => !deniedActions.find(act => act._id == action._id));
            
                    returnData.set({ actions: allowActions })
                    callback();
                })
        } else {
            returnData.set({
                actions: []
            });
            return callback();
        }
    })

}

exports.deletePermission = deletePermission;
exports.listPermissions = listPermissions;
exports.addPermission = addPermission;
exports.getPermission = getPermission;
exports.updatePermission = updatePermission;
exports.changeStatusPermission = changeStatusPermission;
exports.getActionsForModuleAction = getActionsForModuleAction;
exports.getModuleActionsForPermission = getModuleActionsForPermission;
exports.getActionsOnModule = getActionsOnModule;