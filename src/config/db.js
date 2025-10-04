import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
  try {
    // Ensure indexes are created automatically (needed for text search)
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: true });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};
