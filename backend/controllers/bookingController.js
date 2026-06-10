// ============================================================
//  Worker Connect — bookingController.js
//  Handles all booking lifecycle operations
// ============================================================

const asyncHandler   = require("express-async-handler");
const Booking        = require("../models/Booking");
const Worker         = require("../models/Worker");
const User           = require("../models/User");
const Notification   = require("../models/Notification");

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const BOOKING_STATUS = Object.freeze({
  PENDING:     "Pending",
  ACCEPTED:    "Accepted",
  IN_PROGRESS: "In Progress",
  COMPLETED:   "Completed",
  CANCELLED:   "Cancelled",
});

// Valid transitions a worker is permitted to make
const WORKER_ALLOWED_TRANSITIONS = Object.freeze({
  [BOOKING_STATUS.PENDING]:     [BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.CANCELLED],
  [BOOKING_STATUS.ACCEPTED]:    [BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.CANCELLED],
  [BOOKING_STATUS.IN_PROGRESS]: [BOOKING_STATUS.COMPLETED],
  [BOOKING_STATUS.COMPLETED]:   [],
  [BOOKING_STATUS.CANCELLED]:   [],
});

// ─────────────────────────────────────────────
//  Helper: create an in-app notification
// ─────────────────────────────────────────────
const createNotification = async ({ recipient, recipientModel, title, message, bookingId }) => {
  try {
    await Notification.create({
      recipient,
      recipientModel, // "User" | "Worker"
      title,
      message,
      booking: bookingId,
      isRead:  false,
    });
  } catch (err) {
    // Notification failure must never break the main flow
    console.error("[Notification Error]", err.message);
  }
};

// ─────────────────────────────────────────────
//  Helper: shared populate config
// ─────────────────────────────────────────────
const POPULATE_USER   = { path: "user",   select: "name email phone"                                        };
const POPULATE_WORKER = { path: "worker", select: "name email phone skills serviceCharges location averageRating" };

// ============================================================
//  1. createBooking
//     POST /api/bookings
//     Authenticated user creates a new service booking.
//     A notification is fired to the assigned worker.
// ============================================================
const createBooking = asyncHandler(async (req, res) => {
  const {
    workerId,
    serviceType,
    bookingDate,
    address,
    description,
    totalAmount,
  } = req.body;

  // --- Validate required fields ---
  if (!workerId || !serviceType || !bookingDate || !address) {
    res.status(400);
    throw new Error(
      "workerId, serviceType, bookingDate, and address are required."
    );
  }

  // --- Verify worker exists and is active ---
  const worker = await Worker.findById(workerId);
  if (!worker) {
    res.status(404);
    throw new Error("Worker not found.");
  }
  if (!worker.isVerified) {
    res.status(400);
    throw new Error("This worker has not been verified yet.");
  }
  if (!worker.availability) {
    res.status(400);
    throw new Error("This worker is currently unavailable. Please choose another worker.");
  }

  // --- Prevent duplicate pending/accepted bookings with the same worker ---
  const duplicate = await Booking.findOne({
    user:    req.user.id,
    worker:  workerId,
    status:  { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED] },
  });
  if (duplicate) {
    res.status(409);
    throw new Error(
      "You already have an active booking with this worker. Please wait for it to be resolved."
    );
  }

  // --- Create booking ---
  const booking = await Booking.create({
    user:             req.user.id,
    worker:           workerId,
    serviceType:      serviceType.trim(),
    bookingDate:      new Date(bookingDate),
    address,
    description:      description || "",
    emergencyRequest: false,
    status:           BOOKING_STATUS.PENDING,
    totalAmount:      totalAmount || worker.serviceCharges || 0,
  });

  // --- Notify worker ---
  await createNotification({
    recipient:      workerId,
    recipientModel: "Worker",
    title:          "New Booking Request",
    message:        `You have a new booking request for ${serviceType} on ${new Date(bookingDate).toDateString()}.`,
    bookingId:      booking._id,
  });

  const populated = await booking.populate([POPULATE_USER, POPULATE_WORKER]);

  res.status(201).json({
    success: true,
    message: "Booking created successfully.",
    booking: populated,
  });
});

// ============================================================
//  2. getBookingDetails
//     GET /api/bookings/:id
//     Returns a single booking with full user and worker data.
//     Accessible by the booking's owner, the assigned worker,
//     or an admin.
// ============================================================
const getBookingDetails = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate(POPULATE_USER)
    .populate(POPULATE_WORKER);

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found.");
  }

  // --- Authorization: only owner, assigned worker, or admin ---
  const isOwner  = booking.user?._id.toString()   === req.user.id;
  const isWorker = booking.worker?._id.toString()  === req.user.id;
  const isAdmin  = req.user.role                   === "admin";

  if (!isOwner && !isWorker && !isAdmin) {
    res.status(403);
    throw new Error("You are not authorized to view this booking.");
  }

  res.status(200).json({
    success: true,
    booking,
  });
});

// ============================================================
//  3. getUserBookings
//     GET /api/bookings/my-bookings
//     Returns all bookings placed by the logged-in customer,
//     newest first with optional status filter.
//
//     Query params:
//       status — filter by a specific status value
//       page   — default 1
//       limit  — default 10
// ============================================================
const getUserBookings = asyncHandler(async (req, res) => {
  const { status }  = req.query;
  const page        = Math.max(1, parseInt(req.query.page)  || 1);
  const limit       = Math.min(50, parseInt(req.query.limit) || 10);
  const skip        = (page - 1) * limit;

  const filter = { user: req.user.id };
  if (status) {
    if (!Object.values(BOOKING_STATUS).includes(status)) {
      res.status(400);
      throw new Error(`Invalid status. Must be one of: ${Object.values(BOOKING_STATUS).join(", ")}`);
    }
    filter.status = status;
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(POPULATE_WORKER),
    Booking.countDocuments(filter),
  ]);

  res.status(200).json({
    success:    true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count:      bookings.length,
    bookings,
  });
});

// ============================================================
//  4. getWorkerBookings
//     GET /api/bookings/worker-bookings
//     Returns all bookings assigned to the logged-in worker,
//     newest first with optional status filter.
//
//     Query params:
//       status — filter by a specific status value
//       page / limit
// ============================================================
const getWorkerBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const page       = Math.max(1, parseInt(req.query.page)  || 1);
  const limit      = Math.min(50, parseInt(req.query.limit) || 10);
  const skip       = (page - 1) * limit;

  const filter = { worker: req.user.id };
  if (status) {
    if (!Object.values(BOOKING_STATUS).includes(status)) {
      res.status(400);
      throw new Error(`Invalid status. Must be one of: ${Object.values(BOOKING_STATUS).join(", ")}`);
    }
    filter.status = status;
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(POPULATE_USER),
    Booking.countDocuments(filter),
  ]);

  res.status(200).json({
    success:    true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count:      bookings.length,
    bookings,
  });
});

// ============================================================
//  5. updateBookingStatus
//     PATCH /api/bookings/:id/status
//     Worker updates the booking's status through its lifecycle.
//     Valid transitions are enforced via WORKER_ALLOWED_TRANSITIONS.
//     A notification is sent to the customer on every change.
// ============================================================
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status) {
    res.status(400);
    throw new Error("status is required.");
  }

  if (!Object.values(BOOKING_STATUS).includes(status)) {
    res.status(400);
    throw new Error(`Invalid status. Must be one of: ${Object.values(BOOKING_STATUS).join(", ")}`);
  }

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error("Booking not found.");
  }

  // --- Only the assigned worker may update status ---
  if (booking.worker.toString() !== req.user.id) {
    res.status(403);
    throw new Error("Only the assigned worker can update this booking's status.");
  }

  // --- Enforce allowed state transitions ---
  const allowedNext = WORKER_ALLOWED_TRANSITIONS[booking.status];
  if (!allowedNext.includes(status)) {
    res.status(400);
    throw new Error(
      `Cannot transition from "${booking.status}" to "${status}". ` +
      `Allowed next statuses: ${allowedNext.length ? allowedNext.join(", ") : "none"}.`
    );
  }

  booking.status = status;

  // Record completion timestamp
  if (status === BOOKING_STATUS.COMPLETED) {
    booking.completedAt = new Date();
  }

  await booking.save();

  // --- Notify customer ---
  const statusMessages = {
    [BOOKING_STATUS.ACCEPTED]:    "Your booking has been accepted by the worker.",
    [BOOKING_STATUS.IN_PROGRESS]: "Work on your booking has started.",
    [BOOKING_STATUS.COMPLETED]:   "Your booking has been marked as completed. Please leave a review.",
    [BOOKING_STATUS.CANCELLED]:   "Your booking has been cancelled by the worker.",
  };

  await createNotification({
    recipient:      booking.user,
    recipientModel: "User",
    title:          `Booking ${status}`,
    message:        statusMessages[status] || `Your booking status is now: ${status}.`,
    bookingId:      booking._id,
  });

  const populated = await booking.populate([POPULATE_USER, POPULATE_WORKER]);

  res.status(200).json({
    success: true,
    message: `Booking status updated to "${status}".`,
    booking: populated,
  });
});

// ============================================================
//  6. cancelBooking
//     PATCH /api/bookings/:id/cancel
//     Authenticated user cancels their own booking.
//     Only bookings in "Pending" status may be cancelled.
//     A notification is sent to the worker.
// ============================================================
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found.");
  }

  // --- Only the booking owner may cancel ---
  if (booking.user.toString() !== req.user.id) {
    res.status(403);
    throw new Error("You are not authorized to cancel this booking.");
  }

  // --- Only Pending bookings can be cancelled by customer ---
  if (booking.status !== BOOKING_STATUS.PENDING) {
    res.status(400);
    throw new Error(
      `Booking cannot be cancelled at this stage. ` +
      `Only "${BOOKING_STATUS.PENDING}" bookings can be cancelled. ` +
      `Current status: "${booking.status}".`
    );
  }

  booking.status      = BOOKING_STATUS.CANCELLED;
  booking.cancelledAt = new Date();
  booking.cancelledBy = "user";

  await booking.save();

  // --- Notify worker ---
  await createNotification({
    recipient:      booking.worker,
    recipientModel: "Worker",
    title:          "Booking Cancelled",
    message:        "A customer has cancelled their pending booking request.",
    bookingId:      booking._id,
  });

  res.status(200).json({
    success: true,
    message: "Booking cancelled successfully.",
    booking: {
      _id:         booking._id,
      status:      booking.status,
      cancelledAt: booking.cancelledAt,
    },
  });
});

// ============================================================
//  7. emergencyBooking
//     POST /api/bookings/emergency
//     Creates a highest-priority booking with emergencyRequest=true.
//     Skips the duplicate-booking guard so customers can reach
//     any available worker immediately.
//     Notifies the worker with an URGENT flag.
// ============================================================
const emergencyBooking = asyncHandler(async (req, res) => {
  const {
    workerId,
    serviceType,
    address,
    description,
    totalAmount,
  } = req.body;

  // --- Validate required fields ---
  if (!workerId || !serviceType || !address) {
    res.status(400);
    throw new Error("workerId, serviceType, and address are required for an emergency booking.");
  }

  // --- Verify worker exists and is available ---
  const worker = await Worker.findById(workerId);
  if (!worker) {
    res.status(404);
    throw new Error("Worker not found.");
  }
  if (!worker.isVerified) {
    res.status(400);
    throw new Error("This worker is not verified and cannot accept emergency requests.");
  }
  if (!worker.availability) {
    res.status(400);
    throw new Error("This worker is currently unavailable. Please choose another worker for the emergency.");
  }

  // --- Create emergency booking (bookingDate = now) ---
  const booking = await Booking.create({
    user:             req.user.id,
    worker:           workerId,
    serviceType:      serviceType.trim(),
    bookingDate:      new Date(),          // immediate — right now
    address,
    description:      description || "EMERGENCY — Immediate assistance required.",
    emergencyRequest: true,                // ← highest priority flag
    status:           BOOKING_STATUS.PENDING,
    totalAmount:      totalAmount || worker.serviceCharges || 0,
  });

  // --- Notify worker with URGENT title ---
  await createNotification({
    recipient:      workerId,
    recipientModel: "Worker",
    title:          "🚨 URGENT — Emergency Booking Request",
    message:        `Emergency ${serviceType} request from a customer at ${address}. Immediate response required.`,
    bookingId:      booking._id,
  });

  const populated = await booking.populate([POPULATE_USER, POPULATE_WORKER]);

  res.status(201).json({
    success: true,
    message: "Emergency booking created. The worker has been notified immediately.",
    booking: populated,
  });
});

// ============================================================
//  Exports
// ============================================================
module.exports = {
  createBooking,
  getBookingDetails,
  getUserBookings,
  getWorkerBookings,
  updateBookingStatus,
  cancelBooking,
  emergencyBooking,
};