const { GoogleGenAI } = require("@google/genai");

const {
  createResumeMemories,
  queryResumeMemory,
  RESUME_NAMESPACE,
} = require("./resumePilot.vector.service");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const GEMINI_MODEL = "gemini-3.1-flash-lite";

// ======================================================
// GENERATE VECTOR
// ======================================================

async function generateVector(content) {
  if (!content || !content.trim()) {
    throw new Error("Content is required for embedding");
  }

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: content,
    config: {
      outputDimensionality: 768,
    },
  });

  return response.embeddings[0].values;
}

// ======================================================
// RESUME TEXT CLEANING
// ======================================================

function cleanText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ======================================================
// DETECT RESUME SECTION
// ======================================================

function detectSection(line) {
  const normalized = line
    .trim()
    .toLowerCase()
    .replace(/[:\-|]+$/g, "");

  const sections = {
    summary: [
      "summary",
      "professional summary",
      "profile",
      "objective",
      "career objective",
    ],

    skills: [
      "skills",
      "technical skills",
      "technical skill",
      "technologies",
      "technical expertise",
    ],

    experience: [
      "experience",
      "work experience",
      "professional experience",
      "internship",
      "internships",
    ],

    projects: ["projects", "project", "personal projects", "academic projects"],

    education: ["education", "academic background", "qualifications"],

    certifications: ["certifications", "certificates", "licenses"],

    achievements: ["achievements", "awards", "honors"],
  };

  for (const [section, names] of Object.entries(sections)) {
    if (names.includes(normalized)) {
      return section;
    }
  }

  return null;
}

// ======================================================
// CHUNK RESUME
// ======================================================

function chunkResumeText(text, maxLength = 1000) {
  const cleanedText = cleanText(text);

  if (!cleanedText) {
    return [];
  }

  const lines = cleanedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const chunks = [];

  let currentSection = "general";
  let currentText = "";

  function pushChunk() {
    if (!currentText.trim()) {
      return;
    }

    chunks.push({
      section: currentSection,
      text: currentText.trim(),
    });

    currentText = "";
  }

  for (const line of lines) {
    const detectedSection = detectSection(line);

    if (detectedSection) {
      pushChunk();

      currentSection = detectedSection;

      currentText = `Section: ${detectedSection}\n`;
      continue;
    }

    if (currentText.length + line.length + 1 > maxLength) {
      pushChunk();

      currentText = `Section: ${currentSection}\n${line}`;
    } else {
      currentText += `${line}\n`;
    }
  }

  pushChunk();

  return chunks;
}

// ======================================================
// INDEX RESUME
// ======================================================

async function indexResumeForResumePilot({ report, userId, resumeVersion }) {
  if (!report) {
    throw new Error("Interview report is required");
  }

  const resumeText = cleanText(report.resume || "");
  const selfDescription = cleanText(report.selfDescription || "");

  const sourceChunks = [];

  // ------------------------------------------------------
  // Resume
  // ------------------------------------------------------

  if (resumeText) {
    sourceChunks.push({
      source: "resume",
      text: resumeText,
    });
  }

  // ------------------------------------------------------
  // Self Description
  // ------------------------------------------------------

  if (selfDescription) {
    sourceChunks.push({
      source: "self-description",
      text: selfDescription,
    });
  }

  if (!sourceChunks.length) {
    return {
      indexed: 0,
    };
  }

  const allChunks = [];

  for (const source of sourceChunks) {
    const chunks = chunkResumeText(source.text);

    chunks.forEach((chunk) => {
      allChunks.push({
        ...chunk,
        source: source.source,
      });
    });
  }

  const records = [];

  for (let index = 0; index < allChunks.length; index++) {
    const chunk = allChunks[index];

    const embeddingText = `
Resume Version: ${resumeVersion}
Source: ${chunk.source}
Section: ${chunk.section}

${chunk.text}
`.trim();

    const vectors = await generateVector(embeddingText);

    records.push({
      id: `resume-${report._id}-${index}`,

      values: vectors,

      metadata: {
        userId: String(userId),

        reportId: String(report._id),

        resumeVersion: Number(resumeVersion),

        title: report.title || "Interview Strategy",

        section: chunk.section,

        source: chunk.source,

        chunkIndex: Number(index),

        text: chunk.text,

        createdAt: new Date(report.createdAt).toISOString(),
      },
    });
  }

  await createResumeMemories({
    records,
    namespace: RESUME_NAMESPACE,
  });

  return {
    indexed: records.length,
  };
}

// ======================================================
// RETRIEVE RELEVANT RESUME MEMORY
// ======================================================

async function retrieveResumeContext({
  message,
  jobDescription = "",
  userId,
  reportId,
  limit = 8,
}) {
  const queryText = `
Current user question:
${message}

Target job description:
${jobDescription || "Not provided"}

Retrieve resume information that is relevant
to the user's question and target role.
`.trim();

  const queryVector = await generateVector(queryText);

  const matches = await queryResumeMemory({
    queryVector,
    userId,
    reportId,
    limit,
    namespace: RESUME_NAMESPACE,
  });

  return matches.map((match) => ({
    score: match.score,

    reportId: match.metadata?.reportId,

    resumeVersion: match.metadata?.resumeVersion,

    title: match.metadata?.title || "Interview Strategy",

    section: match.metadata?.section || "general",

    source: match.metadata?.source || "resume",

    chunkIndex: match.metadata?.chunkIndex,

    text: match.metadata?.text || "",
  }));
}

// ======================================================
// GENERATE RESUME PILOT RESPONSE
// ======================================================

async function generateResumePilotResponse({
  message,
  jobDescription = "",
  userId,
  reportId,
  history = [],
}) {
  const memories = await retrieveResumeContext({
    message,
    jobDescription,
    userId,
    reportId,
    limit: 8,
  });

  const conversationText = history
    .map((item) => {
      const role = item.role === "assistant" ? "ResumePilot" : "User";

      return `${role}: ${item.content}`;
    })
    .join("\n");

  const resumeContext = memories.length
    ? memories
        .map(
          (item, index) => `
[Resume Context ${index + 1}]
Version: ${item.resumeVersion}
Title: ${item.title}
Section: ${item.section}
Source: ${item.source}

${item.text}
`,
        )
        .join("\n")
    : "No relevant indexed resume information was found.";

  const prompt = `
You are ResumePilot, the personal AI resume memory
and career assistant inside ResumeIQ.

Your job is to help the user understand, improve,
compare and adapt their resume using their actual
previous resume information.

==================================================
CURRENT USER QUESTION
==================================================

${message}

==================================================
TARGET JOB DESCRIPTION
==================================================

${jobDescription || "Not provided"}

==================================================
RELEVANT RESUME MEMORY
==================================================

${resumeContext}

==================================================
RECENT CONVERSATION
==================================================

${conversationText || "No previous conversation."}

==================================================
STRICT RULES
==================================================

1. Resume evidence is the source of truth about the
candidate's actual background.

2. NEVER invent:
- skills
- technologies
- experience
- projects
- companies
- job titles
- certifications
- achievements
- responsibilities
- metrics

3. Do not assume related technologies are the same.

Examples:
React does NOT mean Next.js.
JavaScript does NOT mean TypeScript.
MongoDB does NOT mean PostgreSQL.
Express.js does NOT mean NestJS.

4. When the user asks what to change for a new role:
- identify what can be kept
- identify what should be rewritten
- identify what should be reordered
- identify relevant missing skills
- clearly mark anything that should only be added
  if the candidate actually has that experience

5. If a technology is required by the target job but
is not present in the resume context, say that it is
missing instead of pretending the candidate knows it.

6. Never fabricate experience just to improve ATS score.

7. Prefer actionable recommendations.

8. When useful, structure answers as:
KEEP
CHANGE
REORDER
MISSING / LEARN
DO NOT ADD UNLESS TRUE

9. Keep responses concise but useful.

10. If no relevant resume memory exists, clearly say
that ResumePilot could not find relevant resume
information and recommend uploading/generating a
resume report first.

==================================================
ANSWER
==================================================
`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      temperature: 0.2,
    },
  });

  const answer =
    response.text?.trim() || "I could not generate a response right now.";

  const uniqueSources = [];

  const seenSources = new Set();

  for (const item of memories) {
    const key = `${item.reportId}-${item.section}`;

    if (seenSources.has(key)) {
      continue;
    }

    seenSources.add(key);

    uniqueSources.push({
      reportId: item.reportId,
      resumeVersion: item.resumeVersion,
      title: item.title,
      section: item.section,
      source: item.source,
    });
  }

  return {
    answer,
    sources: uniqueSources,
  };
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  generateVector,
  chunkResumeText,
  indexResumeForResumePilot,
  retrieveResumeContext,
  generateResumePilotResponse,
};
