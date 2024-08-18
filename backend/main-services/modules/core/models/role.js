let Schema = require('mongoose').Schema,
ObjectId = Schema.ObjectId,
systemDb = require(__db_path + '/system-db'),
consts = require(__config_path + '/consts');

let RoleSchema = new Schema({
    title: {
        type: String,
        trim: true,
        required: consts.ERRORS.ERROR_ROLE_TITLE_MISSING
    },
    description: {
        type: String,
        trim: true,
        max: 2000,
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
        required: consts.ERRORS.ERROR_ROLE_CODE_MISSING
    }
});

RoleSchema.pre('save', function(next) {
    this.dateUpdated = Date.now();
    next();
})

RoleSchema.post('save', (doc, next) => {
    require('../../../../config/authorization').mappingRoleActions();
    next();
});

RoleSchema.post('updateMany', (doc, next) => {
    require('../../../../config/authorization').mappingRoleActions();
    next();
});

module.exports = systemDb.model('Role', RoleSchema);