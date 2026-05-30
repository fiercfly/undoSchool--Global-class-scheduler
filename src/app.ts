import express from "express";
import cors from "cors";
import path from "path";
import apiRoutes from "./routes";
import { errorHandler } from "./errors/errorHandler";
import db from "./database/connection";

const app = express();

// Standard Middlewares
app.use(cors());
app.use(express.json());

// Serve the UI from the public/ folder
// process.cwd() always points to the project root regardless of where the compiled file lives
app.use(express.static(path.join(process.cwd(), "public")));

// Root: serve the HTML UI
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Global Class Offering Booking System API is healthy.",
    timestamp: new Date().toISOString(),
  });
});

// Dynamic Seed Metadata endpoint for the Playground frontend
app.get("/api/metadata", async (req, res, next) => {
  try {
    const courses = await db("courses").select("id", "title", "description");
    const teachers = await db("teachers").select("id", "name", "email");
    const parents = await db("parents").select("id", "name", "email");
    res.status(200).json({ courses, teachers, parents });
  } catch (err) {
    next(err);
  }
});

// Mount all API endpoints under /api
app.use("/api", apiRoutes);

// Fallback for unmatched routes
app.use((req, res, next) => {
  res.status(404).json({
    status: "fail",
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;