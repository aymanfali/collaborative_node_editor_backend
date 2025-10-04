import { body, param } from "express-validator";

export const noteIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid note ID"),
];

export const createNoteValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be 1-200 characters"),
  body("content")
    .optional({ nullable: true })
    .isString()
    .withMessage("Content must be a string"),
];

export const updateNoteValidator = [
  ...noteIdParamValidator,
  body("title")
    .optional()
    .isString()
    .withMessage("Title must be a string")
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be 1-200 characters"),
  body("content")
    .optional({ nullable: true })
    .isString()
    .withMessage("Content must be a string"),
];

export const upsertCollaboratorValidator = [
  ...noteIdParamValidator,
  body("email").notEmpty().withMessage("Email is required").isEmail(),
  body("permission")
    .optional()
    .isIn(["view", "edit"]).withMessage("permission must be view|edit"),
];

export const removeCollaboratorValidator = [
  ...noteIdParamValidator,
  param("userId").isMongoId().withMessage("Invalid user ID"),
];
