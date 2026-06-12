

const express = require("express");
const router  = express.Router();

const {
  getDashboardStats,
  getAllUsers,
  getAllWorkers,
  verifyWorker,
  deleteUser,
  deleteWorker,
  getAllComplaints,
  getReports,
} = require("../controllers/adminController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");


router.get("/dashboard", protect, adminOnly, getDashboardStats);


router.get("/users", protect, adminOnly, getAllUsers);


router.get("/workers", protect, adminOnly, getAllWorkers);


router.put("/verify-worker/:id", protect, adminOnly, verifyWorker);


router.delete("/users/:id", protect, adminOnly, deleteUser);


router.delete("/workers/:id", protect, adminOnly, deleteWorker);


router.get("/complaints", protect, adminOnly, getAllComplaints);


router.get("/reports", protect, adminOnly, getReports);

module.exports = router;
