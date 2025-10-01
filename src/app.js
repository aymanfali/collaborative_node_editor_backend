import express from "express";
import { errorHandler } from "./middlewares/error.middleware.js";
import morgan from "morgan";
import mainRotues from "./routes/v1/index.routes.js";
import cors from "cors";

const app = express();

// Enable CORS for your frontend
app.use(cors({
  origin: "http://localhost:5173", // frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

// Core middleware
app.use(morgan("dev"));
app.use(express.json());

app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use("/api/v1", mainRotues);
app.use(errorHandler);

export default app;
