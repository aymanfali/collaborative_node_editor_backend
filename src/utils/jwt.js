import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config(); 

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

// Fail fast if secrets are missing
if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT secrets are not defined in environment variables");
}

export const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email, role: user.role }, ACCESS_SECRET, {
    expiresIn: "30m",
  });
};

export const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email, role: user.role }, REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

export const verifyAccessToken = (token) => jwt.verify(token, ACCESS_SECRET);
export const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET);
