import { body } from "express-validator";

export const registerValidator = [
  body("name").notEmpty().withMessage("Name is required").isString(),
  body("email").notEmpty().withMessage("Email is required").isEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

export const loginValidator = [
  body("email").notEmpty().withMessage("Email is required").isEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

export const refreshValidator = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
];

export const logoutValidator = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
];
