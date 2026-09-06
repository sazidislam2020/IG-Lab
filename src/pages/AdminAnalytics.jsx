import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";

export default function AdminAnalytics() {
  const { colors: t } = useTheme();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalSubmissions: 0,
    passedSubmissions: 0,
    totalPoints: 0,
    totalRevenue: 0,
  });
  const [courseStats, setCourseStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    setLoading(true);

    // 1. Users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const { count: pendingApprovals } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    // 2. Courses
    const { count: totalCourses } = await supabase
      .from("courses")
      .select("id", { count: "exact", head: true });

    // 3. Enrollments
    const { count: totalEnrollments } = await supabase
      .from("course_enrollments")
      .select("id", { count: "exact", head: true });

    // 4. Submissions
    const { count: totalSubmissions } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true });

    const { count: passedSubmissions } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("passed", true);

    // 5. Total points
    const { data: pointsData } = await supabase
      .from("points_ledger")
      .select("points");
    const totalPoints = (pointsData || []).reduce((sum, p) => sum + p.points, 0);

    // 6. Revenue (from subscriptions)
    const { data: subsData } = await supabase
      .from("subscriptions")
      .select("amount");
    const totalRevenue = (subsData || []).reduce((sum, s) => sum + (s.amount || 0), 0);

    setStats({
      totalUsers: totalUsers || 0,
      pendingApprovals: pendingApprovals || 0,
      totalCourses: totalCourses || 0,
      totalEnrollments: totalEnrollments || 0,
      totalSubmissions: totalSubmissions || 0,
      passedSubmissions: passedSubmissions || 0,
      totalPoints,
      totalRevenue,
    });

    // 7. Course stats
    const { data: courses } = await supabase
      .from("courses")
      .select("id, title, is_free");

    const courseStatsArr = [];
    for (const course of courses || []) {
      const { count: enrollments } = await supabase
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", course.id);

      courseStatsArr.push({
        ...course,
        enrollments: enrollments || 0,
      });
    }
    courseStatsArr.sort((a, b) => b.enrollments - a.enrollments);
    setCourseStats(courseStatsArr);

    // 8. Recent activity (last 10 submissions)
    const { data: recentSubs } = await supabase
      .from("submissions")
      .select("*, profiles:user_id(full_name, email), tasks!inner(title)")
      .order("created_at", { ascending: false })
      .limit(10);

    setRecentActivity(recentSubs || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", color: t.txtDim }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12, animation: "spin 1s linear infinite" }}>📊</div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  const passRate = stats.totalSubmissions > 0
    ? Math.round((stats.passedSubmissions / stats.totalSubmissions) * 100)
    : 0;

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.txt, fontFamily: "'Inter',sans-serif" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: `1px solid ${t.border}`, background: t.bg === "#FAFAFA" ? "rgba(255,255,255,0.92)" : "rgba(10,14,22,0.92)", backdropFilter: "blur(6px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/dashboard" style={{ color: t.txtSec, textDecoration: "none", fontSize: 13 }}>← Dashboard</Link>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700 }}>📊 Analytics</h1>
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px" }}>
        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
          <StatCard icon="👥" value={stats.totalUsers} label="Total Users" color="#38BDF8" t={t} />
          <StatCard icon="⏳" value={stats.pendingApprovals} label="Pending Approvals" color="#FACC15" t={t} />
          <StatCard icon="📚" value={stats.totalCourses} label="Courses" color="#A78BFA" t={t} />
          <StatCard icon="📋" value={stats.totalEnrollments} label="Enrollments" color="#4ADE80" t={t} />
          <StatCard icon="✅" value={`${passRate}%`} label="Pass Rate" color="#FF6B2B" t={t} />
          <StatCard icon="⭐" value={stats.totalPoints.toLocaleString()} label="Points Earned" color="#FFB238" t={t} />
          <StatCard icon="💰" value={`৳${stats.totalRevenue.toLocaleString()}`} label="Revenue" color="#4ADE80" t={t} />
          <StatCard icon="📝" value={stats.totalSubmissions} label="Submissions" color="#22D3EE" t={t} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Course Enrollment Stats */}
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📚 Course Enrollments</h2>
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
              {courseStats.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: t.txtDim }}>No courses yet</div>
              ) : (
                courseStats.map((course, i) => (
                  <div key={course.id} style={{ padding: "14px 18px", borderBottom: i < courseStats.length - 1 ? `1px solid ${t.border}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: t.txt }}>{course.title}</div>
                      <div style={{ fontSize: 12, color: t.txtDim }}>
                        {course.is_free ? "Free" : "Paid"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#FF6B2B" }}>{course.enrollments}</div>
                      <div style={{ fontSize: 11, color: t.txtDim }}>enrolled</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>⚡ Recent Activity</h2>
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
              {recentActivity.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: t.txtDim }}>No activity yet</div>
              ) : (
                recentActivity.map((sub, i) => (
                  <div key={sub.id} style={{ padding: "12px 18px", borderBottom: i < recentActivity.length - 1 ? `1px solid ${t.border}` : "none", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 16 }}>{sub.passed ? "✅" : "❌"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.txt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {sub.profiles?.full_name || sub.profiles?.email || "Student"}
                      </div>
                      <div style={{ fontSize: 12, color: t.txtDim }}>{sub.tasks?.title || "Task"}</div>
                    </div>
                    <span style={{ fontSize: 12, color: t.txtDim, whiteSpace: "nowrap" }}>
                      {timeAgo(sub.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, value, label, color, t }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: t.txtDim, marginTop: 4 }}>{label}</div>
    </div>
  );
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
