import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading, signOut } = useAuth();
  const { colors: t } = useTheme();
  const styles = makeStyles(t);

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && profile.status === "pending") {
    return (
      <div style={styles.pending}>
        <div style={styles.pendingIcon}>⏳</div>
        <h2 style={{ marginBottom: 12 }}>Account Pending Approval</h2>
        <p style={{ color: t.txtSec, maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
          Your account is waiting for admin approval. You'll be able to access
          the platform once an administrator reviews your registration.
        </p>
        <div style={styles.pendingSteps}>
          <div style={styles.pendingStep}><span style={styles.stepDone}>✓</span> Registered successfully</div>
          <div style={styles.pendingStep}><span style={styles.stepActive}>●</span> Waiting for approval</div>
          <div style={styles.pendingStep}><span style={styles.stepPending}>3</span> Access the platform</div>
        </div>
        <button
          onClick={async () => { await signOut(); window.location.href = '/login'; }}
          style={styles.signOutBtn}
        >
          Sign out
        </button>
      </div>
    );
  }

  if (profile && profile.status === "rejected") {
    return (
      <div style={styles.pending}>
        <div style={styles.pendingIcon}>❌</div>
        <h2 style={{ marginBottom: 12 }}>Account Not Approved</h2>
        <p style={{ color: t.txtSec, maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
          Your account was not approved. Please contact support for more
          information.
        </p>
        <button
          onClick={async () => { await signOut(); window.location.href = '/login'; }}
          style={styles.signOutBtn}
        >
          Sign out
        </button>
      </div>
    );
  }

  if (requiredRole && profile?.role !== requiredRole) {
    // Allow super_admin to access admin routes
    if (requiredRole === "admin" && profile?.role === "super_admin") {
      return children;
    }
    // Allow admin & super_admin to access teacher routes
    if (requiredRole === "teacher" && (profile?.role === "admin" || profile?.role === "super_admin")) {
      return children;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

const makeStyles = (t) => ({
  loading: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: t.bg,
    color: t.txt,
    fontFamily: "Inter, system-ui, sans-serif",
    gap: 16,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid rgba(255,90,31,0.2)",
    borderTopColor: "#FF6B2B",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  pending: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: t.bg,
    color: t.txt,
    fontFamily: "Inter, system-ui, sans-serif",
    textAlign: "center",
    padding: 24,
  },
  pendingIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  pendingSteps: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 24,
    textAlign: "left",
    width: "100%",
    maxWidth: 300,
  },
  pendingStep: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    color: t.txtSec,
  },
  stepDone: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "rgba(62,207,142,0.15)",
    color: "#3ECF8E",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  stepActive: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "rgba(255,178,56,0.15)",
    color: "#FFB238",
    fontSize: 10,
    flexShrink: 0,
    animation: "pulse 1.5s infinite",
  },
  stepPending: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: "50%",
    border: `1px solid ${t.border}`,
    color: t.txtDim,
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  signOutBtn: {
    background: "transparent",
    border: `1px solid ${t.border}`,
    color: t.txtSec,
    padding: "10px 20px",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
  },
});
