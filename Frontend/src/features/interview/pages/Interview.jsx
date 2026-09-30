import React, { useState } from "react";
import { useParams } from "react-router";
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

const Interview = () => {
  const { interviewId } = useParams();

  const { report, loading, getResumePdf } = useInterview();

  const [activeNav, setActiveNav] = useState("technical");

  if (loading || !report) {
    return (
      <main className="interview-page">
        <div className="interview-layout">
          <div className="interview-content">
            <h2>Loading interview report...</h2>
          </div>
        </div>
      </main>
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

  const handleDownloadResume = async () => {
    try {
      await getResumePdf(interviewId);
    } catch (error) {
      console.error("Resume PDF error:", error);

      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to generate resume PDF.",
      );
    }
  };

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
            className="button primary-button"
            onClick={handleDownloadResume}
          >
            Download Resume
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
