let Schema = require('mongoose').Schema,
ObjectId = Schema.ObjectId,
systemDb = require(__db_path + '/system-db'),
consts = require(__config_path + '/consts'),
utils = require(__libs_path + '/utils');

let PermissionSchema = new Schema({
    title: {
        type: String,
        trim: true,
        required: consts.ERRORS.ERROR_TITLE_MISSING
    },
    role: {
        type: ObjectId,
        ref: "Role"
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
    description: {
        type: String,
        max: 2000,
        trim: true,
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
        required: consts.ERRORS.ERROR_CODE_MISSING
    },
    allow: {
        type: Boolean,
        default: false
    },
    moduleAction: [{
        type: ObjectId,
        ref: "ModuleAction"
    }]
})

PermissionSchema.pre('save', function(next) {
    this.dateUpdated = Date.now();
    next();
})

PermissionSchema.post('save', (doc, next) => {
    require('../../../../config/authorization').mappingRoleActions();
    next();
})

PermissionSchema.post('updateMany', (doc, next) => {
    require('../../../../config/authorization').mappingRoleActions();
    next();
})

module.exports = systemDb.model('Permission', PermissionSchema);