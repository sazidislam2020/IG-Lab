import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSubscription } from "../hooks/useSubscription";
import SearchModal from "../components/SearchModal";

export default function Dashboard() {
  const { user, profile, signOut, isStudent, isTeacher, isAdmin, isSuperAdmin } = useAuth();
  const { toggleTheme, isDark, colors: t } = useTheme();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ totalPoints: 0, tasksPassed: 0, coursesEnrolled: 0, rank: 0 });
  const [courses, setCourses] = useState([]);
  const [recentSubs, setRecentSubs] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const { subscription, isFree, isPaid, loading: subLoading } = useSubscription(user?.id);

  const roleLabel = isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : isTeacher ? "Teacher" : "Student";
  const roleColor = isSuperAdmin ? "#FF5A1F" : isAdmin ? "#FFB238" : isTeacher ? "#22D3EE" : "#4ADE80";

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user?.id]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function loadDashboardData() {
    setLoading(true);

    // 1. Points
    const { data: points } = await supabase
      .from("points_ledger")
      .select("points")
      .eq("user_id", user.id);
    const totalPoints = (points || []).reduce((sum, p) => sum + p.points, 0);

    // 2. Submissions (tasks passed + recent)
    const { data: subs } = await supabase
      .from("submissions")
      .select("*, tasks!inner(title, language, levels!inner(title, course_id, courses!inner(title)))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const tasksPassed = (subs || []).filter((s) => s.passed).length;
    setRecentSubs((subs || []).slice(0, 5));

    // 3. Course progress
    // Students only see courses they've enrolled in; staff see all.
    let enrolledCourseIds = null;
    if (isStudent) {
      const { data: enrolls } = await supabase
        .from("course_enrollments")
        .select("course_id")
        .eq("user_id", user.id);
      enrolledCourseIds = new Set((enrolls || []).map((e) => e.course_id));
    }

    const { data: allCourses } = await supabase
      .from("courses")
      .select("*, course_modules!course_modules_course_id_fkey(id, module_type, title, module_order, points_value, module_tasks!module_tasks_module_id_fkey(task_id))");

    const courseProgress = [];
    for (const course of allCourses || []) {
      if (enrolledCourseIds && !enrolledCourseIds.has(course.id)) continue;
      const modules = course.course_modules || [];
      let totalTasks = 0;
      let completedTasks = 0;
      let totalModulePoints = 0;

      for (const mod of modules) {
        const tasks = mod.module_tasks || [];
        totalTasks += tasks.length;
        totalModulePoints += mod.points_value || 0;
        for (const mt of tasks) {
          const hasPassed = (subs || []).some((s) => s.task_id === mt.task_id && s.passed);
          if (hasPassed) completedTasks++;
        }
      }

      if (modules.length > 0) {
        courseProgress.push({
          id: course.id,
          title: course.title,
          description: course.description,
          is_free: course.is_free,
          totalTasks,
          completedTasks,
          totalPoints: totalModulePoints,
          percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          moduleCount: modules.length,
        });
      }
    }
    setCourses(courseProgress);
    const coursesEnrolled = courseProgress.length;

    // 4. Leaderboard rank
    const { data: allStudents } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "student")
      .eq("status", "approved");

    const ranked = [];
    for (const s of allStudents || []) {
      const { data: pts } = await supabase
        .from("points_ledger")
        .select("points")
        .eq("user_id", s.id);
      const total = (pts || []).reduce((sum, p) => sum + p.points, 0);
      ranked.push({ id: s.id, total });
    }
    ranked.sort((a, b) => b.total - a.total);
    const rank = ranked.findIndex((s) => s.id === user.id) + 1;

    // 5. Top 3 leaderboard
    setTopStudents(ranked.slice(0, 5).map((s, i) => ({ ...s, rank: i + 1 })));

    // 6. Upcoming live classes (future scheduled OR currently marked live)
    const { data: classes } = await supabase
      .from("live_classes")
      .select("id, title, scheduled_at, status, subject, profiles!live_classes_host_id_fkey(email, full_name)")
      .or(`scheduled_at.gte.${new Date().toISOString()},status.eq.live`)
      .order("scheduled_at", { ascending: true })
      .limit(3);
    setUpcomingClasses(classes || []);

    setStats({ totalPoints, tasksPassed, coursesEnrolled, rank });
    setLoading(false);
  }

  async function handleSignOut() {
    try {
      await signOut();
      navigate("/login");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", color: t.txtDim }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12, animation: "spin 1s linear infinite" }}>⚙️</div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    <div className="dashboard-page" style={{ minHeight: "100vh", background: t.bg, color: t.txt, fontFamily: "'Inter', system-ui, sans-serif", transition: "background 0.3s, color 0.3s" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", borderBottom: `1px solid ${t.border}`, background: isDark ? "rgba(9,9,11,0.92)" : "rgba(250,250,250,0.92)", backdropFilter: "blur(6px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate("/dashboard")}>
          <span style={{ width: 9, height: 9, background: "#FF6B2B", borderRadius: 2, transform: "rotate(45deg)", boxShadow: "0 0 10px #FF6B2B" }} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: t.txt }}>IGNITE LAB</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: roleColor, border: `1px solid ${roleColor}40`, background: `${roleColor}14`, padding: "4px 10px", borderRadius: 100 }}>{roleLabel}</span>
          <button onClick={() => setSearchOpen(true)} style={{ background: t.card, border: `1px solid ${t.border}`, color: t.txtDim, padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            🔍 <span style={{ opacity: 0.5 }}>Search...</span> <span style={{ background: t.border, padding: "1px 5px", borderRadius: 3, fontSize: 10 }}>⌘K</span>
          </button>
          <span style={{ fontSize: 13, color: t.txtSec }}>{profile?.full_name?.split(" ")[0] || profile?.email}</span>
          <button onClick={toggleTheme} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.txt, padding: "6px 8px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" }} title={isDark ? "Light mode" : "Dark mode"}>
            {isDark ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          <button onClick={handleSignOut} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.txt, padding: "6px 14px", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>Sign out</button>
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px" }}>
        {/* Hero Welcome */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 700, marginBottom: 6, color: t.txt }}>
            {greeting}, {profile?.full_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p style={{ color: t.txtSec, fontSize: 16, lineHeight: 1.6, maxWidth: 600 }}>
            {isStudent && "Ready to code? Jump into your courses or pick up where you left off."}
            {isTeacher && "Manage your students, assign tasks, and track progress."}
            {isAdmin && !isSuperAdmin && "Manage courses, teachers, and student approvals."}
            {isSuperAdmin && "Full platform control — approve users, manage admins, and view analytics."}
          </p>
        </div>

        {/* Subscription Banner — only for free students */}
        {isStudent && !subLoading && isFree && (
          <div style={{ background: "linear-gradient(135deg, #FF6B2B14, #FF6B2B08)", border: "1px solid #FF6B2B30", borderRadius: 14, padding: "20px 24px", marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>🔓</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: t.txt, marginBottom: 2 }}>You're on the free Explorer plan</div>
                <div style={{ fontSize: 13, color: t.txtSec }}>Level 0 is free — upgrade to unlock all course content</div>
              </div>
            </div>
            <button
              onClick={() => navigate("/payment")}
              style={{ background: "#FF6B2B", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Upgrade Now →
            </button>
          </div>
        )}

        {/* Current Plan Badge — for paid students */}
        {isStudent && !subLoading && isPaid && subscription && (
          <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 14, padding: "14px 20px", marginBottom: 28, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <span style={{ fontSize: 14, color: t.txt }}>
              <strong style={{ color: "#4ADE80" }}>{subscription.plan_name}</strong> — All content unlocked
              {subscription.expires_at && (
                <span style={{ color: t.txtDim, marginLeft: 8 }}>(expires {new Date(subscription.expires_at).toLocaleDateString()})</span>
              )}
            </span>
          </div>
        )}

        {/* Stats Row */}
        {isStudent && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 36 }}>
            <StatCard icon="⭐" value={stats.totalPoints} label="Total Points" color="#FF6B2B" t={t} />
            <StatCard icon="✅" value={stats.tasksPassed} label="Tasks Passed" color="#4ADE80" t={t} />
            <StatCard icon="📚" value={stats.coursesEnrolled} label="Courses" color="#38BDF8" t={t} />
            <StatCard icon="🏆" value={stats.rank > 0 ? `#${stats.rank}` : "—"} label="Leaderboard" color="#A78BFA" t={t} />
          </div>
        )}

        {/* Two-column layout */}
        <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: isStudent ? "1fr 380px" : "1fr", gap: 24 }}>
          {/* Left column */}
          <div>
            {/* Course Progress */}
            {isStudent && (
              <section style={{ marginBottom: 32 }}>
                <SectionHeader title="📊 My Courses" t={t} action={courses.length > 0 ? { label: "View all →", onClick: () => navigate("/courses") } : null} />
                {courses.length === 0 ? (
                  <EmptyCard message="No courses yet" action="Browse courses to get started" onClick={() => navigate("/courses")} t={t} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {courses.map((c) => (
                      <CourseCard key={c.id} course={c} t={t} isDark={isDark} onClick={() => navigate(`/courses/${c.id}`)} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Quick Actions */}
            <section style={{ marginBottom: 32 }}>
              <SectionHeader title="⚡ Quick Actions" t={t} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {isStudent && (
                  <>
                    <ActionCard icon="💻" title="Code Sandbox" desc="Write & run code" color="#FF6B2B" t={t} onClick={() => navigate("/sandbox")} />
                    <ActionCard icon="🤖" title="Robot Sim" desc="3D robot control" color="#22D3EE" t={t} onClick={() => navigate("/simulation")} />
                    <ActionCard icon="📡" title="Live Classes" desc="Join a session" color="#F87171" t={t} onClick={() => navigate("/classes")} />
                    <ActionCard icon="📂" title="Projects" desc="Build with any stack" color="#A78BFA" t={t} onClick={() => navigate("/projects")} />
                    <ActionCard icon="🏆" title="Leaderboard" desc="See your rank" color="#FACC15" t={t} onClick={() => navigate("/leaderboard")} />
                    <ActionCard icon="👤" title="Profile" desc="View your stats" color="#4ADE80" t={t} onClick={() => navigate("/profile")} />
                    {isFree && <ActionCard icon="💳" title="Upgrade" desc="Unlock all courses" color="#FF6B2B" t={t} onClick={() => navigate("/payment")} />}
                  </>
                )}
                {isTeacher && (
                  <>
                    <ActionCard icon="👥" title="Students" desc="Manage accounts" color="#22D3EE" t={t} onClick={() => navigate("/teacher")} />
                    <ActionCard icon="📝" title="Review Submissions" desc="Grade one-attempt tasks" color="#A78BFA" t={t} onClick={() => navigate("/teacher/review")} />
                    <ActionCard icon="📡" title="Start Call" desc="Live video session" color="#F87171" t={t} onClick={() => navigate("/classes/create")} />
                    <ActionCard icon="📝" title="Courses" desc="Manage content" color="#FF6B2B" t={t} onClick={() => navigate("/admin/courses")} />
                  </>
                )}
                {isAdmin && (
                  <>
                    <ActionCard icon="📡" title="Start Call" desc="Live video session" color="#F87171" t={t} onClick={() => navigate("/classes/create")} />
                    <ActionCard icon="📝" title="Courses" desc="Manage content" color="#FF6B2B" t={t} onClick={() => navigate("/admin/courses")} />
                    <ActionCard icon="🎨" title="Site Settings" desc="Customize site" color="#A78BFA" t={t} onClick={() => navigate("/admin/site-settings")} />
                    <ActionCard icon="📊" title="Analytics" desc="View stats" color="#38BDF8" t={t} onClick={() => navigate("/admin/analytics")} />
                  </>
                )}
                {isSuperAdmin && (
                  <>
                    <ActionCard icon="👥" title="User Management" desc="Manage all users" color="#FF5A1F" t={t} onClick={() => navigate("/admin/users")} />
                    <ActionCard icon="🔐" title="Approvals" desc="Review accounts" color="#FFB238" t={t} onClick={() => navigate("/admin/approvals")} />
                    <ActionCard icon="📋" title="Audit Log" desc="Review actions" color="#38BDF8" t={t} onClick={() => navigate("/admin/audit-log")} />
                    <ActionCard icon="🎨" title="Site Settings" desc="Customize site" color="#A78BFA" t={t} onClick={() => navigate("/admin/site-settings")} />
                    <ActionCard icon="📊" title="Analytics" desc="View stats" color="#38BDF8" t={t} onClick={() => navigate("/admin/analytics")} />
                  </>
                )}
              </div>
            </section>

            {/* Recent Activity */}
            {isStudent && (
              <section>
                <SectionHeader title="📝 Recent Activity" t={t} action={recentSubs.length > 0 ? { label: "View all →", onClick: () => navigate("/profile") } : null} />
                {recentSubs.length === 0 ? (
                  <EmptyCard message="No activity yet" action="Complete tasks to see your history here" t={t} />
                ) : (
                  <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={thStyle(t)}>Task</th>
                          <th style={thStyle(t)}>Course</th>
                          <th style={thStyle(t)}>Status</th>
                          <th style={thStyle(t)}>Points</th>
                          <th style={thStyle(t)}>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSubs.map((sub) => (
                          <tr key={sub.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                            <td style={tdStyle(t)}>{sub.tasks?.title || "—"}</td>
                            <td style={{ ...tdStyle(t), color: t.txtDim, fontSize: 13 }}>{sub.tasks?.levels?.courses?.title || "—"}</td>
                            <td style={tdStyle(t)}>
                              <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: sub.passed ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)", color: sub.passed ? "#4ADE80" : "#F87171" }}>
                                {sub.passed ? "✅ Pass" : "❌ Fail"}
                              </span>
                            </td>
                            <td style={{ ...tdStyle(t), color: sub.passed ? "#FF6B2B" : t.txtDim, fontWeight: 600, fontSize: 13 }}>
                              {sub.passed ? `+${sub.points_awarded}` : "—"}
                            </td>
                            <td style={{ ...tdStyle(t), color: t.txtDim, fontSize: 12, whiteSpace: "nowrap" }}>
                              {timeAgo(sub.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Right column (student only) */}
          {isStudent && (
            <div>
              {/* Leaderboard */}
              <section style={{ marginBottom: 24 }}>
                <SectionHeader title="🏆 Top Performers" t={t} action={{ label: "Full board →", onClick: () => navigate("/leaderboard") }} />
                <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px" }}>
                  {topStudents.length === 0 ? (
                    <p style={{ color: t.txtDim, fontSize: 14, textAlign: "center", padding: 20 }}>No data yet</p>
                  ) : (
                    topStudents.map((s, i) => {
                      const isMe = s.id === user?.id;
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                      return (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < topStudents.length - 1 ? `1px solid ${t.border}` : "none", background: isMe ? `${roleColor}08` : "transparent", borderRadius: 6, paddingLeft: isMe ? 8 : 0, paddingRight: isMe ? 8 : 0 }}>
                          <span style={{ width: 28, textAlign: "center", fontSize: medal ? 18 : 14, fontWeight: 700, color: t.txtDim }}>{medal || s.rank}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: isMe ? roleColor : t.txt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {isMe ? "You" : `Student ${s.rank}`}
                            </div>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#FF6B2B" }}>{s.total} pts</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Upcoming Classes */}
              <section>
                <SectionHeader title="📡 Upcoming Classes" t={t} action={{ label: "View all →", onClick: () => navigate("/classes") }} />
                <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px" }}>
                  {upcomingClasses.length === 0 ? (
                    <p style={{ color: t.txtDim, fontSize: 14, textAlign: "center", padding: 20 }}>No upcoming classes</p>
                  ) : (
                    upcomingClasses.map((cls, i) => (
                      <div key={cls.id} style={{ padding: "10px 0", borderBottom: i < upcomingClasses.length - 1 ? `1px solid ${t.border}` : "none", cursor: "pointer" }} onClick={() => navigate(`/classes/${cls.id}`)}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: t.txt, marginBottom: 4 }}>{cls.title}</div>
                        <div style={{ fontSize: 12, color: t.txtDim, display: "flex", gap: 8 }}>
                          {cls.subject && <span>{cls.subject}</span>}
                          <span>{cls.profiles?.full_name || cls.profiles?.email || "Instructor"}</span>
                          {cls.status === "live" ? (
                            <span style={{ color: "#F87171", fontWeight: 700 }}>● LIVE NOW</span>
                          ) : (
                            <span style={{ color: "#F87171" }}>● {formatDate(cls.scheduled_at)}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @media (max-width: 900px) {
          .dashboard-page nav { padding: 12px 16px !important; }
          .dashboard-page nav > div:last-child { gap: 6px !important; }
          .dashboard-page nav > div:last-child > span:first-child { display: none !important; }
          .dashboard-page main { padding: 24px 16px !important; }
          .dashboard-grid { grid-template-columns: 1fr !important; }
          .dashboard-page table { font-size: 12px !important; }
          .dashboard-page th:nth-child(2),
          .dashboard-page td:nth-child(2) { display: none !important; }
        }
        @media (max-width: 600px) {
          .dashboard-page th:nth-child(5),
          .dashboard-page td:nth-child(5) { display: none !important; }
        }
      `}</style>
    </div>
    </>
  );
}

/* ── Sub-components ── */

function StatCard({ icon, value, label, color, t }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px 18px", transition: "background 0.3s, border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: t.txtDim, marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function SectionHeader({ title, t, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: t.txt, margin: 0 }}>{title}</h2>
      {action && (
        <button onClick={action.onClick} style={{ background: "transparent", border: "none", color: "#FF6B2B", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

function CourseCard({ course, t, onClick, isDark }) {
  const c = course;
  const color = c.percentage === 100 ? "#4ADE80" : c.percentage > 50 ? "#38BDF8" : "#FF6B2B";

  return (
    <div
      onClick={onClick}
      style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 16 }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: t.txt, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
        <div style={{ fontSize: 12, color: t.txtDim, marginBottom: 10 }}>
          {c.completedTasks}/{c.totalTasks} tasks · {c.moduleCount} modules
          {c.is_free && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "#4ADE80", background: "rgba(74,222,128,0.12)", padding: "2px 8px", borderRadius: 100 }}>FREE</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 6, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${c.percentage}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 32, textAlign: "right" }}>{c.percentage}%</span>
        </div>
      </div>
      {c.totalPoints > 0 && (
        <span style={{ fontSize: 12, fontWeight: 600, color: "#FF6B2B", background: "rgba(255,107,43,0.1)", padding: "4px 10px", borderRadius: 6, whiteSpace: "nowrap" }}>⭐ {c.totalPoints}</span>
      )}
    </div>
  );
}

function ActionCard({ icon, title, desc, color, t, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 16px", cursor: "pointer", transition: "all 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: t.txt, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 12, color: t.txtDim }}>{desc}</div>
    </div>
  );
}

function EmptyCard({ message, action, onClick, t }) {
  return (
    <div
      onClick={onClick}
      style={{ background: t.card, border: `1px dashed ${t.border}`, borderRadius: 12, padding: "32px 24px", textAlign: "center", cursor: onClick ? "pointer" : "default", transition: "all 0.15s" }}
      onMouseEnter={onClick ? (e) => { e.currentTarget.style.borderColor = "#FF6B2B40"; } : undefined}
      onMouseLeave={onClick ? (e) => { e.currentTarget.style.borderColor = t.border; } : undefined}
    >
      <p style={{ fontSize: 15, fontWeight: 600, color: t.txtSec, marginBottom: 4 }}>{message}</p>
      <p style={{ fontSize: 13, color: t.txtDim }}>{action}</p>
    </div>
  );
}

/* ── Helpers ── */

function thStyle(t) {
  return { textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 600, letterSpacing: 0.8, color: t.txtDim, textTransform: "uppercase", borderBottom: `1px solid ${t.border}` };
}

function tdStyle(t) {
  return { padding: "10px 14px", fontSize: 14, color: t.txt };
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d - now;
  if (diff < 0) return "Past";
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Starting soon";
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}
