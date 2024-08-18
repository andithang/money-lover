const Wallet = require('../models/wallet');
const validator = require('validator');
const async = require('async');
const fs = require('fs');
const utils = require(__libs_path + '/utils');

const listWallets = (req, returnData, callback) => {
    let { search, isDelete } = req.params;
    let user = req.user;

    const query = {
        $or: [
            {
                user: user._id
            },
            {
                isDefault: 1
            }
        ]
    };
    if (!validator.isNull(isDelete)) {
        query['isDelete'] = isDelete;
    }
    else query['isDelete'] = false;

    Wallet
        .find()
        .where(query)
        .populate({
            path: "walletType",
            populate: {
                path: "icon"
            }
        })
        .exec((err, results) => {
            if (err) return callback(err);
            returnData.set(results);
            callback();
        })
}

const getWallet = (req, returnData, callback) => {
    let id = req.params.id;

    Wallet
        .findOne({ _id: id })
        .populate("walletType")
        .exec((err, data) => {
            if (err) return callback(err);
            if (!data) return callback('ERROR_WALLET_NOT_FOUND');
            returnData.set(data);
            callback();
        })
}

const addWallet = (req, returnData, callback) => {
    let { amount, walletType, includeInTotal, isDefault } = req.params;
    const user = req.user;

    if (validator.isNull(walletType)) {
        return callback('ERROR_WALLETTYPE_MISSING');
    }
    if (validator.isNull(isDefault)) {
        isDefault = 1;
    }
    else isDefault = 0;

    async.series([
        function (cb) {
            Wallet
                .findOne()
                .where({ walletType: walletType, isDelete: false, user: user._id })
                .exec((err, data) => {
                    if (err) {
                        cb(err);
                    }
                    if (data) {
                        cb('ERROR_WALLET_EXIST');
                    }
                    else cb();
                })
        },
        function (cb) {
            let newWallet = new Wallet({
                amount,
                walletType,
                user: user._id,
                includeInTotal,
                isDefault,
                dateCreated: new Date()
            })
            newWallet.save((err, result) => {
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

const updateWallet = (req, returnData, callback) => {
    let { walletType, includeInTotal, _id, amount } = req.params;

    if (validator.isNull(walletType)) {
        return callback('ERROR_WALLETTYPE_MISSING');
    }

    Wallet
        .findOne()
        .where({ _id })
        .exec((err, result) => {
            if (err) {
                return callback(err);
            }
            if (!result && result._id.toString() != _id) {
                return callback('ERROR_WALLET_NOT_FOUND');
            }
            else {
                utils.merge(result, { walletType, includeInTotal, amount });
                result.save(function (error, data) {
                    if (error) return callback(error);
                    returnData.set(data);
                    callback();
                });
            }
        })
}

const deleteWallet = (req, returnData, callback) => {
    let { ids } = req.params;

    if (validator.isNull(ids) || !Array.isArray(ids)) {
        return callback('ERROR_IDs_MISSING');
    }

    Wallet
        .updateMany({
            _id: {
                $in: ids
            }
        }, {
            $set: {
                isDelete: true
            }
        }, (err, data) => {
            if (err) return callback(err);
            callback();
        })
}

exports.deleteWallet = deleteWallet;
exports.listWallets = listWallets;
exports.addWallet = addWallet;
exports.getWallet = getWallet;
exports.updateWallet = updateWallet;