var mongoose = require('mongoose');

var SpaceSchema = {
    schema: {
        name: String,
        modified: Number,
        lastModified: Number,
        avatar: String,
        description: String,
        username: String,
        icon: String,
        docUrl: String,
        apiUrl: String,
        display: {}
    },
    self: {
        getAll: function (cb) {
            return this.find({name: { $type: 'string' }}, cb);
        },
        findByName: function (name, cb) {
            return this.find({ name: name }, cb);
        },
        removeSpace: function (name, cb) {
            var Setting = require('./settingModel');
            var Profile = require('./profileModel');
            Setting.removeSettings(name, function () { });
            Profile.removeProfile(name, function () { });
            this.remove({ name: name }, cb);
        },
        updateSpace: function (params, update, cb) {
            update.modified = Date.now();
            update.$currentDate = { lastModified: true};
            
            this.findOneAndUpdate({ name: params.space }, update, { upsert: true, returnNewDocument: true }, (err, updated) => cb(updated));
        }
    },
    
};
var Space = require('./createModel')(mongoose, 'Space', SpaceSchema);
module.exports = Space;
//# sourceMappingURL=/Users/erratik/Sites/datawhore/admin/api/models/spaceModel.js.map
