// ============================================================
// server.js — Worker Connect API Entry Point
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// ── Route Imports ────────────────────────────────────────────
const authRoutes         = require("./routes/authRoutes");
const userRoutes         = require("./routes/userRoutes");
const workerRoutes       = require("./routes/workerRoutes");
const bookingRoutes      = require("./routes/bookingRoutes");
const reviewRoutes       = require("./routes/reviewRoutes");
const complaintRoutes    = require("./routes/complaintRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes        = require("./routes/adminRoutes");
const reportRoutes       = require("./routes/reportRoutes");

// ── Middleware Imports ───────────────────────────────────────
const errorMiddleware = require("./middlewares/errorMiddleware");

// ── App Initialisation ───────────────────────────────────────
const app = express();

// ── Connect to MongoDB ───────────────────────────────────────
connectDB();

// ── Core Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check / Root Route ────────────────────────────────
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Worker Connect API Running",
  });
});

// ── API Routes ───────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/workers",       workerRoutes);
app.use("/api/bookings",      bookingRoutes);
app.use("/api/reviews",       reviewRoutes);
app.use("/api/complaints",    complaintRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api/reports",       reportRoutes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ── Global Error Middleware ──────────────────────────────────
// Must be registered last, after all routes
app.use(errorMiddleware);

// ── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅  Worker Connect API is running on port ${PORT}`);
  console.log(`🌐  Environment : ${process.env.NODE_ENV || "development"}`);
const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

connectDB();

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("RapidAssist API Running...");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});