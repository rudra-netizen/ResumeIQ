import React from "react";
import { Link } from "react-router-dom";
import "./Welcome.scss";

const GOOGLE_AUTH_URL = "http://localhost:3000/api/auth/google";

export default function Welcome() {
  const handleGoogleSignup = () => {
    window.location.href = GOOGLE_AUTH_URL;
  };

  return (
    <main className="welcome-page">
      {/* Background ambient lighting */}
      <div className="welcome-bg" aria-hidden="true">
        <div className="glow-mesh glow-primary" />
        <div className="glow-mesh glow-accent" />
        <div className="glow-mesh glow-teal" />
        <div className="grid-overlay" />
      </div>

      {/* Top Navigation */}
      <header className="welcome-navbar">
        <Link to="/welcome" className="brand">
          <div className="brand-mark">
            <span className="brand-mark-glyph">R</span>
          </div>
          <span className="brand-title">
            Resume<span className="highlight">IQ</span>
          </span>
        </Link>

        <div className="nav-badge">
          <span className="live-dot" />
          <span>LLM Engine &bull; ResumePilot v2.4 Active</span>
        </div>
      </header>

      {/* Main Hero Grid */}
      <section className="welcome-hero">
        {/* Left Column: Value Prop & Dual Auth */}
        <div className="hero-copy">
          <div className="pill-eyebrow">
            <span className="sparkle">✦</span>
            <span>NEXT-GEN CAREER INTELLIGENCE</span>
          </div>

          <h1 className="hero-heading">
            Transform your resume into a targeted
            <span className="gradient-text"> interview advantage.</span>
          </h1>

          <p className="hero-subtext">
            ResumeIQ breaks down your resume with tailored LLM models—generating
            technical & behavioral interview questions, creating your custom
            skill roadmap, and providing <strong>ResumePilot</strong>, an
            instant RAG document assistant.
          </p>

          {/* Feature highlights */}
          <div className="feature-tags">
            <div className="tag">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              ATS Scoring & Optimization
            </div>
            <div className="tag">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
              Behavioral & Tech Q&A
            </div>
            <div className="tag">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m12 6 4 6-4 6-4-6z" />
              </svg>
              Skill Roadmap
            </div>
            <div className="tag highlight-tag">
              <span className="ai-icon">⚡</span>
              ResumePilot RAG Bot
            </div>
          </div>

          {/* Authentication Selection */}
          <div className="auth-box">
            <div className="auth-header">
              <span className="auth-title">Get started in seconds</span>
              <span className="auth-subtitle">
                Select your preferred way to continue
              </span>
            </div>

            <div className="auth-actions">
              {/* Primary Google Auth */}
              <button
                type="button"
                className="auth-btn google-btn"
                onClick={handleGoogleSignup}
              >
                <div className="btn-icon">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    width="20"
                    height="20"
                  >
                    <path
                      fill="#4285F4"
                      d="M21.35 12.23c0-.72-.06-1.25-.2-1.8H12v3.41h5.37a4.59 4.59 0 0 1-1.99 3.01v2.51h3.22c1.89-1.74 2.75-4.3 2.75-7.13Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 21.75c2.7 0 4.96-.89 6.61-2.39l-3.22-2.51c-.89.6-2.03.96-3.39.96-2.61 0-4.83-1.76-5.62-4.13H3.05v2.59A9.99 9.99 0 0 0 12 21.75Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.38 13.68A6.01 6.01 0 0 1 6.06 12c0-.58.11-1.15.32-1.68V7.73H3.05A9.98 9.98 0 0 0 2 12c0 1.61.39 3.13 1.05 4.27l3.33-2.59Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 6.19c1.47 0 2.79.51 3.83 1.51l2.87-2.87C16.95 3.2 14.7 2.25 12 2.25a9.99 9.99 0 0 0-8.95 5.48l3.33 2.59C7.17 7.95 9.39 6.19 12 6.19Z"
                    />
                  </svg>
                </div>
                <div className="btn-text">
                  <strong>Sign up with Google</strong>
                  <small>Zero setup &bull; 1-click verification</small>
                </div>
                <span className="btn-chevron">&rarr;</span>
              </button>

              <div className="divider-line">
                <span>or</span>
              </div>

              {/* Standard Sign In */}
              <Link to="/login" className="auth-btn signin-btn">
                <div className="btn-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="20"
                    height="20"
                  >
                    <path
                      d="M15 3H6.5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21H15"
                      strokeLinecap="round"
                    />
                    <path
                      d="M11 12h9M17 8l4 4-4 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="btn-text">
                  <strong>Sign in with existing account</strong>
                  <small>Access saved analyses, roadmaps & chat</small>
                </div>
                <span className="btn-chevron">&rarr;</span>
              </Link>
            </div>

            <p className="auth-legal">
              By proceeding, you accept ResumeIQ's <a href="#terms">Terms</a>{" "}
              and <a href="#privacy">Privacy Policy</a>.
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Dark UI Mockup Showcase */}
        <div className="hero-preview" aria-hidden="true">
          {/* Top Floating Badge: ATS Metric */}
          <div className="glass-card float-badge ats-badge">
            <div className="gauge-ring">
              <span className="gauge-val">94</span>
              <span className="gauge-label">ATS</span>
            </div>
            <div className="badge-meta">
              <strong>High Compatibility</strong>
              <span>Top 5% candidate match</span>
            </div>
          </div>

          {/* Main Visual: ResumeIQ Core Dashboard View */}
          <div className="glass-card main-preview-card">
            <div className="card-header">
              <div className="window-dots">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <div className="window-tab">resume_analysis_report.json</div>
            </div>

            <div className="card-body">
              {/* Roadmap Snapshot */}
              <div className="preview-block">
                <div className="block-title">
                  <span className="title-icon">🎯</span> Tailored Career Roadmap
                </div>
                <div className="roadmap-milestones">
                  <div className="milestone completed">
                    <span className="node">✓</span>
                    <span>Distributed Systems</span>
                  </div>
                  <div className="milestone active">
                    <span className="node">2</span>
                    <span>Microservices & RAG Patterns</span>
                  </div>
                  <div className="milestone pending">
                    <span className="node">3</span>
                    <span>System Architecture Mock</span>
                  </div>
                </div>
              </div>

              {/* Generated Interview Questions Preview */}
              <div className="preview-block">
                <div className="block-title">
                  <span className="title-icon">💡</span> Generated Interview
                  Questions
                </div>
                <div className="interview-chips">
                  <div className="chip tech">
                    <span className="label">Technical:</span>
                    "Explain cache invalidation trade-offs in your Redis tier."
                  </div>
                  <div className="chip behavioral">
                    <span className="label">Behavioral:</span>
                    "Describe handling architectural disagreements under tight
                    deadlines."
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Widget: ResumePilot RAG Bot */}
          <div className="glass-card float-badge pilot-badge">
            <div className="pilot-avatar">
              <span className="pilot-glow" />
              🤖
            </div>
            <div className="pilot-dialogue">
              <div className="pilot-name">
                ResumePilot <span className="tag-rag">RAG CHAT</span>
              </div>
              <p className="pilot-msg">
                "I indexed your 4-page resume. Would you like to practice
                behavioral questions or optimize your backend bullet points?"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Trust Bar */}
      <footer className="welcome-footer">
        <div className="footer-item">
          <span className="footer-dot" /> End-to-end Encrypted Documents
        </div>
        <div className="footer-pipe" />
        <div className="footer-item">LLM Context-Augmented Analysis</div>
        <div className="footer-pipe" />
        <div className="footer-item">
          Built for Developers & Tech Professionals
        </div>
      </footer>
    </main>
  );
}
