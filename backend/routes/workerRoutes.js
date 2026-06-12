

const express = require("express");
const router  = express.Router();

const {
  createWorkerProfile,
  updateWorkerProfile,
  getWorkerProfile,
  searchWorkers,
  getNearbyWorkers,
  updateAvailability,
  getTopRatedWorkers,
  verifyWorker,
} = require("../controllers/workerController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");

router.get("/search", searchWorkers);

router.get("/nearby", getNearbyWorkers);

router.get("/top-rated", getTopRatedWorkers);

router.get("/:id", getWorkerProfile);

router.post("/", protect, createWorkerProfile);

router.put("/availability", protect, updateAvailability);

router.put("/:id", protect, updateWorkerProfile);

router.put("/verify/:id", protect, adminOnly, verifyWorker);

module.exports = router;
