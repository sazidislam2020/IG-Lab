import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export default function CreateClass() {
  const { profile, isAdmin, isSuperAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedModuleId = searchParams.get("module");

  const canCreateWebinar = isAdmin || isSuperAdmin;
  const canCreateCourseClass = isTeacher || isAdmin || isSuperAdmin;

  const [mode, setMode] = useState(preselectedModuleId ? "course" : canCreateWebinar ? "webinar" : "course");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [courseModules, setCourseModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(preselectedModuleId || "");
  const [meetLink, setMeetLink] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) loadModules(selectedCourse);
  }, [selectedCourse]);

  async function loadCourses() {
    const { data } = await supabase.from("courses").select("id, title").order("title");
    setCourses(data || []);
    if (preselectedModuleId) {
      // Find which course this module belongs to
      const { data: mod } = await supabase
        .from("course_modules")
        .select("course_id")
        .eq("id", preselectedModuleId)
        .single();
      if (mod) setSelectedCourse(mod.course_id);
    }
  }

  async function loadModules(courseId) {
    const { data } = await supabase
      .from("course_modules")
      .select("id, title, module_type, module_order")
      .eq("course_id", courseId)
      .eq("module_type", "live")
      .order("module_order");
    setCourseModules(data || []);
  }

  async function handleCreate(startNow = false) {
    if (!title.trim() || creating) return;
    if (!startNow && (!date || !time)) return;
    setCreating(true);

    const scheduledAt = startNow ? new Date().toISOString() : new Date(`${date}T${time}:00`).toISOString();
    const initialStatus = startNow ? "live" : "scheduled";
    const roomId = crypto.randomUUID();

    const insertData = {
      host_id: profile.id,
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim(),
      scheduled_at: scheduledAt,
      duration_min: duration,
      room_id: roomId,
      status: initialStatus,
      meet_link: meetLink.trim() || null,
    };

    // If course-linked, set module_id
    if (mode === "course" && selectedModule) {
      insertData.module_id = selectedModule;
    }

    const { data, error } = await supabase
      .from("live_classes")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Create class error:", error);
      alert("Failed to create class: " + error.message);
      setCreating(false);
      return;
    }

    navigate(`/classes/${data.id}`);
  }

  return (
    <div className="create-class-page" style={S.page}>
      <nav style={S.nav}>
        <div style={S.navLeft}>
          <Link to="/classes" style={S.backLink}>← Live Classes</Link>
          <span style={S.brand}>📡 Schedule a Class</span>
        </div>
      </nav>

      <main style={S.main}>
        <div style={S.formCard}>
          <h2 style={S.formTitle}>Create Live Class</h2>
          <p style={S.formSubtitle}>Schedule a live class. Paste a Google Meet / Zoom / any meeting link for students to join.</p>

          {/* Mode selector */}
          <div style={S.modeRow}>
            {canCreateWebinar && (
              <button
                onClick={() => setMode("webinar")}
                style={mode === "webinar" ? { ...S.modeBtn, ...S.modeBtnActive } : S.modeBtn}
              >
                🎤 Standalone Webinar
              </button>
            )}
            {canCreateCourseClass && (
              <button
                onClick={() => setMode("course")}
                style={mode === "course" ? { ...S.modeBtn, ...S.modeBtnActive } : S.modeBtn}
              >
                📚 Course Session
              </button>
            )}
          </div>

          {mode === "webinar" && (
            <div style={S.infoBox}>
              <span style={{ color: "#FFB238" }}>🎤</span>
              <span style={{ fontSize: 13, color: DIM }}>
                This will appear as a standalone webinar — not linked to any course. Students can join from the main Live Classes page.
              </span>
            </div>
          )}

          <div style={S.field}>
            <label style={S.label}>Class Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === "webinar" ? "e.g. Python Workshop: Build a Calculator" : "e.g. Week 3: Introduction to Loops"}
              style={S.input}
              autoFocus
            />
          </div>

          {mode === "course" && (
            <>
              <div style={S.row}>
                <div style={{ ...S.field, flex: 1 }}>
                  <label style={S.label}>Course *</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => { setSelectedCourse(e.target.value); setSelectedModule(""); }}
                    style={S.select}
                  >
                    <option value="">Select a course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div style={{ ...S.field, flex: 1 }}>
                  <label style={S.label}>Link to Module</label>
                  <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    style={S.select}
                  >
                    <option value="">No specific module</option>
                    {courseModules.map((m) => (
                      <option key={m.id} value={m.id}>
                        #{m.module_order + 1} {m.title}
                      </option>
                    ))}
                    {courseModules.length === 0 && selectedCourse && (
                      <option value="" disabled>No live modules in this course yet</option>
                    )}
                  </select>
                </div>
              </div>
            </>
          )}

          <div style={S.field}>
            <label style={S.label}>Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Python Fundamentals"
              style={S.input}
            />
          </div>

          <div style={S.field}>
            <label style={S.label}>🔗 Meeting Link (Google Meet / Zoom / any URL)</label>
            <input
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              placeholder="https://meet.google.com/xxx-xxxx-xxx or Zoom link"
              style={S.input}
            />
            <p style={{ fontSize: 11, color: DIM, marginTop: 4 }}>
              Students will click this link to join the video call. Paste your Google Meet, Zoom, or any meeting URL.
            </p>
          </div>

          <div style={S.field}>
            <label style={S.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will be covered in this class?"
              style={S.textarea}
              rows={3}
            />
          </div>

          <div style={S.row}>
            <div style={{ ...S.field, flex: 1 }}>
              <label style={S.label}>Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.input} />
            </div>
            <div style={{ ...S.field, flex: 1 }}>
              <label style={S.label}>Time *</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={S.input} />
            </div>
          </div>

          <div style={S.field}>
            <label style={S.label}>Duration (minutes)</label>
            <div style={S.durationRow}>
              {[30, 45, 60, 90, 120].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  style={duration === d ? { ...S.durBtn, ...S.durBtnActive } : S.durBtn}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>

          <div style={S.actions}>
            <button onClick={() => navigate("/classes")} style={S.cancelBtn}>Cancel</button>
            <button
              onClick={() => handleCreate(true)}
              disabled={!title.trim() || creating}
              style={{ ...S.startNowBtn, opacity: !title.trim() || creating ? 0.5 : 1 }}
            >
              {creating ? "Starting..." : "🔴 Start Now"}
            </button>
            <button
              onClick={() => handleCreate(false)}
              disabled={!title.trim() || !date || !time || creating}
              style={{ ...S.createBtn, opacity: !title.trim() || !date || !time || creating ? 0.5 : 1 }}
            >
              {creating ? "Creating..." : "📅 Schedule"}
            </button>
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 640px) {
          .create-class-page nav { padding: 12px 16px !important; }
          .create-class-page main { padding: 24px 16px !important; }
          .create-class-page form { padding: 20px !important; }
        }
      `}</style>
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
  nav: { display: "flex", alignItems: "center", padding: "16px 32px", borderBottom: "1px solid " + LINE, background: PANEL },
  navLeft: { display: "flex", alignItems: "center", gap: 16 },
  backLink: { color: DIM, textDecoration: "none", fontSize: 13 },
  brand: { fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700 },
  main: { maxWidth: 640, margin: "0 auto", padding: "40px 32px" },
  formCard: { background: PANEL, border: "1px solid " + LINE, borderRadius: 16, padding: 32 },
  formTitle: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: DIM, marginBottom: 24 },

  modeRow: { display: "flex", gap: 8, marginBottom: 20 },
  modeBtn: {
    flex: 1, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    background: BG, border: "1px solid " + LINE, color: DIM, cursor: "pointer",
    transition: "all 0.15s",
  },
  modeBtnActive: { borderColor: ORG, color: ORG, background: ORG + "12" },

  infoBox: {
    display: "flex", alignItems: "center", gap: 10, background: BG,
    border: "1px solid " + LINE, borderRadius: 8, padding: "12px 14px", marginBottom: 20,
  },

  field: { marginBottom: 18 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: DIM, marginBottom: 6 },
  input: {
    width: "100%", padding: "10px 14px", fontSize: 14, background: BG,
    border: "1px solid " + LINE, borderRadius: 8, color: TXT, outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "100%", padding: "10px 14px", fontSize: 14, background: BG,
    border: "1px solid " + LINE, borderRadius: 8, color: TXT, outline: "none",
    boxSizing: "border-box", cursor: "pointer",
  },
  textarea: {
    width: "100%", padding: "10px 14px", fontSize: 14, background: BG,
    border: "1px solid " + LINE, borderRadius: 8, color: TXT, outline: "none",
    boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
  },
  row: { display: "flex", gap: 12 },
  durationRow: { display: "flex", gap: 8 },
  durBtn: {
    background: BG, border: "1px solid " + LINE, color: DIM,
    padding: "8px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600,
  },
  durBtnActive: { borderColor: ORG, color: ORG, background: ORG + "12" },
  actions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 },
  cancelBtn: {
    background: "transparent", border: "1px solid " + LINE, color: TXT,
    padding: "10px 20px", borderRadius: 8, fontSize: 13, cursor: "pointer",
  },
  createBtn: {
    background: "linear-gradient(135deg,#FF5A1F,#ef4444)", color: "#fff", border: "none",
    padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  startNowBtn: {
    background: "linear-gradient(135deg,#F87171,#ef4444)", color: "#fff", border: "none",
    padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 0 20px rgba(248,113,113,0.3)",
  },
};
