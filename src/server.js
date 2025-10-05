import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

// Connect DB
connectDB();

// Create HTTP server from Express app
const server = createServer(app);

// Attach Socket.IO to the same server
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL, // frontend URL
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

// Expose io instance and track active socket connections
app.set("io", io);
let activeSockets = 0;
app.set("activeSockets", activeSockets);

// Map noteId -> Map<socketId, userInfo>
// userInfo: { userId, name, color }
const roomPresence = new Map();

// Socket.IO events
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  activeSockets += 1;
  app.set("activeSockets", activeSockets);

  // Join a specific note room for scoped collaboration
  socket.on("join-note", ({ noteId, user }) => {
    if (!noteId) return;
    socket.join(noteId);
    if (!roomPresence.has(noteId)) roomPresence.set(noteId, new Map());
    const room = roomPresence.get(noteId);
    room.set(socket.id, {
      userId: user?.id || user?._id || socket.id,
      name: user?.name || user?.email || "Anonymous",
      color: user?.color || "#22c55e",
    });
    // Notify room of presence update
    io.to(noteId).emit("presence", Array.from(room.values()));
  });

  // Leave a note room
  socket.on("leave-note", ({ noteId }) => {
    if (!noteId) return;
    socket.leave(noteId);
    if (roomPresence.has(noteId)) {
      const room = roomPresence.get(noteId);
      room.delete(socket.id);
      io.to(noteId).emit("presence", Array.from(room.values()));
      if (room.size === 0) roomPresence.delete(noteId);
    }
  });

  // Editor changes scoped to a room
  socket.on("editor-changes", ({ noteId, delta }) => {
    if (!noteId || !delta) return;
    socket.to(noteId).emit("editor-changes", delta);
  });

  // Cursor updates scoped to a room
  socket.on("cursor-update", ({ noteId, cursor }) => {
    if (!noteId || !cursor) return;
    // cursor: { userId, name, color, index, length }
    socket.to(noteId).emit("cursor-update", cursor);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    activeSockets = Math.max(0, activeSockets - 1);
    app.set("activeSockets", activeSockets);
    // Clean up presence from all rooms the socket was part of
    for (const [noteId, room] of roomPresence.entries()) {
      if (room.has(socket.id)) {
        room.delete(socket.id);
        io.to(noteId).emit("presence", Array.from(room.values()));
        if (room.size === 0) roomPresence.delete(noteId);
      }
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running at ${process.env.FRONTEND_URL}:${PORT}`);
});
