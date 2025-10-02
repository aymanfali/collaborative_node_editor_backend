import * as authService from "../services/auth.service.js";
import { validationResult } from "express-validator";
import { User } from "../models/user.model.js";

const handleValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors
      .array()
      .map((err) => err.msg)
      .join(", ");
    const error = new Error(errorMsg);
    error.status = 400;
    throw error;
  }
};

export const register = async (req, res) => {
  try {
    handleValidation(req);
    const { name, email, password } = req.body;
    const tokens = await authService.register(name, email, password);
    // Set HttpOnly cookies so frontend requests (withCredentials) are authenticated
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.json({ success: true, data: tokens });
  } catch (err) {
    res
      .status(err.status || 400)
      .json({ success: false, message: err.message || "Something went wrong" });
  }
};

export const login = async (req, res) => {
  try {
    handleValidation(req);
    const { email, password } = req.body;
    const tokens = await authService.login(email, password);
    // Set HttpOnly cookies so frontend requests (withCredentials) are authenticated
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.json({ success: true, data: tokens });
  } catch (err) {
    res
      .status(err.status || 400)
      .json({ success: false, message: err.message });
  }
};
export const refresh = async (req, res) => {
  try {
    handleValidation(req);
    const { refreshToken } = req.body;
    const tokens = await authService.refreshToken(refreshToken);
    res.json({ success: true, data: tokens });
  } catch (err) {
    res
      .status(err.status || 401)
      .json({ success: false, message: err.message });
  }
};
export const logout = async (req, res) => {
  try {
    handleValidation(req);
    let { refreshToken } = req.body || {};
    if (!refreshToken && req.cookies && req.cookies.refreshToken) {
      refreshToken = req.cookies.refreshToken;
    }
    const result = await authService.logout(refreshToken);
    const isProd = process.env.NODE_ENV === 'production';
    // Clear auth cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res
      .status(err.status || 400)
      .json({ success: false, message: err.message });
  }
};

export const me = async (req, res) => {
  try {
    // req.user is set by authMiddleware after verifying access token
    const { id } = req.user || {};
    if (!id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await User.findById(id).select("name email avatar provider role");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};
