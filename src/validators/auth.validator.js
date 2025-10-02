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
  body("refreshToken").optional(), // allow cookie-based refresh
];

export const logoutValidator = [
  body("refreshToken").optional(), // allow cookie-based logout
];
