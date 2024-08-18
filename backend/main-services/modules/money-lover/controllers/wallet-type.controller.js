const WalletType = require('../models/wallet-type');
const validator = require('validator');
const async = require('async');
const fs = require('fs');
const consts = require('../../../../config/consts');
const utils = require(__libs_path + '/utils'),
mongoose = require('mongoose'),
ObjectId = mongoose.Types.ObjectId;

const listWalletTypes = (req, returnData, callback) => {
    let { search, isDelete, page, size } = req.params;

    const query = {
        $or: [{
            name: new RegExp(search, 'i')
        }]
    };
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

    WalletType
        .find()
        .where(query)
        .populate('icon')
        .sort({dateCreated: -1})
        .skip(page*size)
        .limit(size)
        .exec((err, results) => {
            if (err) return callback(err);
            // calculate count
            WalletType.aggregate([{
                $match: query
            }, {
                $count: "total"
            }])
            .exec((errCount, result) => {
                if(errCount){
                    winstonLogger.error(`Error searching wallet types when arregate total: ${errCount ? JSON.stringify(errCount) : 'result with total empty'}`)
                    return callback(errCount);
                }
                returnData.set({results, total: result[0] ? result[0].total: 0});
                callback();
            })
        })
}

const getWalletType = (req, returnData, callback) => {
    let id = req.params.id;

    WalletType
        .findOne({ _id: id })
        .exec((err, data) => {
            if (err) return callback(err);
            if (!data) return callback('ERROR_WALLETTYPE_NOT_FOUND');
            returnData.set(data);
            callback();
        })
}

const addWalletType = (req, returnData, callback) => {
    let { name, icon, isDefault } = req.params;
    const creator = req.user;

    if (validator.isNull(name)) {
        return callback('ERROR_CODE_MISSING');
    }
    if (validator.isNull(icon)) {
        return callback('ERROR_PATH_MISSING');
    }
    if (validator.isNull(isDefault)) {
        isDefault = 1;
    }
    else isDefault = 0;

    async.series([
        function (cb) {
            WalletType
                .findOne()
                .where({ name: name, icon: icon, isDelete: false })
                .exec((err, data) => {
                    if (err) {
                        cb(err);
                    }
                    if (data) {
                        cb('ERROR_WALLETTYPE_EXIST');
                    }
                    else cb();
                })
        },
        function (cb) {
            let newWalletType = new WalletType({
                name,
                icon,
                creator: creator._id,
                dateCreated: new Date()
            })
            newWalletType.save((err, result) => {
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

const updateWalletType = (req, returnData, callback) => {
    let { name, icon, id } = req.params;

    if (validator.isNull(name)) {
        return callback('ERROR_CODE_MISSING');
    }
    if (validator.isNull(icon)) {
        return callback('ERROR_PATH_MISSING');
    }
    if (!validator.isMongoId(id)) {
        return callback('ERROR_ID_MISSING');
    }

    WalletType
        .findOne()
        .where({ _id: id })
        .exec((err, result) => {
            if (err) {
                return callback(err);
            }
            if (!result && result._id.toString() != id) {
                return callback('ERROR_WALLETTYPE_NOT_FOUND');
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

const deleteWalletType = (req, returnData, callback) => {
    let { ids} = req.params;

    if (validator.isNull(ids)) {
        return callback('ERROR_ID_MISSING');
    }

    WalletType
        .update({
            _id: {$in: ids.map(id => ObjectId(id))}
        }, {
            $set: {
                isDelete: true
            }
        }, (err, data) => {
            if (err) return callback(err);
            callback();
        })
}

const getWalletTypesByIds = (req, returnData, callback) => {
    const { ids } = req.params;
    if(ids.find(id => !validator.isMongoId(id)) || !Array.isArray(ids)){
        return callback(consts.ERRORS.ERROR_IDS_NOT_ARRAY);
    }
    WalletType.find({
        _id: { $in: ids }
    }).exec((err, data) => {
        if(err) return callback(err);
        returnData.set({results: data});
        callback();
    })
}

exports.deleteWalletType = deleteWalletType;
exports.listWalletTypes = listWalletTypes;
exports.addWalletType = addWalletType;
exports.getWalletType = getWalletType;
exports.updateWalletType = updateWalletType;
exports.getWalletTypesByIds = getWalletTypesByIds;