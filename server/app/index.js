'use strict';

var app = require('express')();
var path = require('path');
var expressSession = require('express-session');
var User = require('../api/users/user.model');
var passport = require('passport');

// "Enhancing" middleware (does not send response, server-side effects only)

app.use(expressSession({
  // this mandatory configuration ensures that session IDs are not predictable
  secret: 'tongiscool', // or whatever you like
  // these options are recommended and reduce session concurrency issues
  resave: false,
  saveUnitialized: false
}));

// app.use('/api', function (req, res, next) {
//   if (!req.session.counter) req.session.counter = 0;
//   console.log('counter', ++req.session.counter);
//   next();
// });

app.use(passport.initialize());
app.use(passport.session());

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
passport.use(
  new GoogleStrategy({
    clientID: 'CLIENTKEYHERE',
    clientSecret: 'CLIENTSECRETHERE',
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

app.use(function (req, res, next) {
  console.log('session', req.session);
  next();
});

app.use(require('./logging.middleware'));

app.use(require('./body-parsing.middleware'));

app.get('/logout', function (req, res, next) {
  req.session.destroy();
  res.redirect('/')
});


app.post('/login', function (req, res, next) {
  User.findOne({
    where: req.body
  })
  .then(function (user) {
    if (!user) {
      res.sendStatus(401);
    } else {
      req.session.userId = user.id;
      res.status(201);
      res.send(user);
    }
  })
  .catch(next);
});

// "Responding" middleware (may send a response back to client)

app.use('/api', require('../api/api.router'));

app.get('/auth/google', passport.authenticate('google', { scope: 'email' }));

// handle the callback after Google has authenticated the user
app.get('/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/', // or wherever
    failureRedirect: '/' // or wherever
  })
);

passport.serializeUser(function (user, done) {
  // __________
});

passport.deserializeUser(function (id, done) {
  // __________
});

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
