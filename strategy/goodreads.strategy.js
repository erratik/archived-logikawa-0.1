const GoodreadsStrategy = require('passport-goodreads').Strategy; 

module.exports = function (app, space, passport, refresh, savePassport, Setting, API_URL, CLIENT_URL) {

    Setting.findSettings(space, (settings) => {

        if (settings.oauth) {
            passport.use(new GoodreadsStrategy({
                consumerKey: settings.oauth.filter(s => s.keyName === 'apiKey')[0].value,
                consumerSecret: settings.oauth.filter(s => s.keyName === 'apiSecret')[0].value,
                callbackURL: `${API_URL}/auth/${space}/callback`
            },
                (token, tokenSecret, profile, done) => savePassport(space, settings, {
                    token: token,
                    tokenSecret: tokenSecret
                }, profile, done)
            ));
        }

    });

    app.get('/auth/goodreads', passport.authenticate(space));
    app.get('/auth/goodreads/callback', passport.authenticate(space, {
        successRedirect: `${CLIENT_URL}/space/${space}`,
        failureRedirect: CLIENT_URL
    }));

};
