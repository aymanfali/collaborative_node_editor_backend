import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { User } from "../../models/user.model.js";
import Note from "../../models/note.model.js";

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

// GET /api/v1/admin/stats -> return counts (admin only)
router.get("/stats", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [usersCount, notesCount] = await Promise.all([
      User.countDocuments(),
      Note.countDocuments(),
    ]);
    const activeSessions = req.app.get("activeSockets") || 0;
    res.json({ users: usersCount, notes: notesCount, activeSessions });
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Failed to load admin stats" });
  }
});

// DELETE /api/v1/admin/users/:id -> delete user (admin only)
router.delete("/users/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "User deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete user" });
  }
});

export default router;
