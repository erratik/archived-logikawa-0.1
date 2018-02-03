const SpotifyStrategy = require('passport-spotify').Strategy; 

module.exports = function (app, space, passport, refresh, savePassport, Setting, API_URL, CLIENT_URL) {

    Setting.findSettings(space, (settings) => {

        if (settings.oauth) {
            const strategy = new SpotifyStrategy({
                clientID: settings.oauth.filter(s => s.keyName === 'apiKey')[0].value,
                clientSecret: settings.oauth.filter(s => s.keyName === 'apiSecret')[0].value,
                callbackURL: `${API_URL}/auth/${space}/callback`
            },
                (accessToken, refreshToken, profile, done) => savePassport(space, settings, {
                    accessToken: accessToken,
                    refreshToken: refreshToken
                }, profile, done)
            );
            passport.use(strategy);
            refresh.use(strategy);
        }
    });

    app.get('/auth/spotify', passport.authenticate(space, {
        scope: ['user-read-email', 'user-read-private', 'user-read-recently-played']
    }));
    app.get('/auth/spotify/callback', passport.authenticate(space, {
        successRedirect: `${CLIENT_URL}/space/${space}`,
        failureRedirect: CLIENT_URL
    }));

};
