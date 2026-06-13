
const express = require("express");
const router  = express.Router();

const {
  createBooking,
  getBookingDetails,
  getUserBookings,
  getWorkerBookings,
  updateBookingStatus,
  cancelBooking,
  emergencyBooking,
} = require("../controllers/bookingController");

const { protect } = require("../middlewares/authMiddleware");


router.get("/user",    protect, getUserBookings);


router.get("/worker",  protect, getWorkerBookings);


router.post("/emergency", protect, emergencyBooking);


router.post("/",       protect, createBooking);


router.get("/:id",     protect, getBookingDetails);


router.put("/status/:id", protect, updateBookingStatus);


router.delete("/:id",  protect, cancelBooking);

module.exports = router;
