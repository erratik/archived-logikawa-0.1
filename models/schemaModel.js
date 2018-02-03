const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectId;
var Drop = require('./dropModel');
var _ = require('lodash');

const childSchema = new mongoose.Schema({
    type: String,
    fetchUrl: String,
    dropUrl: String,
    contentPath: String,
    modified: Number,
    dropCount: Number,
    content: {}
});

let Schema;
const SchemaSchema = {
    schema: {
        space: String,
        schemas: [childSchema]
    },
    self: {
        findSchema: function (params, cb) {
            this.findOne({ space: params.space }, function (err, docs) {
                if (!docs) {
                    var schema = new Schema({
                        space: params.space,
                        schemas: [{
                            type: params.type,
                            modified: Date.now()
                        }]
                    });
                    docs = { schemas: [schema] };
                }
                if (!params.type.includes('rain')) {
                    cb(docs.schemas.filter(function (schema) {
                        return schema.type === params.type;
                    })[0]);
                } else if (docs) {

                    let schemas = docs.schemas.filter(schema => !!schema.type && schema.type.includes('rain'));

                    Drop.countByTypes(params.space, (types) => {
                        schemas = schemas.map(schema => {
                            schema.dropCount = types.filter(c => c.type === schema.type)[0] ? types.filter(c => c.type === schema.type)[0].count : 0;
                            return schema;
                        });
                        cb(schemas);
                    });

                    // TODO: replace with the new count function
                    // countDropsBySchema(space, schemas, _schemas => cb(_schemas))

                }
            });
        },
        findAllSchemas: function (params, cb) {

            const query = !!params.spaces ? { space: { $in: params.spaces } } : {};
            params.mode = !!params.mode ? params.mode : null;

            this.find(query, (err, docs) => {
                if (err) {
                    cb(err);
                } else if (params.mode === 'count') {

                    const counts = {};
                    let cnt = 0;
                    
                    for (let i = 0; i < docs.length ; i++) {
                        
                        countDropsBySchema(docs[i].space, docs[i].schemas, (dropCounts, spaceName) => {
                            counts[spaceName] = dropCounts;
                            if (params.spaces.length === Object.keys(counts).length) {
                                cb(counts);
                            } else {
                                cnt++;
                            }
                        }, 'count');

                    }
                } else {
                    cb(docs);
                }

            });
        },
        removeSchema: function (space, type, cb) {
            var query = { space: space, 'schemas.type': type };
            this.update(query, { $pull: { schemas: { type: type } } }, { multi: true }, (err, _updated) => {

                if (err) {
                    cb(err);
                } else if (_updated.ok) {
                    cb();
                }
            });
        },
        writeSchema: function (options, schema, cb) {
            const that = this;
            const sid = new ObjectId(schema.id);
            const query = options.type === 'profile' ? { space: options.space, 'schemas.type': options.type } : { space: options.space, 'schemas._id': sid };
            const schemaQuery = options.type === 'profile' ? { 'type': options.type } : { '_id': sid };


            const addSchema = function (callback) {
                schema.modified = Date.now();
                if (!!schema.fetchUrl) {
                    schema.fetchUrl = schema.fetchUrl.apiEndpointUrl;
                }
                that.findOneAndUpdate({ space: options.space }, { $push: { schemas: schema } }, { upsert: true, returnNewDocument: true }, function (err, updated) {
                    if (err) {
                        cb(err);
                    } else {
                        that.findOne({ space: options.space, 'schemas.type': options.type }, { 'schemas.$': 1 }, (err, docs) => {
                            if (err) {
                                cb(err);
                            } else {
                                cb(docs.schemas[0]);
                            }
                        });
                    }
                });
            };

            this.findOne(query, { 'schemas.$': 1 }, function (_err, docs) {
                if (docs) {
                    that.update(query, { $pull: { schemas: schemaQuery } }, { multi: false }, function (error, _updated) {
                        if (_updated.ok) {
                            addSchema(cb);
                        }
                    });
                }
                else {
                    // console.log(`no ${schema.type} schema found, creating`);
                    addSchema(cb);
                }
            });
        }
    }
};

const countDropsBySchema = (spaceName, schemas, cb, mode = null) => {
    return Drop.countByTypes(spaceName, (types) => {
        if (mode === 'count') {
            cb(types, spaceName);
        } else {
            schemas = schemas.map(schema => {
                schema.dropCount = types.filter(c => c.type === schema.type)[0] ? types.filter(c => c.type === schema.type)[0].count : 0;
                return schema;
            });
        }
    });
};

Schema = require('./createModel')(mongoose, 'Schema', SchemaSchema);
module.exports = Schema;
//# sourceMappingURL=/Users/erratik/Sites/datawhore/admin/api/models/schemaModel.js.map
