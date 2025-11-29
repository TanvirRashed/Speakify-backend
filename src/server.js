// src/server.js

// 1) Load .env BEFORE anything else that uses process.env
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Make the path explicit so CWD never bites us
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// 2) Now import the rest
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { initDB } from "./config/database.js";
import errorHandler from "./middleware/errorHandler.js";

// Routes (these may indirectly import openaiService.js)
import ttsRoutes from "./routes/tts.js";
import asrRoutes from "./routes/asr.js";
import statsRoutes from "./routes/stats.js";
import reasoningRoutes from "./routes/reasoning.js";
// import reasoningController from "./controllers/reasoningController.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api/", limiter);

// Health check route
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Speakify API is running",
    timestamp: new Date().toISOString(),
  });
});

// Convenience GET /reason for quick browser testing (maps query -> body)
// app.get("/reason", async (req, res, next) => {
//   try {
//     req.body = req.body || {};
//     if (req.query.transcript) req.body.transcript = req.query.transcript;
//     if (req.query.question) req.body.question = req.query.question;
//     return await reasoningController.resonate(req, res, next);
//   } catch (err) {
//     next(err);
//   }
// });

// API Routes
app.use("/api/tts", ttsRoutes);
app.use("/api/asr", asrRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/reason", reasoningRoutes);
// app.use("/reason", reasoningRoutes);
// Convenience mount: expose reasoning routes at the top-level /reason
// so quick browser GETs to /reason work during development.

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Speakify API root – server is running',
    routes: ['/health', '/reason', '/api/tts', '/api/asr', '/api/stats', '/api/reason'],
  });
});

// 404 handler — Express 5 compatible
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database tables
    await initDB();

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════╗
║     🎙️  SPEAKIFY API SERVER         ║
╠═══════════════════════════════════════╣
║  Environment: ${process.env.NODE_ENV || "development"}
║  Port: ${PORT}
║  Database: Connected ✅
║  Firebase: Initialized ✅
║  OpenAI: Configured ✅
║  Cloudinary: Connected ✅
╚═══════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

// Start the server
startServer();

export default app;
