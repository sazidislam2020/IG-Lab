import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import Icon from "../components/Icon";

// The bundled Learning Engine (scripts/build-learning-engine.mjs copies
// ../learning-engine/dist here). Its assets use a relative base, so this URL
// resolves everything from /learning-engine/ — library and all five labs
// (SQL, Excel, Python, Power BI, reader) run same-origin inside the frame.
const ENGINE_URL = "/learning-engine/index.html";

export default function Learn() {
  const navigate = useNavigate();
  const { user } = useAuth(); // session exists: ProtectedRoute already gated
  const { colors: t } = useTheme();
  const frameRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [loadKey, setLoadKey] = useState(0); // bump to remount the iframe
  const styles = makeStyles(t);

  // Reload button: try an in-frame reload first, fall back to a remount
  // (cross-document loads and sandboxed frames can throw on location access).
  function reload() {
    setLoaded(false);
    setLoadKey((k) => k + 1);
  }

  function openInTab() {
    window.open(ENGINE_URL, "_blank", "noopener");
  }

  useEffect(() => {
    const prev = document.title;
    document.title = "Learn · Ignite Lab";
    return () => {
      document.title = prev; // restore when leaving the route
    };
  }, []);

  return (
    <div style={styles.wrap}>
      <header style={styles.bar}>
        <button
          style={styles.barBtn}
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
          title="Back to dashboard"
        >
          <Icon name="arrowRight" size={17} style={{ transform: "rotate(180deg)" }} />
          <span>Back</span>
        </button>

        <div style={styles.barTitle}>
          <span style={styles.barHeading}>Learning Engine</span>
          <span style={styles.barSub}>Read · SQL · Excel · Python · Power BI</span>
        </div>

        <div style={styles.barActions}>
          <button
            style={styles.barBtn}
            onClick={reload}
            aria-label="Reload"
            title="Reload the learning engine"
          >
            <Icon name="settings" size={16} />
            <span>Reload</span>
          </button>
          <button
            style={styles.barBtn}
            onClick={openInTab}
            aria-label="Open in new tab"
            title="Open the learning engine in its own tab"
          >
            <Icon name="arrowRight" size={16} />
            <span>Expand</span>
          </button>
        </div>
      </header>

      <div style={styles.frameArea}>
        {!loaded && (
          <div style={styles.loader}>
            <span style={styles.spinner} />
            <span style={styles.loaderTxt}>Loading learning engine…</span>
          </div>
        )}
        <iframe
          key={loadKey}
          ref={frameRef}            src={
              user?.email
                ? `${ENGINE_URL}?user=${encodeURIComponent(user.email)}`
                : ENGINE_URL
            }
          title="Learning Engine"
          onLoad={() => setLoaded(true)}
          style={{
            ...styles.frame,
            opacity: loaded ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
}

const makeStyles = (t) => ({
  wrap: {
    position: "fixed",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    background: t.bg,
    zIndex: 500,
  },
  bar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "8px 10px",
    borderBottom: `1px solid ${t.border}`,
    background: t.surface,
    flexShrink: 0,
  },
  barBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 11px",
    borderRadius: 8,
    border: `1px solid ${t.border}`,
    background: t.card,
    color: t.txt,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  barTitle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    overflow: "hidden",
  },
  barHeading: {
    fontSize: 13.5,
    fontWeight: 700,
    color: t.txt,
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  barSub: {
    fontSize: 10.5,
    color: t.txtDim,
    whiteSpace: "nowrap",
  },
  barActions: {
    display: "flex",
    gap: 6,
  },
  frameArea: {
    position: "relative",
    flex: 1,
    minHeight: 0,
    background: t.bg,
  },
  frame: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    border: "none",
    transition: "opacity 0.25s",
  },
  loader: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    background: t.bg,
    zIndex: 1,
  },
  spinner: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: `3px solid ${t.border}`,
    borderTopColor: t.accent,
    animation: "ign-spin 0.8s linear infinite",
  },
  loaderTxt: {
    fontSize: 13,
    color: t.txtDim,
  },
});