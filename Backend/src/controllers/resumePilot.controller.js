const mongoose = require("mongoose");

const interviewReportModel = require("../models/interviewReport.model");
const resumePilotMessageModel = require("../models/resumePilotMessage.model");

const {
  generateResumePilotResponse,
  indexResumeForResumePilot,
} = require("../services/resumePilot.service");

// ======================================================
// GET AUTHENTICATED USER ID
// ======================================================

function getAuthenticatedUserId(req) {
  const userId = req.user?.userId || req.user?.id;

  if (!userId) {
    const error = new Error("Authenticated user not found.");

    error.statusCode = 401;

    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error("Invalid authenticated user ID.");

    error.statusCode = 401;

    throw error;
  }

  return userId;
}

// ======================================================
// CHAT WITH RESUME PILOT
// ======================================================

async function chatWithResumePilot(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);

    const { message, jobDescription, reportId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: "Message is required.",
      });
    }

    if (message.trim().length > 4000) {
      return res.status(400).json({
        message: "Message cannot exceed 4000 characters.",
      });
    }

    if (reportId && !mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({
        message: "Invalid report ID.",
      });
    }

    // ----------------------------------------------------
    // Verify report belongs to current user
    // ----------------------------------------------------

    if (reportId) {
      const report = await interviewReportModel.findOne({
        _id: reportId,
        user: userId,
      });

      if (!report) {
        return res.status(404).json({
          message: "Interview report not found.",
        });
      }
    }

    // ----------------------------------------------------
    // Get previous ResumePilot conversation
    // ----------------------------------------------------

    const previousMessages = await resumePilotMessageModel
      .find({
        user: userId,
      })
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .lean();

    const history = previousMessages.reverse();

    // ----------------------------------------------------
    // Generate RAG response
    // ----------------------------------------------------

    const result = await generateResumePilotResponse({
      message: message.trim(),

      jobDescription: jobDescription?.trim() || "",

      userId,

      reportId: reportId || undefined,

      history,
    });

    // ----------------------------------------------------
    // Save user message
    // ----------------------------------------------------

    await resumePilotMessageModel.create({
      user: userId,

      role: "user",

      content: message.trim(),
    });

    // ----------------------------------------------------
    // Save assistant response
    // ----------------------------------------------------

    await resumePilotMessageModel.create({
      user: userId,

      role: "assistant",

      content: result.answer,
    });

    return res.status(200).json({
      answer: result.answer,

      sources: result.sources,
    });
  } catch (error) {
    console.error("ResumePilot Chat Error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "ResumePilot failed to generate a response.",
    });
  }
}

// ======================================================
// GET CHAT HISTORY
// ======================================================

async function getResumePilotHistory(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);

    const messages = await resumePilotMessageModel
      .find({
        user: userId,
      })
      .sort({
        createdAt: 1,
      })
      .limit(100)
      .lean();

    return res.status(200).json({
      messages,
    });
  } catch (error) {
    console.error("ResumePilot History Error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to get ResumePilot history.",
    });
  }
}

// ======================================================
// REINDEX ALL USER RESUMES
// ======================================================

async function reindexUserResumes(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);

    const reports = await interviewReportModel
      .find({
        user: userId,
      })
      .sort({
        createdAt: 1,
      });

    if (!reports.length) {
      return res.status(200).json({
        message: "No interview reports found to index.",
        indexedReports: 0,
      });
    }

    let indexedReports = 0;

    for (let index = 0; index < reports.length; index++) {
      const report = reports[index];

      const resumeVersion = index + 1;

      await indexResumeForResumePilot({
        report,

        userId,

        resumeVersion,
      });

      indexedReports++;
    }

    return res.status(200).json({
      message: "Resume memories reindexed successfully.",
      indexedReports,
    });
  } catch (error) {
    console.error("ResumePilot Reindex Error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to reindex resumes.",
    });
  }
}

module.exports = {
  chatWithResumePilot,
  getResumePilotHistory,
  reindexUserResumes,
};
