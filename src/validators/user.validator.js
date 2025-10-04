import { body } from "express-validator";

export const updateMeValidator = [
  body("name")
    .optional()
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 characters"),
  body("avatar")
    .optional({ nullable: true })
    .isString()
    .withMessage("Avatar must be a string"),
  body("password")
    .optional({ nullable: true })
    .isString()
    .withMessage("Password must be a string")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];
