var mongoose = require('mongoose');
var Space = require('./spaceModel');

const environment = process.env.HOME === '/Users/erratik' ? 'development' : 'production';
const datawhoreConfig = require('../datawhore-config')(environment);
const API_URL = require('../lib/constants/urls')(datawhoreConfig).DATAWHORE[environment].API_URL;

var SettingSchema = {
    schema: {
        space: String,
        modified: Number,
        lastModified: { type: Date },
        connected: Boolean,
        oauth: [],
        extras: []
    },
    self: {
        findSettings: function(spaceName, cb) {
            this.find({ space: spaceName }, function(err, docs) {
                if (err) cb(err);
                if (!docs) {
                    docs = [{ space: spaceName, modified: Date.now(), $currentDate : { lastModified: true} }];
                }
                docs = docs.map(doc => {
                    doc.connected = !!doc.extras ? Boolean(doc.extras.filter(d => d.label === 'accessToken').length) : false;
                    return doc;
                });
                cb(docs[0]);
            });
        },
        findAllSettings: function(params, cb) {
            const query = !!params.spaces ? { space: { $in: params.spaces } } : {};
            this.find(query, function(err, docs) {
                if (err) cb(err);
                cb(docs);
            });
        },
        removeSettings: function(name, cb) {
            this.remove({ space: name }, cb);
        },
        updateSettings: function(update, cb) {
            var query = { space: update.name || update.space },
                opts = { multi: false, upsert: true };
            delete update._id;
            update.space = update.name;
            update.modified = Date.now();
            update.connected = update.connected ? false : update.connected;

            let extrasKeys = [];

            if (update.oauth.extras) {
                update.extras = update.oauth.extras.map(function(settings) {
                    settings.type = 'oauth';
                    if (settings.label === 'access_token') {
                        update.connected = true;
                        settings.label = 'accessToken';
                    }
                    return settings;
                });

                update.extras.forEach(s => extrasKeys.push(s.label));
            }

            if (!extrasKeys.includes('authorizationUrl')) {
                update.extras.push({
                    type: 'oauth',
                    label: 'authorizationUrl',
                    value: `${API_URL}/auth/${query.space}`
                })
            }

            if (update.oauth.settings) {
                update.oauth = update.oauth.settings;
            } else {
                delete update.oauth;
            }

            update.$currentDate = { lastModified: true};
            
            this.findOneAndUpdate(
                query, 
                update, 
                { upsert: true, returnNewDocument: true }, 
                (err, updated) => Space.updateSpace(query.space, {}, () => {
                    if (!!cb) {

                        cb(updated);
                    }
                })
            );
        }
    }
};
var Setting = require('./createModel')(mongoose, 'Setting', SettingSchema);
module.exports = Setting;
//# sourceMappingURL=/Users/erratik/Sites/datawhore/admin/api/models/settingModel.js.map
