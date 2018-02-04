// dependencies
const env = require('node-env-file');
const express = require('express');
const path = require('path');

const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');

const routes = require('./routes/authenticate');
const api = require('./routes/core');
const users = require('./routes/users');

const app = express();
const environment = app.get('env');
const datawhoreConfig = require('./datawhore-config')(environment);

if (environment === 'development') {
    env(__dirname + '/.env');
}

app.use('/public', express.static(path.join(__dirname, './public')))
app.set('constants', require('./lib/constants/urls')(datawhoreConfig));

console.log(app.get('constants'));
const DATAWHORE = app.get('constants').DATAWHORE[environment];

//  app.configure(function () {

//     // if (env === 'production') {
//     // }

//     // other configurations etc for express go here...
// });

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// app.use(express.static(path.join(__dirname, '../public')));


// Add headers
app.use(function(req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', DATAWHORE.CLIENT_URL);

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'lumpy space princess',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(flash());
app.use(passport.session());


// passport config
const User = require('./models/userModel');
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use('/users', users);

app.use('/', routes);
require('./strategy')(app);

const Space = require('./models/spaceModel');
const Settings = require('./models/settingModel');
const Schema = require('./models/schemaModel');

const mongoURI = (app.get('env') === 'development') ? process.env.MONGODB_LOCAL_URI : process.env.MONGODB_URI;
// mongoose
mongoose.connect(mongoURI, function(err) {
    if (err) throw err;
    Space.getAll((err, spaces) => Schema.findAllSchemas({}, (schemas) => Settings.findAllSettings({}, (settings) => require('./scheduler')(app, spaces, settings, schemas))));
});

app.use('/api', api);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500).send({
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500).send({
        message: err.message,
        error: {}
    });
});


module.exports = app;
