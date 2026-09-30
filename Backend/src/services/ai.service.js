const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const interviewReportSchema = z.object({
  matchScore: z.number().min(0).max(100),

  technicalQuestions: z.array(
    z.object({
      question: z.string(),
      intention: z.string(),
      answer: z.string(),
    }),
  ),

  behavioralQuestions: z.array(
    z.object({
      question: z.string(),
      intention: z.string(),
      answer: z.string(),
    }),
  ),

  skillGaps: z.array(
    z.object({
      skill: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    }),
  ),

  preparationPlan: z.array(
    z.object({
      day: z.number(),
      focus: z.string(),
      tasks: z.array(z.string()),
    }),
  ),

  title: z.string(),
});

async function generateInterviewReport({
  resume,
  selfDescription,
  jobDescription,
}) {
  const prompt = `
You are an expert technical interviewer.

Analyze the candidate information against the provided job description.

Generate a realistic interview preparation report.

RESUME:
${resume || "Not provided"}

SELF DESCRIPTION:
${selfDescription || "Not provided"}

JOB DESCRIPTION:
${jobDescription}


IMPORTANT OUTPUT RULES:

Return ONLY a valid JSON object matching the provided schema.

You MUST use these EXACT field names:

matchScore
technicalQuestions
behavioralQuestions
skillGaps
preparationPlan
title

DO NOT use snake_case field names.

DO NOT use alternative field names.

DO NOT omit any required field.

DO NOT return null for any required field.


MATCH SCORE:

matchScore must be a number between 0 and 100.


TECHNICAL QUESTIONS:

technicalQuestions must be an array of objects.

Every object MUST contain:

{
    "question": "string",
    "intention": "string",
    "answer": "string"
}


BEHAVIORAL QUESTIONS:

behavioralQuestions must be an array of objects.

Every object MUST contain:

{
    "question": "string",
    "intention": "string",
    "answer": "string"
}


SKILL GAPS:

skillGaps must be an array of objects.

Every object MUST contain:

{
    "skill": "string",
    "severity": "low"
}

severity MUST be exactly one of:

low
medium
high


PREPARATION PLAN:

preparationPlan must be an array of objects.

Every object MUST contain:

{
    "day": 1,
    "focus": "string",
    "tasks": [
        "string"
    ]
}

day must be a number.

tasks must always be an array of strings.


TITLE:

title must be a short descriptive string.


CONTENT RULES:

- Do not invent candidate experience.
- Do not invent education.
- Do not invent skills.
- Base the analysis only on the provided candidate information and job description.
- Generate practical interview questions.
- Generate useful skill gaps.
- Generate a practical day-wise preparation plan.
- Return only JSON.
- Do not return markdown.
- Do not wrap the JSON inside a code block.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",

    contents: prompt,

    config: {
      responseFormat: {
        text: {
          mimeType: "application/json",
          schema: zodToJsonSchema(interviewReportSchema),
        },
      },
    },
  });

  console.log("Gemini Response:");
  console.log(response.text);

  let parsed;

  try {
    parsed = JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini returned invalid JSON:", response.text);

    throw new Error("Gemini returned invalid JSON");
  }

  console.log("Parsed Gemini Response:");
  console.log(JSON.stringify(parsed, null, 2));

  try {
    return interviewReportSchema.parse(parsed);
  } catch (error) {
    console.error("Gemini response does not match schema:");

    console.error(error);

    throw error;
  }
}

async function generatePdfFromHtml(htmlContent) {
  const browser = await puppeteer.launch({
    headless: true,

    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
    });

    return await page.pdf({
      format: "A4",

      printBackground: true,

      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
    });
  } finally {
    await browser.close();
  }
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
  const htmlSchema = z.object({
    html: z.string(),
  });

  const prompt = `
Create a professional ATS-friendly 1 page resume in HTML.

Use the candidate information below.

RESUME:
${resume || "Not provided"}

SELF DESCRIPTION:
${selfDescription || "Not provided"}

JOB DESCRIPTION:
${jobDescription}


Requirements:

- 1 page
- Professional layout
- ATS-friendly
- No fake experience
- No fake education
- No fake skills
- Use semantic HTML
- Return complete HTML
- Do not use markdown
- Return only valid JSON
- JSON must contain exactly one field named "html"
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",

    contents: prompt,

    config: {
      responseFormat: {
        text: {
          mimeType: "application/json",
          schema: zodToJsonSchema(htmlSchema),
        },
      },
    },
  });

  console.log("Resume HTML Gemini Response:");
  console.log(response.text);

  let parsed;

  try {
    parsed = JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini returned invalid resume JSON:", response.text);

    throw new Error("Gemini returned invalid resume JSON");
  }

  const jsonContent = htmlSchema.parse(parsed);

  return await generatePdfFromHtml(jsonContent.html);
}

module.exports = {
  generateInterviewReport,
  generateResumePdf,
};
