'use strict';

var app = require('express')();
var path = require('path');
var expressSession = require('express-session');
var User = require('../api/users/user.model');

//---PASSPORT---//
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

//---Set up express session---//
app.use(expressSession({
  secret: 'tongiscool',
  resave: false,
  saveUnitialized: false
}));

//---Initialize passport AFTER we've set up session---//
app.use(passport.initialize());
app.use(passport.session());

//---Set up passport strategies---//
passport.use(new LocalStrategy({ usernameField: 'email' },
  function(email, password, done) {
    User.findOne({
      where: {
        email: email
      }
    })
    .then(user => done(null, user));
  }
));

passport.use(new GoogleStrategy({
    clientID: 'clientID',
    clientSecret: 'clientSecret',
    callbackURL: '/auth/google/callback'
  },
  //9) CALLBACK FN THAT RUNS after user has successfully logged in to google (runs after google redirected user to callback URL). This callback fn is given to us by passport to pass down info given from the provider (Google will send back the token and profile).
    //1. user logs in successfully to google
    //2. google makes get request to our callback URL
    //3. callback URL hits passport.authenticate, which causes this callback fn to run.
  function (token, refreshToken, profile, done) {
    // the callback will pass back user profile information and each service (Facebook, Twitter, and Google) will pass it back a different way. Passport standardizes the information that comes back in its profile object.
    User.findOrCreate({
      where: {
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id
      }
    })
    .then(user => { done(null, user[0])});
      //done says this op is done, go on to serializeUser. This returns the user obj so passport can associate it with a given session as req.user
  })
);


//----Set up passport serializing/deserializing----//

//9a) after user successfully authenticates with google, passport serializes the data and integrates with session:
passport.serializeUser(function (user, done) {
  //user is passed in to fn from the done call in above callback fn
  done(null, user.id);
  //we determine that we want to save user.id to session. we could also choose to save the entire user obj
});

//for every other request, passport will attempt to deserialize user off the session and attach it as req.user. id is whatever data we told serializeUser above to serialize and put on req.session (user.id)
passport.deserializeUser(function (id, done) {
  //we have serialized data user.id on req.session. Serialized id is passed into deserializeUser. deserializeUser then uses the id to find user obj in our db.
  User.findById(id)
  .then(user => {
    //user is the db instance that we got back from db, found with the serialized user.id that we put onto session at 9a).
    done(null, user);
    //if successfully found, pass db user instance into done, which will put it onto req.user. Now, we have access to req.user in every following route/middleware.
  })
  .catch(done);
});


//----Set up routes for how to invoke passport strategies (local and google)----//

//1-2) User logging in with local strategy fills out login form and makes post request to /login with their info. Since it's local, we don't need to redirect them to a provider login. So just call passport.authenticate (v2), which runs the callback fn defined when we defined our local strategy. Jump down to number 9)
app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
  })
);

//3) When user clicks on "Sign Up With Google", they send get request to this link (/auth/google). Then, using passport.authenticate (v1), 4) we auto redirect user to google login
app.get('/auth/google', passport.authenticate('google', { scope: 'email' }));


//----Callback URL for providers----//

//8) after user has logged in successfully with google, google redirects them to callback URL below (auth/google/callback). This makes passport.authenticate (v2) initiate the callback fn defined when we defined our google strategy
app.get('/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/'
  })
);

//----------------//

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});




//---middleware & routes---//
app.use((req, res, next) => {
  console.log('session', req.session, req.user);
  next();
});
app.use(require('./logging.middleware'));
app.use(require('./body-parsing.middleware'));

app.use('/api', require('../api/api.router'));

//-------------//

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
