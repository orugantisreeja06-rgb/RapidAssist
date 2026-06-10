// ============================================================
//  Worker Connect — bookingRoutes.js
//  Booking lifecycle routes
// ============================================================

const express = require("express");
const router  = express.Router();

const {
  createBooking,
  getBookingDetails,
  getUserBookings,
  getWorkerBookings,
  updateBookingStatus,
  cancelBooking,
  emergencyBooking,
} = require("../controllers/bookingController");

const { protect } = require("../middlewares/authMiddleware");

// ─────────────────────────────────────────────
//  All booking routes require authentication
// ─────────────────────────────────────────────

// @route   GET /api/bookings/user
// @desc    Get all bookings placed by the logged-in user
// @access  Private (customer)
// NOTE: static routes defined before /:id to prevent Express
//       treating "user" or "worker" as a dynamic ID param
router.get("/user",    protect, getUserBookings);

// @route   GET /api/bookings/worker
// @desc    Get all bookings assigned to the logged-in worker
// @access  Private (worker)
router.get("/worker",  protect, getWorkerBookings);

// @route   POST /api/bookings/emergency
// @desc    Create a high-priority emergency booking
// @access  Private (customer)
router.post("/emergency", protect, emergencyBooking);

// @route   POST /api/bookings/
// @desc    Create a new standard booking
// @access  Private (customer)
router.post("/",       protect, createBooking);

// @route   GET /api/bookings/:id
// @desc    Get a single booking by ID
// @access  Private (booking owner, assigned worker, or admin)
router.get("/:id",     protect, getBookingDetails);

// @route   PUT /api/bookings/status/:id
// @desc    Worker updates booking status (Accepted / In Progress / Completed / Cancelled)
// @access  Private (worker)
router.put("/status/:id", protect, updateBookingStatus);

// @route   DELETE /api/bookings/:id
// @desc    User cancels a pending booking
// @access  Private (customer)
router.delete("/:id",  protect, cancelBooking);

module.exports = router;