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
          <span style={styles.spark} />
          IGNITE LAB
        </Link>

        {!hasSession ? (
          <>
            <h1 style={styles.title}>Link expired</h1>
            <p style={styles.subtitle}>
              This password-reset link is invalid or has expired. Go back to
              the login page and request a new one.
            </p>
            <Link to="/login" style={styles.button}>Back to login</Link>
          </>
        ) : done ? (
          <>
            <h1 style={styles.title}>Password updated ✅</h1>
            <p style={styles.subtitle}>Taking you to your dashboard...</p>
          </>
        ) : (
          <>
            <h1 style={styles.title}>Set a new password</h1>
            <p style={styles.subtitle}>Choose a new password for your account.</p>

            {error && <div style={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>New password</label>
                <input
                  type="password"
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
                <label style={styles.label}>Confirm password</label>
                <input
                  type="password"
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
    boxShadow: "0 0 6px #FF6B2B",
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 26,
    fontWeight: 700,
    color: t.txt,
    marginBottom: 8,
  },
  subtitle: {
    color: t.txtSec,
    fontSize: 14.5,
    marginBottom: 24,
    lineHeight: 1.55,
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
  },
  button: {
    display: "block",
    textAlign: "center",
    background: "#FF6B2B",
    color: t.accentInk, // ink label = 6.1:1 (white failed AA)
    border: "none",
    borderRadius: 8,
    padding: "13px 20px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
    textDecoration: "none",
  },
  footer: {
    textAlign: "center",
    color: t.txtSec,
    fontSize: 14,
    marginTop: 24,
  },
  link: {
    color: t.accentLink,
    textDecoration: "none",
    fontWeight: 500,
  },
});
