

const express = require("express");
const router  = express.Router();

const {
  submitComplaint,
  getComplaint,
  getUserComplaints,
  updateComplaintStatus,
  resolveComplaint,
} = require("../controllers/complaintController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");




router.get("/user", protect, getUserComplaints);


router.post("/", protect, submitComplaint);


router.get("/:id", protect, getComplaint);


router.put("/status/:id",  protect, adminOnly, updateComplaintStatus);


router.put("/resolve/:id", protect, adminOnly, resolveComplaint);

module.exports = router;
