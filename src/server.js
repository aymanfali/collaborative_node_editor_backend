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
    origin: "http://localhost:5173", // frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Socket.IO events
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("editor-changes", (data) => {
    // Broadcast to everyone else
    socket.broadcast.emit("editor-changes", data);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
