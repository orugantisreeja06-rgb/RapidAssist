
const asyncHandler = require("express-async-handler");
const bcrypt       = require("bcryptjs");
const jwt          = require("jsonwebtoken");
const crypto       = require("crypto");

const User   = require("../models/User");
const Worker = require("../models/Worker");

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sanitizeUser = (doc) => {
  const obj = doc.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    res.status(400);
    throw new Error("Please provide name, email, phone, and password.");
  }

  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    res.status(409);
    throw new Error("An account with this email already exists.");
  }

  const salt           = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

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

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password.");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password"
  );

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password.");
  }

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

  const existingWorker = await Worker.findOne({
    email: email.toLowerCase().trim(),
  });
  if (existingWorker) {
    res.status(409);
    throw new Error("A worker account with this email already exists.");
  }

  const salt           = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

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
    isVerified:     false, 
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


const forgotPassword = asyncHandler(async (req, res) => {
  const { email, accountType } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Please provide an email address.");
  }

 
  const Model  = accountType === "worker" ? Worker : User;
  const account = await Model.findOne({ email: email.toLowerCase().trim() });

  if (!account) {
 
    res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a reset link has been sent.",
    });
    return;
  }


  const resetToken   = crypto.randomBytes(32).toString("hex");


  const hashedToken  = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  account.resetPasswordToken  = hashedToken;
  account.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  await account.save({ validateBeforeSave: false });

  res.status(200).json({
    success:    true,
    message:    "Password reset token generated.",
    resetToken,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token }                 = req.params;
  const { password, accountType } = req.body;

  if (!token || !password) {
    res.status(400);
    throw new Error("Reset token and new password are required.");
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const Model   = accountType === "worker" ? Worker : User;
  const account = await Model.findOne({
    resetPasswordToken:  hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!account) {
    res.status(400);
    throw new Error("Reset token is invalid or has expired.");
  }

  const salt           = await bcrypt.genSalt(12);
  account.password     = await bcrypt.hash(password, salt);

  account.resetPasswordToken  = undefined;
  account.resetPasswordExpire = undefined;

  await account.save();

  const role  = accountType === "worker" ? "worker" : "customer";
  const jwtToken = generateToken(account._id, role);

  res.status(200).json({
    success: true,
    message: "Password has been reset successfully.",
    token:   jwtToken,
  });
});

module.exports = {
  registerUser,
  loginUser,
  registerWorker,
  forgotPassword,
  resetPassword,
};
