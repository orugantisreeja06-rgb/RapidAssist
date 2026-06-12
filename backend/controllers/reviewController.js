
const asyncHandler = require("express-async-handler");
const Review       = require("../models/Review");
const Worker       = require("../models/Worker");
const Booking      = require("../models/Booking");

const recalculateWorkerRating = async (workerId) => {
  const stats = await Review.aggregate([
    { $match: { worker: workerId } },
    {
      $group: {
        _id:           "$worker",
        averageRating: { $avg: "$rating" },
        totalReviews:  { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Worker.findByIdAndUpdate(workerId, {
      averageRating: parseFloat(stats[0].averageRating.toFixed(1)),
      totalReviews:  stats[0].totalReviews,
    });
  } else {
    await Worker.findByIdAndUpdate(workerId, {
      averageRating: 0,
      totalReviews:  0,
    });
  }
};

const addReview = asyncHandler(async (req, res) => {
  const { workerId, bookingId, rating, comment } = req.body;

  if (!workerId || !bookingId || !rating) {
    res.status(400);
    throw new Error("workerId, bookingId, and rating are required.");
  }

  const parsedRating = Number(rating);
  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    res.status(400);
    throw new Error("Rating must be a whole number between 1 and 5.");
  }

  const worker = await Worker.findById(workerId);
  if (!worker) {
    res.status(404);
    throw new Error("Worker not found.");
  }

  const booking = await Booking.findOne({
    _id:    bookingId,
    user:   req.user.id,
    worker: workerId,
  });

  if (!booking) {
    res.status(404);
    throw new Error(
      "Booking not found or does not belong to you for this worker."
    );
  }

  if (booking.status !== "Completed") {
    res.status(400);
    throw new Error(
      "You can only review a worker after the booking has been completed."
    );
  }
  const existingReview = await Review.findOne({ booking: bookingId, user: req.user.id });
  if (existingReview) {
    res.status(409);
    throw new Error(
      "You have already reviewed this booking. Use the update endpoint to edit it."
    );
  }

  const review = await Review.create({
    user:    req.user.id,
    worker:  workerId,
    booking: bookingId,
    rating:  parsedRating,
    comment: comment?.trim() || "",
  });

  await recalculateWorkerRating(worker._id);

  const populated = await review.populate([
    { path: "user",   select: "name email" },
    { path: "worker", select: "name"       },
  ]);

  res.status(201).json({
    success: true,
    message: "Review submitted successfully.",
    review:  populated,
  });
});

const getWorkerReviews = asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  const worker = await Worker.findById(workerId).select(
    "name averageRating totalReviews"
  );
  if (!worker) {
    res.status(404);
    throw new Error("Worker not found.");
  }

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const skip  = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find({ worker: workerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "user", select: "name" }),
    Review.countDocuments({ worker: workerId }),
  ]);

  res.status(200).json({
    success:    true,
    worker: {
      _id:           worker._id,
      name:          worker.name,
      averageRating: worker.averageRating,
      totalReviews:  worker.totalReviews,
    },
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count:      reviews.length,
    reviews,
  });
});
const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error("Review not found.");
  }

  if (review.user.toString() !== req.user.id) {
    res.status(403);
    throw new Error("You are not authorized to update this review.");
  }

  const { rating, comment } = req.body;

  if (rating === undefined && comment === undefined) {
    res.status(400);
    throw new Error("Provide at least one of: rating, comment.");
  }

  if (rating !== undefined) {
    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      res.status(400);
      throw new Error("Rating must be a whole number between 1 and 5.");
    }
    review.rating = parsedRating;
  }

  if (comment !== undefined) {
    review.comment = comment.trim();
  }

  review.updatedAt = new Date();
  await review.save();

  await recalculateWorkerRating(review.worker);

  const populated = await review.populate({ path: "user", select: "name email" });

  res.status(200).json({
    success: true,
    message: "Review updated successfully.",
    review:  populated,
  });
});

const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error("Review not found.");
  }

  const isOwner = review.user.toString() === req.user.id;
  const isAdmin = req.user.role          === "admin";

  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error("You are not authorized to delete this review.");
  }

  const workerId = review.worker;

  await review.deleteOne();

  await recalculateWorkerRating(workerId);

  res.status(200).json({
    success: true,
    message: "Review deleted successfully.",
  });
});

const getAverageRating = asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  const worker = await Worker.findById(workerId).select(
    "name averageRating totalReviews"
  );
  if (!worker) {
    res.status(404);
    throw new Error("Worker not found.");
  }

  const aggregation = await Review.aggregate([
    { $match: { worker: worker._id } },
    {
      $group: {
        _id:           "$worker",
        averageRating: { $avg: "$rating" },
        totalReviews:  { $sum: 1 },
        fiveStar:      { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
        fourStar:      { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
        threeStar:     { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
        twoStar:       { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
        oneStar:       { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
      },
    },
  ]);

  if (aggregation.length === 0) {
    return res.status(200).json({
      success:      true,
      workerId,
      workerName:   worker.name,
      averageRating: 0,
      totalReviews:  0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    });
  }

  const stats = aggregation[0];

  res.status(200).json({
    success:       true,
    workerId,
    workerName:    worker.name,
    averageRating: parseFloat(stats.averageRating.toFixed(1)),
    totalReviews:  stats.totalReviews,
    distribution: {
      5: stats.fiveStar,
      4: stats.fourStar,
      3: stats.threeStar,
      2: stats.twoStar,
      1: stats.oneStar,
    },
  });
});
module.exports = {
  addReview,
  getWorkerReviews,
  updateReview,
  deleteReview,
  getAverageRating,
};
