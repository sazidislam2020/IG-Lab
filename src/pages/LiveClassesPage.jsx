import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export default function LiveClassesPage() {
  const { profile, isTeacher, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming"); // 'upcoming' | 'live' | 'ended' | 'all'

  const canCreate = isTeacher || isAdmin || isSuperAdmin;

  useEffect(() => {
    loadClasses();
    // Poll every 30 seconds for live status updates
    const interval = setInterval(loadClasses, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadClasses() {
    setLoading(true);
    const { data } = await supabase
      .from("live_classes")
      .select("*, profiles:host_id(email, full_name)")
      .order("scheduled_at", { ascending: filter === "ended" ? false : true });
    setClasses(data || []);
    setLoading(false);
  }

  function getStatus(cls) {
    // Honor the DB status field first — a class the teacher marked "live"
    // is live even if its scheduled_at is in the past.
    if (cls.status === "ended") return { label: "Ended", color: "#5C6478", bg: "#5C647818" };
    if (cls.status === "live") return { label: "Live Now", color: "#F87171", bg: "#F8717118" };
    const now = new Date();
    const start = new Date(cls.scheduled_at);
    const end = new Date(start.getTime() + cls.duration_min * 60000);
    if (now >= start && now <= end) return { label: "Live Now", color: "#F87171", bg: "#F8717118" };
    if (now < start) {
      const diff = start - now;
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      const days = Math.floor(hrs / 24);
      let timeStr;
      if (days > 0) timeStr = `in ${days}d ${hrs % 24}h`;
      else if (hrs > 0) timeStr = `in ${hrs}h ${mins % 60}m`;
      else timeStr = `in ${mins}m`;
      return { label: timeStr, color: "#FFB238", bg: "#FFB23818" };
    }
    return { label: "Scheduled", color: "#3ECF8E", bg: "#3ECF8E18" };
  }

  function formatDateTime(d) {
    return new Date(d).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const filtered = classes.filter((cls) => {
    const status = getStatus(cls);
    if (filter === "live") return status.label === "Live Now";
    // Upcoming shows everything that hasn't ended — including live-now classes
    // at the top, so students never miss a running class.
    if (filter === "upcoming") return status.label !== "Ended";
    if (filter === "ended") return status.label === "Ended";
    return true;
  });

  // Sort live classes first in the upcoming/all views
  if (filter !== "ended") {
    filtered.sort((a, b) => {
      const aLive = (a.status === "live" || getStatus(a).label === "Live Now") ? 1 : 0;
      const bLive = (b.status === "live" || getStatus(b).label === "Live Now") ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive;
      return new Date(a.scheduled_at) - new Date(b.scheduled_at);
    });
  }

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navLeft}>
          <a href="/dashboard" style={S.backLink}>← Dashboard</a>
          <span style={S.brand}>📡 Live Classes</span>
        </div>
        {canCreate && (
          <button onClick={() => navigate("/classes/create")} style={S.createBtn}>
            + Schedule Class
          </button>
        )}
      </nav>

      <main style={S.main}>
        {/* Filter tabs */}
        <div style={S.tabs}>
          {[
            { key: "upcoming", label: "📅 Upcoming" },
            { key: "live", label: "🔴 Live Now" },
            { key: "ended", label: "📋 Past" },
            { key: "all", label: "All" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              style={filter === t.key ? { ...S.tab, ...S.tabActive } : S.tab}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Class cards */}
        {loading ? (
          <div style={S.loading}>Loading classes...</div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>
              {filter === "live" ? "No live classes right now" : "No classes found"}
            </h2>
            <p style={{ color: "#8A93A6", marginBottom: 24 }}>
              {canCreate
                ? "Schedule a class to get started!"
                : "Check back later for upcoming classes."}
            </p>
            {canCreate && (
              <button onClick={() => navigate("/classes/create")} style={S.createBtn}>
                + Schedule Class
              </button>
            )}
          </div>
        ) : (
          <div style={S.grid}>
            {filtered.map((cls) => {
              const status = getStatus(cls);
              const isHost = cls.host_id === profile?.id;
              return (
                <div key={cls.id} style={S.card}>
                  <div style={S.cardHeader}>
                    <span style={{ ...S.statusBadge(status.color, status.bg) }}>
                      {status.label === "Live Now" && <span style={S.liveDot} />}
                      {status.label}
                    </span>
                    {isHost && <span style={S.hostBadge}>HOST</span>}
                  </div>
                  <h3 style={S.cardTitle}>{cls.title}</h3>
                  {cls.description && (
                    <p style={S.cardDesc}>{cls.description}</p>
                  )}
                  <div style={S.cardMeta}>
                    <span style={S.metaItem}>👤 {cls.profiles?.full_name || cls.profiles?.email || "Unknown"}</span>
                    <span style={S.metaItem}>🕐 {formatDateTime(cls.scheduled_at)}</span>
                    <span style={S.metaItem}>⏱ {cls.duration_min} min</span>
                    {cls.subject && <span style={S.metaItem}>📖 {cls.subject}</span>}
                  </div>
                  <div style={S.cardActions}>
                    {(status.label === "Live Now" || isHost) ? (
                      <button
                        onClick={() => navigate(`/classes/${cls.id}`)}
                        style={S.joinBtn}
                      >
                        {status.label === "Live Now" ? "🔴 Join Now" : "▶ Start Class"}
                      </button>
                    ) : status.label !== "Ended" ? (
                      <button
                        onClick={() => navigate(`/classes/${cls.id}`)}
                        style={S.viewBtn}
                      >
                        View Details
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: "#5C6478" }}>Class ended</span>
                    )}
                    {isHost && cls.status !== "ended" && (
                      <button
                        onClick={async () => {
                          await supabase.from("live_classes").update({ status: "ended" }).eq("id", cls.id);
                          loadClasses();
                        }}
                        style={S.endBtn}
                      >
                        End Class
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

const BG = "#0A0E16";
const PANEL = "#131926";
const LINE = "rgba(237,239,243,0.09)";
const TXT = "#EDEFF3";
const DIM = "#8A93A6";
const ORG = "#FF5A1F";

const S = {
  page: { minHeight: "100vh", background: BG, color: TXT, fontFamily: "Inter,sans-serif" },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 32px", borderBottom: "1px solid " + LINE, background: PANEL,
    position: "sticky", top: 0, zIndex: 100,
  },
  navLeft: { display: "flex", alignItems: "center", gap: 16 },
  backLink: { color: DIM, textDecoration: "none", fontSize: 13 },
  brand: { fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700 },
  createBtn: {
    background: "linear-gradient(135deg,#FF5A1F,#ef4444)", color: "#fff", border: "none",
    padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  main: { maxWidth: 1100, margin: "0 auto", padding: "32px 32px" },

  // Tabs
  tabs: { display: "flex", gap: 4, marginBottom: 28, background: PANEL, borderRadius: 10, padding: 4, width: "fit-content" },
  tab: {
    background: "transparent", border: "none", color: DIM, padding: "8px 16px",
    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
  },
  tabActive: { background: ORG + "18", color: ORG },

  loading: { textAlign: "center", padding: 60, color: DIM },
  empty: { textAlign: "center", padding: 80, color: TXT },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 },

  // Card
  card: {
    background: PANEL, border: "1px solid " + LINE, borderRadius: 12,
    padding: "20px 22px", transition: "border-color 0.2s",
  },
  cardHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  statusBadge: (color, bg) => ({
    fontSize: 11, fontWeight: 600, color, background: bg,
    padding: "3px 10px", borderRadius: 100, display: "flex", alignItems: "center", gap: 5,
  }),
  liveDot: {
    width: 6, height: 6, borderRadius: "50%", background: "#F87171",
    animation: "pulse 1.5s infinite",
  },
  hostBadge: {
    fontSize: 10, fontWeight: 700, color: ORG, background: ORG + "18",
    padding: "2px 8px", borderRadius: 100, letterSpacing: 0.8,
  },
  cardTitle: { fontSize: 17, fontWeight: 600, marginBottom: 6 },
  cardDesc: { fontSize: 13, color: DIM, lineHeight: 1.5, marginBottom: 12 },
  cardMeta: { display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  metaItem: { fontSize: 12, color: "#5C6478" },
  cardActions: { display: "flex", gap: 8, alignItems: "center" },
  joinBtn: {
    background: "linear-gradient(135deg,#F87171,#ef4444)", color: "#fff", border: "none",
    padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
    animation: "pulse 2s infinite",
  },
  viewBtn: {
    background: "transparent", border: "1px solid " + LINE, color: TXT,
    padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
  },
  endBtn: {
    background: "transparent", border: "1px solid rgba(248,113,113,0.3)", color: "#F87171",
    padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", marginLeft: "auto",
  },
};
