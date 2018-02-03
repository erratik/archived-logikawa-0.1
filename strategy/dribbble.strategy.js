DribbbleStrategy = require('passport-dribbble').Strategy;

module.exports = function (app, space, passport, refresh, savePassport, Setting, API_URL, CLIENT_URL) {

    Setting.findSettings(space, (settings) => {
        settings.space = space;
        if (settings.oauth) {
            passport.use(new DribbbleStrategy({
                clientID: settings.oauth.filter(s => s.keyName === 'apiKey')[0].value,
                clientSecret: settings.oauth.filter(s => s.keyName === 'apiSecret')[0].value,
                callbackURL: `${API_URL}/auth/${space}/callback`,
                passReqToCallback: true
            },
                (req, accessToken, refreshToken, profile, done) => savePassport(space, settings, {
                    accessToken: accessToken,
                    refreshToken: refreshToken
                }, profile, done)
            ));

        }

    });

    app.get(`/auth/dribbble`, passport.authenticate(space, { scope: 'public write comment upload' }));
    app.get(`/auth/dribbble/callback`, passport.authenticate(space, {
        successRedirect: `${CLIENT_URL}/space/${space}`,
        failureRedirect: CLIENT_URL
    }));

};
