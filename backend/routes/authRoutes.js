// ============================================================
//  Worker Connect — authRoutes.js
//  Public authentication routes (no middleware required)
// ============================================================

const express = require("express");
const router  = express.Router();

const {
  registerUser,
  loginUser,
  registerWorker,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

// ─────────────────────────────────────────────
//  Customer Routes
// ─────────────────────────────────────────────

// @route   POST /api/auth/register
// @desc    Register a new customer account
// @access  Public
router.post("/register", registerUser);

// @route   POST /api/auth/login
// @desc    Login with email and password (customer)
// @access  Public
router.post("/login", loginUser);

// ─────────────────────────────────────────────
//  Worker Routes
// ─────────────────────────────────────────────

// @route   POST /api/auth/register-worker
// @desc    Register a new worker account
// @access  Public
router.post("/register-worker", registerWorker);

// ─────────────────────────────────────────────
//  Password Reset Routes
// ─────────────────────────────────────────────

// @route   POST /api/auth/forgot-password
// @desc    Generate a password reset token
// @access  Public
router.post("/forgot-password", forgotPassword);

// @route   POST /api/auth/reset-password/:token
// @desc    Verify reset token and update password
// @access  Public
router.post("/reset-password/:token", resetPassword);

module.exports = router;