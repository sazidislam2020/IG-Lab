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
          <span style={styles.brandMark}>
            <span style={styles.spark} />
          </span>
          <span>
            <span style={styles.brandName}>IGNITE LAB</span>
            <span style={styles.brandTag}>Robotics Education Platform</span>
          </span>
        </Link>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to continue learning</p>

        {/* Ostad-style segmented Login / Sign up switcher */}
        <div style={styles.tabs} role="tablist" aria-label="Authentication">
          <span style={styles.tabActive} role="tab" aria-selected="true">Log in</span>
          <Link to="/signup" style={styles.tab} role="tab" aria-selected="false">New account</Link>
        </div>

        {error && <div style={styles.error} role="alert">{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="login-email" style={styles.label}>Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="you@example.com"
            />
          </div>

          <div style={styles.field}>
            <div style={styles.labelRow}>
              <label htmlFor="login-password" style={styles.label}>Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetBusy}
                style={styles.forgotBtn}
              >
                {resetBusy ? "Sending..." : "Forgot password?"}
              </button>
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="••••••••"
            />
            {resetSent && (
              <div style={styles.resetSent} role="status">
                If an account exists for <strong>{email}</strong>, a reset
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
            {loading ? "Signing in..." : "Log in"}
            {!loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            )}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{" "}
          <Link to="/signup" style={styles.link}>
            Sign up free
          </Link>
        </p>

        <p style={styles.help}>
          Trouble signing in? WhatsApp{" "}
          <a
            href="https://wa.me/8801722200248"
            target="_blank"
            rel="noreferrer"
            style={{ ...styles.link, fontWeight: 600 }}
          >
            Md. Sazid Ul Islam (Admin) — 01722200248
          </a>
        </p>
      </div>
    </div>
  );
}

const makeStyles = (t) => {
  const isLight = t.bg === "#FAFAFA";
  return {
    page: {
      minHeight: "100vh",
      background: t.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 20px",
      fontFamily: "Inter, system-ui, sans-serif",
    },
    card: {
      width: "100%",
      maxWidth: 420,
      background: t.card,
      border: `1px solid ${t.border}`,
      borderRadius: 16,
      padding: "40px 32px",
      boxSizing: "border-box",
      boxShadow: isLight ? t.shadow : "none",
    },
    brand: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginBottom: 28,
      textDecoration: "none",
    },
    brandMark: {
      width: 38,
      height: 38,
      borderRadius: 11,
      background: `linear-gradient(135deg, ${t.accent}, #E85D1A)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    spark: {
      width: 12,
      height: 12,
      background: "#fff",
      borderRadius: 2,
      transform: "rotate(45deg)",
    },
    brandName: {
      display: "block",
      fontFamily: "'Space Grotesk', sans-serif",
      fontWeight: 700,
      fontSize: 15,
      letterSpacing: "-0.02em",
      color: t.txt,
    },
    brandTag: {
      display: "block",
      fontSize: 11.5,
      color: t.txtDim,
      marginTop: 1,
    },
    title: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 26,
      fontWeight: 700,
      color: t.txt,
      textAlign: "center",
      marginBottom: 6,
      letterSpacing: "-0.02em",
    },
    subtitle: {
      color: t.txtSec,
      fontSize: 14.5,
      marginBottom: 24,
      textAlign: "center",
    },
    tabs: {
      display: "flex",
      background: isLight ? "#F1F1F3" : t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      padding: 4,
      marginBottom: 24,
      gap: 4,
    },
    tabActive: {
      flex: 1,
      textAlign: "center",
      padding: "9px 0",
      borderRadius: 7,
      background: t.card,
      border: `1px solid ${t.border}`,
      fontSize: 13.5,
      fontWeight: 600,
      color: t.txt,
      boxShadow: isLight ? "0 1px 2px rgba(16,24,40,0.05)" : "none",
    },
    tab: {
      flex: 1,
      textAlign: "center",
      padding: "9px 0",
      borderRadius: 7,
      fontSize: 13.5,
      fontWeight: 500,
      color: t.txtSec,
      textDecoration: "none",
    },
    error: {
      background: isLight ? "#FEF2F2" : "rgba(239,68,68,0.1)",
      border: `1px solid ${isLight ? "#FECACA" : "rgba(239,68,68,0.3)"}`,
      color: isLight ? "#B91C1C" : "#FCA5A5",
      padding: "10px 14px",
      borderRadius: 10,
      fontSize: 13.5,
      marginBottom: 18,
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: 16,
    },
    field: {
      display: "flex",
      flexDirection: "column",
      gap: 7,
    },
    labelRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    label: {
      fontSize: 13.5,
      fontWeight: 600,
      color: t.txt,
    },
    input: {
      background: isLight ? "#FFFFFF" : "#0F1420",
      border: `1px solid ${isLight ? "#D8DAE0" : t.border}`,
      borderRadius: 10,
      padding: "13px 14px",
      fontSize: 15,
      color: t.txt,
      outline: "none",
      transition: "border-color 0.2s",
      width: "100%",
      boxSizing: "border-box",
    },
    button: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      background: t.accent,
      color: t.accentInk, // ink label = 6.1:1 (white was 2.84:1 — fails AA)
      border: "none",
      borderRadius: 10,
      padding: "14px 20px",
      fontSize: 15.5,
      fontWeight: 700,
      cursor: "pointer",
      marginTop: 6,
      transition: "opacity 0.2s",
      width: "100%",
    },
    help: {
      textAlign: "center",
      color: t.txtDim,
      fontSize: 12.5,
      marginTop: 16,
      lineHeight: 1.5,
    },
    footer: {
      textAlign: "center",
      color: t.txtSec,
      fontSize: 14,
      marginTop: 22,
    },
    forgotBtn: {
      background: "none",
      border: "none",
      color: t.accentLink,
      fontSize: 12.5,
      fontWeight: 600,
      cursor: "pointer",
      padding: "4px 0",
    },
    resetSent: {
      background: isLight ? "#ECFDF5" : "rgba(62,207,142,0.1)",
      border: `1px solid ${isLight ? "#A7F3D0" : "rgba(62,207,142,0.3)"}`,
      color: isLight ? "#047857" : "#6EE7B7",
      padding: "10px 14px",
      borderRadius: 10,
      fontSize: 13,
      lineHeight: 1.5,
      marginTop: 8,
    },
    link: {
      color: t.accentLink,
      textDecoration: "none",
      fontWeight: 500,
    },
  };
};
