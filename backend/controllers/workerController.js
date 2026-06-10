// ============================================================
//  Worker Connect — workerController.js
//  Handles all worker profile and discovery operations
// ============================================================

const asyncHandler = require("express-async-handler");
const Worker       = require("../models/Worker");

// ─────────────────────────────────────────────
//  Helper: Haversine formula
//  Returns distance in kilometres between two lat/lng points
// ─────────────────────────────────────────────
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const toRad  = (val) => (val * Math.PI) / 180;
  const R      = 6371; // Earth's radius in km

  const dLat   = toRad(lat2 - lat1);
  const dLng   = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
};

// ─────────────────────────────────────────────
//  Helper: Parse and clamp pagination params
// ─────────────────────────────────────────────
const getPagination = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(50, parseInt(query.limit) || 10);
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
};

// ============================================================
//  1. createWorkerProfile
//     POST /api/workers/profile
//     Called after registration to enrich the worker's profile.
//     Requires: authenticated worker (req.user.role === "worker")
// ============================================================
const createWorkerProfile = asyncHandler(async (req, res) => {
  const workerId = req.user.id;

  // --- Check: profile must not already exist ---
  const exists = await Worker.findById(workerId);
  if (!exists) {
    res.status(404);
    throw new Error("Worker account not found.");
  }

  if (exists.profileComplete) {
    res.status(400);
    throw new Error("Worker profile already exists. Use update instead.");
  }

  const {
    bio,
    skills,
    experience,
    serviceCharges,
    location,
    availability,
    profileImage,
    idProof,
    certifications,
  } = req.body;

  // --- Validate required enrichment fields ---
  if (!skills || !experience || !serviceCharges || !location) {
    res.status(400);
    throw new Error(
      "skills, experience, serviceCharges, and location are required."
    );
  }

  // location must carry coordinates for geo queries
  // Expected shape: { address, city, state, pincode, coordinates: { lat, lng } }
  if (
    !location.coordinates ||
    location.coordinates.lat == null ||
    location.coordinates.lng == null
  ) {
    res.status(400);
    throw new Error(
      "location.coordinates must include lat and lng values."
    );
  }

  const updatedWorker = await Worker.findByIdAndUpdate(
    workerId,
    {
      bio,
      skills:          Array.isArray(skills) ? skills : [skills],
      experience,
      serviceCharges,
      location,
      availability:    availability ?? true,
      profileImage:    profileImage || "",
      idProof:         idProof      || "",
      certifications:  certifications || [],
      profileComplete: true,
    },
    { new: true, runValidators: true }
  ).select("-password -resetPasswordToken -resetPasswordExpire");

  res.status(201).json({
    success: true,
    message: "Worker profile created successfully.",
    worker:  updatedWorker,
  });
});

// ============================================================
//  2. updateWorkerProfile
//     PUT /api/workers/profile
//     Allows a worker to update their own profile fields.
// ============================================================
const updateWorkerProfile = asyncHandler(async (req, res) => {
  const workerId = req.user.id;

  const worker = await Worker.findById(workerId);
  if (!worker) {
    res.status(404);
    throw new Error("Worker not found.");
  }

  // --- Whitelist updatable fields (exclude sensitive auth fields) ---
  const ALLOWED_UPDATES = [
    "name",
    "phone",
    "bio",
    "skills",
    "experience",
    "serviceCharges",
    "location",
    "availability",
    "profileImage",
    "certifications",
    "idProof",
  ];

  const updates = {};
  ALLOWED_UPDATES.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    res.status(400);
    throw new Error("No valid fields provided for update.");
  }

  // Normalise skills to array if sent as string
  if (updates.skills && !Array.isArray(updates.skills)) {
    updates.skills = [updates.skills];
  }

  // Validate coordinates if location is being updated
  if (updates.location) {
    const coords = updates.location.coordinates;
    if (!coords || coords.lat == null || coords.lng == null) {
      res.status(400);
      throw new Error(
        "Updated location must include coordinates.lat and coordinates.lng."
      );
    }
  }

  const updatedWorker = await Worker.findByIdAndUpdate(
    workerId,
    { $set: updates },
    { new: true, runValidators: true }
  ).select("-password -resetPasswordToken -resetPasswordExpire");

  res.status(200).json({
    success: true,
    message: "Worker profile updated successfully.",
    worker:  updatedWorker,
  });
});

// ============================================================
//  3. getWorkerProfile
//     GET /api/workers/:id
//     Public — returns a single worker's profile.
// ============================================================
const getWorkerProfile = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.params.id).select(
    "-password -resetPasswordToken -resetPasswordExpire -idProof"
  );

  if (!worker) {
    res.status(404);
    throw new Error("Worker not found.");
  }

  res.status(200).json({
    success: true,
    worker,
  });
});

// ============================================================
//  4. searchWorkers
//     GET /api/workers/search
//     Public — filter by category/skill, location (city/state),
//     price range, minimum rating, and availability.
//
//     Query params:
//       skill         — e.g. "electrician"
//       city          — e.g. "Chennai"
//       state         — e.g. "Tamil Nadu"
//       minPrice      — minimum serviceCharges
//       maxPrice      — maximum serviceCharges
//       minRating     — minimum averageRating (0–5)
//       availability  — "true" | "false"
//       page          — default 1
//       limit         — default 10, max 50
//       sortBy        — "rating" | "price_asc" | "price_desc" (default "rating")
// ============================================================
const searchWorkers = asyncHandler(async (req, res) => {
  const {
    skill,
    city,
    state,
    minPrice,
    maxPrice,
    minRating,
    availability,
    sortBy,
  } = req.query;

  const { page, limit, skip } = getPagination(req.query);

  // --- Build dynamic filter ---
  const filter = {
    isVerified:      true,   // only show verified workers
    profileComplete: true,
  };

  // Skill / category filter  (case-insensitive)
  if (skill) {
    filter.skills = { $in: [new RegExp(skill.trim(), "i")] };
  }

  // Location filter
  if (city)  filter["location.city"]  = new RegExp(city.trim(),  "i");
  if (state) filter["location.state"] = new RegExp(state.trim(), "i");

  // Price range filter
  if (minPrice || maxPrice) {
    filter.serviceCharges = {};
    if (minPrice) filter.serviceCharges.$gte = Number(minPrice);
    if (maxPrice) filter.serviceCharges.$lte = Number(maxPrice);
  }

  // Rating filter
  if (minRating) {
    filter.averageRating = { $gte: Number(minRating) };
  }

  // Availability filter
  if (availability !== undefined) {
    filter.availability = availability === "true";
  }

  // --- Sort options ---
  const sortMap = {
    rating:    { averageRating: -1 },
    price_asc: { serviceCharges: 1 },
    price_desc:{ serviceCharges: -1 },
  };
  const sort = sortMap[sortBy] || { averageRating: -1 };

  // --- Execute query ---
  const [workers, total] = await Promise.all([
    Worker.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(
        "name phone skills experience serviceCharges location availability averageRating totalReviews profileImage"
      ),
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

// ============================================================
//  5. getNearbyWorkers
//     GET /api/workers/nearby
//     Public — returns workers within `distance` km of the
//     supplied coordinates using the Haversine formula.
//
//     Query params:
//       lat       — user latitude  (required)
//       lng       — user longitude (required)
//       distance  — radius in km (default 10)
//       skill     — optional skill filter
//       page / limit
//
//     Note: For large datasets in production, switch to a
//     MongoDB 2dsphere index with $nearSphere for better perf.
// ============================================================
const getNearbyWorkers = asyncHandler(async (req, res) => {
  const { lat, lng, distance = 10, skill } = req.query;

  if (!lat || !lng) {
    res.status(400);
    throw new Error("lat and lng query parameters are required.");
  }

  const userLat     = parseFloat(lat);
  const userLng     = parseFloat(lng);
  const maxDistance = parseFloat(distance);

  if (isNaN(userLat) || isNaN(userLng) || isNaN(maxDistance)) {
    res.status(400);
    throw new Error("lat, lng, and distance must be valid numbers.");
  }

  const { page, limit, skip } = getPagination(req.query);

  // --- Base filter ---
  const filter = { isVerified: true, profileComplete: true, availability: true };
  if (skill) filter.skills = { $in: [new RegExp(skill.trim(), "i")] };

  // --- Fetch candidate workers (with coordinates stored) ---
  const allWorkers = await Worker.find(filter).select(
    "name phone skills experience serviceCharges location availability averageRating totalReviews profileImage"
  );

  // --- Filter by Haversine distance ---
  const nearbyWorkers = allWorkers
    .filter((w) => {
      const coords = w.location?.coordinates;
      if (!coords || coords.lat == null || coords.lng == null) return false;
      const d = haversineDistance(userLat, userLng, coords.lat, coords.lng);
      w._doc.distanceKm = parseFloat(d.toFixed(2)); // attach distance to result
      return d <= maxDistance;
    })
    .sort((a, b) => a._doc.distanceKm - b._doc.distanceKm); // nearest first

  const total   = nearbyWorkers.length;
  const paged   = nearbyWorkers.slice(skip, skip + limit);

  res.status(200).json({
    success:    true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count:      paged.length,
    radiusKm:   maxDistance,
    workers:    paged,
  });
});

// ============================================================
//  6. updateAvailability
//     PATCH /api/workers/availability
//     Authenticated worker — toggle or set availability flag.
// ============================================================
const updateAvailability = asyncHandler(async (req, res) => {
  const workerId = req.user.id;

  const { availability } = req.body;

  if (availability === undefined || typeof availability !== "boolean") {
    res.status(400);
    throw new Error("availability must be a boolean (true or false).");
  }

  const worker = await Worker.findByIdAndUpdate(
    workerId,
    { $set: { availability } },
    { new: true }
  ).select("name availability");

  if (!worker) {
    res.status(404);
    throw new Error("Worker not found.");
  }

  res.status(200).json({
    success:      true,
    message:      `Availability set to ${availability ? "Available" : "Unavailable"}.`,
    availability: worker.availability,
  });
});

// ============================================================
//  7. getTopRatedWorkers
//     GET /api/workers/top-rated
//     Public — returns top-rated verified workers, optionally
//     filtered by skill.
//
//     Query params:
//       skill  — optional
//       limit  — default 10, max 50
// ============================================================
const getTopRatedWorkers = asyncHandler(async (req, res) => {
  const { skill } = req.query;
  const { limit } = getPagination(req.query);

  const filter = {
    isVerified:      true,
    profileComplete: true,
    totalReviews:    { $gte: 1 }, // only workers who have been reviewed
  };

  if (skill) filter.skills = { $in: [new RegExp(skill.trim(), "i")] };

  const workers = await Worker.find(filter)
    .sort({ averageRating: -1, totalReviews: -1 })
    .limit(limit)
    .select(
      "name skills experience serviceCharges location availability averageRating totalReviews profileImage"
    );

  res.status(200).json({
    success: true,
    count:   workers.length,
    workers,
  });
});

// ============================================================
//  8. verifyWorker
//     PATCH /api/workers/:id/verify
//     Admin only — approves or revokes a worker's verification.
//     Requires: req.user.role === "admin" (enforced in middleware)
// ============================================================
const verifyWorker = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Expect { isVerified: true/false } to support both verify & revoke
  const { isVerified, verificationNote } = req.body;

  if (isVerified === undefined || typeof isVerified !== "boolean") {
    res.status(400);
    throw new Error("isVerified must be a boolean (true or false).");
  }

  const worker = await Worker.findById(id);
  if (!worker) {
    res.status(404);
    throw new Error("Worker not found.");
  }

  worker.isVerified       = isVerified;
  worker.verifiedAt       = isVerified ? new Date() : null;
  worker.verifiedBy       = isVerified ? req.user.id : null;
  worker.verificationNote = verificationNote || "";

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

// ============================================================
//  Exports
// ============================================================
module.exports = {
  createWorkerProfile,
  updateWorkerProfile,
  getWorkerProfile,
  searchWorkers,
  getNearbyWorkers,
  updateAvailability,
  getTopRatedWorkers,
  verifyWorker,
};