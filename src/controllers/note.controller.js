import mongoose from 'mongoose';
import Note from '../models/note.model.js';
import { User } from '../models/user.model.js';

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
        let query = {};
        if (!isAdmin) {
            query = {
                $or: [
                    { owner: req.user?.id },
                    { 'collaborators.user': req.user?.id }
                ]
            };
        }
        const notes = await Note.find(query)
            .populate('owner', 'name email')
            .populate('collaborators.user', 'name email');
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
        const isOwner = String(note.owner) === String(req.user?.id);
        const isCollaborator = note.collaborators?.some(c => String(c.user) === String(req.user?.id));
        if (!isAdmin && !isOwner && !isCollaborator) {
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
        const isOwner = String(note.owner) === String(req.user?.id);
        const collab = note.collaborators?.find(c => String(c.user) === String(req.user?.id));
        const canEdit = isAdmin || isOwner || (collab && collab.permission === 'edit');
        if (!canEdit) {
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
        const isOwner = String(note.owner) === String(req.user?.id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Only owner or admin can delete' });
        }
        await note.deleteOne(); // safer than remove()
        res.json({ message: "Note deleted" });
    } catch (err) {
        console.error("Delete note error:", err);
        res.status(500).json({ message: "Server error deleting note" });
    }
};

// Collaborators APIs
export const listCollaborators = async (req, res) => {
    try {
        const note = await Note.findById(req.params.id).populate('collaborators.user', 'name email');
        if (!note) return res.status(404).json({ message: 'Note not found' });
        const isAdmin = req.user?.role === 'admin';
        const isOwner = String(note.owner) === String(req.user?.id);
        const isCollaborator = note.collaborators?.some(c => String(c.user) === String(req.user?.id));
        if (!isAdmin && !isOwner && !isCollaborator) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        res.json(note.collaborators || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const upsertCollaborator = async (req, res) => {
    try {
        const { email, permission } = req.body;
        if (!email) return res.status(400).json({ message: 'email is required' });
        if (permission && !['view', 'edit'].includes(permission)) {
            return res.status(400).json({ message: 'permission must be view|edit' });
        }
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ message: 'Note not found' });

        const isAdmin = req.user?.role === 'admin';
        const isOwner = String(note.owner) === String(req.user?.id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Only owner or admin can manage collaborators' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User with this email not found' });
        if (String(user._id) === String(note.owner)) {
            return res.status(400).json({ message: 'Owner is already full access' });
        }

        const idx = note.collaborators.findIndex(c => String(c.user) === String(user._id));
        if (idx >= 0) {
            if (permission) note.collaborators[idx].permission = permission;
        } else {
            note.collaborators.push({ user: user._id, permission: permission || 'view' });
        }
        await note.save();
        const populated = await note.populate('collaborators.user', 'name email');
        res.json(populated.collaborators);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const removeCollaborator = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const note = await Note.findById(id);
        if (!note) return res.status(404).json({ message: 'Note not found' });

        const isAdmin = req.user?.role === 'admin';
        const isOwner = String(note.owner) === String(req.user?.id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Only owner or admin can manage collaborators' });
        }
        note.collaborators = note.collaborators.filter(c => String(c.user) !== String(userId));
        await note.save();
        res.json({ message: 'Collaborator removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
