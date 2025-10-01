import express from "express";
import { createNote, deleteNote, getNoteById, getNotes, updateNote } from "../../controllers/note.controller.js";

const router = express.Router();

router.post('/notes', createNote);
router.get('/notes/', getNotes);
router.get('/notes/:id', getNoteById);
router.put('/notes/:id', updateNote);
router.delete('/notes/:id', deleteNote);

export default router;
