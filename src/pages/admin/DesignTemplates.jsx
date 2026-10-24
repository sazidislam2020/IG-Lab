import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";
import DesignEditor from "../../components/design/DesignEditor";
import DesignRenderer from "../../components/design/DesignRenderer";
import {
  fetchDesignsForAdmin,
  saveTemplate,
} from "../../lib/design/templates";
import {
  defaultCertificateDesign,
  defaultPosterDesign,
  sampleData,
} from "../../lib/design/model";
import { exportPNG, exportPDF } from "../../lib/design/export";

/**
 * DesignTemplates — admin hub for the Canva-style certificate & poster
 * designer. Manages the two global designs (certificate, poster) plus
 * per-course overrides, and launches the full-screen editor.
 */
export default function DesignTemplates() {
  const { colors: t } = useTheme();
  const [loading, setLoading] = useState(true);
  const [globalCert, setGlobalCert] = useState(null);
  const [globalPoster, setGlobalPoster] = useState(null);
  const [overrides, setOverrides] = useState([]);
  const [courses, setCourses] = useState([]);
  const [editing, setEditing] = useState(null); // { id, type, scope, course_id, name, design }
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [res, crs] = await Promise.all([
      fetchDesignsForAdmin(),
      supabase.from("courses").select("id, title").order("created_at").then((r) => r.data || []),
    ]);
    setGlobalCert(res.globalCert);
    setGlobalPoster(res.globalPoster);
    setOverrides(res.courseOverrides || []);
    setCourses(crs);
    setLoading(false);
  }

  function openEditor({ id = null, type, scope = "global", course_id = null, name, design }) {
    const fallback = type === "poster" ? defaultPosterDesign() : defaultCertificateDesign();
    setEditing({
      id,
      type,
      scope,
      course_id,
      name: name || (type === "poster" ? "Poster" : "Certificate"),
      design: design || fallback,
    });
  }

  async function handleSave(design) {
    const row = {
      id: editing.id,
      type: editing.type,
      scope: editing.scope,
      course_id: editing.course_id,
      name: editing.name,
      canvas: design.canvas,
      elements: design.elements,
      is_active: true,
    };
    const { error } = await saveTemplate(row);
    if (error) {
      setMsg("⚠ " + (error.message || "Could not save"));
      setTimeout(() => setMsg(""), 4000);
      return;
    }
    setEditing(null);
    setMsg("Design saved ✓");
    setTimeout(() => setMsg(""), 3000);
    load();
  }

  const courseTitle = (id) => courses.find((c) => c.id === id)?.title || "Course";

  // ── Full-screen editor ────────────────────────────────────
  if (editing) {
    const data = sampleData();
    // The certificate embedded in a poster: prefer this course's own certificate
    // design, then the global certificate.
    const courseCertOverride = editing.course_id
      ? overrides.find((o) => o.type === "certificate" && o.course_id === editing.course_id)
      : null;
    const certDesignForEmbed =
      editing.type === "poster"
        ? courseCertOverride?.design || globalCert?.design || defaultCertificateDesign()
        : null;
    return (
      <DesignEditor
        initialDesign={editing.design}
        kind={editing.type}
        title={`${editing.name}${editing.scope === "course" ? " · " + courseTitle(editing.course_id) : ""}`}
        onBack={() => setEditing(null)}
        onSave={handleSave}
        certDesign={certDesignForEmbed}
        onExportPNG={(d) => exportPNG(d, data, { filename: editing.name, certDesign: certDesignForEmbed })}
        onExportPDF={(d) => exportPDF(d, data, { filename: editing.name, certDesign: certDesignForEmbed })}
      />
    );
  }

  // ── List view ─────────────────────────────────────────────
  const card = {
    background: t.card,
    border: `1px solid ${t.border}`,
    borderRadius: 14,
    padding: 20,
    display: "flex",
    gap: 18,
    alignItems: "center",
    flexWrap: "wrap",
  };
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
  const primary = { ...btn, background: "#FF6B2B", color: "#fff", borderColor: "#FF6B2B" };

  function DesignThumb({ design, type }) {
    return (
      <div style={{ width: 190, flexShrink: 0 }}>
        <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${t.border}` }}>
          <DesignRenderer design={design} data={sampleData()} width={190} showPlaceholders />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, color: t.txt, display: "grid", placeItems: "center", fontFamily: "'Inter', sans-serif" }}>
        Loading designer…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.txt, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ borderBottom: `1px solid ${t.border}`, padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10, background: t.bg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/dashboard" style={{ fontSize: 13, color: t.txtSec, textDecoration: "none" }}>← Dashboard</Link>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, margin: 0 }}>
            Certificate & Poster Designer
          </h1>
        </div>
        {msg && <span style={{ fontSize: 13, color: msg.startsWith("⚠") ? "#F87171" : "#4ADE80" }}>{msg}</span>}
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px", display: "flex", flexDirection: "column", gap: 24 }}>
        <p style={{ color: t.txtSec, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Design one <b>global certificate</b> and <b>global poster</b> used across all courses, or override them
          per course. Any element can be locked as <b>fixed</b> or switched to <b>variable</b>
          (student name, course, certificate ID, …). Logos and signatures are added as images and placed anywhere.
        </p>

        {/* Global designs */}
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, margin: "4px 0 0" }}>Global designs</h2>

        <div style={card}>
          <DesignThumb design={globalCert?.design || defaultCertificateDesign()} type="certificate" />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Certificate — all courses</div>
            <div style={{ fontSize: 12, color: t.txtDim, marginTop: 4 }}>
              {globalCert ? `Saved · "${globalCert.name}"` : "Using built-in default (not saved yet)"}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                style={primary}
                onClick={() => openEditor({ id: globalCert?.id, type: "certificate", name: globalCert?.name || "Global certificate", design: globalCert?.design })}
              >
                {globalCert ? "Edit design" : "Create design"}
              </button>
            </div>
          </div>
        </div>

        <div style={card}>
          <DesignThumb design={globalPoster?.design || defaultPosterDesign()} type="poster" />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Congratulation poster — all courses</div>
            <div style={{ fontSize: 12, color: t.txtDim, marginTop: 4 }}>
              {globalPoster ? `Saved · "${globalPoster.name}"` : "Using built-in default (not saved yet)"}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                style={primary}
                onClick={() => openEditor({ id: globalPoster?.id, type: "poster", name: globalPoster?.name || "Global poster", design: globalPoster?.design })}
              >
                {globalPoster ? "Edit design" : "Create design"}
              </button>
            </div>
          </div>
        </div>

        {/* Per-course overrides */}
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, margin: "12px 0 0" }}>Per-course designs</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {courses.length === 0 && (
            <div style={{ fontSize: 13, color: t.txtDim }}>No courses yet.</div>
          )}
          {courses.map((c) => {
            const certOv = overrides.find((o) => o.type === "certificate" && o.course_id === c.id);
            const posterOv = overrides.find((o) => o.type === "poster" && o.course_id === c.id);
            return (
              <div key={c.id} style={{ ...card, padding: "14px 20px" }}>
                <div style={{ flex: 1, minWidth: 180, fontWeight: 600, fontSize: 14 }}>{c.title}</div>
                <button
                  style={certOv ? btn : { ...btn, borderColor: "rgba(255,107,43,0.5)" }}
                  onClick={() => openEditor({ id: certOv?.id, type: "certificate", scope: "course", course_id: c.id, name: certOv?.name || `${c.title} certificate`, design: certOv?.design })}
                >
                  {certOv ? "Edit certificate" : "+ Certificate"}
                </button>
                <button
                  style={posterOv ? btn : { ...btn, borderColor: "rgba(255,107,43,0.5)" }}
                  onClick={() => openEditor({ id: posterOv?.id, type: "poster", scope: "course", course_id: c.id, name: posterOv?.name || `${c.title} poster`, design: posterOv?.design })}
                >
                  {posterOv ? "Edit poster" : "+ Poster"}
                </button>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 12, color: t.txtDim, lineHeight: 1.6 }}>
          Note: saving requires the <code>design_templates</code> table (migration 0023). Until it's applied, the
          built-in defaults are shown to students and edits can be previewed/exported but not persisted.
        </p>
      </div>
    </div>
  );
}