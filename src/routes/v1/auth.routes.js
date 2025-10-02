import express from "express";
import * as authController from "../../controllers/auth.controller.js";
import {
  registerValidator,
  loginValidator,
  refreshValidator,
  logoutValidator,
} from "../../validators/auth.validator.js";
import passport from "passport";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// Redirect user to Google
router.get("/google", passport.authenticate("google", { 
  scope: ["profile", "email"],
  session: false,
}));

// Handle Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  (req, res) => {
    // Passport passes tokens in req.user (from done in strategy)
    const { accessToken, refreshToken } = req.user;
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

    const isProd = process.env.NODE_ENV === "production";
    // Set HttpOnly cookies so tokens are not exposed in URL or JS
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    // Redirect to frontend home without tokens in URL
    return res.redirect(FRONTEND_URL);
  }
);
router.post("/register", registerValidator, authController.register);
router.post("/login", loginValidator, authController.login);
router.post("/refresh", refreshValidator, authController.refresh);
router.post("/logout", logoutValidator, authController.logout);

// Return current authenticated user
router.get("/me", authMiddleware, authController.me);

export default router;
