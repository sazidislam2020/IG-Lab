import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export default function LiveClassRoom() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
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

  async function loadClass() {
    const { data, error } = await supabase
      .from("live_classes")
      .select("*, profiles:host_id(email, full_name)")
      .eq("id", classId)
      .single();

    if (error || !data) {
      setError("Class not found");
      setLoading(false);
      return;
    }

    setCls(data);

    const { data: attData } = await supabase
      .from("class_attendance")
      .select("*, profiles:user_id(email, full_name)")
      .eq("class_id", classId);
    setAttendees(attData || []);

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

    // If there's a meeting link, open it immediately
    if (cls.meet_link) {
      window.open(cls.meet_link, "_blank");
    }
  }

  async function refreshAttendees() {
    const { data } = await supabase
      .from("class_attendance")
      .select("*, profiles:user_id(email, full_name)")
      .eq("class_id", classId);
    setAttendees(data || []);
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
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h2>Error</h2>
          <p style={{ color: "#8A93A6", maxWidth: 400, lineHeight: 1.6, marginBottom: 16 }}>{error}</p>
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
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{cls.title}</h1>
            {cls.description && (
              <p style={{ color: DIM, fontSize: 14, marginBottom: 16 }}>{cls.description}</p>
            )}
            <div style={S.lobbyMeta}>
              <div style={S.lobbyMetaItem}>
                <span style={{ color: "#5C6478" }}>Host</span>
                <span>{cls.profiles?.full_name || cls.profiles?.email}</span>
              </div>
              <div style={S.lobbyMetaItem}>
                <span style={{ color: "#5C6478" }}>Scheduled</span>
                <span>{formatDateTime(cls.scheduled_at)}</span>
              </div>
              <div style={S.lobbyMetaItem}>
                <span style={{ color: "#5C6478" }}>Duration</span>
                <span>{cls.duration_min} minutes</span>
              </div>
              {cls.subject && (
                <div style={S.lobbyMetaItem}>
                  <span style={{ color: "#5C6478" }}>Subject</span>
                  <span>{cls.subject}</span>
                </div>
              )}
              <div style={S.lobbyMetaItem}>
                <span style={{ color: "#5C6478" }}>Participants</span>
                <span>{attendees.length} joined</span>
              </div>
            </div>

            {hasLink ? (
              <div style={{
                background: "#10B98118", border: "1px solid #10B98140",
                borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#6EE7B7",
                marginTop: 16, textAlign: "left", wordBreak: "break-all",
              }}>
                ✅ <strong>Meeting link ready</strong> — opens in a new tab when you join.
              </div>
            ) : (
              <div style={{
                background: "#F59E0B18", border: "1px solid #F59E0B40",
                borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#FCD34D",
                marginTop: 16, textAlign: "left",
              }}>
                ⚠️ <strong>No meeting link</strong> — the host hasn't added a video call link yet.
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={joinClass} style={S.joinBtn}>
                {isHost ? "▶ Start Class" : "🔴 Join Class"}
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

  // In-class view — shows meeting info and participants
  return (
    <div style={S.roomPage}>
      {/* Top bar */}
      <div style={S.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>📡 {cls.title}</span>
          <span style={S.liveBadge}>🔴 LIVE</span>
          <span style={{ fontSize: 12, color: "#5C6478" }}>
            {attendees.length} participant{attendees.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isHost && (
            <button onClick={endClass} style={S.endBtn}>⏹ End Class</button>
          )}
          <button onClick={leaveClass} style={S.leaveBtn}>Leave</button>
        </div>
      </div>

      <div style={S.roomBody}>
        {/* Main content — meeting link or waiting */}
        <div style={S.mainContent}>
          {hasLink ? (
            <div style={S.linkCard}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎥</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Video Call is Live!</h2>
              <p style={{ color: DIM, fontSize: 14, marginBottom: 20, maxWidth: 400 }}>
                Click the button below to open the video call in a new tab.
              </p>
              <a
                href={cls.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                style={S.meetLinkBtn}
              >
                🔗 Open Meeting Link
              </a>
              <p style={{ color: "#5C6478", fontSize: 11, marginTop: 12, wordBreak: "break-all", maxWidth: 400 }}>
                {cls.meet_link}
              </p>
            </div>
          ) : (
            <div style={S.linkCard}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Waiting for meeting link...</h2>
              <p style={{ color: DIM, fontSize: 14, maxWidth: 400 }}>
                The host will share a meeting link soon. Stay in this page to see when it's available.
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
                <div style={S.avatar}>{(att.profiles?.full_name || att.profiles?.email || "?")[0].toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {att.profiles?.full_name || att.profiles?.email}
                    {att.user_id === cls.host_id && (
                      <span style={S.hostTag}>HOST</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#5C6478" }}>
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

const BG = "#0A0E16";
const BG2 = "#0F1420";
const PANEL = "#131926";
const LINE = "rgba(237,239,243,0.09)";
const TXT = "#EDEFF3";
const DIM = "#8A93A6";
const ORG = "#FF5A1F";

const S = {
  page: { minHeight: "100vh", background: BG, color: TXT, fontFamily: "Inter,sans-serif" },
  center: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    height: "100vh", color: TXT, textAlign: "center",
  },
  lobby: {
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "100vh", padding: 32,
  },
  lobbyCard: {
    background: PANEL, border: "1px solid " + LINE, borderRadius: 16,
    padding: "40px 48px", textAlign: "center", maxWidth: 500, width: "100%",
  },
  lobbyMeta: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
    textAlign: "left", marginTop: 20,
  },
  lobbyMetaItem: {
    display: "flex", flexDirection: "column", gap: 2,
    padding: "10px 14px", background: BG, borderRadius: 8, fontSize: 13,
  },
  joinBtn: {
    background: "linear-gradient(135deg,#FF5A1F,#ef4444)", color: "#fff", border: "none",
    padding: "12px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer",
    flex: 1,
  },
  backBtn: {
    background: "transparent", border: "1px solid " + LINE, color: TXT,
    padding: "12px 20px", borderRadius: 10, fontSize: 13, cursor: "pointer",
  },
  roomPage: { height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 20px", background: PANEL, borderBottom: "1px solid " + LINE, flexShrink: 0,
  },
  liveBadge: {
    fontSize: 11, fontWeight: 700, color: "#F87171", background: "#F8717118",
    padding: "3px 10px", borderRadius: 100, animation: "pulse 2s infinite",
  },
  endBtn: {
    background: "#F87171", color: "#fff", border: "none",
    padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
  },
  leaveBtn: {
    background: "transparent", border: "1px solid " + LINE, color: TXT,
    padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
  },
  roomBody: { flex: 1, display: "flex", overflow: "hidden" },
  mainContent: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    background: BG, padding: 32,
  },
  linkCard: {
    background: PANEL, border: "1px solid " + LINE, borderRadius: 16,
    padding: "40px 48px", textAlign: "center", maxWidth: 500,
  },
  meetLinkBtn: {
    display: "inline-block",
    background: "linear-gradient(135deg,#FF5A1F,#ef4444)", color: "#fff",
    padding: "14px 32px", borderRadius: 10, fontSize: 16, fontWeight: 700,
    textDecoration: "none", cursor: "pointer",
  },
  sidebar: {
    width: 280, background: BG2, borderLeft: "1px solid " + LINE,
    display: "flex", flexDirection: "column", flexShrink: 0,
  },
  sidebarHeader: {
    padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#5C6478",
    borderBottom: "1px solid " + LINE, letterSpacing: 1,
  },
  participantList: { flex: 1, overflow: "auto", padding: "8px 0" },
  participant: {
    display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
    fontSize: 13,
  },
  avatar: {
    width: 32, height: 32, borderRadius: "50%", background: ORG + "30", color: ORG,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  hostTag: {
    fontSize: 9, fontWeight: 700, color: ORG, background: ORG + "18",
    padding: "1px 6px", borderRadius: 100, marginLeft: 6, letterSpacing: 0.5,
  },
};
