import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import Icon from "./Icon";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isTeacher, isAdmin, isSuperAdmin } = useAuth();
  const { colors: t } = useTheme();
  const styles = makeStyles(t);

  // Don't show on landing, login, signup, password-reset pages
  const hideOn = ["/", "/login", "/signup", "/reset-password"];
  if (hideOn.includes(location.pathname)) return null;

  // Hide on PC (wider than 768px) — use CSS media query
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) return null;

  // Role nav items — SVG icons (no emoji chrome; renders identically on every OS)
  const studentItems = [
    { icon: "home", label: "Home", path: "/dashboard" },
    { icon: "book", label: "Courses", path: "/courses" },
    { icon: "code", label: "Code", path: "/sandbox" },
    { icon: "video", label: "Live", path: "/classes" },
    { icon: "user", label: "Profile", path: "/profile" },
  ];

  const teacherItems = [
    { icon: "home", label: "Home", path: "/dashboard" },
    { icon: "users", label: "Students", path: "/teacher" },
    { icon: "video", label: "Live", path: "/classes" },
    { icon: "check", label: "Review", path: "/teacher/review" },
    { icon: "user", label: "Profile", path: "/profile" },
  ];

  const adminItems = [
    { icon: "home", label: "Home", path: "/dashboard" },
    { icon: "shield", label: "Approve", path: "/admin/approvals" },
    { icon: "video", label: "Live", path: "/classes" },
    { icon: "settings", label: "Settings", path: "/admin/site-settings" },
    { icon: "user", label: "Profile", path: "/profile" },
  ];

  // Role-aware: admin tools ONLY for explicit admins — if the profile
  // hasn't loaded yet (or the fetch failed), default to the student nav
  // instead of leaking admin buttons to everyone.
  const items = isAdmin || isSuperAdmin ? adminItems : isTeacher ? teacherItems : studentItems;

  return (
    <nav style={styles.nav}>
      {items.map((item) => {
        const isActive = location.pathname === item.path || 
          (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            style={{
              ...styles.item,
              color: isActive ? t.accentLink : t.txtDim,
            }}
          >
            <span style={{
              ...styles.icon,
              background: isActive ? "rgba(255,107,43,0.12)" : "transparent",
            }}>
              <Icon name={item.icon} size={19} strokeWidth={isActive ? 2.2 : 1.8} />
            </span>
            <span style={styles.label}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

const makeStyles = (t) => ({
  nav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    background: t.bg,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderTop: `1px solid ${t.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    padding: "0 8px",
    zIndex: 1000,
  },
  item: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "6px 12px",
    transition: "color 0.2s",
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s",
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.02em",
  },
});
