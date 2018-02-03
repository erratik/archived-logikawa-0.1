const FacebookStrategy = require('passport-facebook').Strategy; 

module.exports = function (app, space, passport, refresh, savePassport, Setting, API_URL, CLIENT_URL) {

    Setting.findSettings('facebook', (settings) => {
        if (settings.oauth) {
            const strategy = new FacebookStrategy({
                clientID: settings.oauth.filter(s => s.keyName === 'apiKey')[0].value,
                clientSecret: settings.oauth.filter(s => s.keyName === 'apiSecret')[0].value,
                callbackURL: '${API_URL}/auth/facebook/callback',
                profileFields: ['about', 'cover', 'id', 'updated_time', 'picture', 'friends']
                // callbackURL: settings.oauth.filter(s => s.keyName === 'redirectUrl')[0].value
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
    // https://accounts.facebook.com/authorize/?client_id=<apiKey>&response_type=code&redirect_uri=<redirectUrl>&scope=user-read-private user-read-email
    app.get('/auth/facebook', passport.authenticate(space, { scope: [
        'user_friends',
        'public_profile',
        'email',
        'publish_actions',
        'user_hometown',
        'user_religion_politics',
        'publish_actions',
        'user_likes',
        'user_status',
        'user_about_me',
        'user_location',
        'user_tagged_places',
        'user_birthday',
        'user_photos',
        'user_videos',
        'user_education_history',
        'user_posts',
        'user_website',
        'user_friends',
        'user_relationship_details',
        'user_relationships',
        'user_work_history',
        'user_games_activity'
        ]}))
    app.get('/auth/facebook/callback', passport.authenticate(space, {
        successRedirect: `${CLIENT_URL}/space/${space}`,
        failureRedirect: CLIENT_URL
    }));

};
