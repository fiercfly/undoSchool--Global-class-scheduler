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

// Metadata endpoint: returns all seeded teachers, parents, and courses so the UI can populate dropdowns
app.get("/api/metadata", async (req, res, next) => {
  try {
    const [teachers, parents, courses] = await Promise.all([
      db("teachers").select("id", "name", "email"),
      db("parents").select("id", "name", "email"),
      db("courses").select("id", "title"),
    ]);
    res.status(200).json({ teachers, parents, courses });
  } catch (err) {
    next(err);
  }
});

// Mount all API endpoints under /api
app.use("/api", apiRoutes);

// Fallback for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    status: "fail",
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
