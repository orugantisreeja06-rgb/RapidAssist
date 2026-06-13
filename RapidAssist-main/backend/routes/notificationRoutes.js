

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




router.put("/read-all", protect, markAllAsRead);


router.post("/", protect, adminOnly, createNotification);


router.get("/", protect, getUserNotifications);


router.put("/:id/read", protect, markAsRead);

router.delete("/:id", protect, deleteNotification);

module.exports = router;
