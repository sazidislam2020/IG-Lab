import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabase";

export default function SubmissionReview() {
  const { profile, signOut } = useAuth();
  const { isDark, colors: t } = useTheme();
  const navigate = useNavigate();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | needs | passed | failed
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const canGrade = profile && ["teacher", "admin", "super_admin"].includes(profile.role);

  useEffect(() => {
    loadSubs();
  }, []);

  async function loadSubs() {
    setLoading(true);
    const { data } = await supabase
      .from("submissions")
      .select(`
        *,
        profiles!submissions_user_id_fkey(email, full_name),
        tasks!submissions_task_id_fkey(
          id, title, language, points_value, expected_output,
          levels!tasks_level_id_fkey(
            course_id,
            courses!levels_course_id_fkey(title)
          )
        )
      `)
      .order("created_at", { ascending: false });
    setSubs(data || []);
    setLoading(false);
  }

  function courseTitle(sub) {
    return sub.tasks?.levels?.courses?.title || "";
  }

  const filtered = subs.filter((s) => {
    if (filter === "needs") return s.passed === false && s.graded_by === "auto";
    if (filter === "passed") return s.passed === true;
    if (filter === "failed") return s.passed === false;
    return true;
  });

  async function grade(sub, passed) {
    if (!canGrade) return;
    setBusyId(sub.id);
    const now = new Date().toISOString();
    const task = sub.tasks || {};

    await supabase
      .from("submissions")
      .update({
        passed,
        points_awarded: passed ? task.points_value || 0 : 0,
        graded_by: "manual",
        reviewed_by: profile.id,
        reviewed_at: now,
        reviewer_note: passed
          ? "Manually approved by teacher"
          : "Manually marked failed by teacher",
      })
      .eq("id", sub.id);

    if (passed) {
      // Award points only if not already awarded for this submission
      const { data: existing } = await supabase
        .from("points_ledger")
        .select("id")
        .eq("submission_id", sub.id);
      if (!existing || existing.length === 0) {
        await supabase.from("points_ledger").insert({
          user_id: sub.user_id,
          submission_id: sub.id,
          points: task.points_value || 0,
          reason: "task_passed_manual",
        });
      }
    } else {
      // Revoke points if the submission was previously awarded
      await supabase.from("points_ledger").delete().eq("submission_id", sub.id);
    }

    setBusyId(null);
    loadSubs();
  }

  function handleSignOut() {
    signOut();
    window.location.href = "/login";
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.txt, fontFamily: "'Inter',sans-serif", transition: "background 0.3s, color 0.3s" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: `1px solid ${t.border}`, background: isDark ? "rgba(9,9,11,0.92)" : "rgba(250,250,250,0.92)", backdropFilter: "blur(6px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/dashboard" style={{ color: t.txtDim, textDecoration: "none", fontSize: 13 }}>← Dashboard</a>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700 }}>📝 Submission Review</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: t.txtSec }}>{profile?.email}</span>
          <button onClick={handleSignOut} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.txt, padding: "8px 16px", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>Sign out</button>
        </div>
      </nav>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: t.txt }}>Manual Evaluation</h1>
          <p style={{ fontSize: 14, color: t.txtSec, marginTop: 4 }}>
            Students have one attempt per task. Auto-grading runs instantly — review failed submissions and override the result when needed.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All" },
            { key: "needs", label: `⚠️ Needs Review (${subs.filter(s => s.passed === false && s.graded_by === "auto").length})` },
            { key: "passed", label: "✅ Passed" },
            { key: "failed", label: "❌ Failed" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 8,
                background: filter === f.key ? "#FF6B2B" : "transparent",
                border: filter === f.key ? "none" : `1px solid ${t.border}`,
                color: filter === f.key ? "#fff" : t.txtSec,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: t.txtDim }}>Loading submissions...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: t.txtDim }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p>No submissions here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((sub) => {
              const expanded = expandedId === sub.id;
              const isManual = sub.graded_by === "manual";
              return (
                <div key={sub.id} style={{ background: t.card, border: `1px solid ${sub.passed ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`, borderRadius: 12, overflow: "hidden" }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", cursor: "pointer", gap: 12, flexWrap: "wrap" }} onClick={() => setExpandedId(expanded ? null : sub.id)}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: t.txt }}>
                        {sub.tasks?.title || "Untitled Task"}
                        {courseTitle(sub) && <span style={{ fontSize: 12, color: t.txtDim, fontWeight: 400 }}> — {courseTitle(sub)}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: t.txtDim, marginTop: 2 }}>
                        👤 {sub.profiles?.full_name || sub.profiles?.email || "Unknown"} · {sub.tasks?.language || "?"} · {new Date(sub.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100,
                        background: sub.passed ? "rgba(74,222,128,0.14)" : "rgba(248,113,113,0.14)",
                        color: sub.passed ? "#4ADE80" : "#F87171",
                      }}>
                        {sub.passed ? "✅ Pass" : "❌ Fail"}
                      </span>
                      <span style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 100,
                        background: isManual ? "rgba(167,139,250,0.14)" : "rgba(56,189,248,0.14)",
                        color: isManual ? "#A78BFA" : "#38BDF8",
                      }}>
                        {isManual ? "👩‍🏫 Manual" : "🤖 Auto"}
                      </span>
                      <span style={{ fontSize: 12, color: sub.passed ? "#FF6B2B" : t.txtDim, fontWeight: 600, minWidth: 40, textAlign: "right" }}>
                        {sub.passed ? `+${sub.points_awarded}` : "0"}
                      </span>
                      <span style={{ fontSize: 14, color: t.txtDim }}>{expanded ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expanded && (
                    <div style={{ padding: "16px 18px", borderTop: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: t.txtDim, textTransform: "uppercase", marginBottom: 6 }}>Student code</div>
                          <pre style={{ background: "#0F1420", color: "#EDEFF3", border: `1px solid ${t.border}`, borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.6, overflow: "auto", maxHeight: 240, margin: 0, fontFamily: "'JetBrains Mono',monospace", whiteSpace: "pre-wrap" }}>{sub.code || "(empty)"}</pre>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: t.txtDim, textTransform: "uppercase", marginBottom: 6 }}>Program output</div>
                          <pre style={{ background: "#0F1420", color: sub.passed ? "#4ADE80" : "#F87171", border: `1px solid ${t.border}`, borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.6, overflow: "auto", maxHeight: 240, margin: 0, fontFamily: "'JetBrains Mono',monospace", whiteSpace: "pre-wrap" }}>{sub.output || "(no output)"}</pre>
                        </div>
                      </div>
                      {sub.tasks?.expected_output && (
                        <div style={{ fontSize: 12, color: t.txtSec, marginBottom: 16 }}>
                          <strong>Expected output:</strong> <code style={{ background: "rgba(62,207,142,0.1)", color: "#3ECF8E", padding: "2px 8px", borderRadius: 4 }}>{sub.tasks.expected_output}</code>
                        </div>
                      )}
                      {isManual && sub.reviewed_at && (
                        <div style={{ fontSize: 12, color: "#A78BFA", marginBottom: 16 }}>👩‍🏫 Reviewed by teacher {new Date(sub.reviewed_at).toLocaleString()} — {sub.reviewer_note || "Manual review"}</div>
                      )}
                      {canGrade && (
                        <div style={{ display: "flex", gap: 10 }}>
                          <button
                            onClick={() => grade(sub, true)}
                            disabled={busyId === sub.id}
                            style={{
                              background: "linear-gradient(135deg,#3ECF8E,#22B07D)", color: "#fff", border: "none",
                              borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: busyId === sub.id ? "wait" : "pointer",
                              opacity: busyId === sub.id ? 0.6 : 1,
                            }}
                          >
                            ✅ Mark Passed (+{sub.tasks?.points_value || 0} pts)
                          </button>
                          <button
                            onClick={() => grade(sub, false)}
                            disabled={busyId === sub.id}
                            style={{
                              background: "rgba(248,113,113,0.14)", color: "#F87171", border: "1px solid rgba(248,113,113,0.3)",
                              borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: busyId === sub.id ? "wait" : "pointer",
                            }}
                          >
                            ❌ Mark Failed
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}