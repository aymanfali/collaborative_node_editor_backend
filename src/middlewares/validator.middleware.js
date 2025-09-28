import { validationResult } from "express-validator";

/**
 * Generic validation handler for express-validator.
 * Ensures all validation errors return in a consistent JSON format.
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
        location: err.location,
      })),
    });
  }

  next();
};
