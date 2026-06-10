// ============================================================
//  Worker Connect — reviewRoutes.js
//  Review and rating routes
// ============================================================

const express = require("express");
const router  = express.Router();

const {
  addReview,
  getWorkerReviews,
  updateReview,
  deleteReview,
  getAverageRating,
} = require("../controllers/reviewController");

const { protect } = require("../middlewares/authMiddleware");

// ─────────────────────────────────────────────
//  Public Routes
// ─────────────────────────────────────────────

// @route   GET /api/reviews/worker/:workerId
// @desc    Get all reviews for a specific worker
// @access  Public
// NOTE: defined before /:reviewId to prevent "worker" being
//       matched as a dynamic review ID param
router.get("/worker/:workerId", getWorkerReviews);

// @route   GET /api/reviews/rating/:workerId
// @desc    Get average rating and star distribution for a worker
// @access  Public
router.get("/rating/:workerId", getAverageRating);

// ─────────────────────────────────────────────
//  Protected Routes — Authentication Required
// ─────────────────────────────────────────────

// @route   POST /api/reviews/
// @desc    Submit a review for a completed booking
// @access  Private (customer)
router.post("/", protect, addReview);

// @route   PUT /api/reviews/:reviewId
// @desc    Update own review (rating or comment)
// @access  Private (review owner)
router.put("/:reviewId", protect, updateReview);

// @route   DELETE /api/reviews/:reviewId
// @desc    Delete own review (owner or admin)
// @access  Private (review owner or admin)
router.delete("/:reviewId", protect, deleteReview);

module.exports = router;