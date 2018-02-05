const _ = require('lodash');
const moment = require('moment');
const objectPath = require('object-path');

module.exports = {
    enrichDrop: (drop, dimensions) => {
      
      drop.content = dimensions.map(dim => {
        let obj = {};
        obj[dim.friendlyName] = objectPath.get(drop, dim.schemaPath);
        return obj;
      }).reduce(function(result, item) {
        var key = Object.keys(item)[0]; //first property: a, b, c
        result[key] = item[key];
        return result;
      }, {});

      return drop;
    }
};
