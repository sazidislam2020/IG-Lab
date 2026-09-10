import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSubscription } from "../hooks/useSubscription";

/**
 * LabGate — controls who can access the 3D Robot Lab.
 *
 * Access mode is set by Admin / Super Admin in Site Settings → Robot Lab:
 *   free       → every approved user can use the lab
 *   paid       → only users with an active paid subscription can use it
 *   restricted → only teachers & admins can use it
 *
 * Admins & Super Admins always have full access, whatever the mode.
 */
export default function LabGate({ children }) {
  const navigate = useNavigate();
  const { user, profile, isAdmin, isTeacher } = useAuth();
  const { colors: t } = useTheme();
  const { isPaid, loading: subLoading } = useSubscription(user?.id);
  const [mode, setMode] = useState("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "lab_access_mode")
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        if (data?.setting_value && ["free", "paid", "restricted"].includes(data.setting_value)) {
          setMode(data.setting_value);
        }
        setLoading(false);
      })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading || subLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: t.bg, color: t.txt, fontFamily: "Inter, system-ui, sans-serif", gap: 16 }}>
        <div style={{ width: 32, height: 32, border: "3px solid rgba(255,90,31,0.2)", borderTopColor: "#FF6B2B", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 13, color: t.txtSec }}>Checking lab access...</p>
      </div>
    );
  }

  // Admins / Super Admins always have full access
  if (isAdmin) return children;

  // Free mode: everyone can use the lab
  if (mode === "free") return children;

  // Paid mode: need an active paid subscription
  if (mode === "paid") {
    if (isPaid) return children;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg, fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: "40px 32px", maxWidth: 420, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🤖</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: t.txt, marginBottom: 8 }}>Robot Lab is a paid feature</h2>
          <p style={{ fontSize: 14, color: t.txtSec, lineHeight: 1.6, marginBottom: 24 }}>
            The 3D Robot Lab now requires an active subscription. Upgrade to unlock the lab and every course.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={() => navigate("/payment")}
              style={{ background: "#FF6B2B", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              💳 Upgrade Now
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              style={{ background: "transparent", color: t.txtSec, border: `1px solid ${t.border}`, borderRadius: 8, padding: "12px 24px", fontSize: 14, cursor: "pointer" }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Restricted mode: teachers & admins only
  if (isTeacher) return children;
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg, fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: "40px 32px", maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: t.txt, marginBottom: 8 }}>Robot Lab is restricted</h2>
        <p style={{ fontSize: 14, color: t.txtSec, lineHeight: 1.6, marginBottom: 24 }}>
          This lab is currently available to teachers and administrators only. Please check back later.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          style={{ background: "#FF6B2B", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}