// ============================================================
//  Worker Connect — complaintController.js
//  Handles complaint submission, tracking, and admin resolution
// ============================================================

const asyncHandler = require("express-async-handler");
const Complaint    = require("../models/Complaint");
const Notification = require("../models/Notification");

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const COMPLAINT_STATUS = Object.freeze({
  PENDING:      "Pending",
  UNDER_REVIEW: "Under Review",
  RESOLVED:     "Resolved",
  REJECTED:     "Rejected",
});

// Valid admin-driven status transitions
const STATUS_TRANSITIONS = Object.freeze({
  [COMPLAINT_STATUS.PENDING]:      [COMPLAINT_STATUS.UNDER_REVIEW],
  [COMPLAINT_STATUS.UNDER_REVIEW]: [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.REJECTED],
  [COMPLAINT_STATUS.RESOLVED]:     [],
  [COMPLAINT_STATUS.REJECTED]:     [],
});

// Supported complaint types
const COMPLAINT_TYPES = Object.freeze([
  "Unprofessional Behaviour",
  "Poor Service Quality",
  "Overcharging",
  "No Show",
  "Fraud",
  "Harassment",
  "Damage to Property",
  "Other",
]);

// ─────────────────────────────────────────────
//  Helper: fire an in-app notification without
//  blocking the main request on failure
// ─────────────────────────────────────────────
const createNotification = async ({
  recipient,
  recipientModel,
  title,
  message,
  complaintId,
}) => {
  try {
    await Notification.create({
      recipient,
      recipientModel, // "User" | "Worker" | "Admin"
      title,
      message,
      complaint: complaintId,
      isRead:    false,
    });
  } catch (err) {
    console.error("[Notification Error]", err.message);
  }
};

// ─────────────────────────────────────────────
//  Shared populate config
// ─────────────────────────────────────────────
const POPULATE_COMPLAINANT = {
  path:   "complainant",
  select: "name email phone",
};
const POPULATE_AGAINST_USER = {
  path:   "againstUser",
  select: "name email phone",
};
const POPULATE_AGAINST_WORKER = {
  path:   "againstWorker",
  select: "name email phone skills",
};

// ============================================================
//  1. submitComplaint
//     POST /api/complaints
//     Authenticated user submits a complaint against a worker
//     or another user. At least one of againstWorkerId or
//     againstUserId must be provided. Notifies all admins.
// ============================================================
const submitComplaint = asyncHandler(async (req, res) => {
  const {
    againstWorkerId,
    againstUserId,
    complaintType,
    description,
    bookingId,       // optional reference to a related booking
  } = req.body;

  // --- Validate: must target someone ---
  if (!againstWorkerId && !againstUserId) {
    res.status(400);
    throw new Error(
      "Complaint must be against a worker (againstWorkerId) or a user (againstUserId)."
    );
  }

  // --- Cannot file against yourself ---
  if (againstUserId && againstUserId === req.user.id) {
    res.status(400);
    throw new Error("You cannot file a complaint against yourself.");
  }

  // --- Validate complaint type ---
  if (!complaintType) {
    res.status(400);
    throw new Error("complaintType is required.");
  }
  if (!COMPLAINT_TYPES.includes(complaintType)) {
    res.status(400);
    throw new Error(
      `Invalid complaintType. Must be one of: ${COMPLAINT_TYPES.join(", ")}.`
    );
  }

  // --- Validate description ---
  if (!description || description.trim().length < 20) {
    res.status(400);
    throw new Error(
      "description is required and must be at least 20 characters."
    );
  }

  // --- Prevent duplicate open complaints for the same target ---
  const duplicateFilter = {
    complainant: req.user.id,
    status:      { $in: [COMPLAINT_STATUS.PENDING, COMPLAINT_STATUS.UNDER_REVIEW] },
  };
  if (againstWorkerId) duplicateFilter.againstWorker = againstWorkerId;
  if (againstUserId)   duplicateFilter.againstUser   = againstUserId;

  const duplicate = await Complaint.findOne(duplicateFilter);
  if (duplicate) {
    res.status(409);
    throw new Error(
      "You already have an open complaint against this person. " +
      "Please wait for it to be resolved before submitting another."
    );
  }

  // --- Build complaint document ---
  const complaintData = {
    complainant:   req.user.id,
    complaintType,
    description:   description.trim(),
    status:        COMPLAINT_STATUS.PENDING,
  };
  if (againstWorkerId) complaintData.againstWorker = againstWorkerId;
  if (againstUserId)   complaintData.againstUser   = againstUserId;
  if (bookingId)       complaintData.booking        = bookingId;

  const complaint = await Complaint.create(complaintData);

  // --- Notify admin(s) ---
  // In production: query all admin accounts and loop.
  // Here we use a dedicated env variable for a single admin ID.
  if (process.env.ADMIN_USER_ID) {
    await createNotification({
      recipient:      process.env.ADMIN_USER_ID,
      recipientModel: "User",
      title:          "New Complaint Submitted",
      message:        `A new complaint of type "${complaintType}" has been submitted and requires review.`,
      complaintId:    complaint._id,
    });
  }

  const populated = await complaint.populate([
    POPULATE_COMPLAINANT,
    POPULATE_AGAINST_USER,
    POPULATE_AGAINST_WORKER,
  ]);

  res.status(201).json({
    success:   true,
    message:   "Complaint submitted successfully. Our team will review it shortly.",
    complaint: populated,
  });
});

// ============================================================
//  2. getComplaint
//     GET /api/complaints/:id
//     Returns a single complaint with related user/worker data.
//     Accessible by the complainant, or an admin.
// ============================================================
const getComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate(POPULATE_COMPLAINANT)
    .populate(POPULATE_AGAINST_USER)
    .populate(POPULATE_AGAINST_WORKER);

  if (!complaint) {
    res.status(404);
    throw new Error("Complaint not found.");
  }

  // --- Authorization: complainant or admin only ---
  const isComplainant = complaint.complainant?._id.toString() === req.user.id;
  const isAdmin       = req.user.role === "admin";

  if (!isComplainant && !isAdmin) {
    res.status(403);
    throw new Error("You are not authorized to view this complaint.");
  }

  res.status(200).json({
    success:   true,
    complaint,
  });
});

// ============================================================
//  3. getUserComplaints
//     GET /api/complaints/my-complaints
//     Returns all complaints submitted by the logged-in user,
//     newest first, with optional status filter.
//
//     Query params:
//       status — filter by a specific status
//       page   — default 1
//       limit  — default 10, max 50
// ============================================================
const getUserComplaints = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const page       = Math.max(1, parseInt(req.query.page)  || 1);
  const limit      = Math.min(50, parseInt(req.query.limit) || 10);
  const skip       = (page - 1) * limit;

  const filter = { complainant: req.user.id };

  if (status) {
    if (!Object.values(COMPLAINT_STATUS).includes(status)) {
      res.status(400);
      throw new Error(
        `Invalid status. Must be one of: ${Object.values(COMPLAINT_STATUS).join(", ")}.`
      );
    }
    filter.status = status;
  }

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(POPULATE_AGAINST_USER)
      .populate(POPULATE_AGAINST_WORKER),
    Complaint.countDocuments(filter),
  ]);

  res.status(200).json({
    success:    true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count:      complaints.length,
    complaints,
  });
});

// ============================================================
//  4. updateComplaintStatus
//     PATCH /api/complaints/:id/status
//     Admin-only — moves the complaint through its status
//     machine. Enforces valid transitions:
//       Pending → Under Review → Resolved | Rejected
// ============================================================
const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status) {
    res.status(400);
    throw new Error("status is required.");
  }

  if (!Object.values(COMPLAINT_STATUS).includes(status)) {
    res.status(400);
    throw new Error(
      `Invalid status. Must be one of: ${Object.values(COMPLAINT_STATUS).join(", ")}.`
    );
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404);
    throw new Error("Complaint not found.");
  }

  // --- Enforce state machine ---
  const allowedNext = STATUS_TRANSITIONS[complaint.status];
  if (!allowedNext.includes(status)) {
    res.status(400);
    throw new Error(
      `Cannot transition from "${complaint.status}" to "${status}". ` +
      `Allowed next status: ${allowedNext.length ? allowedNext.join(", ") : "none (terminal state)"}.`
    );
  }

  complaint.status      = status;
  complaint.reviewedBy  = req.user.id;
  complaint.reviewedAt  = new Date();

  await complaint.save();

  // --- Notify complainant of status change ---
  const statusMessages = {
    [COMPLAINT_STATUS.UNDER_REVIEW]: "Your complaint is now under review by our team.",
    [COMPLAINT_STATUS.RESOLVED]:     "Your complaint has been resolved. Please check the resolution notes.",
    [COMPLAINT_STATUS.REJECTED]:     "Your complaint has been reviewed and rejected by our team.",
  };

  await createNotification({
    recipient:      complaint.complainant,
    recipientModel: "User",
    title:          `Complaint ${status}`,
    message:        statusMessages[status] || `Your complaint status has been updated to: ${status}.`,
    complaintId:    complaint._id,
  });

  const populated = await complaint.populate([
    POPULATE_COMPLAINANT,
    POPULATE_AGAINST_USER,
    POPULATE_AGAINST_WORKER,
  ]);

  res.status(200).json({
    success:   true,
    message:   `Complaint status updated to "${status}".`,
    complaint: populated,
  });
});

// ============================================================
//  5. resolveComplaint
//     PATCH /api/complaints/:id/resolve
//     Admin-only — finalises a complaint with resolution notes
//     and an outcome (Resolved or Rejected). Notifies the
//     complainant with the admin's decision and notes.
// ============================================================
const resolveComplaint = asyncHandler(async (req, res) => {
  const { outcome, resolutionNotes } = req.body;

  // --- Validate outcome ---
  const validOutcomes = [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.REJECTED];
  if (!outcome || !validOutcomes.includes(outcome)) {
    res.status(400);
    throw new Error(
      `outcome is required and must be one of: ${validOutcomes.join(", ")}.`
    );
  }

  // --- Resolution notes are mandatory for a proper audit trail ---
  if (!resolutionNotes || resolutionNotes.trim().length < 10) {
    res.status(400);
    throw new Error(
      "resolutionNotes are required and must be at least 10 characters."
    );
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404);
    throw new Error("Complaint not found.");
  }

  // --- Can only resolve/reject complaints that are Under Review ---
  if (complaint.status !== COMPLAINT_STATUS.UNDER_REVIEW) {
    res.status(400);
    throw new Error(
      `Only complaints with status "${COMPLAINT_STATUS.UNDER_REVIEW}" can be resolved or rejected. ` +
      `Current status: "${complaint.status}".`
    );
  }

  // --- Apply resolution ---
  complaint.status          = outcome;
  complaint.resolutionNotes = resolutionNotes.trim();
  complaint.resolvedBy      = req.user.id;
  complaint.resolvedAt      = new Date();

  await complaint.save();

  // --- Notify complainant with the outcome and notes ---
  const isResolved      = outcome === COMPLAINT_STATUS.RESOLVED;
  const outcomeLabel    = isResolved ? "Resolved ✓" : "Rejected ✗";
  const outcomeMessage  = isResolved
    ? `Your complaint has been resolved. Admin notes: "${resolutionNotes.trim()}"`
    : `Your complaint has been rejected. Admin notes: "${resolutionNotes.trim()}"`;

  await createNotification({
    recipient:      complaint.complainant,
    recipientModel: "User",
    title:          `Complaint ${outcomeLabel}`,
    message:        outcomeMessage,
    complaintId:    complaint._id,
  });

  const populated = await complaint.populate([
    POPULATE_COMPLAINANT,
    POPULATE_AGAINST_USER,
    POPULATE_AGAINST_WORKER,
  ]);

  res.status(200).json({
    success:   true,
    message:   `Complaint has been ${outcome.toLowerCase()} successfully.`,
    complaint: populated,
  });
});

// ============================================================
//  Exports
// ============================================================
module.exports = {
  submitComplaint,
  getComplaint,
  getUserComplaints,
  updateComplaintStatus,
  resolveComplaint,
};