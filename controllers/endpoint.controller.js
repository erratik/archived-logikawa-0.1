const Schema = require('../models/schemaModel');
const Setting = require('../models/settingModel');
const Space = require('../models/spaceModel');
const Drop = require('../models/dropModel');
const Profile = require('../models/profileModel');
const Rain = require('../models/rainModel');
const objectPath = require('object-path');
const moment = require('moment');


module.exports = {
    schema: {
        update: function (params, content, cb) {
            Schema.findSchema(params, (schema) => {
                schema.content = content;
                Schema.writeSchema(params, schema, (updatedSchema) => {
                    console.log('[schema.update callback]', updatedSchema);
                    cb(updatedSchema);
                });

            });
        },
        write: function (params, data, cb, fetchUrl = null) {

            let schema = {
                type: params.type,
                content: (typeof data === 'string') ? JSON.parse(data) : data
            }

            if (params.type.includes('rain')) {
                schema['fetchUrl'] = fetchUrl;
            }

            Schema.writeSchema(params, schema, (updatedSchema) => {
                updatedSchema.space = updatedSchema.name = params.space;
                console.log('[schema.write callback]', updatedSchema);
                cb(updatedSchema);
            });


        },
        get: function (options, cb) {

            Schema.findSchema(options, (schema) => cb(schema));

        },
        getAll: function (options, cb) {
            options.spaces = options.spaces.split(',');
            Schema.findAllSchemas(options, (schemas) => cb(schemas));
        }
    },
    profile: {
        write: function (space, content, cb) {
            Profile.writeProfile(space, content, (updatedProfile) => cb(content));
        },
        get: function (options, cb) {
            Profile.findProfile(options.space, (profile) => cb(profile));
        }
    },
    space: {
        write: function (options, content, cb) {
            Space.updateSpace(options, content, (updatedProfile) => {
                // todo: make sure to return what's updated, not what's intended for updated
                cb(content);
            });
        },
        getAll: function (options, cb) {
            Space.getAll((err, data) => cb(data));
        },
        status: function (params, cb) {
            params.spaces = params.spaces.split(',');
            // find settings to check the oauth extras properties, must have more than 2 to be connected
            Setting.findAllSettings(params, (settings) => {
                const statusList = settings.map(({ space, extras, modified }) => {
                    let obj = {};
                    return obj[space] = { space, modified, connected: extras.length > 2 };
                });
                cb(statusList);
            });
        }
    },
    rain: {
        write: function (params, content, cb) {
            params.type = content[0].type;
            Rain.updateRain(params, content, (updatedRain) => {
                cb(content);
            });
        },
        get: function (options, cb) {
            Rain.findBySpace(options.space, (rain) => cb(rain));
        },
        getAll: function (options, cb) {

            options.spaces = options.spaces.split(',');
            Rain.findAllRain(options, (rain) => cb(rain));

        }
    },
    settings: {
        write: function (space, content, type = null, cb) {
            if (typeof type === 'function') cb = type;
            Setting.updateSettings(content, (updatedSettings) => cb(content));
        },
        get: function (options, cb) {
            Setting.findSettings(options.space, (settings) => cb(settings));
        }
    },
    drops: {
        fetch: function (options, data, cb) {
            
            let drops = typeof data === 'string' && !data.includes('<html>') ? JSON.parse(data) : data;
            let dropCount = 0;
            const error = Object.keys(drops).filter(o => o.includes('error'));
            // console.log('drops.fetch -> ' + options.space, options.type);

            if (!drops.errors || error.length || !drops.error || (!!drops.status && ['notfound', 'error'].includes(drops.status))) {

                drops = options.contentPath ? objectPath.get(drops, options.contentPath) : drops;
                if (options.space === 'moves') {
                    // debugger;
                    drops = JSON.parse(data);
                }
                if (drops && drops.length) {
                    let schema = drops.map(drop => { return { type: options.type, content: drop } });

                    Drop.writeDrops(options.space, schema, options.type, function (data, lastDropAdded) {
                        
                        cb(data, lastDropAdded);
                    });
                } else {
                    cb(data, false);
                }
            } else {
                cb(drops);
            }
        },
        get: function (options, cb) {
            Drop.getSpaceDrops(options, function (drops) {
                // drops = drops.map(drop => {
                //     JSON.parse(drop.content)
                // });
                cb(drops);
            });
        },
        writeStory: function (options, cb) {
            // TODO: validate timestamps 
            Drop.writeStory(options, function (drops) {
                cb(drops);
            });
        },
        delete: function (space, dropIds, type, cb, options) {
            Drop.removeDrops(space, dropIds, function (data) {
                cb(data);
            });
        }
    }
};
