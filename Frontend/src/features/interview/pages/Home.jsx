import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useInterview } from "../hooks/useInterview";
import "../style/home.scss";

const LOADING_STEPS = [
  {
    title: "Parsing & Structuring Profile",
    desc: "Extracting skills, tech stack, and experience depth...",
  },
  {
    title: "Benchmarking with Job Description",
    desc: "Identifying key requirements, keywords, and skill gaps...",
  },
  {
    title: "Formulating Interview Scenarios",
    desc: "Generating tailored technical questions and behavioral STAR prompts...",
  },
  {
    title: "Building Day-by-Day Roadmap",
    desc: "Structuring targeted preparation milestones and study plan...",
  },
  {
    title: "Preparing ResumePilot Context",
    desc: "Vectorizing data so you can chat with your resume instantly...",
  },
];

/* ========================================================
   ANIMATED LOADING SCREEN (Home -> Interview Transition)
   ======================================================== */
const GenerationLoader = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="home-page home-loading-page">
      <div className="loader-backdrop" aria-hidden="true">
        <div className="loader-ambient-glow glow-1" />
        <div className="loader-ambient-glow glow-2" />
        <div className="loader-grid-lines" />
      </div>

      <div className="loader-container">
        {/* Animated Scanner Graphic */}
        <div className="scanner-card">
          <div className="scanner-beam" />

          <div className="scanner-doc">
            <div className="scanner-header">
              <div className="scanner-avatar" />
              <div className="scanner-lines">
                <span className="line line-title" />
                <span className="line line-subtitle" />
              </div>
              <span className="scanner-ai-badge">AI SCAN</span>
            </div>

            <div className="scanner-body">
              <div className="scanner-row">
                <span className="pill">TECH STACK</span>
                <span className="pill">EXPERIENCE</span>
                <span className="pill">STAR MODEL</span>
              </div>
              <div className="scanner-block">
                <span className="line full" />
                <span className="line mid" />
                <span className="line short" />
              </div>
            </div>
          </div>

          <div className="radar-circle circle-1" />
          <div className="radar-circle circle-2" />
        </div>

        {/* Dynamic Status Text */}
        <div className="loader-content">
          <div className="loader-pill">
            <span className="pulse-dot" />
            <span>
              AI ANALYZING &bull; STEP {currentStep + 1} OF{" "}
              {LOADING_STEPS.length}
            </span>
          </div>

          <h2 className="loader-title">Generating Your Interview Report</h2>

          <div className="loader-step-text" key={currentStep}>
            <strong>{LOADING_STEPS[currentStep].title}</strong>
            <span>{LOADING_STEPS[currentStep].desc}</span>
          </div>

          {/* Stepper Dots & Progress Bar */}
          <div className="loader-progress-wrap">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${((currentStep + 1) / LOADING_STEPS.length) * 100}%`,
                }}
              />
            </div>

            <div className="step-bullets">
              {LOADING_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`step-bullet ${idx <= currentStep ? "completed" : ""} ${
                    idx === currentStep ? "active" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

/* ========================================================
   MAIN HOME COMPONENT
   ======================================================== */
const Home = () => {
  const { loading, generateReport, reports } = useInterview();
  const navigate = useNavigate();

  const [jobDescription, setJobDescription] = useState("");
  const [selfDescription, setSelfDescription] = useState("");

  const resumeInputRef = useRef(null);

  const handleGenerateReport = async () => {
    const resumeFile = resumeInputRef.current?.files?.[0] || null;

    if (!jobDescription.trim()) {
      alert("Please enter the job description.");
      return;
    }

    if (!resumeFile && !selfDescription.trim()) {
      alert("Please upload a resume or enter your self description.");
      return;
    }

    try {
      const data = await generateReport({
        jobDescription: jobDescription.trim(),
        selfDescription: selfDescription.trim(),
        resumeFile,
      });

      if (!data?._id) {
        alert("Interview report was not generated.");
        return;
      }

      navigate(`/interview/${data._id}`);
    } catch (error) {
      console.error("Generate report error:", error);

      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to generate interview report.",
      );
    }
  };

  /* Loading State (Home aur Interview transition ke beech) */
  if (loading) {
    return <GenerationLoader />;
  }

  return (
    <main className="home-page">
      {/* =================================================
          PAGE HEADER
      ================================================= */}
      <header className="page-header">
        <h1>
          Prepare for your <span className="highlight">next interview</span>
        </h1>

        <p>
          Upload your resume and provide the job description to generate a
          personalized interview preparation report.
        </p>

        {/* =================================================
            RESUME PILOT BUTTON
        ================================================= */}
        <div className="resume-pilot-cta">
          <div className="resume-pilot-cta__content">
            <div className="resume-pilot-cta__icon">✦</div>

            <div>
              <h3>ResumePilot</h3>
              <p>
                Ask questions about your previous resumes and get personalized
                career guidance.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="resume-pilot-button"
            onClick={() => navigate("/resume-pilot")}
          >
            Open ResumePilot
            <span>→</span>
          </button>
        </div>
      </header>

      {/* =================================================
          INTERVIEW GENERATION CARD
      ================================================= */}
      <section className="interview-card">
        <div className="interview-card__body">
          {/* LEFT PANEL */}
          <div className="panel panel--left">
            <div className="panel__header">
              <div className="panel__icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 4h16v16H4z" />
                  <path d="M8 8h8" />
                  <path d="M8 12h8" />
                  <path d="M8 16h5" />
                </svg>
              </div>

              <h2>Job Description</h2>
              <span className="badge badge--required">Required</span>
            </div>

            <textarea
              className="panel__textarea"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              maxLength={5000}
            />

            <span className="char-counter">
              {jobDescription.length} / 5000 chars
            </span>
          </div>

          <div className="panel-divider" />

          {/* RIGHT PANEL */}
          <div className="panel panel--right">
            {/* RESUME UPLOAD */}
            <div className="upload-section">
              <div className="section-label">
                Resume
                <span className="badge badge--best">Recommended</span>
              </div>

              <label className="dropzone" htmlFor="resume-upload">
                <div className="dropzone__icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 16V4" />
                    <path d="M8 8l4-4 4 4" />
                    <path d="M4 20h16" />
                  </svg>
                </div>

                <p className="dropzone__title">Upload your resume</p>
                <p className="dropzone__subtitle">PDF or DOCX · Max 5MB</p>
              </label>

              <input
                id="resume-upload"
                ref={resumeInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                hidden
              />
            </div>

            {/* OR DIVIDER */}
            <div className="or-divider">
              <span>OR</span>
            </div>

            {/* SELF DESCRIPTION */}
            <div className="self-description">
              <div className="section-label">Self Description</div>

              <textarea
                className="panel__textarea panel__textarea--short"
                placeholder="Tell us about yourself, your skills, experience, projects, and career goals..."
                value={selfDescription}
                onChange={(event) => setSelfDescription(event.target.value)}
              />
            </div>

            {/* INFO BOX */}
            <div className="info-box">
              <div className="info-box__icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5" />
                  <path d="M12 8h.01" />
                </svg>
              </div>

              <p>
                <strong>Tip:</strong> Upload your resume or provide a self
                description. You can also provide both for better results.
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="interview-card__footer">
          <span className="footer-info">
            Your information is used only to generate your personalized report.
          </span>

          <button
            type="button"
            className="generate-btn"
            onClick={handleGenerateReport}
            disabled={loading}
          >
            <span>Generate Report</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </button>
        </footer>
      </section>

      {/* =================================================
          RECENT REPORTS
      ================================================= */}
      {reports?.length > 0 && (
        <section className="recent-reports">
          <div className="section-label">Recent Reports</div>

          <div className="reports-list">
            {reports.map((report) => (
              <div
                className="report-item"
                key={report._id}
                onClick={() => navigate(`/interview/${report._id}`)}
              >
                <h3>{report.title || "Interview Strategy"}</h3>

                <span>
                  {report.createdAt
                    ? new Date(report.createdAt).toLocaleDateString()
                    : ""}
                </span>

                <span className="match-score">{report.matchScore ?? 0}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =================================================
          PAGE FOOTER
      ================================================= */}
      <footer className="page-footer">
        <a href="#privacy">Privacy</a>
        <a href="#terms">Terms</a>
      </footer>
    </main>
  );
};

export default Home;
