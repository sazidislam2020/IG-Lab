import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import AdminContact from "../components/AdminContact";

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
            <span style={styles.brandMark}>
              <span style={styles.spark} />
            </span>
            <span>
              <span style={styles.brandName}>IGNITE LAB</span>
              <span style={styles.brandTag}>Robotics Education Platform</span>
            </span>
          </Link>

          <div style={styles.pendingIcon} aria-hidden="true">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={t.accentLink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 13.5"/></svg>
          </div>
          <h1 style={styles.title}>Account created!</h1>
          <p style={styles.subtitle}>
            Your account is <strong style={{ color: t.warn }}>pending approval</strong>.
            An administrator will review your registration soon.
          </p>
          <div style={styles.pendingInfo}>
            <p style={styles.pendingStep}><span style={styles.stepNum}>1</span> You registered successfully</p>
            <p style={styles.pendingStep}><span style={styles.stepNum}>2</span> Waiting for admin approval</p>
            <p style={styles.pendingStep}><span style={{ ...styles.stepNum, opacity: 0.3 }}>3</span> <span style={{ opacity: 0.5 }}>Sign in and start learning</span></p>
          </div>
          <p style={{ ...styles.subtitle, marginTop: 18, fontSize: 13 }}>
            You'll be able to sign in once an administrator approves your account.
          </p>

          <AdminContact />

          <Link to="/login" style={{ ...styles.button, marginTop: 8 }}>
            Go to sign in
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
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

        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.subtitle}>
          Start learning robotics and programming — for free
        </p>

        {/* Ostad-style segmented Login / Sign up switcher */}
        <div style={styles.tabs} role="tablist" aria-label="Authentication">
          <Link to="/login" style={styles.tab} role="tab" aria-selected="false">Log in</Link>
          <span style={styles.tabActive} role="tab" aria-selected="true">New account</span>
        </div>

        {error && <div style={styles.error} role="alert">{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="signup-name" style={styles.label}>Full name</label>
            <input
              id="signup-name"
              name="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={styles.input}
              placeholder="Your full name"
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="signup-email" style={styles.label}>Email</label>
            <input
              id="signup-email"
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
            <label htmlFor="signup-password" style={styles.label}>Password</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="At least 6 characters"
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="signup-confirm" style={styles.label}>Confirm password</label>
            <input
              id="signup-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
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
            {!loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            )}
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
      marginBottom: 24,
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
      marginBottom: 20,
      textAlign: "center",
      lineHeight: 1.5,
    },
    tabs: {
      display: "flex",
      background: isLight ? "#F1F1F3" : t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      padding: 4,
      marginBottom: 22,
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
    pendingIcon: {
      textAlign: "center",
      marginBottom: 14,
    },
    pendingInfo: {
      background: isLight ? "#FAFAFA" : "#0F1420",
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      padding: "16px 18px",
      marginTop: 16,
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
      gap: 15,
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
      color: t.accentInk, // ink label = 6.1:1 (white failed AA)
      border: "none",
      borderRadius: 10,
      padding: "14px 20px",
      fontSize: 15.5,
      fontWeight: 700,
      cursor: "pointer",
      marginTop: 4,
      textDecoration: "none",
      transition: "opacity 0.2s",
      width: "100%",
      boxSizing: "border-box",
    },
    footer: {
      textAlign: "center",
      color: t.txtSec,
      fontSize: 14,
      marginTop: 20,
    },
    link: {
      color: t.accentLink,
      textDecoration: "none",
      fontWeight: 600,
    },
  };
};
