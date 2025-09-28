import express from "express";
import * as authController from "../../controllers/auth.controller.js";
import {
  registerValidator,
  loginValidator,
  refreshValidator,
  logoutValidator,
} from "../../validators/auth.validator.js";

const router = express.Router();

router.post("/register", registerValidator, authController.register);
router.post("/login", loginValidator, authController.login);
router.post("/refresh", refreshValidator, authController.refresh);
router.post("/logout", logoutValidator, authController.logout);

export default router;
