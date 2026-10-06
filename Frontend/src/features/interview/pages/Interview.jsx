import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useInterview } from "../hooks/useInterview";
import "../style/interview.scss";

const NAV_ITEMS = [
  {
    id: "technical",
    label: "Technical Questions",
  },
  {
    id: "behavioral",
    label: "Behavioral Questions",
  },
  {
    id: "roadmap",
    label: "Preparation Roadmap",
  },
];

const PDF_STEPS = [
  {
    title: "Extracting ATS-Optimized Profile",
    desc: "Structuring contact info, skills matrix, and bullet points...",
  },
  {
    title: "Formatting Typography & Sections",
    desc: "Applying clean single-column hierarchy & ATS-safe fonts...",
  },
  {
    title: "Embedding Keywords & Match Data",
    desc: "Aligning terminology with target role requirements...",
  },
  {
    title: "Compiling Clean PDF Vector Asset",
    desc: "Generating final print-ready document for download...",
  },
];

/* ========================================================
   PDF DOWNLOAD & REPORT LOADER COMPONENT
   ======================================================== */
const DownloadProgressLoader = ({
  isDownloadMode = true,
  downloadFinished = false,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (downloadFinished) return;
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % PDF_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [downloadFinished]);

  return (
    <main className="interview-page interview-download-page">
      <div className="loader-backdrop" aria-hidden="true">
        <div className="loader-ambient-glow glow-accent" />
        <div className="loader-ambient-glow glow-cyan" />
        <div className="loader-grid-lines" />
      </div>

      <div className="download-loader-card">
        {/* Animated PDF Document Graphic */}
        <div className="pdf-doc-anim">
          <div className="pdf-file-sheet">
            <div className="pdf-corner-fold" />
            <div className="pdf-badge">PDF</div>

            <div className="pdf-doc-lines">
              <span className="line header-line" />
              <span className="line mid-line" />
              <div className="chip-row">
                <span className="tiny-chip" />
                <span className="tiny-chip" />
                <span className="tiny-chip" />
              </div>
              <span className="line full-line" />
              <span className="line full-line" />
              <span className="line short-line" />
            </div>

            {/* Downward Download Beacon / Laser */}
            <div className="download-laser-beam" />
          </div>

          <div className="download-circle circle-1" />
          <div className="download-circle circle-2" />
        </div>

        {/* Dynamic Status Display */}
        <div className="download-text-group">
          <div className="status-pill">
            <span
              className={`status-dot ${downloadFinished ? "dot-success" : "dot-pulse"}`}
            />
            <span>
              {downloadFinished
                ? "DOWNLOAD READY"
                : isDownloadMode
                  ? "PREPARING RESUME PDF"
                  : "FETCHING REPORT DATA"}
            </span>
          </div>

          <h2 className="download-heading">
            {downloadFinished
              ? "Resume Downloaded Successfully!"
              : isDownloadMode
                ? "Generating Your ATS-Optimized Resume"
                : "Loading Your Interview Intelligence"}
          </h2>

          <div className="download-subtext">
            {downloadFinished ? (
              <span className="success-redirect-msg">
                ✓ File saved. Redirecting you back to home...
              </span>
            ) : isDownloadMode ? (
              <>
                <strong>{PDF_STEPS[stepIndex].title}</strong>
                <p>{PDF_STEPS[stepIndex].desc}</p>
              </>
            ) : (
              <p>
                Retrieving technical questions, roadmap and score metrics...
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="download-progress-track">
            <div
              className={`download-progress-fill ${downloadFinished ? "fill-complete" : ""}`}
              style={{
                width: downloadFinished
                  ? "100%"
                  : `${((stepIndex + 1) / PDF_STEPS.length) * 90}%`,
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

/* ========================================================
   QUESTION CARD COMPONENT
   ======================================================== */
const QuestionCard = ({ item, index }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="q-card">
      <div className="q-card__header" onClick={() => setOpen(!open)}>
        <span className="q-card__index">
          {String(index + 1).padStart(2, "0")}
        </span>

        <p className="q-card__question">{item.question}</p>

        <span
          className={`q-card__chevron ${open ? "q-card__chevron--open" : ""}`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>

      {open && (
        <div className="q-card__body">
          <div className="q-card__section">
            <span className="q-card__tag q-card__tag--intention">
              Intention
            </span>
            <p>
              {item.intention ||
                "This question evaluates your understanding and practical knowledge."}
            </p>
          </div>

          <div className="q-card__section">
            <span className="q-card__tag q-card__tag--answer">
              Model Answer
            </span>
            <p>
              {item.answer ||
                "Prepare a clear answer based on your actual experience and understanding."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ========================================================
   ROADMAP DAY COMPONENT
   ======================================================== */
const RoadMapDay = ({ day }) => {
  return (
    <div className="roadmap-day">
      <div className="roadmap-day__header">
        <span className="roadmap-day__badge">Day {day.day}</span>
        <h3 className="roadmap-day__focus">{day.focus}</h3>
      </div>

      <ul className="roadmap-day__tasks">
        {day.tasks?.map((task, index) => (
          <li key={index}>
            <span className="roadmap-day__bullet" />
            <span>{task}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ========================================================
   MAIN INTERVIEW COMPONENT
   ======================================================== */
const Interview = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();

  const { report, loading, getResumePdf } = useInterview();

  const [activeNav, setActiveNav] = useState("technical");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Resume Download Handler with Animated Transition & Redirect
  const handleDownloadResume = async () => {
    try {
      setIsDownloading(true);
      setDownloadSuccess(false);

      await getResumePdf(interviewId);

      // Trigger completion confirmation then navigate home
      setDownloadSuccess(true);
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error) {
      setIsDownloading(false);
      setDownloadSuccess(false);
      console.error("Resume PDF error:", error);

      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to generate resume PDF.",
      );
    }
  };

  // If download is in progress, show the dedicated Download Screen
  if (isDownloading) {
    return (
      <DownloadProgressLoader
        isDownloadMode={true}
        downloadFinished={downloadSuccess}
      />
    );
  }

  // If initial report is loading
  if (loading || !report) {
    return (
      <DownloadProgressLoader isDownloadMode={false} downloadFinished={false} />
    );
  }

  const technicalQuestions = report.technicalQuestions || [];
  const behavioralQuestions = report.behavioralQuestions || [];
  const preparationPlan = report.preparationPlan || [];
  const skillGaps = report.skillGaps || [];
  const matchScore = Number(report.matchScore) || 0;

  const scoreClass =
    matchScore >= 80
      ? "score--high"
      : matchScore >= 60
        ? "score--mid"
        : "score--low";

  return (
    <main className="interview-page">
      <div className="interview-layout">
        {/* LEFT NAVIGATION */}
        <aside className="interview-nav">
          <div>
            <p className="interview-nav__label">Interview Report</p>

            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`interview-nav__item ${
                  activeNav === item.id ? "interview-nav__item--active" : ""
                }`}
                onClick={() => setActiveNav(item.id)}
              >
                <span className="interview-nav__icon">
                  {item.id === "technical" && (
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="M8 9h8" />
                      <path d="M8 13h5" />
                    </svg>
                  )}

                  {item.id === "behavioral" && (
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="8" r="3" />
                      <path d="M5 20c0-4 3-6 7-6s7 2 7 6" />
                    </svg>
                  )}

                  {item.id === "roadmap" && (
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 19V5" />
                      <path d="M4 6h13l-3 4 3 4H4" />
                    </svg>
                  )}
                </span>

                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="button primary-button download-resume-btn"
            onClick={handleDownloadResume}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download Resume</span>
          </button>
        </aside>

        <div className="interview-divider" />

        {/* CENTER CONTENT */}
        <section className="interview-content">
          {activeNav === "technical" && (
            <>
              <div className="content-header">
                <h2>Technical Questions</h2>
                <span className="content-header__count">
                  {technicalQuestions.length}
                </span>
              </div>

              <div className="q-list">
                {technicalQuestions.length > 0 ? (
                  technicalQuestions.map((item, index) => (
                    <QuestionCard key={index} item={item} index={index} />
                  ))
                ) : (
                  <p>No technical questions available.</p>
                )}
              </div>
            </>
          )}

          {activeNav === "behavioral" && (
            <>
              <div className="content-header">
                <h2>Behavioral Questions</h2>
                <span className="content-header__count">
                  {behavioralQuestions.length}
                </span>
              </div>

              <div className="q-list">
                {behavioralQuestions.length > 0 ? (
                  behavioralQuestions.map((item, index) => (
                    <QuestionCard key={index} item={item} index={index} />
                  ))
                ) : (
                  <p>No behavioral questions available.</p>
                )}
              </div>
            </>
          )}

          {activeNav === "roadmap" && (
            <>
              <div className="content-header">
                <h2>Preparation Roadmap</h2>
                <span className="content-header__count">
                  {preparationPlan.length} days
                </span>
              </div>

              <div className="roadmap-list">
                {preparationPlan.length > 0 ? (
                  preparationPlan.map((day, index) => (
                    <RoadMapDay key={index} day={day} />
                  ))
                ) : (
                  <p>No preparation roadmap available.</p>
                )}
              </div>
            </>
          )}
        </section>

        <div className="interview-divider" />

        {/* RIGHT SIDEBAR */}
        <aside className="interview-sidebar">
          <section className="match-score">
            <p className="match-score__label">Match Score</p>

            <div className={`match-score__ring ${scoreClass}`}>
              <span className="match-score__value">{matchScore}</span>
              <span className="match-score__pct">%</span>
            </div>

            <p className="match-score__sub">Profile compatibility</p>
          </section>

          <div className="sidebar-divider" />

          <section className="skill-gaps">
            <p className="skill-gaps__label">Skill Gaps</p>

            <div className="skill-gaps__list">
              {skillGaps.length > 0 ? (
                skillGaps.map((gap, index) => (
                  <span
                    key={index}
                    className={`skill-tag skill-tag--${gap.severity}`}
                  >
                    {gap.skill}
                  </span>
                ))
              ) : (
                <span className="skill-tag skill-tag--low">No major gaps</span>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
};

export default Interview;
