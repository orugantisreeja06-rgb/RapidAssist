
const asyncHandler = require("express-async-handler");
const User         = require("../models/User");
const Worker       = require("../models/Worker");
const Booking      = require("../models/Booking");
const Complaint    = require("../models/Complaint");
const Review       = require("../models/Review");

const getPagination = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, parseInt(query.limit) || 20);
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
};

const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalWorkers,
    verifiedWorkers,
    totalBookings,
    completedBookings,
    activeBookings,
    pendingComplaints,
    totalRevenue,
    recentBookings,
    recentUsers,
  ] = await Promise.all([
    User.countDocuments(),
    Worker.countDocuments(),
    Worker.countDocuments({ isVerified: true }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: "Completed" }),
    Booking.countDocuments({ status: { $in: ["Pending", "Accepted", "In Progress"] } }),
    Complaint.countDocuments({ status: "Pending" }),

    // Sum totalAmount of all completed bookings
    Booking.aggregate([
      { $match: { status: "Completed" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),

    Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({ path: "user",   select: "name email" })
      .populate({ path: "worker", select: "name"       }),
    
    User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email createdAt"),
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      totalWorkers,
      verifiedWorkers,
      unverifiedWorkers: totalWorkers - verifiedWorkers,
      totalBookings,
      completedBookings,
      activeBookings,
      pendingComplaints,
      totalRevenue: totalRevenue[0]?.total ?? 0,
    },
    recentActivity: {
      recentBookings,
      recentUsers,
    },
  });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { search }            = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const filter = {};
  if (search) {
    const regex    = new RegExp(search.trim(), "i");
    filter.$or     = [{ name: regex }, { email: regex }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-password -resetPasswordToken -resetPasswordExpire"),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success:    true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count:      users.length,
    users,
  });
});

const getAllWorkers = asyncHandler(async (req, res) => {
  const { search, isVerified, skill } = req.query;
  const { page, limit, skip }         = getPagination(req.query);

  const filter = {};

  if (isVerified !== undefined) {
    filter.isVerified = isVerified === "true";
  }
  if (skill) {
    filter.skills = { $in: [new RegExp(skill.trim(), "i")] };
  }
  if (search) {
    const regex = new RegExp(search.trim(), "i");
    filter.$or  = [{ name: regex }, { email: regex }];
  }

  const [workers, total] = await Promise.all([
    Worker.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-password -resetPasswordToken -resetPasswordExpire"),
    Worker.countDocuments(filter),
  ]);

  res.status(200).json({
    success:    true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count:      workers.length,
    workers,
  });
});

const verifyWorker = asyncHandler(async (req, res) => {
  const { isVerified, verificationNote } = req.body;

  if (isVerified === undefined || typeof isVerified !== "boolean") {
    res.status(400);
    throw new Error("isVerified (boolean) is required.");
  }

  const worker = await Worker.findById(req.params.id);
  if (!worker) {
    res.status(404);
    throw new Error("Worker not found.");
  }

  worker.isVerified       = isVerified;
  worker.verifiedAt       = isVerified ? new Date() : null;
  worker.verifiedBy       = isVerified ? req.user.id : null;
  worker.verificationNote = verificationNote?.trim() || "";

  await worker.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: isVerified
      ? "Worker has been verified and is now visible to customers."
      : "Worker verification has been revoked.",
    worker: {
      _id:              worker._id,
      name:             worker.name,
      email:            worker.email,
      isVerified:       worker.isVerified,
      verifiedAt:       worker.verifiedAt,
      verificationNote: worker.verificationNote,
    },
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  if (user.role === "admin") {
    res.status(403);
    throw new Error("Admin accounts cannot be deleted through this endpoint.");
  }

  const activeBookings = await Booking.countDocuments({
    user:   user._id,
    status: { $in: ["Pending", "Accepted", "In Progress"] },
  });
  if (activeBookings > 0) {
    res.status(400);
    throw new Error(
      `Cannot delete user. They have ${activeBookings} active booking(s) that must be resolved first.`
    );
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: `User "${user.name}" has been permanently deleted.`,
  });
});

const deleteWorker = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.params.id);

  if (!worker) {
    res.status(404);
    throw new Error("Worker not found.");
  }

  const activeBookings = await Booking.countDocuments({
    worker: worker._id,
    status: { $in: ["Pending", "Accepted", "In Progress"] },
  });
  if (activeBookings > 0) {
    res.status(400);
    throw new Error(
      `Cannot delete worker. They have ${activeBookings} active booking(s) that must be resolved first.`
    );
  }

  await worker.deleteOne();

  res.status(200).json({
    success: true,
    message: `Worker "${worker.name}" has been permanently deleted.`,
  });
});

const getAllComplaints = asyncHandler(async (req, res) => {
  const { status }            = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const VALID_STATUSES = ["Pending", "Under Review", "Resolved", "Rejected"];

  const filter = {};
  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      res.status(400);
      throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}.`);
    }
    filter.status = status;
  }

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "complainant",   select: "name email phone" })
      .populate({ path: "againstUser",   select: "name email phone" })
      .populate({ path: "againstWorker", select: "name email phone skills" }),
    Complaint.countDocuments(filter),
  ]);

  const statusBreakdown = await Complaint.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const breakdown = VALID_STATUSES.reduce((acc, s) => {
    const found  = statusBreakdown.find((b) => b._id === s);
    acc[s] = found?.count ?? 0;
    return acc;
  }, {});

  res.status(200).json({
    success:          true,
    total,
    page,
    totalPages:       Math.ceil(total / limit),
    count:            complaints.length,
    statusBreakdown:  breakdown,
    complaints,
  });
});

const getReports = asyncHandler(async (req, res) => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [
    mostBookedServices,
    topRatedWorkers,
    complaintsByType,
    complaintsByStatus,
    monthlyBookingCount,
    bookingStatusBreakdown,
    averageBookingValue,
  ] = await Promise.all([

    Booking.aggregate([
      { $group: { _id: "$serviceType", totalBookings: { $sum: 1 } } },
      { $sort:  { totalBookings: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, serviceType: "$_id", totalBookings: 1 } },
    ]),

    Worker.find({ isVerified: true, totalReviews: { $gte: 1 } })
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(10)
      .select("name skills averageRating totalReviews serviceCharges location"),

    Complaint.aggregate([
      { $group: { _id: "$complaintType", count: { $sum: 1 } } },
      { $sort:  { count: -1 } },
      { $project: { _id: 0, complaintType: "$_id", count: 1 } },
    ]),

    Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]),

    Booking.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year:  { $year:  "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalBookings:    { $sum: 1 },
          completedBookings:{ $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          totalRevenue:     { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, "$totalAmount", 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id:               0,
          year:              "$_id.year",
          month:             "$_id.month",
          totalBookings:     1,
          completedBookings: 1,
          totalRevenue:      1,
        },
      },
    ]),

    Booking.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]),

    Booking.aggregate([
      { $match: { status: "Completed", totalAmount: { $gt: 0 } } },
      { $group: { _id: null, average: { $avg: "$totalAmount" } } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    reports: {
      mostBookedServices,
      topRatedWorkers,
      complaintStatistics: {
        byType:   complaintsByType,
        byStatus: complaintsByStatus,
      },
      monthlyBookingCount,
      bookingStatusBreakdown,
      averageBookingValue: parseFloat(
        (averageBookingValue[0]?.average ?? 0).toFixed(2)
      ),
      generatedAt: new Date().toISOString(),
    },
  });
});

module.exports = {
  getDashboardStats,
  getAllUsers,
  getAllWorkers,
  verifyWorker,
  deleteUser,
  deleteWorker,
  getAllComplaints,
  getReports,
};
