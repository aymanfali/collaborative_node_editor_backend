import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { User } from "../../models/user.model.js";

const router = express.Router();

// Simple admin guard middleware
function requireAdmin(req, res, next) {
  if (req?.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

// GET /api/v1/admin/users -> list all users (admin only)
router.get("/users", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select("name email role avatar provider createdAt")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load users" });
  }
});

export default router;
