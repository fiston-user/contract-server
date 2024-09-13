import express from "express";
import passport from "passport";

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    console.log("Google auth callback - User:", req.user);
    console.log("Session:", req.session);
    // Successful authentication, redirect to client
    res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  }
);

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      console.error("Error during logout:", err);
      return next(err);
    }
    res.status(200).json({ message: "Logged out successfully" });
  });
});

router.get("/current-user", (req, res) => {
  console.log("Current user route called");
  console.log("Session:", req.session);
  console.log("User:", req.user);
  console.log("isAuthenticated:", req.isAuthenticated());
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

router.post("/login-test", (req, res, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.json({ message: "Logged in successfully", user });
    });
  })(req, res, next);
});

router.get("/test-session", (req, res) => {
  console.log("Test session route called");
  console.log("Session:", req.session);
  console.log("User:", req.user);
  console.log("isAuthenticated:", req.isAuthenticated());
  if (req.isAuthenticated()) {
    res.json({ message: "Session is valid", user: req.user });
  } else {
    res.status(401).json({ error: "No valid session" });
  }
});

export default router;
