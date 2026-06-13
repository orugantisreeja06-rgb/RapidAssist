

const express = require("express");
const router  = express.Router();

const {
  getMostBookedServices,
  getTopRatedWorkers,
  getComplaintStatistics,
  getUserActivityReport,
  getMonthlyBookingReport,
  getDashboardReport,
} = require("../controllers/reportController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");

router.get("/most-booked", protect, adminOnly, getMostBookedServices);

router.get("/top-rated-workers", protect, adminOnly, getTopRatedWorkers);

router.get("/complaints", protect, adminOnly, getComplaintStatistics);

router.get("/user-activity", protect, adminOnly, getUserActivityReport);


router.get("/monthly-bookings", protect, adminOnly, getMonthlyBookingReport);

router.get("/dashboard-analytics", protect, adminOnly, getDashboardReport);

module.exports = router;
