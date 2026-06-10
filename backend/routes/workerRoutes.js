// ============================================================
//  Worker Connect — workerRoutes.js
//  Worker profile and discovery routes
// ============================================================

const express = require("express");
const router  = express.Router();

const {
  createWorkerProfile,
  updateWorkerProfile,
  getWorkerProfile,
  searchWorkers,
  getNearbyWorkers,
  updateAvailability,
  getTopRatedWorkers,
  verifyWorker,
} = require("../controllers/workerController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");

// ─────────────────────────────────────────────
//  Public Routes
// ─────────────────────────────────────────────

// @route   GET /api/workers/search
// @desc    Search workers by skill, location, price, rating, availability
// @access  Public
// NOTE: must be defined before /:id to avoid "search" being treated as an ID
router.get("/search", searchWorkers);

// @route   GET /api/workers/nearby
// @desc    Get workers near a given lat/lng within a radius
// @access  Public
router.get("/nearby", getNearbyWorkers);

// @route   GET /api/workers/top-rated
// @desc    Get top-rated verified workers
// @access  Public
router.get("/top-rated", getTopRatedWorkers);

// @route   GET /api/workers/:id
// @desc    Get a single worker's public profile
// @access  Public
router.get("/:id", getWorkerProfile);

// ─────────────────────────────────────────────
//  Protected — Authenticated Worker Routes
// ─────────────────────────────────────────────

// @route   POST /api/workers/
// @desc    Create worker profile after registration
// @access  Private (worker)
router.post("/", protect, createWorkerProfile);

// @route   PUT /api/workers/:id
// @desc    Update worker profile
// @access  Private (worker)
router.put("/:id", protect, updateWorkerProfile);

// @route   PUT /api/workers/availability
// @desc    Toggle or set worker availability status
// @access  Private (worker)
router.put("/availability", protect, updateAvailability);

// ─────────────────────────────────────────────
//  Protected — Admin Only Routes
// ─────────────────────────────────────────────

// @route   PUT /api/workers/verify/:id
// @desc    Approve or revoke a worker's verified status
// @access  Private (admin)
router.put("/verify/:id", protect, adminOnly, verifyWorker);

module.exports = router;