import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import DesignRenderer from "./DesignRenderer";
import { fetchActiveDesign, fetchSiteIdentity } from "../../lib/design/templates";
import { buildData, defaultCertificateDesign } from "../../lib/design/model";
import { exportPNG, exportPDF } from "../../lib/design/export";

/**
 * DesignedCertificate — renders one earned certificate using the
 * admin-designed template (course-specific or global), with PNG/PDF download.
 * Used on the student profile's "Certificates Earned" grid.
 */
export default function DesignedCertificate({ certificate, profile, width = 340 }) {
  const { colors: t } = useTheme();
  const [design, setDesign] = useState(null);
  const [identity, setIdentity] = useState({});
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!certificate) return;
    (async () => {
      const [d, id] = await Promise.all([
        fetchActiveDesign("certificate", certificate.course_id),
        fetchSiteIdentity(),
      ]);
      setDesign(d?.design || defaultCertificateDesign());
      setIdentity(id || {});
    })();
  }, [certificate?.course_id]);

  if (!certificate) return null;
  if (!design) {
    return (
      <div style={{ width, height: width / 1.414, background: t.card, border: `1px solid ${t.border}`, borderRadius: 8 }} />
    );
  }

  const data = buildData({ cert: certificate, profile, site: identity });
  const isLocked = certificate.locked === true;

  async function dl(kind) {
    setBusy(kind);
    try {
      const name = `${certificate.course_name || "certificate"}-certificate`;
      if (kind === "png") await exportPNG(design, data, { filename: name });
      else await exportPDF(design, data, { filename: name });
    } catch (e) {
      alert("Export failed: " + (e?.message || e));
    }
    setBusy("");
  }

  const btn = {
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    padding: "8px 14px",
    borderRadius: 7,
    border: `1px solid ${t.border}`,
    background: t.surface,
    color: t.txt,
    cursor: "pointer",
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${t.border}`, filter: isLocked ? "blur(3px) brightness(0.5)" : undefined }}>
        <DesignRenderer design={design} data={data} width={width} />
      </div>

      {isLocked ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <div style={{ fontSize: 26 }}>🔒</div>
          <Link
            to={`/courses/${certificate.course_id}`}
            style={{ fontSize: 12, fontWeight: 700, color: "#fff", textAlign: "center", padding: "0 12px", textDecoration: "underline" }}
          >
            Pay to unlock this certificate →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button style={btn} disabled={busy === "png"} onClick={() => dl("png")}>
            {busy === "png" ? "…" : "PNG"}
          </button>
          <button style={btn} disabled={busy === "pdf"} onClick={() => dl("pdf")}>
            {busy === "pdf" ? "…" : "PDF"}
          </button>
        </div>
      )}
    </div>
  );
}