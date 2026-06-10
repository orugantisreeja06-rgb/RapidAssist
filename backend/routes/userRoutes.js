// ============================================================
//  Worker Connect — userRoutes.js
//  User profile, service history, and saved worker routes
// ============================================================

const express = require("express");
const router  = express.Router();

const {
  getProfile,
  updateProfile,
  getServiceHistory,
  saveWorker,
  getSavedWorkers,
  removeSavedWorker,
} = require("../controllers/userController");

const { protect } = require("../middlewares/authMiddleware");

// ─────────────────────────────────────────────
//  All user routes require authentication
// ─────────────────────────────────────────────

// @route   GET /api/users/profile
// @desc    Get the logged-in user's profile
// @access  Private
router.get("/profile", protect, getProfile);

// @route   PUT /api/users/profile
// @desc    Update name, email, phone, and address
// @access  Private
router.put("/profile", protect, updateProfile);

// @route   GET /api/users/history
// @desc    Get all completed bookings for the logged-in user
// @access  Private
router.get("/history", protect, getServiceHistory);

// @route   GET /api/users/saved-workers
// @desc    Get the logged-in user's saved (favourite) workers
// @access  Private
// NOTE: defined before /save-worker/:workerId and
//       /saved-workers/:workerId to ensure exact path matching
router.get("/saved-workers", protect, getSavedWorkers);

// @route   POST /api/users/save-worker/:workerId
// @desc    Add a worker to the logged-in user's saved list
// @access  Private
router.post("/save-worker/:workerId", protect, saveWorker);

// @route   DELETE /api/users/saved-workers/:workerId
// @desc    Remove a worker from the logged-in user's saved list
// @access  Private
router.delete("/saved-workers/:workerId", protect, removeSavedWorker);

module.exports = router;