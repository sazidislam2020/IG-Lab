/**
 * CertificateView — visual-only certificate display.
 *
 * The certificate is rendered as a styled "paper" model on screen.
 * IMPORTANT: this component intentionally provides NO download,
 * save, or print affordances. Printing/saving via the browser is
 * discouraged with a CSS rule that hides content when printing.
 */

const COLORS = {
  bgDark: "#0A0E16",
  accent: "#FF6B2B",
  accentSoft: "rgba(255, 107, 43, 0.35)",
  textMain: "#FFFFFF",
  textSub: "rgba(224, 224, 224, 0.75)",
  textFaint: "rgba(160, 160, 170, 0.55)",
};

export default function CertificateView({
  studentName = "Student",
  courseName = "Course",
  completionDate,
  totalPoints = 0,
  certificateId = "N/A",
  compact = false,
}) {
  const dateStr = completionDate
    ? new Date(completionDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  return (
    <div
      className="cert-view"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: compact ? 520 : 760,
        margin: "0 auto",
        aspectRatio: "1.414 / 1",
        background: COLORS.bgDark,
        borderRadius: 14,
        border: `2px solid ${COLORS.accent}`,
        boxShadow: "0 12px 48px rgba(255,107,43,0.15), 0 2px 12px rgba(0,0,0,0.5)",
        overflow: "hidden",
        fontFamily: "'Space Grotesk','Inter',sans-serif",
        userSelect: "none",
        WebkitUserSelect: "none",
        pointerEvents: "none",
      }}
    >
      {/* Watermark pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 85% 15%, rgba(255,107,43,0.10), transparent 55%), radial-gradient(circle at 10% 90%, rgba(255,107,43,0.08), transparent 50%)`,
          pointerEvents: "none",
        }}
      />

      {/* Subtle grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          pointerEvents: "none",
        }}
      />

      {/* Inner border */}
      <div
        style={{
          position: "absolute",
          inset: 10,
          border: `1px solid ${COLORS.accentSoft}`,
          borderRadius: 8,
          pointerEvents: "none",
        }}
      />

      {/* Corner ornaments — L-shaped brackets */}
      {[
        { top: 16, left: 16, borderStyle: { borderTop: `3px solid ${COLORS.accent}`, borderLeft: `3px solid ${COLORS.accent}` } },
        { top: 16, right: 16, borderStyle: { borderTop: `3px solid ${COLORS.accent}`, borderRight: `3px solid ${COLORS.accent}` } },
        { bottom: 16, left: 16, borderStyle: { borderBottom: `3px solid ${COLORS.accent}`, borderLeft: `3px solid ${COLORS.accent}` } },
        { bottom: 16, right: 16, borderStyle: { borderBottom: `3px solid ${COLORS.accent}`, borderRight: `3px solid ${COLORS.accent}` } },
      ].map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 22,
            height: 22,
            ...c,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: compact ? "4% 7%" : "5% 9%",
          textAlign: "center",
          gap: compact ? "1.2%" : "1.8%",
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: COLORS.accent,
            fontWeight: 700,
            fontSize: compact ? 13 : 15,
            letterSpacing: 2,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              background: COLORS.accent,
              borderRadius: 2,
              transform: "rotate(45deg)",
              boxShadow: `0 0 10px ${COLORS.accent}`,
              display: "inline-block",
            }}
          />
          IGNITE LAB
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: compact ? "clamp(22px, 6vw, 30px)" : "clamp(26px, 5vw, 40px)",
            fontWeight: 800,
            color: COLORS.textMain,
            letterSpacing: 3,
            lineHeight: 1.1,
          }}
        >
          CERTIFICATE
        </div>
        <div
          style={{
            fontSize: compact ? 11 : 13,
            color: COLORS.textFaint,
            letterSpacing: 4,
            marginTop: -4,
          }}
        >
          OF COMPLETION
        </div>

        {/* Divider */}
        <div
          style={{
            width: "36%",
            height: 1.5,
            background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)`,
            margin: "1.5% 0",
          }}
        />

        {/* Certifies */}
        <div style={{ fontSize: compact ? 11 : 13, color: COLORS.textSub }}>
          This certifies that
        </div>

        {/* Student name */}
        <div
          style={{
            fontSize: compact ? "clamp(18px, 5vw, 24px)" : "clamp(22px, 4vw, 30px)",
            fontWeight: 800,
            color: COLORS.accent,
            lineHeight: 1.2,
            maxWidth: "95%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {studentName}
        </div>

        <div style={{ fontSize: compact ? 11 : 13, color: COLORS.textSub }}>
          has successfully completed the course
        </div>

        {/* Course name */}
        <div
          style={{
            fontSize: compact ? "clamp(14px, 3.5vw, 19px)" : "clamp(16px, 3vw, 23px)",
            fontWeight: 700,
            color: COLORS.textMain,
            maxWidth: "95%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {courseName}
        </div>

        {/* Points */}
        <div
          style={{
            fontSize: compact ? 10 : 12,
            color: COLORS.textFaint,
            marginTop: "0.5%",
          }}
        >
          Total Points Earned: {totalPoints}
        </div>

        {/* Bottom row: date + ID */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            marginTop: "2.5%",
            fontSize: compact ? 9 : 11,
            color: COLORS.textFaint,
            padding: "0 2%",
          }}
        >
          <span>Date: {dateStr}</span>
          <span>ID: {certificateId}</span>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: compact ? "5%" : "6%",
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: compact ? 8 : 9,
            color: "rgba(120,120,130,0.5)",
            letterSpacing: 1,
          }}
        >
          Ignite Lab — Robotics Education Platform
        </div>
      </div>

      {/* No-print guard */}
      <style>{`
        @media print {
          .cert-view { display: none !important; }
          .cert-noprint-note { display: block !important; }
        }
      `}</style>
    </div>
  );
}

/**
 * Locked certificate placeholder — shown when the student has
 * completed the course but admin blocked the certificate.
 */
export function CertificateBlockedView({ reason, courseName }) {
  return (
    <div
      style={{
        maxWidth: 560,
        margin: "0 auto",
        background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: 14,
        padding: "32px 28px",
        textAlign: "center",
        fontFamily: "'Inter',sans-serif",
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#F87171",
          marginBottom: 8,
        }}
      >
        Certificate Not Available
      </div>
      <div style={{ fontSize: 14, color: "rgba(224,224,224,0.7)", lineHeight: 1.6 }}>
        {reason ||
          `The certificate for "${courseName || "this course"}" is currently unavailable. Please contact your instructor or administrator for more information.`}
      </div>
    </div>
  );
}
