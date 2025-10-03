import express from "express";
import { createNote, deleteNote, getNoteById, getNotes, updateNote, listCollaborators, upsertCollaborator, removeCollaborator } from "../../controllers/note.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post('/notes', authMiddleware, createNote);
router.get('/notes/', authMiddleware, getNotes);
router.get('/notes/:id', authMiddleware, getNoteById);
router.put('/notes/:id', authMiddleware, updateNote);
router.delete('/notes/:id', authMiddleware, deleteNote);

// Collaborators management
router.get('/notes/:id/collaborators', authMiddleware, listCollaborators);
router.post('/notes/:id/collaborators', authMiddleware, upsertCollaborator);
router.delete('/notes/:id/collaborators/:userId', authMiddleware, removeCollaborator);

export default router;
