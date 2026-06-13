

const express = require("express");
const router  = express.Router();

const {
  addReview,
  getWorkerReviews,
  updateReview,
  deleteReview,
  getAverageRating,
} = require("../controllers/reviewController");

const { protect } = require("../middlewares/authMiddleware");

router.get("/worker/:workerId", getWorkerReviews);

router.get("/rating/:workerId", getAverageRating);

router.post("/", protect, addReview);

router.put("/:reviewId", protect, updateReview);

router.delete("/:reviewId", protect, deleteReview);

module.exports = router;
