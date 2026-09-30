const express = require("express");

const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");

const interviewController = require("../controllers/interview.controller");

const upload = require("../middlewares/file.middleware");

router.post(
  "/",
  authMiddleware.authUser,
  upload.single("resume"),
  interviewController.generateInterViewReportController,
);

router.get(
  "/report/:interviewId",
  authMiddleware.authUser,
  interviewController.getInterviewReportByIdController,
);

router.get(
  "/",
  authMiddleware.authUser,
  interviewController.getAllInterviewReportsController,
);

router.post(
  "/resume/pdf/:interviewReportId",
  authMiddleware.authUser,
  interviewController.generateResumePdfController,
);

module.exports = router;
