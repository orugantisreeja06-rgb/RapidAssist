// ============================================================
//  Worker Connect — authController.js
//  Handles authentication for both Customers (User) and Workers
// ============================================================

const asyncHandler = require("express-async-handler");
const bcrypt       = require("bcryptjs");
const jwt          = require("jsonwebtoken");
const crypto       = require("crypto");

const User   = require("../models/User");
const Worker = require("../models/Worker");

// ─────────────────────────────────────────────
//  Helper: generate a signed JWT
// ─────────────────────────────────────────────
const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// ─────────────────────────────────────────────
//  Helper: strip sensitive fields before send
// ─────────────────────────────────────────────
const sanitizeUser = (doc) => {
  const obj = doc.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

// ============================================================
//  1. registerUser
//     POST /api/auth/register
//     Registers a new customer account and returns a JWT.
// ============================================================
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // --- Validate required fields ---
  if (!name || !email || !phone || !password) {
    res.status(400);
    throw new Error("Please provide name, email, phone, and password.");
  }

  // --- Check for duplicate email ---
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    res.status(409);
    throw new Error("An account with this email already exists.");
  }

  // --- Hash password ---
  const salt           = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  // --- Create user ---
  const user = await User.create({
    name:     name.trim(),
    email:    email.toLowerCase().trim(),
    phone:    phone.trim(),
    password: hashedPassword,
    role:     "customer",
  });

  if (!user) {
    res.status(500);
    throw new Error("Failed to create user. Please try again.");
  }

  const token = generateToken(user._id, "customer");

  res.status(201).json({
    success: true,
    message: "Customer registered successfully.",
    token,
    user: sanitizeUser(user),
  });
});

// ============================================================
//  2. loginUser
//     POST /api/auth/login
//     Authenticates a customer with email + password.
// ============================================================
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // --- Validate input ---
  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password.");
  }

  // --- Find user (select password explicitly if schema hides it) ---
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password"
  );

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password.");
  }

  // --- Compare password ---
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid email or password.");
  }

  const token = generateToken(user._id, "customer");

  res.status(200).json({
    success: true,
    message: "Login successful.",
    token,
    user: sanitizeUser(user),
  });
});

// ============================================================
//  3. registerWorker
//     POST /api/auth/worker/register
//     Registers a new worker account and returns a JWT.
// ============================================================
const registerWorker = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    skills,
    experience,
    serviceCharges,
    location,
    availability,
  } = req.body;

  // --- Validate required fields ---
  if (
    !name ||
    !email ||
    !phone ||
    !password ||
    !skills ||
    !experience ||
    !serviceCharges ||
    !location
  ) {
    res.status(400);
    throw new Error(
      "Please provide name, email, phone, password, skills, experience, serviceCharges, and location."
    );
  }

  // --- Check for duplicate email ---
  const existingWorker = await Worker.findOne({
    email: email.toLowerCase().trim(),
  });
  if (existingWorker) {
    res.status(409);
    throw new Error("A worker account with this email already exists.");
  }

  // --- Hash password ---
  const salt           = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  // --- Create worker ---
  const worker = await Worker.create({
    name:           name.trim(),
    email:          email.toLowerCase().trim(),
    phone:          phone.trim(),
    password:       hashedPassword,
    skills:         Array.isArray(skills) ? skills : [skills],
    experience,
    serviceCharges,
    location,
    availability:   availability ?? true,
    role:           "worker",
    isVerified:     false, // admin reviews worker before activation
  });

  if (!worker) {
    res.status(500);
    throw new Error("Failed to create worker account. Please try again.");
  }

  const token = generateToken(worker._id, "worker");

  res.status(201).json({
    success: true,
    message:
      "Worker registered successfully. Your profile is under review by our team.",
    token,
    worker: sanitizeUser(worker),
  });
});

// ============================================================
//  4. forgotPassword
//     POST /api/auth/forgot-password
//     Generates a password-reset token (for User or Worker).
//     In production, e-mail this token via a mail service.
// ============================================================
const forgotPassword = asyncHandler(async (req, res) => {
  const { email, accountType } = req.body; // accountType: "customer" | "worker"

  if (!email) {
    res.status(400);
    throw new Error("Please provide an email address.");
  }

  // --- Find account in the correct collection ---
  const Model  = accountType === "worker" ? Worker : User;
  const account = await Model.findOne({ email: email.toLowerCase().trim() });

  if (!account) {
    // Generic message to prevent email enumeration
    res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a reset link has been sent.",
    });
    return;
  }

  // --- Generate a random reset token ---
  const resetToken   = crypto.randomBytes(32).toString("hex");

  // Store the hashed version in DB (plain token goes to the user)
  const hashedToken  = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  account.resetPasswordToken  = hashedToken;
  account.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
  await account.save({ validateBeforeSave: false });

  // TODO: Send resetToken via email using nodemailer / sendgrid
  // Example reset URL: `${process.env.CLIENT_URL}/reset-password/${resetToken}`

  res.status(200).json({
    success:    true,
    message:    "Password reset token generated.",
    // ⚠️  Remove `resetToken` from the response in production.
    //     Send it via email instead.
    resetToken,
  });
});

// ============================================================
//  5. resetPassword
//     PUT /api/auth/reset-password/:token
//     Verifies the reset token and updates the password.
// ============================================================
const resetPassword = asyncHandler(async (req, res) => {
  const { token }                 = req.params;
  const { password, accountType } = req.body;

  if (!token || !password) {
    res.status(400);
    throw new Error("Reset token and new password are required.");
  }

  // --- Hash the incoming token to match what is stored in DB ---
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // --- Find account by hashed token and check expiry ---
  const Model   = accountType === "worker" ? Worker : User;
  const account = await Model.findOne({
    resetPasswordToken:  hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!account) {
    res.status(400);
    throw new Error("Reset token is invalid or has expired.");
  }

  // --- Hash the new password ---
  const salt           = await bcrypt.genSalt(12);
  account.password     = await bcrypt.hash(password, salt);

  // --- Clear reset token fields ---
  account.resetPasswordToken  = undefined;
  account.resetPasswordExpire = undefined;

  await account.save();

  // Issue a fresh JWT so the user is logged in immediately
  const role  = accountType === "worker" ? "worker" : "customer";
  const jwtToken = generateToken(account._id, role);

  res.status(200).json({
    success: true,
    message: "Password has been reset successfully.",
    token:   jwtToken,
  });
});

// ============================================================
//  Exports
// ============================================================
module.exports = {
  registerUser,
  loginUser,
  registerWorker,
  forgotPassword,
  resetPassword,
};