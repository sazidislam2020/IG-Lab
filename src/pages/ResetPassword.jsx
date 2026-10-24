import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabase";

/**
 * ResetPassword — landing page for the "Forgot password?" email link.
 *
 * The email link redirects here with #access_token=...&type=recovery in
 * the hash; supabase-js processes it (detectSessionInUrl) and establishes
 * a short-lived recovery session. The user then picks a new password.
 */
export default function ResetPassword() {
  const { colors: t } = useTheme();
  const styles = makeStyles(t);
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setHasSession(!!session);
        setReady(true);
      })
      .catch(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updErr) {
      setError(updErr.message || "Could not update password. The link may have expired — request a new one.");
    } else {
      setDone(true);
      setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
    }
  }

  if (!ready) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={{ color: t.txtSec, fontSize: 14 }}>Checking reset link...</p>
        </div>
      </div>
    );
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

        {!hasSession ? (
          <>
            <h1 style={styles.title}>Link expired</h1>
            <p style={styles.subtitle}>
              This password-reset link is invalid or has expired. Go back to
              the login page and request a new one.
            </p>
            <Link to="/login" style={styles.button}>
              Back to login
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </>
        ) : done ? (
          <>
            <h1 style={styles.title}>Password updated</h1>
            <p style={styles.subtitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: -3, marginRight: 6 }}><polyline points="20 6 9 17 4 12"/></svg>
              Taking you to your dashboard...
            </p>
          </>
        ) : (
          <>
            <h1 style={styles.title}>Set a new password</h1>
            <p style={styles.subtitle}>Choose a new password for your account.</p>

            {error && <div style={styles.error} role="alert">{error}</div>}

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label htmlFor="reset-password" style={styles.label}>New password</label>
                <input
                  id="reset-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={styles.input}
                  placeholder="At least 6 characters"
                  autoFocus
                />
              </div>
              <div style={styles.field}>
                <label htmlFor="reset-confirm" style={styles.label}>Confirm password</label>
                <input
                  id="reset-confirm"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  style={styles.input}
                  placeholder="Repeat the password"
                />
              </div>
              <button type="submit" disabled={busy} style={{ ...styles.button, opacity: busy ? 0.6 : 1 }}>
                {busy ? "Saving..." : "Update password"}
                {!busy && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                )}
              </button>
            </form>
          </>
        )}

        <p style={styles.footer}>
          <Link to="/login" style={styles.link}>← Back to login</Link>
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
      marginBottom: 8,
      letterSpacing: "-0.02em",
    },
    subtitle: {
      color: t.txtSec,
      fontSize: 14.5,
      marginBottom: 24,
      lineHeight: 1.55,
      textAlign: "center",
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
      width: "100%",
      boxSizing: "border-box",
    },
    button: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      background: t.accent,
      color: t.accentInk, // ink label = 6.1:1 (white failed AA)
      border: "none",
      borderRadius: 10,
      padding: "14px 20px",
      fontSize: 15.5,
      fontWeight: 700,
      cursor: "pointer",
      marginTop: 4,
      textDecoration: "none",
      width: "100%",
      boxSizing: "border-box",
    },
    footer: {
      textAlign: "center",
      color: t.txtSec,
      fontSize: 14,
      marginTop: 22,
    },
    link: {
      color: t.accentLink,
      textDecoration: "none",
      fontWeight: 500,
    },
  };
};
