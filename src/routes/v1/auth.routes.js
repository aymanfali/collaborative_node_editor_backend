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
import { uploadAvatar as uploadAvatarMulter } from "../../middlewares/upload.middleware.js";
import { validate } from "../../middlewares/validator.middleware.js";
import { updateMeValidator } from "../../validators/user.validator.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Basic rate limiting for sensitive endpoints
const makeLimiter = (max, actionName) =>
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, _next, options) => {
      return res.status(options.statusCode).json({
        success: false,
        message: `Too many ${actionName} attempts. Please try again in 15 minutes.`,
      });
    },
  });

const registerLimiter = makeLimiter(10, "registration");
const loginLimiter = makeLimiter(10, "login");
const refreshLimiter = makeLimiter(30, "token refresh");

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
router.post("/register", registerLimiter, registerValidator, authController.register);
router.post("/login", loginLimiter, loginValidator, authController.login);
router.post("/refresh", refreshLimiter, refreshValidator, authController.refresh);
router.post("/logout", logoutValidator, authController.logout);

// Return current authenticated user
router.get("/me", authMiddleware, authController.me);

// Update current authenticated user
router.patch("/me", authMiddleware, updateMeValidator, validate, authController.updateMe);

// Upload avatar for current authenticated user
router.post(
  "/avatar",
  authMiddleware,
  (req, res, next) => uploadAvatarMulter(req, res, (err) => {
    if (err) {
      const status = err.message?.includes('image') ? 400 : 500;
      return res.status(status).json({ success: false, message: err.message || 'Upload failed' });
    }
    next();
  }),
  authController.uploadAvatar
);

export default router;
