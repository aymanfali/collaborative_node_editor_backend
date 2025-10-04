import express from "express";
import { createNote, deleteNote, getNoteById, getNotes, updateNote, listCollaborators, upsertCollaborator, removeCollaborator, exportNoteMarkdown, exportNoteHTML, exportNotePDF } from "../../controllers/note.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validator.middleware.js";
import {
  createNoteValidator,
  updateNoteValidator,
  noteIdParamValidator,
  upsertCollaboratorValidator,
  removeCollaboratorValidator,
} from "../../validators/note.validator.js";

const router = express.Router();

router.post('/notes', authMiddleware, createNoteValidator, validate, createNote);
router.get('/notes/', authMiddleware, getNotes);
router.get('/notes/:id', authMiddleware, noteIdParamValidator, validate, getNoteById);
router.put('/notes/:id', authMiddleware, updateNoteValidator, validate, updateNote);
router.delete('/notes/:id', authMiddleware, noteIdParamValidator, validate, deleteNote);

// Export note
router.get('/notes/:id/export.md', authMiddleware, noteIdParamValidator, validate, exportNoteMarkdown);
router.get('/notes/:id/export.html', authMiddleware, noteIdParamValidator, validate, exportNoteHTML);
router.get('/notes/:id/export.pdf', authMiddleware, noteIdParamValidator, validate, exportNotePDF);

// Collaborators management
router.get('/notes/:id/collaborators', authMiddleware, noteIdParamValidator, validate, listCollaborators);
router.post('/notes/:id/collaborators', authMiddleware, upsertCollaboratorValidator, validate, upsertCollaborator);
router.delete('/notes/:id/collaborators/:userId', authMiddleware, removeCollaboratorValidator, validate, removeCollaborator);

export default router;
