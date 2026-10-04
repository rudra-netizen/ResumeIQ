import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { completeGoogleSignup } from "../services/auth.api";
import "../auth.form.scss";

const GoogleSignup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!token) {
      setError("Google verification is missing or expired.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await completeGoogleSignup({
        token,
        username: formData.username,
        password: formData.password,
      });

      // User must login normally
      navigate("/login?googleSignup=success");
    } catch (error) {
      setError(error.response?.data?.message || "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-main">
      <div className="form-container google-signup-container">
        <div className="auth-header">
          <div className="google-icon">G</div>

          <h1>Complete Signup</h1>

          <p className="auth-subtitle">
            Your Google email has been successfully verified.
          </p>

          <p className="auth-description">
            Create your ResumeIQ username and password to finish setting up your
            account.
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>

            <input
              type="text"
              id="username"
              name="username"
              placeholder="Enter your username"
              value={formData.username}
              onChange={handleChange}
              required
              minLength={3}
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>

            <input
              type="password"
              id="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>

            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="button primary-button signup-button"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => navigate("/login")}
          >
            Sign In
          </button>
        </p>
      </div>
    </main>
  );
};

export default GoogleSignup;
