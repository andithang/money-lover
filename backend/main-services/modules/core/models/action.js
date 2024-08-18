let Schema = require('mongoose').Schema,
ObjectId = Schema.ObjectId,
systemDb = require(__db_path + '/system-db'),
crypto = require('crypto'),
consts = require(__config_path + '/consts'),
utils = require(__libs_path + '/utils');

let ActionSchema = new Schema({
    title: {
        type: String,
        trim: true,
        required: consts.ERRORS.ERROR_ACTION_TITLE_MISSING
    },
    description: {
        type: String,
        max: 2000,
        trim: true,
    },
    dateCreated: {
        type: Date,
        default: Date.now
    },
    dateUpdated: {
        type: Date,
        default: Date.now
    },
    userCreated: {
        type: ObjectId,
        ref: 'User'
    },
    is_delete: {
        type: Boolean,
        default: false
    },
    status: {
        type: Number,
        default: 1
    },
    code: {
        type: String,
        max: 200,
        trim: true,
        required: consts.ERRORS.ERROR_ACTION_CODE_MISSING
    }
});

ActionSchema.pre('save', function(next) {
    this.dateUpdated = Date.now();
    next();
})

ActionSchema.post('save', (doc, next) => {
    require('../../../../config/authorization').mappingRoleActions();
    next();
});

ActionSchema.post('updateMany', (doc, next) => {
    require('../../../../config/authorization').mappingRoleActions();
    next();
});

module.exports = systemDb.model('Action', ActionSchema);