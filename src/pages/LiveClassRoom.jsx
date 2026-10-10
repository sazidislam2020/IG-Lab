import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import Icon from "../components/Icon";

export default function LiveClassRoom() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { colors: t } = useTheme();
  const S = makeStyles(t);
  const [cls, setCls] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const attendanceIdRef = useRef(null);

  useEffect(() => {
    loadClass();
    return () => {
      if (attendanceIdRef.current) {
        supabase.from("class_attendance").update({
          left_at: new Date().toISOString(),
          duration_sec: Math.floor((Date.now() - (window._joinTime || Date.now())) / 1000),
        }).eq("id", attendanceIdRef.current);
      }
    };
  }, [classId]);

  // Refresh attendees every 10 seconds
  useEffect(() => {
    if (joined) {
      const interval = setInterval(refreshAttendees, 10000);
      return () => clearInterval(interval);
    }
  }, [joined]);

  async function fetchAttendees() {
    const { data } = await supabase
      .from("class_attendance")
      .select("*")
      .eq("class_id", classId);
    const rows = data || [];
    const ids = [...new Set(rows.map((r) => r.user_id))];
    let dir = [];
    if (ids.length) {
      const { data: d } = await supabase
        .from("profile_public")
        .select("id, full_name")
        .in("id", ids);
      dir = d || [];
    }
    const map = Object.fromEntries(dir.map((p) => [p.id, p.full_name]));
    return rows.map((r) => ({ ...r, display_name: map[r.user_id] || "?" }));
  }

  async function loadClass() {
    const { data, error } = await supabase
      .from("live_classes")
      .select("*, host_name")
      .eq("id", classId)
      .single();

    if (error || !data) {
      setError("Class not found");
      setLoading(false);
      return;
    }

    setCls(data);
    setAttendees(await fetchAttendees());

    setLoading(false);
  }

  async function joinClass() {
    if (!profile || !cls) return;
    window._joinTime = Date.now();

    // Record attendance
    const { data: att, error: attErr } = await supabase
      .from("class_attendance")
      .upsert(
        { class_id: classId, user_id: profile.id },
        { onConflict: "class_id,user_id" }
      )
      .select()
      .single();

    if (attErr) console.error("Attendance error:", attErr);
    if (att) attendanceIdRef.current = att.id;

    // If host, update class status to live
    if (cls.host_id === profile.id) {
      await supabase.from("live_classes").update({ status: "live" }).eq("id", classId);
    }

    setJoined(true);
  }

  async function refreshAttendees() {
    setAttendees(await fetchAttendees());
  }

  async function leaveClass() {
    if (attendanceIdRef.current) {
      const duration = Math.floor((Date.now() - (window._joinTime || Date.now())) / 1000);
      await supabase.from("class_attendance").update({
        left_at: new Date().toISOString(),
        duration_sec: duration,
      }).eq("id", attendanceIdRef.current);
    }
    setJoined(false);
    navigate("/classes");
  }

  async function endClass() {
    if (cls.host_id !== profile?.id) return;
    await supabase.from("live_classes").update({ status: "ended" }).eq("id", classId);
    navigate("/classes");
  }

  function formatDateTime(d) {
    return new Date(d).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.center}>Loading class...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.page}>
        <div style={S.center}>
          <div style={{ fontSize: 48, marginBottom: 16, display: "flex", justifyContent: "center", color: t.danger }}><Icon name="alert" size={44} /></div>
          <h2>Error</h2>
          <p style={{ color: t.txtDim, maxWidth: 400, lineHeight: 1.6, marginBottom: 16 }}>{error}</p>
          <button onClick={() => navigate("/classes")} style={S.backBtn}>← Back to Classes</button>
        </div>
      </div>
    );
  }

  const isHost = cls.host_id === profile?.id;
  const hasLink = cls.meet_link && cls.meet_link.trim();

  // Pre-join screen
  if (!joined) {
    return (
      <div style={S.page}>
        <div style={S.lobby}>
          <div style={S.lobbyCard}>
            <div style={{ fontSize: 48, marginBottom: 16, display: "flex", justifyContent: "center", color: t.accent }}><Icon name="video" size={44} /></div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{cls.title}</h1>
            {cls.description && (
              <p style={{ color: t.txtDim, fontSize: 14, marginBottom: 16 }}>{cls.description}</p>
            )}

            {hasLink ? (
              <div style={{
                background: "rgba(16,185,129,0.09)", border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: 8, padding: "10px 14px", fontSize: 12, color: t.success,
                marginBottom: 16, textAlign: "left",
              }}>
                <strong>Meeting link ready</strong> — opens when you join
              </div>
            ) : (
              <div style={{
                background: "rgba(245,158,11,0.09)", border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 8, padding: "10px 14px", fontSize: 12, color: t.warn,
                marginBottom: 16, textAlign: "left",
              }}>
                <strong>No meeting link</strong> — the host hasn't added a Google Meet link yet
              </div>
            )}

            <div style={S.lobbyMeta}>
              <div style={S.lobbyMetaItem}>
                <span style={{ color: t.txtDim }}>Host</span>
                <span>{cls.host_name || cls.title}</span>
              </div>
              <div style={S.lobbyMetaItem}>
                <span style={{ color: t.txtDim }}>Scheduled</span>
                <span>{formatDateTime(cls.scheduled_at)}</span>
              </div>
              <div style={S.lobbyMetaItem}>
                <span style={{ color: t.txtDim }}>Duration</span>
                <span>{cls.duration_min} minutes</span>
              </div>
              <div style={S.lobbyMetaItem}>
                <span style={{ color: t.txtDim }}>Participants</span>
                <span>{attendees.length} joined</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={joinClass} style={S.joinBtn}>
                {isHost ? <><Icon name="play" size={14} /> Start Class</> : <><Icon name="play" size={14} /> Join Class</>}
              </button>
              <button onClick={() => navigate("/classes")} style={S.backBtn}>
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // In-class view — shows meeting link and participants
  return (
    <div style={S.roomPage}>
      {/* Top bar */}
      <div style={S.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="video" size={14} /> {cls.title}</span>
          <span style={S.liveBadge}>LIVE</span>
          <span style={{ fontSize: 12, color: t.txtDim }}>
            {attendees.length} participant{attendees.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isHost && (
            <button onClick={endClass} style={S.endBtn}>End Class</button>
          )}
          <button onClick={leaveClass} style={S.leaveBtn}>Leave</button>
        </div>
      </div>

      <div style={S.roomBody}>
        {/* Main content — meeting link */}
        <div style={S.mainContent}>
          {hasLink ? (
            <div style={S.linkCard}>
              <div style={{ fontSize: 48, marginBottom: 16, display: "flex", justifyContent: "center", color: t.accent }}><Icon name="video" size={44} /></div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Video Call is Live!</h2>
              <p style={{ color: t.txtDim, fontSize: 14, marginBottom: 20, maxWidth: 400 }}>
                Click below to open the Google Meet call in a new tab.
              </p>
              <a
                href={cls.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                style={S.meetLinkBtn}
              >
                Open Google Meet
              </a>
              <p style={{ color: t.txtDim, fontSize: 11, marginTop: 12, wordBreak: "break-all", maxWidth: 400 }}>
                {cls.meet_link}
              </p>
            </div>
          ) : (
            <div style={S.linkCard}>
              <div style={{ fontSize: 48, marginBottom: 16, display: "flex", justifyContent: "center", color: t.txtDim }}><Icon name="clock" size={44} /></div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Waiting for meeting link...</h2>
              <p style={{ color: t.txtDim, fontSize: 14, maxWidth: 400 }}>
                The host will share a Google Meet link soon. Stay on this page.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar — participants */}
        <div style={S.sidebar}>
          <div style={S.sidebarHeader}>Participants ({attendees.length})</div>
          <div style={S.participantList}>
            {attendees.map((att) => (
              <div key={att.id} style={S.participant}>
                <div style={S.avatar}>{(att.display_name || "?")[0].toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {att.display_name || "?"}
                    {att.user_id === cls.host_id && (
                      <span style={S.hostTag}>HOST</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: t.txtDim }}>
                    Joined {new Date(att.joined_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const makeStyles = (t) => {
  const ORG = t.accent;
  return {
  page: { minHeight: "100vh", background: t.bg, color: t.txt, fontFamily: "Inter,sans-serif" },
  center: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    height: "100vh", color: t.txt, textAlign: "center",
  },
  lobby: {
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "100vh", padding: 32,
  },
  lobbyCard: {
    background: t.card, border: "1px solid " + t.border, borderRadius: 16,
    padding: "40px 48px", textAlign: "center", maxWidth: 500, width: "100%",
  },
  lobbyMeta: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
    textAlign: "left", marginTop: 20,
  },
  lobbyMetaItem: {
    display: "flex", flexDirection: "column", gap: 2,
    padding: "10px 14px", background: t.bg, borderRadius: 8, fontSize: 13,
  },
  joinBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: "linear-gradient(135deg,#FF5A1F,#ef4444)", color: t.accentInk, border: "none",
    padding: "12px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer",
    flex: 1,
  },
  backBtn: {
    background: "transparent", border: "1px solid " + t.border, color: t.txt,
    padding: "12px 20px", borderRadius: 10, fontSize: 13, cursor: "pointer",
  },
  roomPage: { height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: t.bg },
  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 20px", background: t.surface, borderBottom: "1px solid " + t.border, flexShrink: 0,
  },
  liveBadge: {
    fontSize: 11, fontWeight: 700, color: t.danger, background: "rgba(248,113,113,0.12)",
    padding: "3px 10px", borderRadius: 100,
  },
  endBtn: {
    background: t.danger, color: t.accentInk, border: "none",
    padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
  },
  leaveBtn: {
    background: "transparent", border: "1px solid " + t.border, color: t.txt,
    padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
  },
  roomBody: { flex: 1, display: "flex", overflow: "hidden" },
  mainContent: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    background: t.bg, padding: 32,
  },
  linkCard: {
    background: t.card, border: "1px solid " + t.border, borderRadius: 16,
    padding: "40px 48px", textAlign: "center", maxWidth: 500,
  },
  meetLinkBtn: {
    display: "inline-block",
    background: "linear-gradient(135deg,#FF5A1F,#ef4444)", color: t.accentInk,
    padding: "14px 32px", borderRadius: 10, fontSize: 16, fontWeight: 700,
    textDecoration: "none", cursor: "pointer",
  },
  sidebar: {
    width: 280, background: t.card, borderLeft: "1px solid " + t.border,
    display: "flex", flexDirection: "column", flexShrink: 0,
  },
  sidebarHeader: {
    padding: "12px 16px", fontSize: 12, fontWeight: 600, color: t.txtDim,
    borderBottom: "1px solid " + t.border, letterSpacing: 1,
  },
  participantList: { flex: 1, overflow: "auto", padding: "8px 0" },
  participant: {
    display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
    fontSize: 13,
  },
  avatar: {
    width: 32, height: 32, borderRadius: "50%", background: ORG + "30", color: t.accentLink,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  hostTag: {
    fontSize: 9, fontWeight: 700, color: t.accentLink, background: ORG + "18",
    padding: "1px 6px", borderRadius: 100, marginLeft: 6, letterSpacing: 0.5,
  },
  };
};
