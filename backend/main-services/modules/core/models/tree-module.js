let Schema = require('mongoose').Schema,
ObjectId = Schema.ObjectId,
systemDb = require(__db_path + '/system-db'),
consts = require(__config_path + '/consts'),
utils = require(__libs_path + '/utils');

let TreeModuleSchema = new Schema({
    module: {
        ref: "Module",
        type: ObjectId
    },
    children: [{
        ref: "TreeModule",
        type: ObjectId
    }],
    dateCreated: {
        type: Date,
        default: Date.now
    },
    userCreated: {
        type: ObjectId,
        ref: 'User'
    },
    level: {
        type: Number,
        default: 0
    }
})

TreeModuleSchema.pre('save', function(next) {
    this.dateUpdated = Date.now();
    next();
})

module.exports = systemDb.model('TreeModule', TreeModuleSchema);