import mongoose from 'mongoose';
import Note from '../models/note.model.js';

// Create a new Note
export const createNote = async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title) return res.status(400).json({ message: 'Title is required' });
        // owner required by schema
        const note = await Note.create({ title, content, owner: req.user?.id });
        res.status(201).json(note);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get all Notes
export const getNotes = async (req, res) => {
    try {
        const isAdmin = req.user?.role === 'admin';
        const query = isAdmin ? {} : { owner: req.user?.id };
        const notes = await Note.find(query).populate('owner', 'name email');
        res.json(notes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get a single Note
export const getNoteById = async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ message: 'Note not found' });
        const isAdmin = req.user?.role === 'admin';
        if (!isAdmin && String(note.owner) !== String(req.user?.id)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        res.json(note);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update Note
export const updateNote = async (req, res) => {
    try {
        const { title, content } = req.body;
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ message: 'Note not found' });
        const isAdmin = req.user?.role === 'admin';
        if (!isAdmin && String(note.owner) !== String(req.user?.id)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        if (title) note.title = title;
        if (content) note.content = content;

        await note.save();
        res.json(note);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Delete Note
export const deleteNote = async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid note ID" });
    }

    try {
        const note = await Note.findById(id);
        if (!note) return res.status(404).json({ message: "Note not found" });
        const isAdmin = req.user?.role === 'admin';
        if (!isAdmin && String(note.owner) !== String(req.user?.id)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        await note.deleteOne(); // safer than remove()
        res.json({ message: "Note deleted" });
    } catch (err) {
        console.error("Delete note error:", err);
        res.status(500).json({ message: "Server error deleting note" });
    }
};
