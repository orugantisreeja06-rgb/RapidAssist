// ============================================================
//  Worker Connect — reportRoutes.js
//  Analytics and reporting routes — all admin-only
// ============================================================

const express = require("express");
const router  = express.Router();

const {
  getMostBookedServices,
  getTopRatedWorkers,
  getComplaintStatistics,
  getUserActivityReport,
  getMonthlyBookingReport,
  getDashboardReport,
} = require("../controllers/reportController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");

// ─────────────────────────────────────────────
//  All report routes require authentication
//  and admin role
// ─────────────────────────────────────────────

// @route   GET /api/reports/most-booked
// @desc    Top 10 most booked service categories with completion rates
// @access  Private (admin)
router.get("/most-booked", protect, adminOnly, getMostBookedServices);

// @route   GET /api/reports/top-rated-workers
// @desc    Top 10 verified workers sorted by average rating
// @access  Private (admin)
router.get("/top-rated-workers", protect, adminOnly, getTopRatedWorkers);

// @route   GET /api/reports/complaints
// @desc    Complaint breakdown by status and type with resolution rate
// @access  Private (admin)
router.get("/complaints", protect, adminOnly, getComplaintStatistics);

// @route   GET /api/reports/user-activity
// @desc    User activity report: total, active, new this month
// @access  Private (admin)
router.get("/user-activity", protect, adminOnly, getUserActivityReport);

// @route   GET /api/reports/monthly-bookings
// @desc    Monthly booking count and revenue for the last N months
// @access  Private (admin)
router.get("/monthly-bookings", protect, adminOnly, getMonthlyBookingReport);

// @route   GET /api/reports/dashboard-analytics
// @desc    Combined dashboard report: users, workers, bookings, revenue, trends
// @access  Private (admin)
router.get("/dashboard-analytics", protect, adminOnly, getDashboardReport);

module.exports = router;