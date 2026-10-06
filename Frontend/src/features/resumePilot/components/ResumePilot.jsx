import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  chatWithResumePilot,
  getResumePilotHistory,
} from "../services/resumePilot.api";
import "../style/resume-pilot.scss";

const ResumePilot = () => {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");

  // ======================================================
  // LOAD CHAT HISTORY
  // ======================================================

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await getResumePilotHistory();

        setMessages(response?.messages || []);
      } catch (error) {
        console.error("ResumePilot history error:", error);

        setError(
          error?.response?.data?.message ||
            "Unable to load ResumePilot history.",
        );
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, []);

  // ======================================================
  // SEND MESSAGE
  // ======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!message.trim() || loading) {
      return;
    }

    setError("");

    const currentMessage = message.trim();

    const userMessage = {
      role: "user",
      content: currentMessage,
    };

    setMessages((prev) => [...prev, userMessage]);

    setMessage("");

    setLoading(true);

    try {
      const response = await chatWithResumePilot({
        message: currentMessage,
        jobDescription: jobDescription.trim(),
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            response?.answer || "ResumePilot could not generate a response.",
          sources: response?.sources || [],
        },
      ]);
    } catch (error) {
      console.error("ResumePilot chat error:", error);

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "ResumePilot could not respond.";

      setError(errorMessage);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I couldn't process that request. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // ENTER TO SEND
  // SHIFT + ENTER = NEW LINE
  // ======================================================

  const handleMessageKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (!loading && message.trim()) {
        handleSubmit(event);
      }
    }
  };

  // ======================================================
  // QUICK PROMPTS
  // ======================================================

  const handleQuickPrompt = (prompt) => {
    setMessage(prompt);
  };

  return (
    <main className="resume-pilot-page">
      <div className="resume-pilot-shell">
        {/* ==================================================
            TOP BAR
        ================================================== */}

        <header className="resume-pilot-topbar">
          <div className="resume-pilot-brand">
            <div className="resume-pilot-logo">RP</div>

            <div>
              <h1>ResumePilot</h1>

              <p>Your resume memory & career assistant</p>
            </div>
          </div>

          {/* ==================================================
              ONLY DASHBOARD BUTTON
              THE GLOBAL THEME BUTTON IS OUTSIDE THIS PAGE
          ================================================== */}

          <div className="resume-pilot-topbar-actions">
            <button
              type="button"
              className="back-dashboard-btn"
              onClick={() => navigate("/")}
            >
              <span>←</span>
              Dashboard
            </button>
          </div>
        </header>

        {/* ==================================================
            WORKSPACE
        ================================================== */}

        <div className="resume-pilot-workspace">
          {/* ==================================================
              SIDEBAR
          ================================================== */}

          <aside className="resume-pilot-sidebar">
            {/* ==================================================
                MEMORY
            ================================================== */}

            <section className="pilot-sidebar-card">
              <div className="sidebar-card-heading">
                <span>Resume Memory</span>

                <span className="status-dot">●</span>
              </div>

              <div className="memory-status">
                <div className="memory-status-row">
                  <span className="status-check">✓</span>

                  <span>Resume indexed</span>
                </div>

                <div className="memory-status-row">
                  <span className="status-check">✓</span>

                  <span>User-specific retrieval</span>
                </div>

                <div className="memory-status-row">
                  <span className="status-check">✓</span>

                  <span>RAG enabled</span>
                </div>
              </div>

              <div className="memory-badge">Pinecone · resume-memory</div>
            </section>

            {/* ==================================================
                TARGET ROLE
            ================================================== */}

            <section className="pilot-sidebar-card target-role-card">
              <div className="sidebar-card-heading">
                <span>Target Job</span>

                <span className="optional-label">Optional</span>
              </div>

              <p className="sidebar-description">
                Add a job description when you want ResumePilot to compare your
                resume against a new role.
              </p>

              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste job description..."
                maxLength={8000}
              />

              <div className="textarea-footer">
                <span>{jobDescription.length} / 8000</span>
              </div>
            </section>

            {/* ==================================================
                QUICK PROMPTS
            ================================================== */}

            <section className="pilot-sidebar-card quick-prompts-card">
              <div className="sidebar-card-heading">
                <span>Quick Prompts</span>
              </div>

              <div className="quick-prompts">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPrompt(
                      "What should I change in my old MERN resume for a Next.js frontend role?",
                    )
                  }
                >
                  <span>⌁</span>
                  What should I change for a Next.js role?
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickPrompt(
                      "Which projects from my previous resume should I keep for a frontend developer role?",
                    )
                  }
                >
                  <span>⌁</span>
                  Which projects should I keep?
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickPrompt(
                      "Which skills from my previous resume should I highlight for this job?",
                    )
                  }
                >
                  <span>⌁</span>
                  Which skills should I highlight?
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickPrompt(
                      "What are the biggest skill gaps between my resume and this job?",
                    )
                  }
                >
                  <span>⌁</span>
                  Show my skill gaps
                </button>
              </div>
            </section>
          </aside>

          {/* ==================================================
              CHAT PANEL
          ================================================== */}

          <section className="resume-pilot-chat-panel">
            {/* ==================================================
                CHAT HEADER
            ================================================== */}

            <div className="chat-panel-header">
              <div className="chat-title-area">
                <div className="chat-avatar">RP</div>

                <div>
                  <h2>Ask ResumePilot</h2>

                  <p>Resume-aware answers based on your indexed resume data</p>
                </div>
              </div>

              <div className="rag-status">
                <span></span>
                RAG Active
              </div>
            </div>

            {/* ==================================================
                MESSAGES
            ================================================== */}

            <div className="messages-area">
              {historyLoading ? (
                <div className="chat-empty-state">
                  <div className="loading-circle"></div>

                  <h3>Loading your ResumePilot</h3>

                  <p>Restoring your previous conversation...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="chat-empty-state">
                  <div className="empty-icon">✦</div>

                  <h3>Hi, I’m ResumePilot</h3>

                  <p>
                    Ask me about your previous resumes, projects, skills,
                    experience, or how to adapt your resume for another role.
                  </p>

                  <div className="empty-example-grid">
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickPrompt(
                          "What should I change in my old MERN resume for a Next.js frontend role?",
                        )
                      }
                    >
                      Next.js adaptation
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleQuickPrompt(
                          "Which projects from my previous resume should I keep for a frontend developer role?",
                        )
                      }
                    >
                      Project selection
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleQuickPrompt(
                          "Which skills from my previous resume should I highlight for this job?",
                        )
                      }
                    >
                      Skill highlighting
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((item, index) => (
                  <div
                    key={`${index}-${item?.createdAt || ""}`}
                    className={`chat-message ${
                      item.role === "user"
                        ? "chat-message--user"
                        : "chat-message--assistant"
                    }`}
                  >
                    <div className="message-meta">
                      <span className="message-avatar">
                        {item.role === "user" ? "U" : "RP"}
                      </span>

                      <span>
                        {item.role === "user" ? "You" : "ResumePilot"}
                      </span>
                    </div>

                    <div className="message-content">{item.content}</div>

                    {item?.sources?.length > 0 && (
                      <div className="message-sources">
                        <span className="sources-label">Resume context</span>

                        {item.sources.map((source, sourceIndex) => (
                          <span
                            key={`${source.reportId}-${sourceIndex}`}
                            className="source-chip"
                          >
                            V{source.resumeVersion}
                            {" · "}
                            {source.section}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* ==================================================
                  THINKING
              ================================================== */}

              {loading && (
                <div className="chat-message chat-message--assistant">
                  <div className="message-meta">
                    <span className="message-avatar">RP</span>

                    <span>ResumePilot</span>
                  </div>

                  <div className="thinking-indicator">
                    <span></span>
                    <span></span>
                    <span></span>

                    <label>Thinking...</label>
                  </div>
                </div>
              )}
            </div>

            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
              <div className="resume-pilot-error">
                <span>!</span>

                {error}
              </div>
            )}

            {/* ==================================================
                INPUT
            ================================================== */}

            <form className="chat-input-area" onSubmit={handleSubmit}>
              <div className="input-wrapper">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={handleMessageKeyDown}
                  placeholder="Ask ResumePilot about your resume..."
                  rows={2}
                  maxLength={4000}
                  disabled={loading}
                />

                <div className="input-hint">
                  <span>Shift + Enter for new line</span>

                  <span>{message.length} / 4000</span>
                </div>
              </div>

              <button
                type="submit"
                className="send-button"
                disabled={loading || !message.trim()}
              >
                {loading ? (
                  <span className="send-loading">...</span>
                ) : (
                  <>
                    <span>Send</span>

                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />

                      <path d="M13 6l6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </section>
        </div>

        {/* ==================================================
            FOOTER
        ================================================== */}

        <footer className="resume-pilot-footer">
          <span>ResumePilot retrieves only your own resume information.</span>

          <span>Gemini + Pinecone</span>
        </footer>
      </div>
    </main>
  );
};

export default ResumePilot;
