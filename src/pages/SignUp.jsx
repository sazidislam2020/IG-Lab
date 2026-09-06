import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

export default function SignUp() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { colors: t } = useTheme();
  const styles = makeStyles(t);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, fullName);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <Link to="/" style={styles.brand}>
            <span style={styles.spark} />
            IGNITE LAB
          </Link>

          <div style={styles.pendingIcon}>⏳</div>
          <h1 style={styles.title}>Account created!</h1>
          <p style={styles.subtitle}>
            Your account is <strong style={{ color: "#FFB238" }}>pending approval</strong>.
            An administrator will review your registration soon.
          </p>
          <div style={styles.pendingInfo}>
            <p style={styles.pendingStep}><span style={styles.stepNum}>1</span> You registered successfully</p>
            <p style={styles.pendingStep}><span style={styles.stepNum}>2</span> Waiting for admin approval</p>
            <p style={styles.pendingStep}><span style={{ ...styles.stepNum, opacity: 0.3 }}>3</span> <span style={{ opacity: 0.5 }}>Sign in and start learning</span></p>
          </div>
          <p style={{ ...styles.subtitle, marginTop: 20, fontSize: 13, color: "#5C6478" }}>
            You'll be able to sign in once an administrator approves your account.
          </p>

          <Link to="/login" style={styles.button}>
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link to="/" style={styles.brand}>
          <span style={styles.spark} />
          IGNITE LAB
        </Link>

        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.subtitle}>
          Start learning robotics and programming — for free
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={styles.input}
              placeholder="Your full name"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="you@example.com"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="At least 6 characters"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="Repeat your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{" "}
          <Link to="/login" style={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

const makeStyles = (t) => ({
  page: {
    minHeight: "100vh",
    background: t.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "Inter, system-ui, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: t.card,
    border: `1px solid ${t.border}`,
    borderRadius: 12,
    padding: "40px 32px",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: 14,
    color: t.txtSec,
    marginBottom: 32,
    textDecoration: "none",
  },
  spark: {
    width: 9,
    height: 9,
    background: "#FF6B2B",
    borderRadius: 2,
    transform: "rotate(45deg)",
    boxShadow: "0 0 10px #FF6B2B",
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 28,
    fontWeight: 700,
    color: t.txt,
    marginBottom: 8,
  },
  subtitle: {
    color: t.txtSec,
    fontSize: 15,
    marginBottom: 28,
  },
  pendingIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  pendingInfo: {
    background: t.bg === "#FAFAFA" ? "#F4F4F5" : "#0F1420",
    border: `1px solid ${t.border}`,
    borderRadius: 10,
    padding: "16px 18px",
    marginTop: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  pendingStep: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    color: t.txtSec,
  },
  stepNum: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "rgba(62,207,142,0.15)",
    color: "#3ECF8E",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  error: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#FCA5A5",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 20,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: t.txtSec,
  },
  input: {
    background: t.bg === "#FAFAFA" ? "#F4F4F5" : "#0F1420",
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    padding: "12px 14px",
    fontSize: 15,
    color: t.txt,
    outline: "none",
    transition: "border-color 0.2s",
  },
  button: {
    display: "block",
    textAlign: "center",
    background: "#FF6B2B",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "13px 20px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
    textDecoration: "none",
    transition: "opacity 0.2s",
  },
  footer: {
    textAlign: "center",
    color: t.txtSec,
    fontSize: 14,
    marginTop: 24,
  },
  link: {
    color: "#FF6B2B",
    textDecoration: "none",
    fontWeight: 500,
  },
});
