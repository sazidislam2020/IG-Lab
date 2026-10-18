import { useTheme } from "../contexts/ThemeContext";

// Platform admin — keep a single source of truth so the number can't drift
// between the signup, pending-approval and login screens.
export const ADMIN = {
  name: "Md. Sazid Ul Islam",
  phone: "01722200248",
  // WhatsApp only reaches a phone number in international format (no "+", no 0).
  waHref: "https://wa.me/8801722200248",
  telHref: "tel:+8801722200248",
};

/**
 * AdminContact — small call-out linking to the admin on WhatsApp.
 * Used right after sign-up and on the pending/rejected account screens,
 * so waiting students know exactly who to message for approval.
 */
export default function AdminContact({ title = "For your approval, contact the Admin" }) {
  const { colors: t } = useTheme();

  return (
    <div
      style={{
        background: "rgba(255,107,43,0.08)",
        border: "1px solid rgba(255,107,43,0.28)",
        borderRadius: 10,
        padding: "16px 18px",
        marginTop: 20,
        textAlign: "left",
      }}
    >
      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: "#FF9A5C",
          marginBottom: 8,
        }}
      >
        {title}
      </p>
      <p style={{ fontSize: 14.5, color: t.txt, fontWeight: 600, marginBottom: 2 }}>
        {ADMIN.name}
      </p>
      <p style={{ fontSize: 13, color: t.txtSec, marginBottom: 12 }}>
        WhatsApp / Phone: {ADMIN.phone}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a
          href={ADMIN.waHref}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            background: "#25D366",
            color: "#07301A",
            fontWeight: 700,
            fontSize: 13,
            padding: "9px 16px",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          WhatsApp the Admin
        </a>
        <a
          href={ADMIN.telHref}
          style={{
            display: "inline-block",
            background: "transparent",
            border: `1px solid ${t.border}`,
            color: t.txtSec,
            fontWeight: 600,
            fontSize: 13,
            padding: "9px 16px",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Call {ADMIN.phone}
        </a>
      </div>
    </div>
  );
}