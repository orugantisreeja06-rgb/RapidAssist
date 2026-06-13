

const express = require("express");
const router  = express.Router();

const {
  getProfile,
  updateProfile,
  getServiceHistory,
  saveWorker,
  getSavedWorkers,
  removeSavedWorker,
} = require("../controllers/userController");

const { protect } = require("../middlewares/authMiddleware");

router.get("/profile", protect, getProfile);

router.put("/profile", protect, updateProfile);

router.get("/history", protect, getServiceHistory);

router.get("/saved-workers", protect, getSavedWorkers);

router.post("/save-worker/:workerId", protect, saveWorker);

router.delete("/saved-workers/:workerId", protect, removeSavedWorker);

module.exports = router;
