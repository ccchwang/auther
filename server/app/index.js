'use strict';

var app = require('express')();
var path = require('path');
var expressSession = require('express-session');
var User = require('../api/users/user.model');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

app.use(expressSession({
  secret: 'tongiscool',
  resave: false,
  saveUnitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({
    usernameField: 'email'
  },
  function(email, password, done) {
    User.findOne({
      where: {
        email: email
      }
    })
    .then (function (user) {
      // console.log(user);
      done(null, user);
    });
  }
));


var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
passport.use(
  new GoogleStrategy({
    clientID: 'clientID',
    clientSecret: 'clientSecret',
    callbackURL: '/auth/google/callback'
  },
  // Google will send back the token and profile
  function (token, refreshToken, profile, done) {
    // the callback will pass back user profile information and each service (Facebook, Twitter, and Google) will pass it back a different way. Passport standardizes the information that comes back in its profile object.
    User.findOrCreate({
      where: {
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id
      }
    })
    .then(function (user) {
      done(null, user[0]);
    });
  })
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id)
  .then(function (user) {
    done(null, user);
  })
  .catch(done);
});

app.use(function (req, res, next) {
  console.log('session', req.session, req.user);
  next();
});

app.use(require('./logging.middleware'));

app.use(require('./body-parsing.middleware'));

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
  })
);

app.use('/api', require('../api/api.router'));

app.get('/auth/google', passport.authenticate('google', { scope: 'email' }));

// handle the callback after Google has authenticated the user
app.get('/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/'
  })
);

var validFrontendRoutes = ['/', '/stories', '/users', '/stories/:id', '/users/:id', '/signup', '/login'];
var indexPath = path.join(__dirname, '..', '..', 'browser', 'index.html');
validFrontendRoutes.forEach(function (stateRoute) {
  app.get(stateRoute, function (req, res) {
    res.sendFile(indexPath);
  });
});

app.use(require('./statics.middleware'));

app.use(require('./error.middleware'));

module.exports = app;
