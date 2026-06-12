// ============================================================
//  Worker Connect — notificationRoutes.js
//  In-app notification routes
// ============================================================

const express = require("express");
const router  = express.Router();

const {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");

// ─────────────────────────────────────────────
//  All notification routes require authentication
// ─────────────────────────────────────────────

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read for the logged-in user
// @access  Private
// NOTE: static route defined before /:id to prevent Express
//       treating "read-all" as a dynamic notification ID param
router.put("/read-all", protect, markAllAsRead);

// @route   POST /api/notifications/
// @desc    Create a new notification (admin broadcast or internal use)
// @access  Private (admin)
router.post("/", protect, adminOnly, createNotification);

// @route   GET /api/notifications/
// @desc    Get all notifications for the logged-in user, latest first
// @access  Private
router.get("/", protect, getUserNotifications);

// @route   PUT /api/notifications/:id/read
// @desc    Mark a single notification as read
// @access  Private
router.put("/:id/read", protect, markAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification (owner or admin)
// @access  Private
router.delete("/:id", protect, deleteNotification);

module.exports = router;