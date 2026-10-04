const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const GEMINI_MODEL = "gemini-3.1-flash-lite";

/* =========================================================
   GEMINI STRUCTURED CONTENT
========================================================= */

async function generateStructuredContent(prompt, schema) {
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: zodToJsonSchema(schema),
      temperature: 0.1,
    },
  });

  if (!response || !response.text) {
    throw new Error("Gemini returned an empty response.");
  }

  console.log("\n========== GEMINI RESPONSE ==========\n");
  console.log(response.text);
  console.log("\n=====================================\n");

  let parsed;

  try {
    parsed = JSON.parse(response.text);
  } catch (error) {
    console.error("Invalid Gemini JSON:", response.text);
    throw new Error("Gemini returned invalid JSON.");
  }

  return schema.parse(parsed);
}

/* =========================================================
   INTERVIEW SCHEMAS
========================================================= */

const interviewQuestionSchema = z.object({
  question: z.string().min(1),
  intention: z.string().min(1),
  answer: z.string().min(1),
});

const skillGapSchema = z.object({
  skill: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
});

const preparationPlanSchema = z.object({
  day: z.number().int().min(1),
  focus: z.string().min(1),
  tasks: z.array(z.string().min(1)).min(1),
});

const interviewReportSchema = z.object({
  matchScore: z.number().min(0).max(100),

  technicalQuestions: z.array(interviewQuestionSchema).min(20),

  behavioralQuestions: z.array(interviewQuestionSchema).min(20),

  skillGaps: z.array(skillGapSchema),

  preparationPlan: z.array(preparationPlanSchema).min(1),

  title: z.string().min(1),
});

/* =========================================================
   ATS ANALYSIS SCHEMA
========================================================= */

const atsAnalysisSchema = z.object({
  atsScore: z.number().int().min(0).max(100),

  scoreBreakdown: z.object({
    contactInformation: z.number().int().min(0).max(10),
    professionalSummary: z.number().int().min(0).max(10),
    skills: z.number().int().min(0).max(20),
    experience: z.number().int().min(0).max(20),
    projects: z.number().int().min(0).max(15),
    education: z.number().int().min(0).max(10),
    keywordAlignment: z.number().int().min(0).max(15),
  }),

  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  formattingIssues: z.array(z.string()),
  missingSections: z.array(z.string()),
  improvements: z.array(z.string()),
  strengths: z.array(z.string()),
});

/* =========================================================
   RESUME CONTENT SCHEMA
========================================================= */

const resumeContentSchema = z.object({
  name: z.string().min(1),

  contact: z.string(),

  summary: z.string(),

  skills: z.array(
    z.object({
      category: z.string().min(1),
      items: z.array(z.string().min(1)),
    }),
  ),

  experience: z.array(
    z.object({
      company: z.string().min(1),
      role: z.string().min(1),
      date: z.string(),
      bullets: z.array(z.string().min(1)),
    }),
  ),

  projects: z.array(
    z.object({
      name: z.string().min(1),
      technologies: z.string(),
      bullets: z.array(z.string().min(1)),
    }),
  ),

  education: z.array(
    z.object({
      degree: z.string().min(1),
      institution: z.string().min(1),
      date: z.string(),
      details: z.string(),
    }),
  ),

  certifications: z.array(z.string()),
});

/* =========================================================
   HELPERS
========================================================= */

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   VERIFICATION HELPERS (used to validate the AI output)
========================================================= */

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word match, safe for C++, C#, Node.js, CI/CD. Java != JavaScript. */
function containsTerm(text, term) {
  const base = cleanText(term).toLowerCase();
  if (!base) return false;
  const variants = new Set([base]);
  if (base.includes(".") && !base.startsWith(".")) {
    variants.add(base.replace(/[.\s-]/g, "")); // node.js -> nodejs
  }
  const lower = String(text || "").toLowerCase();
  return [...variants].some((v) =>
    new RegExp(`(?<![a-z0-9+#])${escapeRegex(v)}(?![a-z0-9+#])`, "i").test(
      lower,
    ),
  );
}

/** Loose check that a value is grounded in the source text. */
function appearsInSource(value, sourceLower, threshold = 0.6) {
  const tokens = String(value)
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((t) => t.replace(/\.$/, "").replace(/s$/, ""))
    .filter((t) => t.length >= 2);
  if (!tokens.length) return true;
  const hit = tokens.filter((t) => sourceLower.includes(t)).length;
  return hit / tokens.length >= threshold;
}

const SECTION_ALIASES = {
  summary: [
    "summary",
    "professional summary",
    "profile",
    "professional profile",
    "objective",
    "career objective",
    "about me",
    "about",
  ],
  skills: [
    "skills",
    "technical skills",
    "key skills",
    "core competencies",
    "technologies",
    "tech stack",
    "skills & tools",
    "skills and tools",
  ],
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "work history",
    "internship",
    "internships",
    "internship experience",
  ],
  projects: [
    "projects",
    "personal projects",
    "academic projects",
    "key projects",
    "technical projects",
  ],
  education: [
    "education",
    "academic background",
    "academic qualifications",
    "qualifications",
    "education and training",
  ],
  certifications: [
    "certifications",
    "certificates",
    "licenses",
    "courses",
    "training",
  ],
};

const SECTION_LABELS = {
  summary: "Professional Summary",
  skills: "Skills",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
};

function normalizeHeading(line) {
  return line
    .toLowerCase()
    .replace(/[^a-z& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function headingKey(normalized) {
  for (const [key, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.includes(normalized)) return key;
  }
  return null;
}

function parseSections(text) {
  const sections = { header: [] };
  let current = "header";
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.length <= 40) {
      const key = headingKey(normalizeHeading(line));
      if (key) {
        current = key;
        sections[current] = sections[current] || [];
        continue;
      }
    }
    (sections[current] = sections[current] || []).push(line);
  }
  return sections;
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const BULLET_RE = /^\s*[•●▪◦·‣∙\-–—*]\s+/;
const DEGREE_RE =
  /\b(b\.?\s?tech|b\.?e\b|b\.?sc|bca|bachelor|master|m\.?tech|m\.?sc|mca|mba|diploma|ph\.?d|b\.?com|b\.?a\b|12th|intermediate|high school)/i;

const ACTION_VERBS = new Set([
  "built",
  "led",
  "ran",
  "wrote",
  "made",
  "developed",
  "designed",
  "implemented",
  "created",
  "managed",
  "optimized",
  "optimised",
  "integrated",
  "deployed",
  "architected",
  "engineered",
  "automated",
  "improved",
  "reduced",
  "increased",
  "launched",
  "migrated",
  "refactored",
  "configured",
  "analyzed",
  "analysed",
  "collaborated",
  "delivered",
  "maintained",
  "tested",
  "debugged",
  "secured",
  "streamlined",
  "established",
  "enhanced",
  "spearheaded",
  "mentored",
  "coordinated",
  "owned",
  "drove",
  "shipped",
  "authored",
  "constructed",
  "orchestrated",
  "resolved",
  "scaled",
  "monitored",
  "documented",
  "researched",
  "contributed",
  "leveraged",
  "utilized",
  "utilised",
  "applied",
  "executed",
  "produced",
  "supported",
  "trained",
  "evaluated",
  "modeled",
]);

function startsWithActionVerb(bullet) {
  const w = bullet
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase()
    .replace(/[^a-z]/g, "");
  return !!w && (ACTION_VERBS.has(w) || /^[a-z]{3,}ed$/.test(w));
}

function getBullets(lines = []) {
  const explicit = lines
    .filter((l) => BULLET_RE.test(l))
    .map((l) => l.replace(BULLET_RE, ""));
  if (explicit.length) return explicit;
  return lines.filter((l) => l.split(/\s+/).length >= 7);
}

function findPhone(text) {
  const candidates = String(text || "").match(/\+?\d[\d\s().-]{8,}\d/g) || [];
  return (
    candidates.find((c) => {
      const digits = c.replace(/\D/g, "");
      return (
        digits.length >= 10 &&
        digits.length <= 13 &&
        !/(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}/.test(c)
      );
    }) || ""
  ).trim();
}

function extractContactInfo(text) {
  const t = String(text || "");
  return {
    email: t.match(EMAIL_RE)?.[0] || "",
    phone: findPhone(t),
    linkedin:
      t.match(
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[\w\-%]+\/?/i,
      )?.[0] || "",
    github:
      t.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i)?.[0] || "",
    portfolio:
      (t.match(/https?:\/\/[^\s)>,|]+/gi) || []).find(
        (u) => !/linkedin\.com|github\.com/i.test(u),
      ) ||
      t.match(
        /\b[\w-]+\.(?:vercel\.app|netlify\.app|github\.io|onrender\.com)\b[^\s)>,|]*/i,
      )?.[0] ||
      "",
  };
}

function detectName(headerLines = []) {
  const line = (headerLines.find((l) => l.trim()) || "").trim();
  const words = line.split(/\s+/);
  return words.length >= 2 &&
    words.length <= 5 &&
    !/[@\d/|]/.test(line) &&
    line.length <= 50
    ? line
    : "";
}

/* =========================================================
   REMOVE DUPLICATES
========================================================= */

function removeDuplicateQuestions(questions) {
  const seen = new Set();

  return questions.filter((item) => {
    if (!item?.question) return false;

    const normalized = item.question.trim().toLowerCase().replace(/\s+/g, " ");

    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);

    return true;
  });
}

function removeDuplicateSkillGaps(skillGaps) {
  const seen = new Set();

  return skillGaps.filter((item) => {
    if (!item?.skill) return false;

    const normalized = item.skill.trim().toLowerCase();

    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);

    return true;
  });
}

/* =========================================================
   INTERVIEW REPORT
========================================================= */

async function generateInterviewReport({
  resume,
  selfDescription,
  jobDescription,
}) {
  const prompt = `
You are an expert technical interviewer and recruitment analyst.

Analyze the candidate strictly against the provided Job Description.

CANDIDATE RESUME:
${resume || "Not provided"}

SELF DESCRIPTION:
${selfDescription || "Not provided"}

JOB DESCRIPTION:
${jobDescription || "Not provided"}

STRICT RULES:

- Never invent candidate experience.
- Never invent projects.
- Never invent technologies.
- Never invent metrics.
- Never invent companies.
- Never invent education.
- Never invent certifications.

Do not infer one technology from another.

JavaScript != TypeScript
React != Next.js
MongoDB != PostgreSQL
Node.js != NestJS
Express.js != Fastify
REST != GraphQL

Generate a realistic match score.

Generate at least 20 unique technical questions.

Generate at least 20 unique behavioral questions.

Technical questions should cover relevant fundamentals,
implementation, debugging, architecture, authentication,
security, performance and project-specific topics.

Behavioral questions should cover introduction, teamwork,
conflict, failure, learning, deadlines, communication,
ownership, pressure, motivation and career goals.

Do not invent candidate experiences in behavioral answers.

Generate skill gaps based only on actual missing evidence.

Generate a dynamic preparation roadmap based on the actual
skill gaps.

High severity gaps should be prioritized.

Return only valid JSON.
`;

  const result = await generateStructuredContent(prompt, interviewReportSchema);

  result.technicalQuestions = removeDuplicateQuestions(
    result.technicalQuestions,
  );

  result.behavioralQuestions = removeDuplicateQuestions(
    result.behavioralQuestions,
  );

  result.skillGaps = removeDuplicateSkillGaps(result.skillGaps);

  if (result.technicalQuestions.length < 20) {
    throw new Error("Less than 20 unique technical questions were generated.");
  }

  if (result.behavioralQuestions.length < 20) {
    throw new Error("Less than 20 unique behavioral questions were generated.");
  }

  return result;
}

/* =========================================================
   ATS ANALYSIS
   (same prompt + same Gemini call as before; the result is now
   VERIFIED against the real resume text before it is returned)
========================================================= */

function validateAtsResult(result, resume, jobDescription) {
  const text = String(resume || "");
  const jd = String(jobDescription || "");
  const sections = parseSections(text);
  const lines = (k) => sections[k] || [];
  const has = (k) => lines(k).length > 0;
  const uniq = (arr) => [
    ...new Set((arr || []).map(cleanText).filter(Boolean)),
  ];

  const raw = result.scoreBreakdown;
  const improvements = [...result.improvements];
  const formattingIssues = [...result.formattingIssues];
  let penalty = 0;

  /* ---------- Keywords: only what is really in the resume / JD ---------- */
  const llmMatched = uniq(result.matchedKeywords);
  const matchedKeywords = llmMatched.filter((k) => containsTerm(text, k));
  const movedOut = llmMatched.filter((k) => !containsTerm(text, k));
  const missingKeywords = uniq([...result.missingKeywords, ...movedOut]).filter(
    (k) => !containsTerm(text, k) && containsTerm(jd, k),
  );
  const totalKeywords = matchedKeywords.length + missingKeywords.length;

  /* ---------- Contact (10) computed from real text ---------- */
  const header = lines("header");
  const headerInfo = extractContactInfo(header.join("\n"));
  const info = extractContactInfo(text);
  let contactInformation = 0;
  if (detectName(header)) contactInformation += 2;
  if (headerInfo.email || info.email) contactInformation += 3;
  else
    improvements.push("Add a professional email address in the resume header.");
  if (info.phone) contactInformation += 2;
  else improvements.push("Add a phone number in the resume header.");
  if (info.linkedin) contactInformation += 2;
  else improvements.push("Add your LinkedIn profile URL.");
  if (info.github || info.portfolio) contactInformation += 1;
  else improvements.push("Add a GitHub or portfolio URL.");

  /* ---------- Sections ---------- */
  const missingSections = uniq(result.missingSections).filter((name) => {
    const key = headingKey(normalizeHeading(name));
    return !(key && has(key));
  });
  for (const [key, label] of Object.entries(SECTION_LABELS)) {
    if (
      !has(key) &&
      !missingSections.some((s) => s.toLowerCase() === label.toLowerCase())
    ) {
      missingSections.push(label);
      improvements.push(
        `Add a clearly labelled "${label}" section using a standard heading.`,
      );
    }
  }

  const bulletQualityCap = (key, max) => {
    if (!has(key)) return 0;
    const bullets = getBullets(lines(key));
    const verbRatio = bullets.length
      ? bullets.filter(startsWithActionVerb).length / bullets.length
      : 0;
    if (verbRatio < 0.7) {
      improvements.push(
        `Start every ${key} bullet with a strong action verb (Built, Developed, Implemented...).`,
      );
    }
    return Math.round(max * (bullets.length ? 0.5 + 0.5 * verbRatio : 0.4));
  };

  /* ---------- Summary / Skills / Education caps ---------- */
  const summaryWords = lines("summary")
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  const professionalSummary = !has("summary")
    ? 0
    : Math.min(
        clamp(raw.professionalSummary, 0, 10),
        summaryWords < 15 ? 4 : 10,
      );

  const skillTokens = new Set(
    lines("skills")
      .join("\n")
      .replace(/^[^:\n]{1,30}:/gm, "")
      .split(/[,|•;\n/]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && s.length <= 30),
  );
  const skills = !has("skills")
    ? 0
    : Math.min(clamp(raw.skills, 0, 20), skillTokens.size < 6 ? 8 : 20);

  const education = !has("education")
    ? 0
    : Math.min(
        clamp(raw.education, 0, 10),
        DEGREE_RE.test(lines("education").join(" ")) ? 10 : 5,
      );

  const experience = Math.min(
    clamp(raw.experience, 0, 20),
    bulletQualityCap("experience", 20),
  );
  const projects = Math.min(
    clamp(raw.projects, 0, 15),
    bulletQualityCap("projects", 15),
  );

  /* ---------- Keyword alignment recomputed from real matches ---------- */
  let keywordAlignment = totalKeywords
    ? Math.round((15 * matchedKeywords.length) / totalKeywords)
    : 0;
  if (!jd.trim()) {
    keywordAlignment = 0;
    improvements.push(
      "No job description was provided, so keyword alignment could not be scored.",
    );
  }
  if (missingKeywords.length) {
    improvements.push(
      `Missing JD keywords: ${missingKeywords.slice(0, 8).join(", ")}. Add only the ones you genuinely have.`,
    );
  }

  /* ---------- Formatting penalty from real text signals ---------- */
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const textLines = text.split(/\r?\n/);
  if (textLines.filter((l) => /\S {4,}\S|\t/.test(l)).length >= 4) {
    formattingIssues.push(
      "Large gaps or tabs suggest a multi-column or table layout that ATS parsers may read out of order.",
    );
    penalty += 4;
  }
  if (/[\uE000-\uF8FF]|\p{Extended_Pictographic}/u.test(text)) {
    formattingIssues.push(
      "Icons, emoji or special glyphs detected; ATS parsers may mis-read them.",
    );
    penalty += 2;
  }
  if (wordCount < 150) {
    formattingIssues.push(
      "Resume text is very short (under 150 words) or could not be fully extracted.",
    );
    penalty += 5;
  } else if (wordCount > 1000) {
    formattingIssues.push("Resume is very long; keep it to one page.");
    penalty += 3;
  }
  if (textLines.filter((l) => l.length > 250).length >= 3) {
    formattingIssues.push(
      "Dense paragraphs detected; use short bullet points.",
    );
    penalty += 2;
  }
  penalty = Math.min(penalty, 15);

  /* ---------- Final score: always = sum(breakdown) - penalty ---------- */
  const scoreBreakdown = {
    contactInformation: Math.round(clamp(contactInformation, 0, 10)),
    professionalSummary: Math.round(professionalSummary),
    skills: Math.round(skills),
    experience: Math.round(experience),
    projects: Math.round(projects),
    education: Math.round(education),
    keywordAlignment: Math.round(clamp(keywordAlignment, 0, 15)),
  };
  const total = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);
  const atsScore = Math.round(clamp(total - penalty, 0, 97)); // 98-100 intentionally unreachable

  return {
    ...result,
    atsScore,
    scoreBreakdown,
    formattingPenalty: penalty,
    matchedKeywords,
    missingKeywords,
    formattingIssues: uniq(formattingIssues),
    missingSections: uniq(missingSections),
    improvements: uniq(improvements),
  };
}

async function analyzeResumeATS({ resume, jobDescription }) {
  const prompt = `
You are a strict ATS resume evaluator and senior recruiter.

Evaluate the actual candidate resume.

CANDIDATE RESUME:
${resume || "Not provided"}

TARGET JOB DESCRIPTION:
${jobDescription || "Not provided"}

Evaluate:

- Contact information
- Professional summary
- Skills
- Experience
- Projects
- Education
- Keyword alignment
- ATS formatting

Scoring:

Contact Information = 10
Professional Summary = 10
Skills = 20
Experience = 20
Projects = 15
Education = 10
Keyword Alignment = 15

Total = 100.

Only identify information that actually exists or is actually missing.

Do not assume related technologies are equivalent.

JavaScript != TypeScript
React != Next.js
MongoDB != PostgreSQL
Node.js != NestJS
Express.js != Fastify
REST != GraphQL

Formatting issues should only contain genuine ATS problems.

KEYWORD RULES:

- matchedKeywords: hard skills/tools/technologies that appear in BOTH the resume and the job description, spelled as in the resume.
- missingKeywords: hard skills/tools/technologies that appear in the job description but NOT in the resume, spelled as in the job description.
- No soft skills and no generic words.

Be strict: an average resume scores 55-70, a good one 70-82, 90+ is rare.

Return only valid JSON.
`;

  const llmResult = await generateStructuredContent(prompt, atsAnalysisSchema);

  // The model's numbers are never trusted blindly: they are checked
  // and capped against the real resume text.
  return validateAtsResult(llmResult, resume, jobDescription);
}

/* =========================================================
   RESUME GENERATION PROMPT
========================================================= */

async function generateResumeContent({
  resume,
  selfDescription,
  jobDescription,
}) {
  const prompt = `
You are a senior ATS resume writer and technical recruiter.

Your job is to transform the candidate's existing resume into
professional ATS-friendly resume content.

IMPORTANT:

You are generating CONTENT only.
You are NOT generating HTML.
You are NOT generating CSS.

==================================================
ORIGINAL RESUME
==================================================

${resume || "Not provided"}

==================================================
SELF DESCRIPTION
==================================================

${selfDescription || "Not provided"}

==================================================
TARGET JOB DESCRIPTION
==================================================

${jobDescription || "Not provided"}

==================================================
SOURCE PRIORITY
==================================================

1. Original Resume
2. Self Description
3. Job Description only for prioritization

The Job Description must NOT be used to invent candidate facts.

==================================================
NO FABRICATION
==================================================

Never invent:

- experience
- company
- role
- project
- technology
- certification
- achievement
- metric
- responsibility
- education
- employment
- internship
- award

Never fabricate numbers.

Never fabricate performance improvements.

Never fabricate users.

Never fabricate business impact.

==================================================
TECHNOLOGY RULE
==================================================

JavaScript does NOT automatically mean TypeScript.

React does NOT automatically mean Next.js.

MongoDB does NOT automatically mean PostgreSQL.

Node.js does NOT automatically mean NestJS.

Express.js does NOT automatically mean Fastify.

REST does NOT automatically mean GraphQL.

==================================================
CONTENT PRESERVATION
==================================================

Do not aggressively shorten the original resume.

Preserve useful factual information.

Preserve genuine:

- responsibilities
- technologies
- projects
- internships
- achievements
- education
- certifications
- technical details

Improve wording while keeping the original meaning.

==================================================
SUMMARY
==================================================

Create a professional 2-3 sentence summary.

It should describe the actual candidate and target role.

Do not exaggerate.

==================================================
SKILLS
==================================================

Use only actual skills.

Use categories such as:

Languages
Frontend
Backend
Database
Tools
Cloud / Deployment

Do not create empty categories.

==================================================
EXPERIENCE
==================================================

For substantial experiences, use 3-5 bullets if enough factual
information exists.

Do not create bullets just to increase length.

==================================================
PROJECTS
==================================================

For substantial projects, use 3-4 bullets if enough factual
information exists.

Include technologies only when supported by the source.

==================================================
BULLET STYLE
==================================================

Use concise professional bullets.

Prefer:

Action + implementation + technical context + genuine outcome

Only mention outcomes when supported by the source.

==================================================
ATS HEADINGS
==================================================

Use standard sections:

SUMMARY
SKILLS
EXPERIENCE
PROJECTS
EDUCATION
CERTIFICATIONS

==================================================
IMPORTANT
==================================================

The resulting resume will be rendered as a single-column A4
ATS-friendly resume.

Do not make content unnecessarily verbose.

Do not remove genuine useful content.

Do not fabricate content merely to fill page space.

==================================================
ATS + SINGLE PAGE REQUIREMENTS
==================================================

The final resume must fit on ONE A4 page.

- Every bullet must begin with a strong action verb.
- Every bullet must be at most 2 lines (about 28 words).
- No first-person pronouns (I, my, we).
- No bullet characters, emoji or symbols inside the text.
- Dates in a consistent format such as "Jan 2024 - Present".
- Spell JD technologies exactly as the JD spells them, but ONLY
  when the candidate's source already contains that technology.
- The "contact" field must contain only contact details found in
  the source (location, phone, email, LinkedIn, GitHub, portfolio)
  separated by " | ".

Return only JSON.
`;

  return await generateStructuredContent(prompt, resumeContentSchema);
}

/* =========================================================
   NORMALIZE RESUME DATA
========================================================= */

function normalizeResumeData(data) {
  const stripBullet = (b) => cleanText(b).replace(/^[•●▪◦·‣∙\-–—*]\s*/, "");

  return {
    name: cleanText(data?.name),

    contact: cleanText(data?.contact),

    summary: cleanText(data?.summary),

    skills: Array.isArray(data?.skills)
      ? data.skills
          .filter(
            (skill) =>
              skill &&
              skill.category &&
              Array.isArray(skill.items) &&
              skill.items.length > 0,
          )
          .map((skill) => ({
            category: cleanText(skill.category),

            items: skill.items.map((item) => cleanText(item)).filter(Boolean),
          }))
      : [],

    experience: Array.isArray(data?.experience)
      ? data.experience
          .filter((item) => item && item.company && item.role)
          .map((item) => ({
            company: cleanText(item.company),

            role: cleanText(item.role),

            date: cleanText(item.date),

            bullets: Array.isArray(item.bullets)
              ? item.bullets.map(stripBullet).filter(Boolean)
              : [],
          }))
      : [],

    projects: Array.isArray(data?.projects)
      ? data.projects
          .filter((project) => project && project.name)
          .map((project) => ({
            name: cleanText(project.name),

            technologies: cleanText(project.technologies),

            bullets: Array.isArray(project.bullets)
              ? project.bullets.map(stripBullet).filter(Boolean)
              : [],
          }))
      : [],

    education: Array.isArray(data?.education)
      ? data.education
          .filter((item) => item && item.degree && item.institution)
          .map((item) => ({
            degree: cleanText(item.degree),

            institution: cleanText(item.institution),

            date: cleanText(item.date),

            details: cleanText(item.details),
          }))
      : [],

    certifications: Array.isArray(data?.certifications)
      ? data.certifications.map((item) => cleanText(item)).filter(Boolean)
      : [],
  };
}

/* =========================================================
   VERIFY GENERATED RESUME AGAINST THE CANDIDATE'S OWN TEXT
========================================================= */

function buildVerifiedContact(llmContact, source) {
  const norm = (s) =>
    String(s)
      .toLowerCase()
      .replace(/https?:\/\/(www\.)?/g, "")
      .replace(/\/$/, "")
      .replace(/\s+/g, "");
  const srcNorm = norm(source);
  const digits = (s) => String(s).replace(/\D/g, "");

  const parts = String(llmContact || "")
    .split(/\s*[|•·]\s*/)
    .map(cleanText)
    .filter((p) => p && srcNorm.includes(norm(p)));

  const found = extractContactInfo(source);
  const hasPart = (value) =>
    parts.some(
      (p) =>
        norm(p) === norm(value) ||
        (digits(value).length >= 10 && digits(p) === digits(value)),
    );

  for (const value of [
    found.phone,
    found.email,
    found.linkedin,
    found.github,
  ]) {
    if (value && !hasPart(value)) parts.push(cleanText(value));
  }

  return parts.length ? parts.join(" | ") : cleanText(llmContact);
}

function finalizeResumeData(rawContent, { resume, selfDescription }) {
  const source = [resume, selfDescription].filter(Boolean).join("\n");
  const srcLower = source.toLowerCase();
  const data = normalizeResumeData(rawContent);

  const grounded = (item) =>
    containsTerm(source, item) || appearsInSource(item, srcLower, 1);

  data.skills = data.skills
    .map((s) => ({
      category: s.category,
      items: [...new Set(s.items.filter(grounded))],
    }))
    .filter((s) => s.items.length);

  data.projects = data.projects.map((p) => ({
    ...p,
    technologies: p.technologies
      .split(",")
      .map(cleanText)
      .filter((t) => t && grounded(t))
      .join(", "),
  }));

  data.certifications = data.certifications.filter((c) =>
    appearsInSource(c, srcLower),
  );

  const detectedName = detectName(parseSections(resume || "").header);
  if (!appearsInSource(data.name, srcLower, 0.8) && detectedName) {
    data.name = detectedName;
  }

  data.contact = buildVerifiedContact(data.contact, source);

  return data;
}

/** Removes one bullet (from the entry with the most bullets, never below 2). */
function trimResumeData(data) {
  const copy = JSON.parse(JSON.stringify(data));
  const lists = [...copy.projects, ...copy.experience].map((e) => e.bullets);

  let target = null;
  for (const list of lists) {
    if (list.length > 2 && (!target || list.length > target.length))
      target = list;
  }
  if (!target) return null;

  target.pop();
  return copy;
}

/* =========================================================
   RESUME HTML
========================================================= */

function generateResumeHtml(rawData) {
  const data = normalizeResumeData(rawData);

  /* -------------------------------------------------------
     SKILLS
  ------------------------------------------------------- */

  const skillsHtml = data.skills
    .map(
      (skill) => `
          <div class="skill-row">
            <span class="skill-category">${escapeHtml(skill.category)}:</span>
            <span>${escapeHtml(skill.items.join(", "))}</span>
          </div>
        `,
    )
    .join("");

  /* -------------------------------------------------------
     EXPERIENCE
  ------------------------------------------------------- */

  const experienceHtml = data.experience
    .map(
      (item) => `
          <div class="experience-entry">

            <div class="entry-top">

              <div class="entry-title">
                <strong>${escapeHtml(item.company)}</strong>
                ${
                  item.role
                    ? `<span class="entry-role">| ${escapeHtml(item.role)}</span>`
                    : ""
                }
              </div>

              ${
                item.date
                  ? `<div class="entry-date">${escapeHtml(item.date)}</div>`
                  : ""
              }

            </div>

            ${
              item.bullets.length
                ? `
                  <ul class="bullet-list">
                    ${item.bullets
                      .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
                      .join("")}
                  </ul>
                `
                : ""
            }

          </div>
        `,
    )
    .join("");

  /* -------------------------------------------------------
     PROJECTS
  ------------------------------------------------------- */

  const projectsHtml = data.projects
    .map(
      (project) => `
          <div class="project-entry">

            <div class="entry-top">

              <div class="entry-title">
                <strong>${escapeHtml(project.name)}</strong>
                ${
                  project.technologies
                    ? `<span class="entry-role">| ${escapeHtml(project.technologies)}</span>`
                    : ""
                }
              </div>

            </div>

            ${
              project.bullets.length
                ? `
                  <ul class="bullet-list">
                    ${project.bullets
                      .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
                      .join("")}
                  </ul>
                `
                : ""
            }

          </div>
        `,
    )
    .join("");

  /* -------------------------------------------------------
     EDUCATION
  ------------------------------------------------------- */

  const educationHtml = data.education
    .map(
      (item) => `
          <div class="education-entry">

            <div class="entry-top">

              <div class="entry-title">
                <strong>${escapeHtml(item.degree)}</strong>
                <span class="entry-role">| ${escapeHtml(item.institution)}</span>
              </div>

              ${
                item.date
                  ? `<div class="entry-date">${escapeHtml(item.date)}</div>`
                  : ""
              }

            </div>

            ${
              item.details
                ? `<div class="education-details">${escapeHtml(item.details)}</div>`
                : ""
            }

          </div>
        `,
    )
    .join("");

  /* -------------------------------------------------------
     CERTIFICATIONS
  ------------------------------------------------------- */

  const certificationsHtml = data.certifications.length
    ? `
        <section class="resume-section">

          <div class="section-heading">CERTIFICATIONS</div>

          <ul class="bullet-list">
            ${data.certifications
              .map((certification) => `<li>${escapeHtml(certification)}</li>`)
              .join("")}
          </ul>

        </section>
      `
    : "";

  /* -------------------------------------------------------
     COMPLETE HTML
  ------------------------------------------------------- */

  return `<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<title>${escapeHtml(data.name)} - Resume</title>

<style>

/* A4 page. Content box = 184mm x 277mm. */
@page {
  size: A4;
  margin: 10mm 13mm;
}

/* Density variables: the renderer picks the most comfortable
   level that still fits on ONE page (never below 9pt). */
:root {
  --fs: 10.5pt;
  --lh: 1.32;
  --sec: 12px;
  --ent: 7px;
  --li: 2.5px;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: #ffffff;
}

body {
  color: #000000;

  font-family: Arial, Helvetica, "Liberation Sans", sans-serif;

  font-size: var(--fs);

  line-height: var(--lh);
}

.resume {
  width: 184mm;
  margin: 0;
  padding: 0;
}

/* HEADER */

.header {
  text-align: center;
  margin: 0 0 var(--sec) 0;
}

.name {
  font-size: calc(var(--fs) * 1.9);
  font-weight: 700;
  line-height: 1.1;
  margin: 0 0 4px 0;
}

.contact {
  font-size: var(--fs);
  line-height: 1.25;
  word-break: break-word;
}

/* SECTIONS */

.resume-section {
  margin: 0 0 var(--sec) 0;
}

.resume-section:last-child {
  margin-bottom: 0;
}

.section-heading {
  font-size: calc(var(--fs) * 1.08);
  font-weight: 700;
  line-height: 1.2;
  margin: 0 0 calc(var(--ent) - 1px) 0;
  padding: 0 0 2px 0;
  border-bottom: 1px solid #000000;
  break-after: avoid;
}

.summary {
  margin: 0;
}

/* SKILLS */

.skill-row {
  margin: 0 0 var(--li) 0;
}

.skill-row:last-child {
  margin-bottom: 0;
}

.skill-category {
  font-weight: 700;
}

/* ENTRIES */

.experience-entry,
.project-entry,
.education-entry {
  margin: 0 0 var(--ent) 0;
}

.experience-entry:last-child,
.project-entry:last-child,
.education-entry:last-child {
  margin-bottom: 0;
}

.entry-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 var(--li) 0;
  break-after: avoid;
}

.entry-title {
  min-width: 0;
  flex: 1;
}

.entry-role {
  font-weight: 400;
  margin-left: 2px;
}

.entry-date {
  flex-shrink: 0;
  white-space: nowrap;
}

/* BULLETS */

.bullet-list {
  margin: 0;
  padding: 0 0 0 18px;
  list-style-type: disc;
}

.bullet-list li {
  margin: 0 0 var(--li) 0;
  padding: 0;
}

.bullet-list li:last-child {
  margin-bottom: 0;
}

.education-details {
  margin: 0;
}

</style>

</head>

<body>

<div class="resume">

  <header class="header">

    <div class="name">${escapeHtml(data.name)}</div>

    ${data.contact ? `<div class="contact">${escapeHtml(data.contact)}</div>` : ""}

  </header>

  ${
    data.summary
      ? `
        <section class="resume-section">
          <div class="section-heading">SUMMARY</div>
          <p class="summary">${escapeHtml(data.summary)}</p>
        </section>
      `
      : ""
  }

  ${
    data.skills.length
      ? `
        <section class="resume-section">
          <div class="section-heading">SKILLS</div>
          ${skillsHtml}
        </section>
      `
      : ""
  }

  ${
    data.experience.length
      ? `
        <section class="resume-section">
          <div class="section-heading">EXPERIENCE</div>
          ${experienceHtml}
        </section>
      `
      : ""
  }

  ${
    data.projects.length
      ? `
        <section class="resume-section">
          <div class="section-heading">PROJECTS</div>
          ${projectsHtml}
        </section>
      `
      : ""
  }

  ${
    data.education.length
      ? `
        <section class="resume-section">
          <div class="section-heading">EDUCATION</div>
          ${educationHtml}
        </section>
      `
      : ""
  }

  ${certificationsHtml}

</div>

</body>

</html>
`;
}

/* =========================================================
   GENERATE PDF (single page, auto-fit)
========================================================= */

// comfortable -> compact. Font never goes below 9pt (ATS / readability).
const DENSITY_LEVELS = [
  { fs: 10.5, lh: 1.32, sec: 12, ent: 7, li: 2.5 },
  { fs: 10.2, lh: 1.3, sec: 11, ent: 6.5, li: 2.2 },
  { fs: 10, lh: 1.28, sec: 10, ent: 6, li: 2 },
  { fs: 9.7, lh: 1.26, sec: 9, ent: 5, li: 1.7 },
  { fs: 9.4, lh: 1.23, sec: 8, ent: 4, li: 1.4 },
  { fs: 9.2, lh: 1.2, sec: 7, ent: 3.5, li: 1.2 },
  { fs: 9, lh: 1.18, sec: 6, ent: 3, li: 1 },
];

const MM_TO_PX = 96 / 25.4;
const PAGE_CONTENT_HEIGHT_PX = (297 - 20) * MM_TO_PX; // A4 minus 10mm top/bottom
const FIT_SAFETY_PX = 6;

/**
 * Returns { pdf, fits }.
 * If requireFit is true and the content cannot fit on one page even at the
 * most compact level, nothing is rendered and { pdf: null, fits: false } is returned.
 */
async function generatePdfFromHtml(htmlContent, { requireFit = false } = {}) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,

      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    await page.emulateMediaType("print");

    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });

    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
    });

    await page.evaluate(async () => {
      if (document.fonts) {
        await document.fonts.ready;
      }
    });

    /* -----------------------------------------------------
       Pick the most comfortable density that fits ONE page
    ----------------------------------------------------- */

    let fits = false;
    let chosen = DENSITY_LEVELS[DENSITY_LEVELS.length - 1];
    let height = 0;

    for (const level of DENSITY_LEVELS) {
      await page.evaluate((t) => {
        const s = document.documentElement.style;
        s.setProperty("--fs", `${t.fs}pt`);
        s.setProperty("--lh", String(t.lh));
        s.setProperty("--sec", `${t.sec}px`);
        s.setProperty("--ent", `${t.ent}px`);
        s.setProperty("--li", `${t.li}px`);
      }, level);

      height = await page.evaluate(
        () => document.querySelector(".resume").getBoundingClientRect().height,
      );

      chosen = level;

      if (height <= PAGE_CONTENT_HEIGHT_PX - FIT_SAFETY_PX) {
        fits = true;
        break;
      }
    }

    console.log("\n========== RESUME LAYOUT ==========");
    console.log({
      fits,
      fontSizePt: chosen.fs,
      contentHeightPx: Math.round(height),
      pageContentHeightPx: Math.round(PAGE_CONTENT_HEIGHT_PX),
    });
    console.log("===================================\n");

    if (!fits && requireFit) {
      return { pdf: null, fits: false };
    }

    /* -----------------------------------------------------
       CREATE PDF
    ----------------------------------------------------- */

    const pdf = await page.pdf({
      format: "A4",

      preferCSSPageSize: true,

      printBackground: false,

      displayHeaderFooter: false,

      // Hard guarantee: never more than one page.
      pageRanges: "1",

      tagged: true,

      /*
       * CSS @page controls the real page margins.
       * Puppeteer margins stay zero so margins are not doubled.
       */
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    return { pdf, fits };
  } catch (error) {
    console.error("\n========== PDF GENERATION ERROR ==========\n");

    console.error(error);

    console.error("\n===========================================\n");

    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/* =========================================================
   PUBLIC PDF GENERATOR
========================================================= */

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
  console.log("\n========================================");

  console.log("STARTING ATS RESUME GENERATION");

  console.log("========================================\n");

  /* -------------------------------------------------------
     STEP 1: Generate structured content
  ------------------------------------------------------- */

  const resumeContent = await generateResumeContent({
    resume,
    selfDescription,
    jobDescription,
  });

  console.log("\n========== FINAL RESUME CONTENT ==========\n");

  console.log(JSON.stringify(resumeContent, null, 2));

  console.log("\n==========================================\n");

  /* -------------------------------------------------------
     STEP 2: Verify content against the candidate's own text
  ------------------------------------------------------- */

  let data = finalizeResumeData(resumeContent, { resume, selfDescription });

  /* -------------------------------------------------------
     STEP 3: Generate HTML + PDF (must fit ONE page).
     If it cannot fit even at the most compact readable size,
     the least important bullet is removed and it is retried.
  ------------------------------------------------------- */

  let result;

  while (true) {
    result = await generatePdfFromHtml(generateResumeHtml(data), {
      requireFit: true,
    });

    if (result.fits) break;

    const trimmed = trimResumeData(data);

    if (!trimmed) {
      console.warn("Could not trim further; rendering the first page only.");

      result = await generatePdfFromHtml(generateResumeHtml(data), {
        requireFit: false,
      });

      break;
    }

    console.log("Content too long for one page: removed one bullet.");

    data = trimmed;
  }

  console.log("\nATS RESUME PDF GENERATED SUCCESSFULLY.\n");

  return result.pdf;
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  generateInterviewReport,
  analyzeResumeATS,
  generateResumePdf,
};
