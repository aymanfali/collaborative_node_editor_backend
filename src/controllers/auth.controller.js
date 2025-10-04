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

// Handle avatar upload and update the user's avatar URL
export const uploadAvatar = async (req, res) => {
  try {
    const { id } = req.user || {};
    if (!id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // multer places file info on req.file
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filename = req.file.filename;
    const absoluteUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${filename}`;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.avatar = absoluteUrl;
    await user.save();

    const safe = {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      provider: user.provider,
      role: user.role,
    };

    return res.json({ success: true, data: safe, message: 'Avatar uploaded successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
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
    // Accept refresh token from body or from HttpOnly cookie
    let { refreshToken } = req.body || {};
    if (!refreshToken && req.cookies && req.cookies.refreshToken) {
      refreshToken = req.cookies.refreshToken;
    }

    const tokens = await authService.refreshToken(refreshToken);

    // After rotating tokens, also refresh cookies so subsequent requests succeed via cookies
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

// Allow the authenticated user to update their own profile
export const updateMe = async (req, res) => {
  try {
    const { id } = req.user || {};
    if (!id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Only allow updating specific fields
    const { name, avatar, password } = req.body || {};
    const update = {};
    if (typeof name === 'string' && name.trim().length >= 3) update.name = name.trim();
    if (typeof avatar === 'string') update.avatar = avatar.trim();

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Apply allowed updates
    if (update.name !== undefined) user.name = update.name;
    if (update.avatar !== undefined) user.avatar = update.avatar;

    // Optional password change for local provider
    if (password && user.provider === 'local') {
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      user.password = password; // will be hashed by pre('save') hook
    }

    await user.save();

    const safe = {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      provider: user.provider,
      role: user.role,
    };

    return res.json({ success: true, data: safe, message: 'Profile updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};
