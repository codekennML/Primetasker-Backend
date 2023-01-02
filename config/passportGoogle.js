// const { random } = require("Math");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("../model/User");

// const emailVerifyCode = math.random().substring(2, 8);

// console.log(emailVerifyCode);/
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
      scope: ["profile"],
    },
    async (accessToken, refreshToken, email, profile, done) => {
      //   console.log(profile);

      const user = await User.findOne({ googleId: profile.id });
      if (user) {
        return done(null, user);
      } else {
        const newUser = User.create({
          firstname: profile.name?.givenName,
          lastname: profile.name?.familyName,
          email: profile.emails[0].value,
          avatar: profile.photos[0].value,
          googleId: profile.id,
        });
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser(async (id, done) => {
  await User.findById(id, (err, user) => {
    done(null, user);
  });
});
