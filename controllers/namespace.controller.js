const Setting = require('../models/settingModel');

const EndpointService = require('../services/endpoint.service');
const OauthService = require('../services/oauth.service');
const FetchingService = require('../services/fetch-params.service');

const Utils = require('../lib/utils');

const moment = require('moment');
const request = require('request');
const refresh = require('passport-oauth2-refresh');
const https = require('https');

module.exports = NamespaceController = {
    runCall: (data, cb = null, extras = null, resCallback) => {

        Setting.findSettings(data.space, (o) => {

            data.apiUrl = Utils.pluck('apiUrl', o.oauth);
            data.apiKey = Utils.pluck('apiKey', o.oauth);
            data.apiSecret = Utils.pluck('apiSecret', o.oauth);
            data.accessToken = Utils.pluck('accessToken', o.extras);
            data.refreshToken = Utils.pluck('refreshToken', o.extras);
            data.tokenSecret = Utils.pluck('tokenSecret', o.extras);
            data.fetchUrl = data.apiEndpointUrl;

            let urlExtras;
            if (!!data.urlParams) {

                urlExtras = Object.keys(data.urlParams).map(function (k) {
                    return encodeURIComponent(k) + "=" + encodeURIComponent(data.urlParams[k]);
                }).join('&');
            }

            let options;
            let params;
            if (data.apiEndpointUrl) {

                switch (data.space) {
                    case 'tumblr':
                    case 'twitter':
                    case 'facebook':

                        // OAuth Authorization requests

                        urlExtras = urlExtras ? '?' + urlExtras : '?access_token=' + data.accessToken
                        data.url = data.apiEndpointUrl + urlExtras + '&access_token=' + data.accessToken;

                        options = {
                            hostname: data.apiUrl,
                            path: data.url,
                            headers: {
                                Authorization: OauthService.makeOAuthHeaders(data)
                            }
                        };

                        https.get(options, function (result) {
                            let buffer = '';
                            result.setEncoding('utf8');
                            result.on('data', (dataReceived) => buffer += dataReceived);
                            result.on('end', () => EndpointService.post(data, JSON.parse(buffer), cb));
                        });

                        break;

                    case 'goodreads':
                        urlExtras += '&key=' + data.accessToken;

                    case 'moves':
                        if (!!data.urlParams.date) {
                            data.apiEndpointUrl += data.urlParams.date;
                        } else {
                            data.apiEndpointUrl = data.apiEndpointUrl.replace('daily/', 'daily');
                        }

                    default:

                        // Access Token requests

                        data.url = data.apiEndpointUrl;
                        data.url += !data.url.includes('?') ? `?erratik=datawhore` : `&v=${Date.now()}`;
                        data.url += '&' + urlExtras;

                        options = {
                            uri: `https://${data.apiUrl}${data.url}&access_token=${data.accessToken}&oauth_token=${data.accessToken}`,
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                            }
                        };


                }

                NamespaceController.requestDataWithToken(data, options, cb);

            }
        });
    },
    requestDataWithToken: (data, options, cb) => request(options, (error, response, body) => {

        try {

            if (body) {

                const expiredTokenMsg = ['expired', 'expired_access_token'];
                
                let errorObj = typeof body === 'string' && !expiredTokenMsg.includes(body) ? JSON.parse(body) : {
                    status: 401
                };
                errorObj = expiredTokenMsg.includes(body) ? { error: body }: errorObj;
                    
                const err = body.includes('html') ? {
                    status: 401
                } : errorObj;

                const hasExpiredToken = !!expiredTokenMsg.includes(errorObj.error);
                
                if (!!errorObj.error || err.status === 401) {

                    console.log('⛔ [namespace ctrl: request]', errorObj.error);
                    // if (data.space === 'spotify') {
                    //     debugger;
                    // }
                    if (hasExpiredToken) {

                        Setting.findSettings(data.space, (settings) => {
                            refresh.requestNewAccessToken(data.space, data.refreshToken, (_e, accessToken, refreshToken) => {

                                // `refreshToken` may or may not exist, depending on the strategy you are using.
                                if (!_e) {
                                    refreshToken = refreshToken ? refreshToken : data.refreshToken;
                                    const keys = {
                                        accessToken,
                                        refreshToken
                                    };
                                    settings.extras = Object.keys(keys).map(key => {
                                        return {
                                            'type': 'oauth',
                                            'value': keys[key],
                                            'label': key
                                        };
                                    });
                                    settings.connected = true;
                                    Setting.updateSettings(settings, EndpointService.post(data, body, cb));
                                }
                            });
                        });
                    } else {
                        cb();
                    }

                } else {

                    EndpointService.post(data, body, cb);
                }


            }
        } catch (error) {
            console.log(error)
        }
    }),
    endpointSpaceCall: (data, req, res, cb = null) => {
        // let extras;
        if (req) {
            NamespaceController.runCall(data, EndpointService.responseHandler(res, cb));
        } else {

        }
    }
};
