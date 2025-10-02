import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";
import { Token } from "../models/token.model.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";

const getExpiry = (days = 7) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
};

export const socialLogin = async (provider, providerId, email, name, avatar) => {
  let user = await User.findOne({ provider, providerId });

  if (!user) {
    // If user already exists with same email (local), link it
    user = await User.findOne({ email });
    if (user) {
      user.provider = provider;
      user.providerId = providerId;
      // set avatar if provided and not already set
      if (avatar && !user.avatar) user.avatar = avatar;
      await user.save();
    } else {
      user = await User.create({ provider, providerId, email, name, avatar });
    }
  }

  // Rotate tokens
  await Token.deleteMany({ userId: user._id });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await Token.create({ userId: user._id, token: refreshToken, expiresAt: getExpiry() });

  return { accessToken, refreshToken, user };
};

/**
 * Register a new user
 */
export const register = async (name, email, password) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("Email already in use");

  // Let the user schema pre-save hook hash the password
  const user = new User({ name, email, password });
  await user.save();

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await Token.create({ userId: user._id, token: refreshToken, expiresAt });

  return { accessToken, refreshToken };
};

/**
 * Login a user
 */
export const login = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error("Invalid credentials");
  }

  // Remove any old refresh tokens for this user (rotation)
  await Token.deleteMany({ userId: user._id });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await Token.create({ userId: user._id, token: refreshToken, expiresAt });

  return { accessToken, refreshToken };
};

/**
 * Refresh an access token using a refresh token
 */
export const refreshToken = async (currentRefreshToken) => {
  if (!currentRefreshToken) throw new Error("Refresh token required");

  // Find and delete the used refresh token (single-use)
  const storedToken = await Token.findOneAndDelete({
    token: currentRefreshToken,
  });
  if (!storedToken) throw new Error("Invalid or expired refresh token");

  let payload;
  try {
    payload = jwt.verify(currentRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  const user = await User.findById(payload.id);
  if (!user) throw new Error("User not found");

  // Generate new tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await Token.create({ userId: user._id, token: refreshToken, expiresAt });

  return { accessToken, refreshToken };
};

/**
 * Logout a user by deleting their refresh token
 */
export const logout = async (refreshToken) => {
  if (!refreshToken) throw new Error("Refresh token required");

  await Token.findOneAndDelete({ token: refreshToken });
  return { message: "Logged out successfully" };
};
