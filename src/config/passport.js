import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import * as authService from "../services/auth.service.js";

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Use authService.socialLogin for consistency
                const tokens = await authService.socialLogin(
                    "google",
                    profile.id,
                    profile.emails[0].value,
                    profile.displayName,
                    profile.photos && profile.photos.length ? profile.photos[0].value : undefined
                );
                return done(null, tokens);
            } catch (err) {
                return done(err, false);
            }
        }
    )
);

export default passport;
