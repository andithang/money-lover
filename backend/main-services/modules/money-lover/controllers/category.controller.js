const Category = require('../models/category');
const validator = require('validator');
const async = require('async');
const fs = require('fs');
const utils = require(__libs_path + '/utils'),
    mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId,
    consts = require(__config_path + '/consts');

const listCategorys = (req, returnData, callback) => {
    let { search, isDelete, isDefault, page, size } = req.params;
    const user = req.user;

    let query = {};
    if (!validator.isNull(isDelete)) {
        query['isDelete'] = isDelete;
    }
    else query['isDelete'] = false;
    if (validator.isNull(page)) {
        page = 0;
    }
    if (validator.isNull(size)) {
        size = consts.page_size;
    }
    // query only default categories for ADMIN role
    if (validator.isNull(isDefault) && (user.level == consts.user_roles.ADMIN || user.level == consts.user_roles.SYSTEM_USER)) {
        isDefault = 1;
        query['isDefault'] = isDefault;
        query = {
            ...query,
            $or: [{
                name: new RegExp(search, 'i')
            }]
        }
    }
    else {
        query = {
            ...query,
            $and: [{
                name: new RegExp(search, 'i')
            }, {
                $or: [
                    {
                        creator: user._id
                    },
                    {
                        isDefault: 1
                    }
                ]
            }]
        }
    }

    Category
        .find()
        .where(query)
        .skip(page*size)
        .limit(size)
        .populate('icon')
        .sort({ dateCreated: -1 })
        .exec((err, results) => {
            if (err) return callback(err);
            // calculate count
            Category.aggregate([{
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

const getCategory = (req, returnData, callback) => {
    let id = req.params.id;

    Category
        .findOne({ _id: id })
        .exec((err, data) => {
            if (err) return callback(err);
            if (!data) return callback('ERROR_CATEGORY_NOT_FOUND');
            returnData.set(data);
            callback();
        })
}

const addCategory = (req, returnData, callback) => {
    let { name, icon, isDefault, transactionType, api_name } = req.params;
    const creator = req.user;

    if (validator.isNull(name)) {
        return callback('ERROR_CODE_MISSING');
    }
    if (validator.isNull(icon)) {
        return callback('ERROR_PATH_MISSING');
    }
    if (api_name == 'category:create-admin') {
        isDefault = 1;
    }
    else isDefault = 0;
    if (validator.isNull(transactionType)) {
        return callback('ERROR_TYPE_MISSING');
    }

    async.series([
        function (cb) {
            Category
                .findOne()
                .where({ name: name, icon: icon, isDelete: false })
                .exec((err, data) => {
                    if (err) {
                        cb(err);
                    }
                    if (data) {
                        cb('ERROR_CATEGORY_EXIST');
                    }
                    else cb();
                })
        },
        function (cb) {
            let newCategory = new Category({
                name,
                icon,
                transactionType,
                isDefault,
                creator: creator._id,
                dateCreated: new Date()
            })
            newCategory.save((err, result) => {
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

const updateCategory = (req, returnData, callback) => {
    let { name, icon, id, transactionType, api_name } = req.params;

    if (validator.isNull(name)) {
        return callback('ERROR_CODE_MISSING');
    }
    if (validator.isNull(icon)) {
        return callback('ERROR_PATH_MISSING');
    }
    if (!validator.isMongoId(id)) {
        return callback('ERROR_ID_MISSING');
    }
    if (validator.isNull(transactionType)) {
        return callback('ERROR_TYPE_MISSING');
    }

    Category
        .findOne()
        .where({ _id: id })
        .exec((err, result) => {
            if (err) {
                return callback(err);
            }
            if (!result && result._id.toString() != id) {
                return callback('ERROR_CATEGORY_NOT_FOUND');
            }
            else {
                if(api_name != 'category:update-admin' && result.isDefault) return callback(consts.ERRORS.UNAUTHORIZED);
                utils.merge(result, { name, icon, transactionType });
                result.save(function (error, data) {
                    if (error) return callback(error);
                    returnData.set(data);
                    callback();
                });
            }
        })
}

const deleteCategory = (req, returnData, callback) => {
    let { ids, api_name } = req.params;

    if (validator.isNull(ids)) {
        return callback('ERROR_ID_MISSING');
    }
    Category
    .findOne()
    .where({ _id: id })
    .exec((errGet, result) => {
        if(errGet) return callback(errGet)
        if(api_name != 'category:delete-admin' && result.isDefault) return callback(consts.ERRORS.UNAUTHORIZED);
        Category
            .update({
                _id: { $in: ids.map(id => ObjectId(id)) }
            }, {
                $set: {
                    isDelete: true
                }
            }, (err, data) => {
                if (err) return callback(err);
                callback();
            })
    })
}

exports.deleteCategory = deleteCategory;
exports.listCategorys = listCategorys;
exports.addCategory = addCategory;
exports.getCategory = getCategory;
exports.updateCategory = updateCategory;