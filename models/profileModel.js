var mongoose = require('mongoose');
var dimensionSchema = new mongoose.Schema({
    friendlyName: String,
    schemaPath: String
});
var ProfileSchema = {
    schema: {
        space: String,
        modified: Number,
        profile: [dimensionSchema]
    },
    self: {
        findProfile: function (params, cb) {
            const query = !!params.space ? { space: params.space } : {};
            if (typeof params === 'string') {
                query.space = params.space = params;
            } 
            
            this.find(query, function (err, docs) {
                docs = docs.length ? docs[0] : [];
                cb(docs);
            });
        },
        writeProfile: function (spaceName, profileBucket, cb) {
            profileBucket.map(prop => prop.type = 'profile');
            var update = { modified: Date.now(), profile: profileBucket };
            this.findOneAndUpdate({ space: spaceName }, update, { upsert: true, returnNewDocument: true }, function (err, updated) {
                cb(updated);
            });
        },
        removeProfile: function (name, cb) {
            this.remove({ space: name }, cb);
        },
    }
};
var Profile = require('./createModel')(mongoose, 'Profile', ProfileSchema);
module.exports = Profile;
//# sourceMappingURL=/Users/erratik/Sites/datawhore/admin/api/models/profileModel.js.map
