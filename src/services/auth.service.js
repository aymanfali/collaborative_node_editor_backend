import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";
import { Token } from "../models/token.model.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";

/**
 * Register a new user
 */
export const register = async (name, email, password) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("Email already in use");

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashedPassword });
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
