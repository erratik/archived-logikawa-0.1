const InstagramStrategy = require('passport-instagram').Strategy; 

module.exports = function (app, space, passport, refresh, savePassport, Setting, API_URL, CLIENT_URL) {
    
    Setting.findSettings(space, (settings) => {

        if (settings.oauth) {
            passport.use(new InstagramStrategy({
                clientID: settings.oauth.filter(s => s.keyName === 'apiKey')[0].value,
                clientSecret: settings.oauth.filter(s => s.keyName === 'apiSecret')[0].value,
                callbackURL: `${API_URL}/auth/${space}/callback`
            },
                (accessToken, refreshToken, profile, done) => savePassport(space, settings, {
                    accessToken: accessToken,
                    refreshToken: refreshToken
                }, profile, done)
            ));
        }

    });

    app.get('/auth/instagram', passport.authenticate(space, {
        scope: ['basic', 'public_content', 'likes', 'comments', 'follower_list', 'relationships']
    }));
    app.get('/auth/instagram/callback', passport.authenticate(space, {
        successRedirect: `${CLIENT_URL}/space/${space}`,
        failureRedirect: CLIENT_URL
    }));

};
