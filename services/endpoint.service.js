const EndpointController = require('../controllers/endpoint.controller');
const objectPath = require('object-path');

module.exports = {
    get: (data, cb) => {
        
        const endpointController = objectPath.get(EndpointController, data.action);
        if (typeof endpointController === 'function') {
            return endpointController(data, function(resp) {
                //FIXME: refactor this
                if (!!resp && !!resp.length && data.type.includes('rain')) {
                    resp = resp.map(schema => {
                        // schema.content = JSON.stringify(schema.content);
                        return schema;
                    });
                }
                
                cb(resp);
            }, data.query);
        } else {
            cb({ service: data.action, message: 'no endpoints set for ' + data.action });
        }
    },
    post: (data, content, cb) => {

        const endpointController = objectPath.get(EndpointController, data.action);
         
        if (data.type.includes('rain') && !data.action.includes('update')) 
            content['fetchUrl'] = data.fetchUrl;
        
        return endpointController(data, content, (resp) => {
            cb(resp);
        });
    },
    responseHandler: (res, cb) => {
        if (res) {
            cb(resp);
        }
    }
};
