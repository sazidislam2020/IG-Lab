import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const { signIn } = useAuth();
  const { colors: t } = useTheme();
  const styles = makeStyles(t);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setResetSent(false);
    if (!email || !email.includes("@")) {
      setError("Enter your email address above first, then click Forgot password.");
      return;
    }
    setResetBusy(true);
    // Sends a secure reset link — the user sets their own new password.
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetBusy(false);
    if (resetErr) {
      setError(resetErr.message || "Could not send the reset email");
    } else {
      setResetSent(true);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link to="/" style={styles.brand}>
          <span style={styles.spark} />
          IGNITE LAB
        </Link>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to continue learning</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
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
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetBusy}
              style={styles.forgotBtn}
            >
              {resetBusy ? "Sending..." : "Forgot password?"}
            </button>
            {resetSent && (
              <div style={styles.resetSent}>
                ✅ If an account exists for <strong>{email}</strong>, a reset
                link is on its way. Check your inbox (and spam folder).
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{" "}
          <Link to="/signup" style={styles.link}>
            Sign up free
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
    boxSizing: "border-box",
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
    background: "#FF6B2B",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "13px 20px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
    transition: "opacity 0.2s",
  },
  footer: {
    textAlign: "center",
    color: t.txtSec,
    fontSize: 14,
    marginTop: 24,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    background: "none",
    border: "none",
    color: "#FF6B2B",
    fontSize: 12.5,
    fontWeight: 500,
    cursor: "pointer",
    padding: "4px 0 0",
  },
  resetSent: {
    background: "rgba(62,207,142,0.1)",
    border: "1px solid rgba(62,207,142,0.3)",
    color: "#6EE7B7",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.5,
    marginTop: 8,
  },
  link: {
    color: "#FF6B2B",
    textDecoration: "none",
    fontWeight: 500,
  },
});
