
const asyncHandler = require("express-async-handler");
const Notification = require("../models/Notification");

const NOTIFICATION_TYPES = Object.freeze([
  "booking",
  "review",
  "complaint",
  "payment",
  "system",
  "alert",
]);

const createNotification = asyncHandler(async (req, res) => {
  const {
    recipient,
    recipientModel,
    title,
    message,
    type,
    booking,
    complaint,
  } = req.body;

  if (!recipient || !recipientModel || !title || !message) {
    res.status(400);
    throw new Error(
      "recipient, recipientModel, title, and message are required."
    );
  }

  const ALLOWED_MODELS = ["User", "Worker"];
  if (!ALLOWED_MODELS.includes(recipientModel)) {
    res.status(400);
    throw new Error(
      `recipientModel must be one of: ${ALLOWED_MODELS.join(", ")}.`
    );
  }

  if (type && !NOTIFICATION_TYPES.includes(type)) {
    res.status(400);
    throw new Error(
      `Invalid type. Must be one of: ${NOTIFICATION_TYPES.join(", ")}.`
    );
  }

  const notifData = {
    recipient,
    recipientModel,
    title:   title.trim(),
    message: message.trim(),
    type:    type || "system",
    isRead:  false,
  };
  if (booking)   notifData.booking   = booking;
  if (complaint) notifData.complaint = complaint;

  const notification = await Notification.create(notifData);

  res.status(201).json({
    success:      true,
    message:      "Notification created successfully.",
    notification,
  });
});

const getUserNotifications = asyncHandler(async (req, res) => {
  const { isRead, type } = req.query;
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 15);
  const skip  = (page - 1) * limit;

  const filter = { recipient: req.user.id };

  if (isRead !== undefined) {
    if (isRead !== "true" && isRead !== "false") {
      res.status(400);
      throw new Error('isRead must be "true" or "false".');
    }
    filter.isRead = isRead === "true";
  }

  if (type) {
    if (!NOTIFICATION_TYPES.includes(type)) {
      res.status(400);
      throw new Error(
        `Invalid type. Must be one of: ${NOTIFICATION_TYPES.join(", ")}.`
      );
    }
    filter.type = type;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user.id, isRead: false }),
  ]);

  res.status(200).json({
    success:     true,
    unreadCount,
    total,
    page,
    totalPages:  Math.ceil(total / limit),
    count:       notifications.length,
    notifications,
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found.");
  }

  if (notification.recipient.toString() !== req.user.id) {
    res.status(403);
    throw new Error("You are not authorized to update this notification.");
  }

  if (notification.isRead) {
    return res.status(200).json({
      success: true,
      message: "Notification was already marked as read.",
      notification,
    });
  }

  notification.isRead  = true;
  notification.readAt  = new Date();
  await notification.save();

  res.status(200).json({
    success:      true,
    message:      "Notification marked as read.",
    notification,
  });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  res.status(200).json({
    success:      true,
    message:      "All notifications marked as read.",
    updatedCount: result.modifiedCount,
  });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found.");
  }

  const isRecipient = notification.recipient.toString() === req.user.id;
  const isAdmin     = req.user.role === "admin";

  if (!isRecipient && !isAdmin) {
    res.status(403);
    throw new Error("You are not authorized to delete this notification.");
  }

  await notification.deleteOne();

  res.status(200).json({
    success: true,
    message: "Notification deleted successfully.",
  });
});

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
