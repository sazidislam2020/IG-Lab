import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabase";

export default function CoursesPage() {
  const { profile, isAdmin, isSuperAdmin, isTeacher, user } = useAuth();
  const { isDark, colors: t } = useTheme();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [enrollCounts, setEnrollCounts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);

  const canManage = isAdmin || isSuperAdmin;
  const isStudent = !canManage && !isTeacher;

  const S = makeStyles(t, isDark);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    const { data } = await supabase
      .from("courses")
      .select(`
        *,
        course_modules!course_modules_course_id_fkey (
          id, module_type, title, module_order, points_value
        )
      `)
      .order("created_at", { ascending: false });

    // Enrich with module counts
    const enriched = (data || []).map((c) => {
      const modules = c.course_modules || [];
      const liveCount = modules.filter((m) => m.module_type === "live").length;
      const classworkCount = modules.filter((m) => m.module_type === "classwork").length;
      const homeworkCount = modules.filter((m) => m.module_type === "homework").length;
      const bossCount = modules.filter((m) => m.module_type === "boss").length;
      const totalPoints = modules.reduce((sum, m) => sum + (m.points_value || 0), 0);
      return {
        ...c,
        liveCount,
        classworkCount,
        homeworkCount,
        bossCount,
        totalPoints,
        moduleCount: modules.length,
      };
    });

    setCourses(enriched);

    // Load enrollments for the current student
    if (user?.id && isStudent) {
      const { data: enrolls } = await supabase
        .from("course_enrollments")
        .select("course_id")
        .eq("user_id", user.id);
      setEnrolledIds(new Set((enrolls || []).map((e) => e.course_id)));
    }

    // Load enrollment counts for all courses
    const { data: counts } = await supabase
      .from("course_enrollments")
      .select("course_id");
    const countMap = {};
    for (const e of counts || []) countMap[e.course_id] = (countMap[e.course_id] || 0) + 1;
    setEnrollCounts(countMap);

    setLoading(false);
  }

  async function toggleEnroll(course, e) {
    e.stopPropagation();
    if (!user?.id) return;
    setBusyId(course.id);
    if (enrolledIds.has(course.id)) {
      // Unenroll
      await supabase.from("course_enrollments").delete().eq("user_id", user.id).eq("course_id", course.id);
      setEnrolledIds((prev) => { const n = new Set(prev); n.delete(course.id); return n; });
      setEnrollCounts((prev) => ({ ...prev, [course.id]: Math.max(0, (prev[course.id] || 1) - 1) }));
    } else {
      // Enroll
      const { error } = await supabase.from("course_enrollments").insert({ user_id: user.id, course_id: course.id });
      if (!error) {
        setEnrolledIds((prev) => new Set([...prev, course.id]));
        setEnrollCounts((prev) => ({ ...prev, [course.id]: (prev[course.id] || 0) + 1 }));
      }
    }
    setBusyId(null);
  }

  async function deleteCourse(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this course and all its modules?")) return;
    await supabase.from("courses").delete().eq("id", id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navLeft}>
          <a href="/dashboard" style={S.backLink}>← Dashboard</a>
          <span style={S.brand}>📚 Courses</span>
        </div>
        {canManage && (
          <button onClick={() => navigate("/admin/courses")} style={S.manageBtn}>
            ⚙ Manage Courses
          </button>
        )}
      </nav>

      <main style={S.main}>
        {loading ? (
          <div style={S.loading}>Loading courses...</div>
        ) : courses.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
            <h2 style={{ fontSize: 20, marginBottom: 8, color: t.txt }}>No courses yet</h2>
            <p style={{ color: t.txtDim }}>
              {canManage
                ? "Go to Course Management to create courses."
                : "Courses will appear here once an admin creates them."}
            </p>
          </div>
        ) : (
          <div style={S.grid}>
            {courses.map((c) => (
              <div
                key={c.id}
                style={S.card}
                onClick={() => navigate(`/courses/${c.id}`)}
              >
                <div style={S.cardHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={S.courseIcon}>📘</span>
                    {c.is_free ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#4ADE80", background: "rgba(74,222,128,0.12)", padding: "3px 10px", borderRadius: 100 }}>FREE</span>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#FF5A1F", background: "rgba(255,90,31,0.12)", padding: "3px 10px", borderRadius: 100 }}>PREMIUM</span>
                    )}
                    {enrollCounts[c.id] > 0 && (
                      <span style={{ fontSize: 11, color: t.txtDim }}>👥 {enrollCounts[c.id]}</span>
                    )}
                  </div>
                  {canManage && (
                    <button onClick={(e) => deleteCourse(c.id, e)} style={S.deleteBtn} title="Delete">
                      🗑
                    </button>
                  )}
                </div>
                <h3 style={S.cardTitle}>{c.title}</h3>
                <p style={S.cardDesc}>{c.description || "No description"}</p>

                {/* Module breakdown */}
                <div style={S.moduleBreakdown}>
                  {c.liveCount > 0 && (
                    <span style={S.tagLive}>📡 {c.liveCount} Live</span>
                  )}
                  {c.classworkCount > 0 && (
                    <span style={S.tagClasswork}>💻 {c.classworkCount} Classwork</span>
                  )}
                  {c.homeworkCount > 0 && (
                    <span style={S.tagHomework}>📝 {c.homeworkCount} Homework</span>
                  )}
                  {c.bossCount > 0 && (
                    <span style={S.tagBoss}>⚔️ {c.bossCount} Boss</span>
                  )}
                </div>

                <div style={S.cardFooter}>
                  <span style={S.pointsText}>⭐ {c.totalPoints} pts</span>
                  <span style={S.moduleCount}>{c.moduleCount} modules</span>
                </div>
                {isStudent && user?.id && (
                  <button
                    onClick={(e) => toggleEnroll(c, e)}
                    disabled={busyId === c.id}
                    style={{
                      width: "100%", marginTop: 14, padding: "9px 0", borderRadius: 8,
                      fontSize: 13, fontWeight: 700, cursor: busyId === c.id ? "wait" : "pointer",
                      border: "none", transition: "all 0.15s",
                      background: enrolledIds.has(c.id) ? "rgba(248,113,113,0.14)" : "linear-gradient(135deg,#3ECF8E,#22B07D)",
                      color: enrolledIds.has(c.id) ? "#F87171" : "#fff",
                    }}
                  >
                    {busyId === c.id ? "..." : enrolledIds.has(c.id) ? "✓ Enrolled — Click to Unenroll" : "📥 Enroll Now"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const makeStyles = (t, isDark) => ({
  page: { minHeight: "100vh", background: t.bg, color: t.txt, fontFamily: "Inter,sans-serif", transition: "background 0.3s, color 0.3s" },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 32px", borderBottom: `1px solid ${t.border}`,
    background: isDark ? "rgba(9,9,11,0.92)" : "rgba(250,250,250,0.92)",
    backdropFilter: "blur(6px)", position: "sticky", top: 0, zIndex: 100,
  },
  navLeft: { display: "flex", alignItems: "center", gap: 16 },
  backLink: { color: t.txtDim, textDecoration: "none", fontSize: 13 },
  brand: { fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700 },
  manageBtn: {
    background: "transparent", border: `1px solid ${t.border}`, color: t.txt,
    padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  main: { maxWidth: 1100, margin: "0 auto", padding: "40px 32px" },
  loading: { textAlign: "center", padding: 60, color: t.txtDim },
  empty: { textAlign: "center", padding: 80 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 },
  card: {
    background: t.card, border: `1px solid ${t.border}`, borderRadius: 12,
    padding: "20px 22px", cursor: "pointer", transition: "border-color 0.2s, background 0.3s",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  courseIcon: { fontSize: 28 },
  deleteBtn: {
    background: "transparent", border: "none", color: "#F87171", fontSize: 16,
    cursor: "pointer", padding: 4, opacity: 0.5,
  },
  cardTitle: { fontSize: 17, fontWeight: 600, marginBottom: 4, color: t.txt },
  cardDesc: { fontSize: 13, color: t.txtSec, lineHeight: 1.5, marginBottom: 12 },

  moduleBreakdown: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tagLive: { fontSize: 11, fontWeight: 600, color: "#F87171", background: "#F8717118", padding: "3px 8px", borderRadius: 6 },
  tagClasswork: { fontSize: 11, fontWeight: 600, color: "#38BDF8", background: "#38BDF818", padding: "3px 8px", borderRadius: 6 },
  tagHomework: { fontSize: 11, fontWeight: 600, color: "#FFB238", background: "#FFB23818", padding: "3px 8px", borderRadius: 6 },
  tagBoss: { fontSize: 11, fontWeight: 600, color: "#F472B6", background: "#F472B618", padding: "3px 8px", borderRadius: 6 },

  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  pointsText: { fontSize: 12, fontWeight: 600, color: "#FF5A1F" },
  moduleCount: { fontSize: 12, color: t.txtDim },
});