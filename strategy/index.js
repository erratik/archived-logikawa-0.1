
const Setting = require('../models/settingModel');
const EndpointController = require('../controllers/endpoint.controller');
const passport = require('passport');
const refresh = require('passport-oauth2-refresh');

const environment = process.env.HOME === '/Users/erratik' ? 'development' : 'production'; 
const datawhoreConfig = require('../datawhore-config')(environment); 
const API_URL = require('../lib/constants/urls')(datawhoreConfig).DATAWHORE[environment].API_URL;
const CLIENT_URL = require('../lib/constants/urls')(datawhoreConfig).DATAWHORE[environment].CLIENT_URL;

module.exports = function (app) {

    const savePassport = (space, settings, extras, profile, done) => {

        EndpointController.schema.write({space, type: 'profile'}, profile, function(schema) {
            console.log('connect profile saving', profile);

            settings.extras = Object.keys(extras).map(key => {
                return {
                    'type': 'oauth',
                    'value': extras[key],
                    'label': key === 'token' ? 'accessToken' : key
                };
            });

            console.log('saving passport', settings);
            settings.space = space;
            Setting.updateSettings(settings, function(settings) {
                done(null, settings);
            });
        });

    };

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));
    
    require('./facebook.strategy')(app, 'facebook', passport, refresh, savePassport, Setting, API_URL, CLIENT_URL);
    require('./instagram.strategy')(app, 'instagram', passport, refresh, savePassport, Setting, API_URL, CLIENT_URL);
    require('./moves.strategy')(app, 'moves', passport, refresh, savePassport, Setting, API_URL, CLIENT_URL);
    require('./github.strategy')(app, 'github', passport, refresh, savePassport, Setting, API_URL, CLIENT_URL);
    require('./tumblr.strategy')(app, 'tumblr', passport, refresh, savePassport, Setting, API_URL, CLIENT_URL);
    require('./twitter.strategy')(app, 'twitter', passport, refresh, savePassport, Setting, API_URL, CLIENT_URL);
    require('./swarm.strategy')(app, 'swarm', passport, refresh, savePassport, Setting, API_URL, CLIENT_URL);
    require('./spotify.strategy')(app, 'spotify', passport, refresh, savePassport, Setting, API_URL, CLIENT_URL);
    require('./pinterest.strategy')(app, 'pinterest', passport, refresh, savePassport, Setting, API_URL, CLIENT_URL);
    require('./dribbble.strategy')(app, 'dribbble', passport, refresh, savePassport, Setting, API_URL, CLIENT_URL);
    require('./goodreads.strategy')(app, 'goodreads', passport, refresh, savePassport, Setting, API_URL, CLIENT_URL);

};
