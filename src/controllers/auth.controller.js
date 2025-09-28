import * as authService from "../services/auth.service.js";
import { validationResult } from "express-validator";

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
    res.json({ success: true, data: tokens });
  } catch (err) {
    res
      .status(err.status || 400)
      .json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    handleValidation(req);
    const { email, password } = req.body;
    const tokens = await authService.login(email, password);
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
    const { refreshToken } = req.body;
    const result = await authService.logout(refreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    res
      .status(err.status || 400)
      .json({ success: false, message: err.message });
  }
};
