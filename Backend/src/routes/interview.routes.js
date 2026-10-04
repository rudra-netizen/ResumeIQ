const express = require("express");

const router = express.Router();

const authUser = require("../middlewares/auth.middleware");
const interviewController = require("../controllers/interview.controller");
const upload = require("../middlewares/file.middleware");

router.post(
  "/",
  authUser,
  upload.single("resume"),
  interviewController.generateInterViewReportController,
);

router.get(
  "/report/:interviewId",
  authUser,
  interviewController.getInterviewReportByIdController,
);

router.get("/", authUser, interviewController.getAllInterviewReportsController);

router.post(
  "/resume/pdf/:interviewReportId",
  authUser,
  interviewController.generateResumePdfController,
);

module.exports = router;
