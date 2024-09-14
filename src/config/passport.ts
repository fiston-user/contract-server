import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User, { IUser } from "../models/User";
import { createDefaultProject } from "../utils/projectUtils";
import { Strategy as LocalStrategy } from "passport-local";
import mongoose from "mongoose";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error(
    "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables"
  );
  process.exit(1);
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.SERVER_URL}/auth/google/callback`,
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await new User({
            googleId: profile.id,
            email: profile.emails![0].value,
            displayName: profile.displayName,
            profilePicture: profile.photos![0].value,
          }).save();

          // Create a default project for the new user
          await createDefaultProject(user);
        }

        done(null, user);
      } catch (error) {
        done(error as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);

    done(null, user);
  } catch (error) {
    console.error("Deserialization error:", error);
    done(error, null);
  }
});

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      // Check if the test user already exists
      let user = await User.findOne({ email: "test@example.com" });

      if (!user) {
        // If the test user doesn't exist, create it
        user = await new User({
          googleId: "test_" + new mongoose.Types.ObjectId().toString(), // Generate a unique ID
          email: "test@example.com",
          displayName: "Test User",
        }).save();

        // Create a default project for the new user
        await createDefaultProject(user);
      }

      // This is a test user. In a real application, you'd check the password.
      if (username === "testuser" && password === "testpassword") {
        return done(null, user);
      }
      return done(null, false, { message: "Invalid credentials" });
    } catch (error) {
      return done(error);
    }
  })
);

// Add this type declaration to extend the Express.User interface
declare global {
  namespace Express {
    interface User extends IUser {}
  }
}
