const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
        passReqToCallback: true
    },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({ googleId: profile.id });

                if (!user) {
                    // Check if user exists with same email
                    user = await User.findOne({ email: profile.emails[0].value.toLowerCase() });

                    if (user) {
                        user.googleId = profile.id;
                        await user.save();
                    } else {
                        // For this app, users are usually tied to a business.
                        // If they login via Google and don't exist, we might need to handle this.
                        // For now, let's create a "standalone" user or error out depending on requirements.
                        // Given the request, let's allow creation but mark as unverified if needed.
                        user = await User.create({
                            name: profile.displayName,
                            email: profile.emails[0].value.toLowerCase(),
                            googleId: profile.id,
                            password: Math.random().toString(36).slice(-8), // Dummy password
                            businessId: req.query.state || null, // Pass businessId via state if available
                            isVerified: true // Google auth verifies email
                        });
                    }
                }
                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    ));
} else {
    console.warn('⚠️ Google Client ID or Secret missing. Google Login will not be available.');
}

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
