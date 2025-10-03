import express from "express";
import { errorHandler } from "./middlewares/error.middleware.js";
import morgan from "morgan";
import mainRotues from "./routes/v1/index.routes.js";
import cors from "cors";
import authRoutes from "./routes/v1/auth.routes.js";
import adminRoutes from "./routes/v1/admin.routes.js";
import passport from "./config/passport.js";
import cookieParser from "cookie-parser";


const app = express();

// Enable CORS for your frontend with credentials (cookies)
app.use(cors({
  origin: "http://localhost:5173", // frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

// Core middleware
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use("/api/v1", mainRotues);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use(errorHandler);

export default app;
