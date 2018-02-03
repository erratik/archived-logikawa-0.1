const TumblrStrategy = require('passport-tumblr').Strategy;

module.exports = function (app, space, passport, refresh, savePassport, Setting, API_URL, CLIENT_URL) {

    Setting.findSettings(space, (settings) => {

        if (settings.oauth) {
            passport.use(new TumblrStrategy({
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

    app.get('/auth/tumblr', passport.authenticate('tumblr'));
    app.get('/auth/tumblr/callback', passport.authenticate(space, {
        successRedirect: `${CLIENT_URL}/space/${space}`,
        failureRedirect: CLIENT_URL
    }));

};
