import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";
import DesignRenderer from "./DesignRenderer";
import { fetchActiveDesign, fetchSiteIdentity } from "../../lib/design/templates";
import { buildData, defaultCertificateDesign, defaultPosterDesign } from "../../lib/design/model";
import { exportPNG, exportPDF, shareDesign } from "../../lib/design/export";

const A = "#FF6B2B";

/**
 * CertificateSection — the student-facing certificate + congratulation poster
 * for a course. Renders the admin-designed certificate, handles pay-to-unlock
 * for paid certificates, download/share, and shows the poster once completed.
 *
 * Props:
 *   course, profile, certificate, certBlock, certDisabled,
 *   progress { pct, doneTasks, totalTasks, isComplete },
 *   onUnlocked(updatedCert)
 */
export default function CertificateSection({
  course,
  profile,
  certificate,
  certBlock,
  certDisabled,
  progress = {},
  onUnlocked,
}) {
  const { colors: t } = useTheme();
  const [certDesign, setCertDesign] = useState(null);
  const [posterDesign, setPosterDesign] = useState(null);
  const [identity, setIdentity] = useState({});
  const [completion, setCompletion] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    (async () => {
      const [cd, pd, id] = await Promise.all([
        fetchActiveDesign("certificate", course?.id),
        fetchActiveDesign("poster", course?.id),
        fetchSiteIdentity(),
      ]);
      setCertDesign(cd?.design || defaultCertificateDesign());
      setPosterDesign(pd?.design || defaultPosterDesign());
      setIdentity(id || {});
      // completion row (poster) — tolerate a missing table
      try {
        const { data } = await supabase
          .from("course_completions")
          .select("*")
          .eq("user_id", profile?.id)
          .eq("course_id", course?.id)
          .maybeSingle();
        setCompletion(data || null);
      } catch (_) {
        setCompletion(null);
      }
    })();
  }, [course?.id, profile?.id]);

  const { pct = 0, doneTasks = 0, totalTasks = 0, isComplete = false } = progress;

  const baseCert = certificate || {
    student_name: profile?.full_name || (profile?.email || "").split("@")[0] || "Student",
    course_name: course?.title || "Course",
    earned_at: completion?.completed_at || new Date().toISOString(),
    certificate_id: "—",
    total_points: completion?.total_points ?? 0,
  };

  const data = buildData({
    cert: baseCert,
    course,
    profile,
    site: identity,
  });

  const previewData = buildData({
    cert: {
      ...baseCert,
      certificate_id: "IL-••••-••••-••••••",
      total_points: 0,
    },
    course,
    profile,
    site: identity,
  });

  const isLocked = !!certificate && certificate.locked === true;
  const certPrice = Number(course?.certificate_price || 0);
  const completed = isComplete || !!completion || !!certificate;

  // Poster embeds the certificate only when it's actually earned/unlocked.
  const certForPoster = certificate && !isLocked ? certDesign : null;
  const posterData = data;

  async function payNow() {
    setPaying(true);
    setPayErr("");
    try {
      const { error } = await supabase.rpc("unlock_certificate", {
        p_course_id: course.id,
      });
      if (error) throw error;
      onUnlocked &&
        onUnlocked({ ...certificate, locked: false, unlocked_at: new Date().toISOString() });
    } catch (e) {
      setPayErr(e?.message || "Payment failed. Please try again.");
    }
    setPaying(false);
  }

  async function run(kind, which) {
    const key = which + kind;
    setBusy(key);
    try {
      if (which === "cert") {
        if (kind === "png") await exportPNG(certDesign, data, { filename: `${course?.title || "certificate"}-certificate`, certDesign: null });
        else if (kind === "pdf") await exportPDF(certDesign, data, { filename: `${course?.title || "certificate"}-certificate` });
        else await shareDesign(certDesign, data, { filename: `${course?.title || "certificate"}-certificate`, title: `Certificate — ${course?.title}` });
      } else {
        if (kind === "png") await exportPNG(posterDesign, posterData, { filename: `${course?.title || "course"}-congrats`, certDesign: certForPoster });
        else if (kind === "pdf") await exportPDF(posterDesign, posterData, { filename: `${course?.title || "course"}-congrats`, certDesign: certForPoster });
        else await shareDesign(posterDesign, posterData, { filename: `${course?.title || "course"}-congrats`, title: `I completed ${course?.title}!`, certDesign: certForPoster });
      }
    } catch (e) {
      alert("Export failed: " + (e?.message || e));
    }
    setBusy("");
  }

  const statusBadge = certificate
    ? isLocked
      ? { text: certPrice > 0 ? `🔒 Pay ৳${certPrice}` : "🔒 Locked", bg: "rgba(255,178,56,0.14)", color: "#FFB238" }
      : { text: "✓ Earned", bg: "rgba(74,222,128,0.12)", color: "#4ADE80" }
    : certBlock
    ? { text: "🚫 Not available", bg: "rgba(239,68,68,0.12)", color: "#F87171" }
    : certDisabled
    ? { text: "Disabled", bg: "rgba(255,255,255,0.06)", color: t.txtDim }
    : { text: `🎓 ${pct}% complete`, bg: "rgba(255,255,255,0.06)", color: t.txtDim };

  const btn = {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    padding: "9px 16px",
    borderRadius: 8,
    border: `1px solid ${t.border}`,
    background: t.surface,
    color: t.txt,
    cursor: "pointer",
  };
  const primary = { ...btn, background: A, color: "#fff", borderColor: A };

  if (!certDesign) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      {/* ── Certificate card ── */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 20 }}>🏆</span>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: t.txt, margin: 0 }}>Course Certificate</h2>
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: statusBadge.bg, color: statusBadge.color }}>
            {statusBadge.text}
          </span>
        </div>

        {certificate && !isLocked ? (
          <>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <DesignRenderer design={certDesign} data={data} width={Math.min(720, 640)} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              <button style={primary} disabled={busy === "certpng"} onClick={() => run("png", "cert")}>
                {busy === "certpng" ? "Rendering…" : "Download PNG"}
              </button>
              <button style={btn} disabled={busy === "certpdf"} onClick={() => run("pdf", "cert")}>
                {busy === "certpdf" ? "Rendering…" : "Download PDF"}
              </button>
              <button style={btn} disabled={busy === "certshare"} onClick={() => run("share", "cert")}>
                Share
              </button>
            </div>
          </>
        ) : certificate && isLocked ? (
          <>
            <div style={{ position: "relative" }}>
              <div style={{ filter: "blur(3px) brightness(0.5)", pointerEvents: "none", display: "flex", justifyContent: "center" }}>
                <DesignRenderer design={certDesign} data={data} width={Math.min(720, 640)} />
              </div>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div style={{ fontSize: 34 }}>🔒</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", textAlign: "center" }}>
                  Course completed — unlock your certificate
                </div>
                <button onClick={payNow} disabled={paying} style={{ ...primary, fontSize: 15, padding: "12px 28px" }}>
                  {paying ? "Processing…" : certPrice > 0 ? `Pay ৳${certPrice} to unlock` : "Unlock certificate"}
                </button>
                {payErr && <div style={{ fontSize: 12, color: "#FCA5A5", maxWidth: 320, textAlign: "center" }}>{payErr}</div>}
              </div>
            </div>
            <p style={{ fontSize: 12, color: t.txtDim, textAlign: "center", marginTop: 12 }}>
              One-time demo payment to unlock download & sharing for this certificate.
            </p>
          </>
        ) : certBlock ? (
          <div style={{ textAlign: "center", padding: "24px 16px" }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>🔒</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F87171", marginBottom: 6 }}>Certificate Not Available</div>
            <div style={{ fontSize: 13, color: t.txtSec, maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
              {certBlock.reason || `The certificate for "${course?.title}" is currently unavailable. Please contact your instructor.`}
            </div>
          </div>
        ) : certDisabled ? (
          <div style={{ textAlign: "center", padding: "24px 16px", color: t.txtDim, fontSize: 14 }}>
            🔒 Certificates are currently not offered for this course.
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <div style={{ filter: "blur(2px) brightness(0.55)", pointerEvents: "none", display: "flex", justifyContent: "center" }}>
              <DesignRenderer design={certDesign} data={previewData} width={Math.min(720, 640)} />
            </div>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ fontSize: 34 }}>🔒</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", textAlign: "center" }}>
                Complete all tasks to earn this certificate
              </div>
              <div style={{ width: "60%", maxWidth: 320 }}>
                <div style={{ height: 8, background: "rgba(255,255,255,0.15)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: isComplete ? "#4ADE80" : "linear-gradient(90deg,#FF6B2B,#F59E0B)", borderRadius: 4, transition: "width 0.4s" }} />
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 6, fontWeight: 600 }}>
                  {doneTasks}/{totalTasks} tasks — {pct}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Congratulation poster (once completed) ── */}
      {completed && posterDesign && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 20 }}>🎉</span>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: t.txt, margin: 0 }}>Congratulations Poster</h2>
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: "rgba(255,107,43,0.12)", color: A }}>
              {certForPoster ? "With certificate" : "Keep going!"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <DesignRenderer design={posterDesign} data={posterData} width={Math.min(440, 440)} showPlaceholders={false} certDesign={certForPoster} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
            <button style={primary} disabled={busy === "pngposter"} onClick={() => run("png", "poster")}>
              {busy === "pngposter" ? "Rendering…" : "Download PNG"}
            </button>
            <button style={btn} disabled={busy === "pdfposter"} onClick={() => run("pdf", "poster")}>
              {busy === "pdfposter" ? "Rendering…" : "Download PDF"}
            </button>
            <button style={btn} disabled={busy === "shareposter"} onClick={() => run("share", "poster")}>
              Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}