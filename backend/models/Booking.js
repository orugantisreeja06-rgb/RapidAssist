const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    serviceType: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "In Progress", "Completed", "Cancelled"],
      default: "Pending",
    },
    emergencyRequest: {
      type: Boolean,
      default: false,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedAt: Date,
    cancelledAt: Date,
    cancelledBy: {
      type: String,
      enum: ["user", "worker", "admin"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Booking", bookingSchema);
