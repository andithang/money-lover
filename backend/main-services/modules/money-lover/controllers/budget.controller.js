const Budget = require('../models/budget');
const validator = require('validator');
const async = require('async');
const fs = require('fs');

const listBudgets = (req, returnData, callback) => {
    const { search, isDelete } = req.params;

    const query = {
        $or: [{
            name: new RegExp(search, 'i')
        }, {
            code: new RegExp(search, 'i')
        }]
    };
    if (!validator.isNull(isDelete)) {
        query['isDelete'] = isDelete;
    }

    Budget
        .find()
        .where(query)
        .exec((err, results) => {
            if (err) return callback(err);
            returnData.set(results);
            callback();
        })
}

const getBudget = (req, returnData, callback) => {
    let id = req.params.id;

    Budget
        .findOne({ _id: id })
        .exec((err, data) => {
            if (err) return callback(err);
            if (!data) return callback('ERROR_BUDGET_NOT_FOUND');
            returnData.set(data);
            callback();
        })
}

const addBudget = (req, returnData, callback) => {
    const { name, icon } = req.params;
    const creator = req.user;

    if (validator.isNull(name)) {
        return callback('ERROR_CODE_MISSING');
    }
    if (validator.isNull(icon)) {
        return callback('ERROR_PATH_MISSING');
    }

    async.series([
        function (cb) {
            Budget
                .findOne()
                .where({ name: name, icon: icon, isDelete: false })
                .exec((err, data) => {
                    if (err) {
                        cb(err);
                    }
                    if (data) {
                        cb('ERROR_BUDGET_EXIST');
                    }
                    else cb();
                })
        },
        function (cb) {
            let newBudget = new Budget({
                name,
                icon,
                creator: creator._id,
                dateCreated: new Date()
            })
            newBudget.save((err, result) => {
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

const updateBudget = (req, returnData, callback) => {
    let { name, icon, _id } = req.params;

    if (validator.isNull(name)) {
        return callback('ERROR_CODE_MISSING');
    }
    if (validator.isNull(icon)) {
        return callback('ERROR_PATH_MISSING');
    }
    if (!validator.isMongoId(id)) {
        return callback('ERROR_ID_MISSING');
    }

    Budget
        .findOne()
        .where({ _id })
        .exec((err, result) => {
            if (err) {
                return callback(err);
            }
            if (!result && result._id.toString() != _id) {
                return callback('ERROR_BUDGET_NOT_FOUND');
            }
            else {
                utils.merge(result, { name, icon });
                result.save(function (error, data) {
                    if (error) return callback(error);
                    returnData.set(data);
                    callback();
                });
            }
        })
}

const deleteBudget = (req, returnData, callback) => {
    let { id } = req.params;

    if (validator.isNull(id)) {
        return callback('ERROR_ID_MISSING');
    }

    Budget
        .update({
            _id: id
        }, {
            $set: {
                isDelete: true
            }
        }, (err, data) => {
            if (err) return callback(err);
            callback();
        })
}

exports.deleteBudget = deleteBudget;
exports.listBudgets = listBudgets;
exports.addBudget = addBudget;
exports.getBudget = getBudget;
exports.updateBudget = updateBudget;