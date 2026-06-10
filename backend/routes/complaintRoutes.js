// ============================================================
//  Worker Connect — complaintRoutes.js
//  Complaint submission and admin resolution routes
// ============================================================

const express = require("express");
const router  = express.Router();

const {
  submitComplaint,
  getComplaint,
  getUserComplaints,
  updateComplaintStatus,
  resolveComplaint,
} = require("../controllers/complaintController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");

// ─────────────────────────────────────────────
//  Protected — Authenticated User Routes
// ─────────────────────────────────────────────

// @route   GET /api/complaints/user
// @desc    Get all complaints submitted by the logged-in user
// @access  Private (customer)
// NOTE: static route defined before /:id to prevent Express
//       treating "user" as a dynamic complaint ID param
router.get("/user", protect, getUserComplaints);

// @route   POST /api/complaints/
// @desc    Submit a new complaint against a worker or user
// @access  Private (customer)
router.post("/", protect, submitComplaint);

// @route   GET /api/complaints/:id
// @desc    Get a single complaint by ID
// @access  Private (complainant or admin)
router.get("/:id", protect, getComplaint);

// ─────────────────────────────────────────────
//  Protected — Admin Only Routes
// ─────────────────────────────────────────────

// @route   PUT /api/complaints/status/:id
// @desc    Admin moves complaint through status machine
//          (Pending → Under Review → Resolved | Rejected)
// @access  Private (admin)
router.put("/status/:id",  protect, adminOnly, updateComplaintStatus);

// @route   PUT /api/complaints/resolve/:id
// @desc    Admin finalises complaint with resolution notes and outcome
// @access  Private (admin)
router.put("/resolve/:id", protect, adminOnly, resolveComplaint);

module.exports = router;