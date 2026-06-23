const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function (passport) {
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    User.findById(id).then(user => done(null, user)).catch(done);
  });

  const googleClientID = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleCallbackURL = process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback';

  if (!googleClientID || !googleClientSecret) {
    console.warn('Google OAuth disabled: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable.');
  } else {
    passport.use(new GoogleStrategy({
      clientID: googleClientID,
      clientSecret: googleClientSecret,
      callbackURL: googleCallbackURL
    }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] && profile.emails[0].value;
      let user = await User.findOne({ email });
      if (user) return done(null, user);
      // Create user
      user = new User({
        username: profile.displayName.replace(/\s+/g, '').toLowerCase().slice(0, 20),
        email,
        profilePhoto: profile.photos && profile.photos[0] && profile.photos[0].value,
        password: null,
        editsLeft: 1,
        notificationsEnabled: true
      });
      await user.save();
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
    }));
  }
};
