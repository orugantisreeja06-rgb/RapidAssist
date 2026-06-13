
const asyncHandler = require("express-async-handler");
const User         = require("../models/User");
const Worker       = require("../models/Worker");
const Booking      = require("../models/Booking");
const Review       = require("../models/Review");
const Complaint    = require("../models/Complaint");

const startOfCurrentMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - (n - 1));
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const getMostBookedServices = asyncHandler(async (req, res) => {
  const services = await Booking.aggregate([
    {
      $group: {
        _id:            "$serviceType",
        totalBookings:  { $sum: 1 },
        completedCount: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
        cancelledCount: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } },
        totalRevenue:   { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, "$totalAmount", 0] } },
      },
    },
    { $sort: { totalBookings: -1 } },
    { $limit: 10 },
    {
      $project: {
        _id:            0,
        serviceType:    "$_id",
        totalBookings:  1,
        completedCount: 1,
        cancelledCount: 1,
        totalRevenue:   { $round: ["$totalRevenue", 2] },
        completionRate: {
          $round: [
            {
              $multiply: [
                { $divide: ["$completedCount", { $max: ["$totalBookings", 1] }] },
                100,
              ],
            },
            1,
          ],
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    count:   services.length,
    report:  services,
  });
});

const getTopRatedWorkers = asyncHandler(async (req, res) => {
  const workers = await Worker.find({
    isVerified:   true,
    totalReviews: { $gte: 1 },
  })
    .sort({ averageRating: -1, totalReviews: -1 })
    .limit(10)
    .select(
      "name email skills serviceCharges location averageRating totalReviews profileImage"
    );

  res.status(200).json({
    success: true,
    count:   workers.length,
    report:  workers,
  });
});

const getComplaintStatistics = asyncHandler(async (req, res) => {
  const [statusBreakdown, typeBreakdown, totalComplaints] = await Promise.all([

    Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]),

    Complaint.aggregate([
      { $group: { _id: "$complaintType", count: { $sum: 1 } } },
      { $sort:  { count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, complaintType: "$_id", count: 1 } },
    ]),

    Complaint.countDocuments(),
  ]);

  const statusMap = {
    "Pending":      0,
    "Under Review": 0,
    "Resolved":     0,
    "Rejected":     0,
  };
  statusBreakdown.forEach(({ status, count }) => {
    if (status in statusMap) statusMap[status] = count;
  });

  const resolutionRate =
    totalComplaints > 0
      ? parseFloat(((statusMap["Resolved"] / totalComplaints) * 100).toFixed(1))
      : 0;

  res.status(200).json({
    success: true,
    report: {
      totalComplaints,
      pending:           statusMap["Pending"],
      underReview:       statusMap["Under Review"],
      resolved:          statusMap["Resolved"],
      rejected:          statusMap["Rejected"],
      resolutionRate,
      topComplaintTypes: typeBreakdown,
    },
  });
});

const getUserActivityReport = asyncHandler(async (req, res) => {
  const monthStart = startOfCurrentMonth();

  const [totalUsers, newUsersThisMonth, usersWithBookings] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: monthStart } }),
    Booking.distinct("user").then((ids) => ids.length),
  ]);

  const inactiveUsers = totalUsers - usersWithBookings;
  const activityRate  =
    totalUsers > 0
      ? parseFloat(((usersWithBookings / totalUsers) * 100).toFixed(1))
      : 0;

  res.status(200).json({
    success: true,
    report: {
      totalUsers,
      activeUsers:       usersWithBookings,
      inactiveUsers,
      usersWithBookings,
      newUsersThisMonth,
      activityRate,
    },
  });
});

const getBookingAnalytics = asyncHandler(async (req, res) => {
  const [statusBreakdown, totalBookings, emergencyCount] = await Promise.all([

    Booking.aggregate([
      {
        $group: {
          _id:          "$status",
          count:        { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
      {
        $project: {
          _id:          0,
          status:       "$_id",
          count:        1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
        },
      },
    ]),

    Booking.countDocuments(),
    Booking.countDocuments({ emergencyRequest: true }),
  ]);

  const statusMap = {
    "Pending":     { count: 0, totalRevenue: 0 },
    "Accepted":    { count: 0, totalRevenue: 0 },
    "In Progress": { count: 0, totalRevenue: 0 },
    "Completed":   { count: 0, totalRevenue: 0 },
    "Cancelled":   { count: 0, totalRevenue: 0 },
  };
  statusBreakdown.forEach(({ status, count, totalRevenue }) => {
    if (status in statusMap) statusMap[status] = { count, totalRevenue };
  });

  const completionRate =
    totalBookings > 0
      ? parseFloat(((statusMap["Completed"].count / totalBookings) * 100).toFixed(1))
      : 0;

  const cancellationRate =
    totalBookings > 0
      ? parseFloat(((statusMap["Cancelled"].count / totalBookings) * 100).toFixed(1))
      : 0;

  res.status(200).json({
    success: true,
    report: {
      totalBookings,
      emergencyBookings: emergencyCount,
      pending:           statusMap["Pending"].count,
      accepted:          statusMap["Accepted"].count,
      inProgress:        statusMap["In Progress"].count,
      completed:         statusMap["Completed"].count,
      cancelled:         statusMap["Cancelled"].count,
      completionRate,
      cancellationRate,
    },
  });
});

const getMonthlyBookingReport = asyncHandler(async (req, res) => {
  const monthCount = Math.min(24, parseInt(req.query.months) || 12);
  const since      = monthsAgo(monthCount);

  const monthly = await Booking.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          year:  { $year:  "$createdAt" },
          month: { $month: "$createdAt" },
        },
        totalBookings:     { $sum: 1 },
        completedBookings: { $sum: { $cond: [{ $eq: ["$status", "Completed"]  }, 1, 0] } },
        cancelledBookings: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"]  }, 1, 0] } },
        pendingBookings:   { $sum: { $cond: [{ $eq: ["$status", "Pending"]    }, 1, 0] } },
        revenue:           { $sum: { $cond: [{ $eq: ["$status", "Completed"]  }, "$totalAmount", 0] } },
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
        cancelledBookings: 1,
        pendingBookings:   1,
        revenue:           { $round: ["$revenue", 2] },
      },
    },
  ]);

  const result = monthly.map((m) => ({
    ...m,
    monthName: MONTH_NAMES[m.month] || "",
    label:     `${MONTH_NAMES[m.month] || ""} ${m.year}`,
  }));

  res.status(200).json({
    success:    true,
    monthsBack: monthCount,
    count:      result.length,
    report:     result,
  });
});

const getRevenueReport = asyncHandler(async (req, res) => {
  const since = monthsAgo(12);

  const [totalRevenueAgg, monthlyRevenue, revenueByService] = await Promise.all([

    Booking.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id:            null,
          totalRevenue:   { $sum: "$totalAmount" },
          totalCompleted: { $sum: 1 },
          avgOrderValue:  { $avg: "$totalAmount" },
          maxOrderValue:  { $max: "$totalAmount" },
          minOrderValue:  { $min: "$totalAmount" },
        },
      },
    ]),

    Booking.aggregate([
      { $match: { status: "Completed", createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            year:  { $year:  "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue:         { $sum: "$totalAmount" },
          completedOrders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id:             0,
          year:            "$_id.year",
          month:           "$_id.month",
          revenue:         { $round: ["$revenue", 2] },
          completedOrders: 1,
        },
      },
    ]),

    Booking.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id:     "$serviceType",
          revenue: { $sum: "$totalAmount" },
          orders:  { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id:         0,
          serviceType: "$_id",
          revenue:     { $round: ["$revenue", 2] },
          orders:      1,
          avgPerOrder: {
            $round: [{ $divide: ["$revenue", { $max: ["$orders", 1] }] }, 2],
          },
        },
      },
    ]),
  ]);

  const monthlyWithNames = monthlyRevenue.map((m) => ({
    ...m,
    monthName: MONTH_NAMES[m.month] || "",
    label:     `${MONTH_NAMES[m.month] || ""} ${m.year}`,
  }));

  const stats = totalRevenueAgg[0] ?? {
    totalRevenue:   0,
    totalCompleted: 0,
    avgOrderValue:  0,
    maxOrderValue:  0,
    minOrderValue:  0,
  };

  res.status(200).json({
    success: true,
    report: {
      totalRevenue:    parseFloat((stats.totalRevenue  ?? 0).toFixed(2)),
      totalCompleted:  stats.totalCompleted ?? 0,
      avgOrderValue:   parseFloat((stats.avgOrderValue ?? 0).toFixed(2)),
      maxOrderValue:   parseFloat((stats.maxOrderValue ?? 0).toFixed(2)),
      minOrderValue:   parseFloat((stats.minOrderValue ?? 0).toFixed(2)),
      monthlyRevenue:  monthlyWithNames,
      revenueByService,
    },
  });
});

const getDashboardReport = asyncHandler(async (req, res) => {
  const monthStart = startOfCurrentMonth();

  const [
    totalUsers,
    totalWorkers,
    verifiedWorkers,
    newUsersThisMonth,
    totalBookings,
    completedBookings,
    pendingBookings,
    activeBookings,
    pendingComplaints,
    revenueAgg,
    topWorkers,
    mostBookedServices,
    monthlyTrend,
  ] = await Promise.all([
    User.countDocuments(),
    Worker.countDocuments(),
    Worker.countDocuments({ isVerified: true }),
    User.countDocuments({ createdAt: { $gte: monthStart } }),

    Booking.countDocuments(),
    Booking.countDocuments({ status: "Completed" }),
    Booking.countDocuments({ status: "Pending" }),
    Booking.countDocuments({ status: { $in: ["Accepted", "In Progress"] } }),

    Complaint.countDocuments({ status: "Pending" }),

    Booking.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id:          null,
          total:        { $sum: "$totalAmount" },
          avgOrder:     { $avg: "$totalAmount" },
        },
      },
    ]),

    Worker.find({ isVerified: true, totalReviews: { $gte: 1 } })
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(5)
      .select("name skills averageRating totalReviews profileImage"),

    Booking.aggregate([
      { $group: { _id: "$serviceType", count: { $sum: 1 } } },
      { $sort:  { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, serviceType: "$_id", count: 1 } },
    ]),

    Booking.aggregate([
      { $match: { createdAt: { $gte: monthsAgo(6) } } },
      {
        $group: {
          _id: {
            year:  { $year:  "$createdAt" },
            month: { $month: "$createdAt" },
          },
          bookings: { $sum: 1 },
          revenue:  { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, "$totalAmount", 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id:      0,
          year:     "$_id.year",
          month:    "$_id.month",
          bookings: 1,
          revenue:  { $round: ["$revenue", 2] },
        },
      },
    ]),
  ]);

  const totalRevenue   = parseFloat((revenueAgg[0]?.total    ?? 0).toFixed(2));
  const avgOrderValue  = parseFloat((revenueAgg[0]?.avgOrder ?? 0).toFixed(2));
  const completionRate =
    totalBookings > 0
      ? parseFloat(((completedBookings / totalBookings) * 100).toFixed(1))
      : 0;

  const trend = monthlyTrend.map((m) => ({
    ...m,
    monthName: MONTH_NAMES[m.month] || "",
    label:     `${MONTH_NAMES[m.month] || ""} ${m.year}`,
  }));

  res.status(200).json({
    success: true,
    report: {
      users: {
        total:        totalUsers,
        newThisMonth: newUsersThisMonth,
      },
      workers: {
        total:      totalWorkers,
        verified:   verifiedWorkers,
        unverified: totalWorkers - verifiedWorkers,
      },
      bookings: {
        total:          totalBookings,
        completed:      completedBookings,
        pending:        pendingBookings,
        active:         activeBookings,
        completionRate,
      },
      revenue: {
        total:        totalRevenue,
        avgOrderValue,
      },
      pendingComplaints,
      topWorkers,
      mostBookedServices,
      monthlyTrend:  trend,
      generatedAt:   new Date().toISOString(),
    },
  });
});

module.exports = {
  getMostBookedServices,
  getTopRatedWorkers,
  getComplaintStatistics,
  getUserActivityReport,
  getBookingAnalytics,
  getMonthlyBookingReport,
  getRevenueReport,
  getDashboardReport,
};
