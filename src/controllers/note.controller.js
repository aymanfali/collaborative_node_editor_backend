import mongoose from 'mongoose';
import Note from '../models/note.model.js';
import { User } from '../models/user.model.js';
import puppeteer from 'puppeteer';

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
        const q = (req.query?.q || '').toString().trim();

        // Base authorization filter
        let query = {};
        if (!isAdmin) {
            query = {
                $or: [
                    { owner: req.user?.id },
                    { 'collaborators.user': req.user?.id }
                ]
            };
        }

        // Apply full-text search if q present
        const hasSearch = q.length > 0;
        if (hasSearch) {
            query = { ...query, $text: { $search: q } };
        }

        // Projection and sort based on whether text search is used
        const findQuery = Note.find(query, hasSearch ? { score: { $meta: 'textScore' } } : undefined);
        if (hasSearch) {
            findQuery.sort({ score: { $meta: 'textScore' } });
        } else {
            findQuery.sort({ createdAt: -1 });
        }

        const notes = await findQuery
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
        const collab = note.collaborators?.find(c => String(c.user) === String(req.user?.id));
        const isCollaborator = !!collab;
        if (!isAdmin && !isOwner && !isCollaborator) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const canEdit = isAdmin || isOwner || (collab && collab.permission === 'edit');
        const payload = note.toObject({ virtuals: true });
        payload.__meta = {
            canEdit,
            canManage: isAdmin || isOwner,
            isCollaborator,
            permission: collab?.permission || (isOwner ? 'edit' : (isAdmin ? 'edit' : null)),
        };
        res.json(payload);
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

// ---------- Exports ----------

function sanitizeFilename(name = 'note') {
    return String(name)
        .trim()
        .replace(/[\n\r\t]/g, ' ')
        .replace(/[^a-zA-Z0-9 _.-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 100) || 'note';
}

async function loadNoteAuthorized(req) {
    const note = await Note.findById(req.params.id).populate('owner', 'name email');
    if (!note) return { error: { code: 404, message: 'Note not found' } };
    const isAdmin = req.user?.role === 'admin';
    const isOwner = String(note.owner?._id || note.owner) === String(req.user?.id);
    const isCollaborator = note.collaborators?.some(c => String(c.user) === String(req.user?.id));
    if (!isAdmin && !isOwner && !isCollaborator) {
        return { error: { code: 403, message: 'Forbidden' } };
    }
    return { note };
}

export const exportNoteMarkdown = async (req, res) => {
    try {
        const { note, error } = await loadNoteAuthorized(req);
        if (error) return res.status(error.code).json({ message: error.message });

        const title = note.title || 'Untitled';
        const md = `# ${title}\n\n${note.content || ''}`;
        const filename = `${sanitizeFilename(title)}.md`;
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(md);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

function escapeHtml(unsafe = '') {
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export const exportNoteHTML = async (req, res) => {
    try {
        const { note, error } = await loadNoteAuthorized(req);
        if (error) return res.status(error.code).json({ message: error.message });

        const title = note.title || 'Untitled';
        const safeTitle = escapeHtml(title);
        const bodyContent = (note.content || '').trim();
        // Basic approach: if content looks like HTML, include as-is; otherwise escape and wrap in <pre>
        const isHtmlLike = /<\w+[^>]*>/i.test(bodyContent);
        const htmlBody = isHtmlLike ? bodyContent : `<pre>${escapeHtml(bodyContent)}</pre>`;
        const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 2rem; }
    h1 { margin-top: 0; }
    pre { white-space: pre-wrap; word-wrap: break-word; }
  </style>
  </head>
<body>
  <h1>${safeTitle}</h1>
  ${htmlBody}
</body>
</html>`;
        const filename = `${sanitizeFilename(title)}.html`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(html);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

export const exportNotePDF = async (req, res) => {
    try {
        const { note, error } = await loadNoteAuthorized(req);
        if (error) return res.status(error.code).json({ message: error.message });

        const title = note.title || 'Untitled';
        const safeTitle = escapeHtml(title);
        const bodyContent = (note.content || '').trim();
        const isHtmlLike = /<\w+[^>]*>/i.test(bodyContent);
        const htmlBody = isHtmlLike ? bodyContent : `<pre>${escapeHtml(bodyContent)}</pre>`;
        const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    @page { margin: 25mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; color: #0f172a; }
    h1 { font-size: 24px; margin: 0 0 16px 0; }
    pre { white-space: pre-wrap; word-wrap: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; background:#f8fafc; padding:12px; border-radius:6px; }
    code { background:#f1f5f9; padding:2px 4px; border-radius:4px; }
    p { line-height: 1.6; margin: 8px 0; }
    ul, ol { margin: 8px 0 8px 20px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
    blockquote { border-left: 4px solid #e2e8f0; margin: 8px 0; padding: 8px 12px; color: #334155; background:#f8fafc; }
  </style>
  </head>
<body>
  <h1>${safeTitle}</h1>
  ${htmlBody}
</body>
</html>`;

        const filename = `${sanitizeFilename(title)}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' } });
            return res.status(200).send(pdfBuffer);
        } finally {
            await browser.close();
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
