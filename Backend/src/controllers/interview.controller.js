const mongoose = require("mongoose");
const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");

const interviewReportModel = require("../models/interviewReport.model");

const {
  generateInterviewReport,
  generateResumePdf,
} = require("../services/ai.service");

function deriveInterviewTitle(jobDescription) {
  if (!jobDescription || !jobDescription.trim()) {
    return "Interview Strategy";
  }

  const firstLine = jobDescription
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Interview Strategy";
  }

  return firstLine.length > 60 ? `${firstLine.slice(0, 60)}...` : firstLine;
}

async function extractResumeText(file) {
  if (!file || !file.buffer) {
    return "";
  }

  const fileName = file.originalname?.toLowerCase() || "";
  const mimeType = file.mimetype?.toLowerCase() || "";

  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    const parser = new PDFParse({
      data: file.buffer,
    });

    try {
      const result = await parser.getText();

      return result.text || "";
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({
      buffer: file.buffer,
    });

    return result.value || "";
  }

  throw new Error("Only PDF and DOCX resume files are supported.");
}

async function generateInterViewReportController(req, res) {
  try {
    const { jobDescription, selfDescription } = req.body;

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({
        message: "Job description is required.",
      });
    }

    if (!selfDescription?.trim() && !req.file) {
      return res.status(400).json({
        message: "Either resume or self description is required.",
      });
    }

    let resumeText = "";

    if (req.file) {
      resumeText = await extractResumeText(req.file);
    }

    if (!resumeText.trim() && !selfDescription?.trim()) {
      return res.status(400).json({
        message: "Could not extract resume text.",
      });
    }

    const interviewReport = await generateInterviewReport({
      resume: resumeText,

      selfDescription: selfDescription?.trim() || "",

      jobDescription: jobDescription.trim(),
    });

    const savedReport = await interviewReportModel.create({
      jobDescription: jobDescription.trim(),

      resume: resumeText,

      selfDescription: selfDescription?.trim() || "",

      matchScore: interviewReport.matchScore,

      technicalQuestions: interviewReport.technicalQuestions,

      behavioralQuestions: interviewReport.behavioralQuestions,

      skillGaps: interviewReport.skillGaps,

      preparationPlan: interviewReport.preparationPlan,

      title: interviewReport.title || deriveInterviewTitle(jobDescription),

      user: req.user.id,
    });

    return res.status(201).json({
      message: "Interview report generated successfully.",

      interviewReport: savedReport,
    });
  } catch (error) {
    console.error("Generate Interview Report Error:", error);

    return res.status(500).json({
      message: error.message || "Failed to generate interview report.",
    });
  }
}

async function getInterviewReportByIdController(req, res) {
  try {
    const { interviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      return res.status(400).json({
        message: "Invalid interview report ID.",
      });
    }

    const interviewReport = await interviewReportModel.findOne({
      _id: interviewId,

      user: req.user.id,
    });

    if (!interviewReport) {
      return res.status(404).json({
        message: "Interview report not found.",
      });
    }

    return res.status(200).json({
      interviewReport,
    });
  } catch (error) {
    console.error("Get Interview Report Error:", error);

    return res.status(500).json({
      message: "Failed to get interview report.",
    });
  }
}

async function getAllInterviewReportsController(req, res) {
  try {
    const interviewReports = await interviewReportModel
      .find({
        user: req.user.id,
      })
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      interviewReports,
    });
  } catch (error) {
    console.error("Get All Interview Reports Error:", error);

    return res.status(500).json({
      message: "Failed to get interview reports.",
    });
  }
}

async function generateResumePdfController(req, res) {
  try {
    const { interviewReportId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(interviewReportId)) {
      return res.status(400).json({
        message: "Invalid interview report ID.",
      });
    }

    const interviewReport = await interviewReportModel.findOne({
      _id: interviewReportId,

      user: req.user.id,
    });

    if (!interviewReport) {
      return res.status(404).json({
        message: "Interview report not found.",
      });
    }

    const pdfBuffer = await generateResumePdf({
      resume: interviewReport.resume || "",

      selfDescription: interviewReport.selfDescription || "",

      jobDescription: interviewReport.jobDescription || "",
    });

    res.set({
      "Content-Type": "application/pdf",

      "Content-Disposition": `attachment; filename="resume_${interviewReportId}.pdf"`,

      "Content-Length": pdfBuffer.length,
    });

    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Generate Resume PDF Error:", error);

    return res.status(500).json({
      message: error.message || "Failed to generate resume PDF.",
    });
  }
}

module.exports = {
  generateInterViewReportController,

  getInterviewReportByIdController,

  getAllInterviewReportsController,

  generateResumePdfController,
};
