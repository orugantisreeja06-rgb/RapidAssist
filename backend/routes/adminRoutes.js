// ============================================================
//  Worker Connect — adminRoutes.js
//  Admin-only platform management routes
// ============================================================

const express = require("express");
const router  = express.Router();

const {
  getDashboardStats,
  getAllUsers,
  getAllWorkers,
  verifyWorker,
  deleteUser,
  deleteWorker,
  getAllComplaints,
  getReports,
} = require("../controllers/adminController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");

// ─────────────────────────────────────────────
//  All admin routes require authentication
//  and admin role — applied to every route
// ─────────────────────────────────────────────

// @route   GET /api/admin/dashboard
// @desc    Get high-level platform stats snapshot
// @access  Private (admin)
router.get("/dashboard", protect, adminOnly, getDashboardStats);

// @route   GET /api/admin/users
// @desc    Get all registered customer accounts
// @access  Private (admin)
router.get("/users", protect, adminOnly, getAllUsers);

// @route   GET /api/admin/workers
// @desc    Get all worker accounts with optional filters
// @access  Private (admin)
router.get("/workers", protect, adminOnly, getAllWorkers);

// @route   PUT /api/admin/verify-worker/:id
// @desc    Approve or revoke a worker's verified status
// @access  Private (admin)
router.put("/verify-worker/:id", protect, adminOnly, verifyWorker);

// @route   DELETE /api/admin/users/:id
// @desc    Permanently delete a customer account
// @access  Private (admin)
router.delete("/users/:id", protect, adminOnly, deleteUser);

// @route   DELETE /api/admin/workers/:id
// @desc    Permanently delete a worker account
// @access  Private (admin)
router.delete("/workers/:id", protect, adminOnly, deleteWorker);

// @route   GET /api/admin/complaints
// @desc    Get all complaints with status filter and pagination
// @access  Private (admin)
router.get("/complaints", protect, adminOnly, getAllComplaints);

// @route   GET /api/admin/reports
// @desc    Get platform analytics: top services, workers, revenue, trends
// @access  Private (admin)
router.get("/reports", protect, adminOnly, getReports);

module.exports = router;