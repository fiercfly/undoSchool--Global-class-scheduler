import express from "express";
import cors from "cors";
import apiRoutes from "./routes";
import { errorHandler } from "./errors/errorHandler";

const app = express();

// Standard Middlewares
app.use(cors());
app.use(express.json());

// Root welcome endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    name: "Global Class Offering Booking System API",
    status: "online",
    version: "1.0.0",
    description: "Production-ready backend API for managing course offerings, dynamic timezone localizations, and high-concurrency booking transactions with strict database-level locking.",
    docs: "https://github.com/fiercfly/undoSchool--Global-class-scheduler#api-documentation",
    health: "/health",
    timestamp: new Date().toISOString(),
  });
});

// API Documentation / Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Global Class Offering Booking System API is healthy.",
    timestamp: new Date().toISOString(),
  });
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
