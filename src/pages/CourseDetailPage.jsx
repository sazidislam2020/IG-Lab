import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSubscription, isModuleGated } from "../hooks/useSubscription";
import { supabase } from "../lib/supabase";
import CertificateView, { CertificateBlockedView } from "../components/CertificateView";

const MODULE_ICONS = {
  live: "📡",
  classwork: "💻",
  homework: "📝",
  boss: "⚔️",
};

const MODULE_COLORS = {
  live: { color: "#F87171", bg: "#F8717118" },
  classwork: { color: "#38BDF8", bg: "#38BDF818" },
  homework: { color: "#FFB238", bg: "#FFB23818" },
  boss: { color: "#F472B6", bg: "#F472B618" },
};

const MODULE_LABELS = {
  live: "Live Sessions",
  classwork: "Classwork",
  homework: "Homework",
  boss: "Boss Exam",
};

const ACCENT = "#FF6B2B";

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { profile, isAdmin, isSuperAdmin, isTeacher, user } = useAuth();
  const { isDark, colors: t } = useTheme();
  const { isFree, isPaid, loading: subLoading } = useSubscription(user?.id);

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollCount, setEnrollCount] = useState(0);
  const [busyEnroll, setBusyEnroll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [certBlock, setCertBlock] = useState(null);

  const canManage = isAdmin || isSuperAdmin;
  const isStudent = !canManage && !isTeacher;
  // Course-level free flag overrides everything — whole course is free
  const courseIsFree = course?.is_free === true;
  const showPaywall = isStudent && !courseIsFree && isFree && !subLoading;

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  async function loadCourse() {
    setLoading(true);

    const { data: c } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (!c) { navigate("/courses"); return; }
    setCourse(c);

    // Load modules with tasks
    // NOTE: the FK hint must be the real constraint name (module_tasks_task_id_fkey).
    // A wrong hint makes the WHOLE query fail with PGRST200, showing "No modules yet".
    const { data: mods, error: modsErr } = await supabase
      .from("course_modules")
      .select(`
        *,
        module_tasks!module_tasks_module_id_fkey (
          task_id, task_order,
          tasks!module_tasks_task_id_fkey (*)
        )
      `)
      .eq("course_id", courseId)
      .order("module_order");
    if (modsErr) console.error("Load modules error:", modsErr.message);

    // Load user submissions to check completion
    const { data: subs } = await supabase
      .from("submissions")
      .select("task_id, passed")
      .eq("user_id", profile.id)
      .eq("passed", true);

    const completed = new Set((subs || []).map((s) => s.task_id));
    setCompletedTasks(completed);

    // Enrollment state
    if (user?.id) {
      const { data: myEnroll } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();
      setIsEnrolled(!!myEnroll);

      // Certificate state for this user + course
      const { data: cert } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();
      setCertificate(cert || null);

      const { data: block } = await supabase
        .from("certificate_blocks")
        .select("reason")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();
      setCertBlock(block || null);
    }
    const { data: countData } = await supabase
      .from("course_enrollments")
      .select("id")
      .eq("course_id", courseId);
    setEnrollCount((countData || []).length);

    // Process modules
    const processed = (mods || []).map((m) => {
      const tasks = (m.module_tasks || [])
        .sort((a, b) => a.task_order - b.task_order)
        .map((mt) => mt.tasks)
        .filter(Boolean);

      const completedCount = tasks.filter((t) => completed.has(t.id)).length;
      const totalTasks = tasks.length;

      return { ...m, tasks, completedCount, totalTasks };
    });

    setModules(processed);
    setLoading(false);
  }

  function getModuleProgress(mod) {
    if (mod.totalTasks === 0) return 0;
    return Math.round((mod.completedCount / mod.totalTasks) * 100);
  }

  function isModuleUnlocked(mod) {
    // Admins/teachers always have access
    if (!isStudent) return true;

    // Whole course is free → everything unlocked
    if (courseIsFree) return true;

    // Free modules are always unlocked
    if (mod.is_free === true) return true;

    // Gated modules need subscription
    if (isModuleGated(mod) && isFree) return false;

    // Boss modules require all previous modules to be completed
    if (mod.module_type === "boss") {
      const prevModules = modules.filter((m) => m.module_order < mod.module_order);
      return prevModules.every((m) => getModuleProgress(m) === 100);
    }

    // Other modules: previous module must be started
    const prevModule = modules.find((m) => m.module_order === mod.module_order - 1);
    if (!prevModule) return true;
    return prevModule.completedCount > 0;
  }

  async function toggleEnroll() {
    if (!user?.id || !course) return;
    setBusyEnroll(true);
    if (isEnrolled) {
      await supabase.from("course_enrollments").delete().eq("user_id", user.id).eq("course_id", course.id);
      setIsEnrolled(false);
      setEnrollCount((n) => Math.max(0, n - 1));
    } else {
      const { error } = await supabase.from("course_enrollments").insert({ user_id: user.id, course_id: course.id });
      if (!error) {
        setIsEnrolled(true);
        setEnrollCount((n) => n + 1);
      }
    }
    setBusyEnroll(false);
  }

  function handleModuleClick(mod) {
    if (!isModuleUnlocked(mod)) {
      if (isModuleGated(mod) && isFree && !courseIsFree) {
        navigate("/payment");
      }
      return;
    }

    if (mod.module_type === "live") {
      navigate(`/classes?module=${mod.id}`);
    } else {
      const incompleteTask = mod.tasks.find((t) => !completedTasks.has(t.id));
      const task = incompleteTask || mod.tasks[0];
      if (task) {
        navigate(`/tasks/${task.id}`);
      }
    }
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", color: t.txtDim }}><p>Loading course...</p></div>;
  }

  if (!course) {
    return <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", color: t.txtDim }}><p>Course not found</p></div>;
  }

  // Group modules by type
  const grouped = {};
  for (const mod of modules) {
    if (!grouped[mod.module_type]) grouped[mod.module_type] = [];
    grouped[mod.module_type].push(mod);
  }

  const typeOrder = ["live", "classwork", "homework", "boss"];

  // Count free vs paid modules (based on admin's is_free toggle)
  const freeModuleCount = modules.filter((m) => m.is_free === true).length;
  const paidModuleCount = modules.filter((m) => m.is_free === false).length;

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.txt, fontFamily: "'Inter',sans-serif", transition: "background 0.3s, color 0.3s" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: `1px solid ${t.border}`, background: isDark ? "rgba(9,9,11,0.92)" : "rgba(250,250,250,0.92)", backdropFilter: "blur(6px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link to="/courses" style={{ color: t.txtDim, textDecoration: "none", fontSize: 13 }}>← Courses</Link>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: t.txt }}>{course.title}</span>
        </div>
        {canManage && (
          <button onClick={() => navigate("/admin/courses")} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.txt, padding: "8px 18px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
            ⚙ Edit Course
          </button>
        )}
      </nav>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 32px" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6, color: t.txt }}>
                {course.title}
                {courseIsFree ? (
                  <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 700, color: "#4ADE80", background: "rgba(74,222,128,0.12)", padding: "4px 12px", borderRadius: 100, verticalAlign: "middle" }}>🆓 FREE COURSE</span>
                ) : (
                  <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 700, color: ACCENT, background: `${ACCENT}18`, padding: "4px 12px", borderRadius: 100, verticalAlign: "middle" }}>💳 PREMIUM</span>
                )}
              </h1>
              <p style={{ fontSize: 15, color: t.txtSec, lineHeight: 1.6 }}>{course.description}</p>
              {enrollCount > 0 && <p style={{ fontSize: 12, color: t.txtDim, marginTop: 6 }}>👥 {enrollCount} student{enrollCount !== 1 ? "s" : ""} enrolled</p>}
            </div>
            {user?.id && (
              <button
                onClick={toggleEnroll}
                disabled={busyEnroll}
                style={{
                  background: isEnrolled ? "transparent" : ACCENT,
                  border: isEnrolled ? `1px solid ${ACCENT}50` : "none",
                  color: isEnrolled ? ACCENT : "#fff",
                  padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 700,
                  cursor: busyEnroll ? "wait" : "pointer", whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}
              >
                {busyEnroll ? "..." : isEnrolled ? "✓ Enrolled · Unenroll" : "📥 Enroll in Course"}
              </button>
            )}
          </div>

          {/* Module count summary */}
          {modules.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              {freeModuleCount > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600, color: "#4ADE80", background: "rgba(74,222,128,0.12)", padding: "4px 12px", borderRadius: 100 }}>
                  🆓 {freeModuleCount} free
                </span>
              )}
              {paidModuleCount > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600, color: ACCENT, background: `${ACCENT}18`, padding: "4px 12px", borderRadius: 100 }}>
                  🔒 {paidModuleCount} premium
                </span>
              )}
            </div>
          )}
        </div>

        {/* Paywall Banner — only for free students */}
        {showPaywall && paidModuleCount > 0 && (
          <div style={{ background: `linear-gradient(135deg, ${ACCENT}14, ${ACCENT}08)`, border: `1px solid ${ACCENT}30`, borderRadius: 14, padding: "24px 28px", marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: t.txt, marginBottom: 4 }}>
                  🔓 Unlock All {modules.length} Modules
                </h3>
                <p style={{ fontSize: 14, color: t.txtSec, lineHeight: 1.5 }}>
                  You have free access to {freeModuleCount} free module{freeModuleCount !== 1 ? "s" : ""}. Upgrade to unlock all {paidModuleCount} premium module{paidModuleCount !== 1 ? "s" : ""} with unlimited sandbox, certificates, and more.
                </p>
              </div>
              <button
                onClick={() => navigate("/payment")}
                style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "opacity 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                Upgrade Now →
              </button>
            </div>
          </div>
        )}

        {/* Certificate section — always visible, visual only, no download */}
        {isStudent && modules.length > 0 && (() => {
          const totalTasks = modules.reduce((s, m) => s + m.totalTasks, 0);
          const doneTasks = modules.reduce((s, m) => s + m.completedCount, 0);
          const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
          const isComplete = pct === 100;
          const certDisabled = course?.certificate_enabled === false;

          return (
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>🏆</span>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: t.txt, margin: 0 }}>Course Certificate</h2>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 100,
                    background: certificate
                      ? "rgba(74,222,128,0.12)"
                      : certBlock
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(255,255,255,0.06)",
                    color: certificate ? "#4ADE80" : certBlock ? "#F87171" : t.txtDim,
                  }}
                >
                  {certificate
                    ? "✓ Earned"
                    : certBlock
                    ? "🚫 Not available"
                    : certDisabled
                    ? "Disabled"
                    : `🎓 ${pct}% complete`}
                </span>
              </div>

              {certificate ? (
                <>
                  <CertificateView
                    studentName={certificate.student_name}
                    courseName={certificate.course_name}
                    completionDate={certificate.earned_at}
                    totalPoints={certificate.total_points}
                    certificateId={certificate.certificate_id}
                    compact
                  />
                  <p style={{ fontSize: 12, color: t.txtDim, textAlign: "center", marginTop: 12 }}>
                    🎓 Congratulations! This certificate is displayed for viewing. Ask your administrator for the official copy.
                  </p>
                </>
              ) : certBlock ? (
                <CertificateBlockedView reason={certBlock.reason} courseName={course?.title} />
              ) : certDisabled ? (
                <div style={{ textAlign: "center", padding: "24px 16px", color: t.txtDim, fontSize: 14 }}>
                  🔒 Certificates are currently not offered for this course.
                </div>
              ) : (
                /* Locked preview — student sees the certificate they're working toward */
                <div style={{ position: "relative" }}>
                  <div style={{ filter: "blur(2px) brightness(0.55)", pointerEvents: "none", userSelect: "none" }}>
                    <CertificateView
                      studentName={profile?.full_name || profile?.email || "Your Name"}
                      courseName={course?.title || "Course"}
                      completionDate={new Date().toISOString()}
                      totalPoints={0}
                      certificateId="IL-••••-••••-••••••"
                      compact
                    />
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 34 }}>🔒</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", textAlign: "center" }}>
                      Complete all tasks to earn this certificate
                    </div>
                    <div style={{ width: "60%", maxWidth: 320 }}>
                      <div style={{ height: 8, background: "rgba(255,255,255,0.15)", borderRadius: 4, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: isComplete ? "#4ADE80" : "linear-gradient(90deg,#FF6B2B,#F59E0B)",
                            borderRadius: 4,
                            transition: "width 0.4s",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 6, fontWeight: 600 }}>
                        {doneTasks}/{totalTasks} tasks — {pct}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {modules.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: t.txtDim }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <p>No modules yet. {canManage ? "Go to Course Management to add modules." : ""}</p>
          </div>
        ) : (
          typeOrder.map((type) => {
            const typeModules = grouped[type];
            if (!typeModules || typeModules.length === 0) return null;
            const colors = MODULE_COLORS[type];

            return (
              <div key={type} style={{ marginBottom: 36 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, background: colors.bg, color: colors.color }}>
                    {MODULE_ICONS[type]}
                  </span>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: t.txt }}>{MODULE_LABELS[type]}</h2>
                    <p style={{ fontSize: 12, color: t.txtDim }}>{typeModules.length} module{typeModules.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {typeModules.map((mod) => {
                    const unlocked = isModuleUnlocked(mod);
                    const progress = getModuleProgress(mod);
                    const isComplete = progress === 100;
                    const gated = isModuleGated(mod) && isFree && isStudent && !courseIsFree;

                    return (
                      <div
                        key={mod.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: t.card,
                          border: `1px solid ${isComplete ? "#4ADE8040" : unlocked ? colors.color + "30" : t.border}`,
                          borderRadius: 10,
                          padding: "14px 18px",
                          transition: "all 0.15s",
                          opacity: unlocked ? 1 : gated ? 0.75 : 0.45,
                          cursor: unlocked ? "pointer" : gated ? "pointer" : "not-allowed",
                        }}
                        onClick={() => handleModuleClick(mod)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
                          <div style={{ fontSize: 22, width: 36, textAlign: "center", flexShrink: 0 }}>
                            {isComplete ? "✅" : gated ? "🔒" : unlocked ? MODULE_ICONS[type] : "🔒"}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: t.txt, marginBottom: 2 }}>{mod.title}</div>
                            {mod.description && (
                              <div style={{ fontSize: 12, color: t.txtDim, marginBottom: 4 }}>{mod.description}</div>
                            )}
                            <div style={{ display: "flex", gap: 12, fontSize: 11, color: t.txtDim }}>
                              {mod.points_value > 0 && <span>⭐ {mod.points_value} pts</span>}
                              {mod.totalTasks > 0 && (
                                <span>{mod.completedCount}/{mod.totalTasks} tasks</span>
                              )}
                              {mod.module_type === "live" && (
                                <span style={{ color: "#F87171" }}>📹 Video Call</span>
                              )}
                              {gated && (
                                <span style={{ color: ACCENT, fontWeight: 600 }}>💳 Upgrade required</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, minWidth: 80 }}>
                          {progress > 0 && (
                            <div style={{ width: 80, height: 4, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${progress}%`, background: isComplete ? "#4ADE80" : colors.color, borderRadius: 2, transition: "width 0.3s" }} />
                            </div>
                          )}
                          {gated ? (
                            <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>Unlock →</span>
                          ) : (
                            <span style={{ fontSize: 12, color: isComplete ? "#4ADE80" : colors.color, fontWeight: 600 }}>
                              {progress}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
