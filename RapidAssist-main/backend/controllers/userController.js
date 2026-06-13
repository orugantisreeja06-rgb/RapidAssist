// ============================================================
//  Worker Connect — userController.js
//  Handles user profile management, service history,
//  and saved (favourite) workers
// ============================================================

const asyncHandler = require("express-async-handler");
const User         = require("../models/User");
const Booking      = require("../models/Booking");
const Worker       = require("../models/Worker");

// ─────────────────────────────────────────────
//  Shared populate config
// ─────────────────────────────────────────────
const POPULATE_SAVED_WORKER = {
  path: "savedWorkers",
  select:
    "name email phone skills serviceCharges location averageRating totalReviews profileImage availability",
};

const POPULATE_BOOKING_WORKER = {
  path: "worker",
  select: "name email phone skills serviceCharges location averageRating profileImage availability",
};

// ============================================================
//  1. getProfile
//     GET /api/users/profile
//     Returns the full profile of the currently logged-in user.
//     Password and reset token fields are excluded.
// ============================================================
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select("-password -resetPasswordToken -resetPasswordExpire")
    .populate(POPULATE_SAVED_WORKER);

  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// ============================================================
//  2. updateProfile
//     PUT /api/users/profile
//     Allows the logged-in user to update their name, email,
//     phone, and address. Email uniqueness is enforced.
// ============================================================
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, address } = req.body;

  // --- At least one field must be provided ---
  if (!name && !email && !phone && !address) {
    res.status(400);
    throw new Error(
      "Provide at least one field to update: name, email, phone, or address."
    );
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  // --- Email uniqueness check (skip if unchanged) ---
  if (email && email.toLowerCase().trim() !== user.email) {
    const emailTaken = await User.findOne({
      email: email.toLowerCase().trim(),
      _id:   { $ne: req.user.id },
    });
    if (emailTaken) {
      res.status(409);
      throw new Error("This email address is already in use by another account.");
    }
    user.email = email.toLowerCase().trim();
  }

  // --- Apply updates ---
  if (name)    user.name  = name.trim();
  if (phone)   user.phone = phone.trim();
  if (address) user.address = address;

  await user.save({ validateBeforeSave: true });

  // Return updated profile without sensitive fields
  const updated = await User.findById(user._id)
    .select("-password -resetPasswordToken -resetPasswordExpire")
    .populate(POPULATE_SAVED_WORKER);

  res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    user:    updated,
  });
});

// ============================================================
//  3. getServiceHistory
//     GET /api/users/service-history
//     Returns all Completed bookings for the logged-in user,
//     newest first, with worker details populated.
//
//     Query params:
//       page  — default 1
//       limit — default 10, max 50
// ============================================================
const getServiceHistory = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const skip  = (page - 1) * limit;

  const filter = { user: req.user.id, status: "Completed" };

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(POPULATE_BOOKING_WORKER),
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
//  4. saveWorker
//     POST /api/users/saved-workers/:workerId
//     Adds a worker to the logged-in user's savedWorkers list.
//     Verifies the worker exists before saving.
//     Duplicate saves are silently ignored (idempotent).
// ============================================================
const saveWorker = asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  // --- Verify worker exists and is active ---
  const worker = await Worker.findById(workerId).select("name isVerified");
  if (!worker) {
    res.status(404);
    throw new Error("Worker not found.");
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  // --- Idempotent: already saved? ---
  const alreadySaved = user.savedWorkers.some(
    (id) => id.toString() === workerId
  );
  if (alreadySaved) {
    return res.status(200).json({
      success: true,
      message: `${worker.name} is already in your saved workers.`,
    });
  }

  user.savedWorkers.push(workerId);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `${worker.name} has been added to your saved workers.`,
    savedCount: user.savedWorkers.length,
  });
});

// ============================================================
//  5. getSavedWorkers
//     GET /api/users/saved-workers
//     Returns the logged-in user's full list of saved
//     (favourite) workers with their profile details.
// ============================================================
const getSavedWorkers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select("savedWorkers")
    .populate(POPULATE_SAVED_WORKER);

  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  res.status(200).json({
    success: true,
    count:   user.savedWorkers.length,
    workers: user.savedWorkers,
  });
});

// ============================================================
//  6. removeSavedWorker
//     DELETE /api/users/saved-workers/:workerId
//     Removes a worker from the logged-in user's saved list.
//     Returns a clean 200 even if the worker was not saved
//     (idempotent DELETE semantics).
// ============================================================
const removeSavedWorker = asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  const beforeCount = user.savedWorkers.length;

  // Filter out the target worker ID
  user.savedWorkers = user.savedWorkers.filter(
    (id) => id.toString() !== workerId
  );

  const removed = user.savedWorkers.length < beforeCount;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success:    true,
    message:    removed
      ? "Worker removed from saved list."
      : "Worker was not in your saved list.",
    savedCount: user.savedWorkers.length,
  });
});

// ============================================================
//  Exports
// ============================================================
module.exports = {
  getProfile,
  updateProfile,
  getServiceHistory,
  saveWorker,
  getSavedWorkers,
  removeSavedWorker,
};
