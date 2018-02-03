var mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectId;
var _ = require('lodash');

var dimensionSchema = new mongoose.Schema({
    type: String,
    friendlyName: String,
    schemaPath: String
});
var RainSchema = {
    schema: {
        space: String,
        modified: Number,
        dimensions: [dimensionSchema]
    },
    self: {
        findBySpace: function (space, cb) {
            return this.findOne({ space: space }, function (err, rain) {

                if (!rain) {
                    rain = {
                        space: space,
                        dimensions: [{}]
                    };
                }
                cb(rain);
            });
        },

        findAllRain: function (params, cb) {

            const query = !!params.spaces && params.spaces[0].length ? { space: { $in: params.spaces } } : {};

            this.find(query, (err, docs) => {
                if (err) {
                    cb(err);
                } else {
                    cb(docs);
                }

            });
        },
        updateRain: function (options, dimensions, cb) {

            const dimType = options.type;
            const query = { space: options.space, 'dimensions.type': dimType };

            var that = this;
            let existingDims = [];
            var addSchema = function (callback) {
                // dimensions = dimensions.map(dim => {
                //     dim._id = new ObjectId(dim.id);
                //     return dim;
                // });

                that.findOneAndUpdate(
                    { space: options.space },
                    { $addToSet: { dimensions: { $each: dimensions.concat(existingDims) } } },
                    { upsert: true, returnNewDocument: true, multi: true }, function (err, updated) {
                        that.find(query, { 'dimensions.$': 1 }, (err, docs) => {
                            if (err) cb(err);
                            if (updated) {
                                updated.dimensions = docs[0].dimensions;
                            } else {
                                updated = { space: options.space, dimensions: [] };
                            }
                            cb(updated);
                        });

                    });
            };

            this.findOne({ space: options.space }, function (errata, dimList) {

                existingDims = dimList ? dimList.dimensions.filter(dim => dim.type !== dimType) : existingDims;

                that.find(query, { 'dimensions.$': 1 }, function (_err, _docs) {
                    if (_docs.length) {
                        that.update(query, { $pull: { dimensions: { type: dimType } } }, { multi: true }, function (error, _updated) {
                            console.log('pulled', _updated);
                            if (_updated.ok) {
                                addSchema(cb);
                            }
                        });
                    }
                    else {
                        addSchema(cb);
                    }
                });
            });


        }
    }
};
var Rain = require('./createModel')(mongoose, 'rain', RainSchema);
module.exports = Rain;
