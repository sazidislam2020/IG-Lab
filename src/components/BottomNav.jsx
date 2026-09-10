import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isStudent, isTeacher, isAdmin, isSuperAdmin } = useAuth();
  const { colors: t } = useTheme();

  // Don't show on landing, login, signup pages
  const hideOn = ["/", "/login", "/signup"];
  if (hideOn.includes(location.pathname)) return null;

  // Hide on PC (wider than 768px) — use CSS media query
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) return null;

  // Student nav items
  const studentItems = [
    { icon: "🏠", label: "Home", path: "/dashboard" },
    { icon: "📚", label: "Courses", path: "/courses" },
    { icon: "💻", label: "Code", path: "/sandbox" },
    { icon: "📡", label: "Live", path: "/classes" },
    { icon: "👤", label: "Profile", path: "/profile" },
  ];

  // Teacher nav items
  const teacherItems = [
    { icon: "🏠", label: "Home", path: "/dashboard" },
    { icon: "👥", label: "Students", path: "/teacher" },
    { icon: "📡", label: "Live", path: "/classes" },
    { icon: "📝", label: "Review", path: "/teacher/review" },
    { icon: "👤", label: "Profile", path: "/profile" },
  ];

  // Admin nav items
  const adminItems = [
    { icon: "🏠", label: "Home", path: "/dashboard" },
    { icon: "🔐", label: "Approve", path: "/admin/approvals" },
    { icon: "📡", label: "Live", path: "/classes" },
    { icon: "🎨", label: "Settings", path: "/admin/site-settings" },
    { icon: "👤", label: "Profile", path: "/profile" },
  ];

  const items = isStudent ? studentItems : isTeacher ? teacherItems : adminItems;

  return (
    <nav style={styles.nav}>
      {items.map((item) => {
        const isActive = location.pathname === item.path || 
          (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              ...styles.item,
              color: isActive ? "#FF6B2B" : t.txtDim,
            }}
          >
            <span style={{
              ...styles.icon,
              background: isActive ? "rgba(255,107,43,0.12)" : "transparent",
            }}>
              {item.icon}
            </span>
            <span style={styles.label}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

const styles = {
  nav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    background: "rgba(15,20,32,0.98)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(255,255,255,0.06)",
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
    fontSize: 18,
    transition: "background 0.2s",
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.02em",
  },
};
