import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import "../auth.form.scss";

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const googleError = searchParams.get("googleError");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(googleError || "");

  const handleGoogleSignup = () => {
    setLoading(true);
    setError("");

    window.location.href = "http://localhost:3000/api/auth/google";
  };

  return (
    <main>
      <div className="form-container">
        <h1>Create Account</h1>

        <p>Create your ResumeIQ account</p>

        {error && <div className="error-message">{error}</div>}

        <button
          type="button"
          className="button primary-button"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          {loading ? "Connecting..." : "Continue with Google"}
        </button>

        <p>
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

export default Register;
