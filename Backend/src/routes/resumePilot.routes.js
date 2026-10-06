const express = require("express");

const router = express.Router();

const authUser = require("../middlewares/auth.middleware");

const resumePilotController = require("../controllers/resumePilot.controller");

// ======================================================
// CHAT WITH RESUME PILOT
// ======================================================

router.post("/", authUser, resumePilotController.chatWithResumePilot);

// ======================================================
// RESUME PILOT CHAT HISTORY
// ======================================================

router.get("/history", authUser, resumePilotController.getResumePilotHistory);

// ======================================================
// REINDEX EXISTING USER RESUMES
// ======================================================

router.post("/reindex", authUser, resumePilotController.reindexUserResumes);

module.exports = router;
