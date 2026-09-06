import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const BASE = {
  accent: "#FF6B2B",
  accentDark: "#E85D1A",
  green: "#4ADE80",
  red: "#F87171",
  gold: "#FACC15",
  cyan: "#22D3EE",
  fontDisplay: "'Space Grotesk', system-ui, sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  ease: "cubic-bezier(0.16, 1, 0.3, 1)",
};

function makeC(t) {
  return { ...BASE, bg: t.bg, surface: t.surface, card: t.card, border: t.border, borderLight: t.borderLight, txt: t.txt, txtSec: t.txtSec, txtDim: t.txtDim };
}

// Internal theme context so all sub-components can access C
const SettingsCtx = createContext(null);
const useC = () => useContext(SettingsCtx);

const categories = [
  { key: "general", label: "General", icon: "\u2699" },
  { key: "hero", label: "Hero Section", icon: "\uD83C\uDFAF" },
  { key: "features", label: "Features", icon: "\u2726" },
  { key: "how", label: "How It Works", icon: "\uD83D\uDCCB" },
  { key: "pricing", label: "Pricing Plans", icon: "\uD83D\uDCB0" },
  { key: "cta", label: "Call to Action", icon: "\uD83D\uDCE2" },
  { key: "footer", label: "Footer", icon: "\uD83D\uDCC4" },
  { key: "theme", label: "Theme / Colors", icon: "\uD83C\uDFA8" },
  { key: "partners", label: "Partners Logos", icon: "\uD83D\uDC65" },
];

// ─── Input Components ───────────────────────────────────────────
function Field({ label, description, children }) {
  const C = useC();
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ fontFamily: C.fontDisplay, fontSize: 14, fontWeight: 600, color: C.txt }}>{label}</label>
      </div>
      {description && <p style={{ fontFamily: C.fontBody, fontSize: 12, color: C.txtDim }}>{description}</p>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, mono }) {
  const C = useC();
  return (
    <input type="text" value={value || ""} onChange={e => onChange(e.target.value)}
      style={{ fontFamily: mono ? C.fontMono : C.fontBody, fontSize: 14, color: C.txt, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", outline: "none", width: "100%", transition: "border-color 0.2s" }}
      onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border} />
  );
}

function Textarea({ value, onChange }) {
  const C = useC();
  return (
    <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={3}
      style={{ fontFamily: C.fontBody, fontSize: 14, color: C.txt, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", resize: "vertical", outline: "none", width: "100%", transition: "border-color 0.2s" }}
      onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border} />
  );
}

function ColorInput({ value, onChange }) {
  const C = useC();
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <input type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)}
        style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${C.border}`, cursor: "pointer", background: "none" }} />
      <input type="text" value={value || ""} onChange={e => onChange(e.target.value)}
        style={{ fontFamily: C.fontMono, fontSize: 13, color: C.txt, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", width: 120, outline: "none" }}
        onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border} />
    </div>
  );
}

function SmallBtn({ children, style: override, ...props }) {
  const C = useC();
  const base = { width: 28, height: 28, borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, color: C.txtSec, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
  return <button style={{ ...base, ...override }} {...props}>{children}</button>;
}

// ─── Partners Manager ────────────────────────────────────────────
function PartnersManager({ onMessage }) {
  const C = useC();
  const [partners, setPartners] = useState([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPartners(); }, []);

  async function fetchPartners() {
    setLoading(true);
    const { data } = await supabase.from("site_partners").select("*").order("sort_order");
    if (data) setPartners(data);
    setLoading(false);
  }

  async function handleAdd() {
    if (!newName.trim() || !newUrl.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("site_partners").insert({
      name: newName.trim(), image_url: newUrl.trim(), sort_order: partners.length + 1, is_active: true,
    });
    if (error) onMessage({ type: "error", text: error.message });
    else { onMessage({ type: "success", text: "Partner added" }); setNewName(""); setNewUrl(""); fetchPartners(); }
    setSaving(false);
  }

  async function handleMove(id, dir) {
    const idx = partners.findIndex(p => p.id === id);
    const other = dir === -1 ? idx - 1 : idx + 1;
    if (other < 0 || other >= partners.length) return;
    const a = partners[idx], b = partners[other];
    await supabase.from("site_partners").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("site_partners").update({ sort_order: a.sort_order }).eq("id", b.id);
    fetchPartners();
  }

  async function handleToggleActive(id, current) {
    await supabase.from("site_partners").update({ is_active: !current }).eq("id", id);
    fetchPartners();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this partner?")) return;
    await supabase.from("site_partners").delete().eq("id", id);
    onMessage({ type: "success", text: "Partner deleted" });
    fetchPartners();
  }

  function getThumb(url) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w120`;
    return url;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Add form */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px" }}>
        <h3 style={{ fontFamily: C.fontDisplay, fontSize: 15, fontWeight: 600, color: C.txt, marginBottom: 16 }}>Add Partner Logo</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontFamily: C.fontBody, fontSize: 12, color: C.txtDim, marginBottom: 4, display: "block" }}>Partner Name</label>
            <TextInput value={newName} onChange={setNewName} />
          </div>
          <div style={{ flex: 2, minWidth: 250 }}>
            <label style={{ fontFamily: C.fontBody, fontSize: 12, color: C.txtDim, marginBottom: 4, display: "block" }}>Logo URL (Google Drive link or direct image URL)</label>
            <TextInput value={newUrl} onChange={setNewUrl} />
          </div>
          <button onClick={handleAdd} disabled={saving || !newName.trim() || !newUrl.trim()}
            style={{ fontFamily: C.fontBody, fontSize: 13, fontWeight: 600, color: "#fff", background: C.accent, padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", whiteSpace: "nowrap", opacity: saving || !newName.trim() || !newUrl.trim() ? 0.5 : 1 }}>
            {saving ? "Adding..." : "Add Partner"}
          </button>
        </div>
        <p style={{ fontFamily: C.fontBody, fontSize: 11, color: C.txtDim, marginTop: 8 }}>
          Google Drive: Share file → "Anyone with link" → paste URL. Auto-converts to thumbnail.
        </p>
      </div>

      {/* Partner list */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: C.fontDisplay, fontSize: 15, fontWeight: 600, color: C.txt }}>Current Partners ({partners.length})</h3>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: C.txtDim }}>Loading...</div>
        ) : partners.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.txtDim }}>No partners yet. Add one above.</div>
        ) : (
          <div>
            {partners.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 24px", borderBottom: i < partners.length - 1 ? `1px solid ${C.border}` : "none", opacity: p.is_active ? 1 : 0.4, transition: "opacity 0.2s" }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  <img src={getThumb(p.image_url)} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }} />
                  <span style={{ display: "none", fontSize: 11, color: C.txtDim, fontFamily: C.fontMono }}>{p.name[0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: C.fontBody, fontSize: 14, fontWeight: 500, color: C.txt }}>{p.name}</div>
                  <div style={{ fontFamily: C.fontMono, fontSize: 11, color: C.txtDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.image_url}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <SmallBtn onClick={() => handleMove(p.id, -1)} title="Move up">{"\u25B2"}</SmallBtn>
                  <SmallBtn onClick={() => handleMove(p.id, 1)} title="Move down">{"\u25BC"}</SmallBtn>
                  <SmallBtn onClick={() => handleToggleActive(p.id, p.is_active)} style={{ color: p.is_active ? C.green : C.txtDim }}>{p.is_active ? "ON" : "OFF"}</SmallBtn>
                  <SmallBtn onClick={() => handleDelete(p.id)} style={{ color: C.red }}>{"\u2715"}</SmallBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pricing Manager ─────────────────────────────────────────────
function PricingManager({ onMessage }) {
  const C = useC();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [newPlan, setNewPlan] = useState(null);

  useEffect(() => { fetchPlans(); }, []);

  async function fetchPlans() {
    setLoading(true);
    const { data } = await supabase.from("site_pricing_plans").select("*").order("sort_order");
    if (data) setPlans(data);
    setLoading(false);
  }

  function openNew() {
    setNewPlan({
      name: "", price: "", discount_price: "", period: "/month",
      features: [""], accent_color: C.txtSec, is_popular: false, sort_order: plans.length + 1,
    });
  }

  async function handleSavePlan(plan) {
    setSaving(true);
    const features = plan.features.filter(f => f.trim());
    if (plan.id) {
      const { error } = await supabase.from("site_pricing_plans").update({
        name: plan.name, price: plan.price, discount_price: plan.discount_price || null,
        period: plan.period, features: JSON.stringify(features),
        accent_color: plan.accent_color, is_popular: plan.is_popular, sort_order: plan.sort_order,
      }).eq("id", plan.id);
      if (error) onMessage({ type: "error", text: error.message });
      else onMessage({ type: "success", text: "Plan updated" });
    } else {
      const { error } = await supabase.from("site_pricing_plans").insert({
        name: plan.name, price: plan.price, discount_price: plan.discount_price || null,
        period: plan.period, features: JSON.stringify(features),
        accent_color: plan.accent_color, is_popular: plan.is_popular, sort_order: plan.sort_order,
      });
      if (error) onMessage({ type: "error", text: error.message });
      else onMessage({ type: "success", text: "Plan created" });
    }
    setEditingPlan(null);
    setNewPlan(null);
    fetchPlans();
    setSaving(false);
  }

  async function handleDeletePlan(id) {
    if (!confirm("Delete this pricing plan?")) return;
    setSaving(true);
    await supabase.from("site_pricing_plans").delete().eq("id", id);
    onMessage({ type: "success", text: "Plan deleted" });
    fetchPlans();
    setSaving(false);
  }

  function PlanForm({ plan, onSave, onCancel }) {
    const [local, setLocal] = useState({ ...plan });

    function updateFeature(i, val) {
      const features = [...local.features];
      features[i] = val;
      setLocal({ ...local, features });
    }
    function addFeature() { setLocal({ ...local, features: [...local.features, ""] }); }
    function removeFeature(i) { setLocal({ ...local, features: local.features.filter((_, j) => j !== i) }); }

    const labelStyle = { fontFamily: C.fontBody, fontSize: 12, color: C.txtDim, marginBottom: 4, display: "block" };

    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Plan Name</label>
            <TextInput value={local.name} onChange={v => setLocal({ ...local, name: v })} />
          </div>
          <div>
            <label style={labelStyle}>Price</label>
            <TextInput value={local.price} onChange={v => setLocal({ ...local, price: v })} />
          </div>
          <div>
            <label style={labelStyle}>Discount Price (optional)</label>
            <TextInput value={local.discount_price || ""} onChange={v => setLocal({ ...local, discount_price: v })} />
          </div>
          <div>
            <label style={labelStyle}>Period</label>
            <TextInput value={local.period} onChange={v => setLocal({ ...local, period: v })} />
          </div>
          <div>
            <label style={labelStyle}>Accent Color</label>
            <ColorInput value={local.accent_color} onChange={v => setLocal({ ...local, accent_color: v })} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
            <input type="checkbox" checked={local.is_popular} onChange={e => setLocal({ ...local, is_popular: e.target.checked })} />
            <label style={{ fontFamily: C.fontBody, fontSize: 13, color: C.txt }}>Most Popular</label>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Features</label>
          {local.features.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <TextInput value={f} onChange={v => updateFeature(i, v)} />
              <SmallBtn onClick={() => removeFeature(i)} style={{ color: C.red, flexShrink: 0 }}>{"\u2715"}</SmallBtn>
            </div>
          ))}
          <button onClick={addFeature} style={{ fontFamily: C.fontBody, fontSize: 12, color: C.accent, background: "none", border: `1px dashed ${C.border}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>+ Add Feature</button>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => onSave(local)} disabled={saving} style={{ fontFamily: C.fontBody, fontSize: 13, fontWeight: 600, color: "#fff", background: C.accent, padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
            {saving ? "Saving..." : plan.id ? "Update Plan" : "Create Plan"}
          </button>
          <button onClick={onCancel} style={{ fontFamily: C.fontBody, fontSize: 13, color: C.txtSec, background: "none", border: `1px solid ${C.border}`, padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontFamily: C.fontDisplay, fontSize: 18, fontWeight: 600, color: C.txt }}>Pricing Plans ({plans.length})</h3>
        {!newPlan && !editingPlan && (
          <button onClick={openNew} style={{ fontFamily: C.fontBody, fontSize: 13, fontWeight: 600, color: "#fff", background: C.accent, padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer" }}>+ New Plan</button>
        )}
      </div>

      {newPlan && <PlanForm plan={newPlan} onSave={handleSavePlan} onCancel={() => setNewPlan(null)} />}
      {editingPlan && <PlanForm plan={editingPlan} onSave={handleSavePlan} onCancel={() => setEditingPlan(null)} />}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.txtDim }}>Loading...</div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: C.txtDim }}>No pricing plans yet. Create one above.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {plans.map(p => (
            <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, opacity: p.is_active ? 1 : 0.5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.accent_color || C.accent, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: C.fontDisplay, fontSize: 14, fontWeight: 600, color: C.txt }}>{p.name}</div>
                <div style={{ fontFamily: C.fontMono, fontSize: 12, color: C.txtDim }}>
                  {p.price} {p.period} {p.is_popular && "• Popular"} {p.discount_price && ` (was ${p.discount_price})`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => setEditingPlan(p)} style={{ fontFamily: C.fontBody, fontSize: 12, color: C.accent, background: "none", border: `1px solid ${C.accent}40`, padding: "6px 14px", borderRadius: 6, cursor: "pointer" }}>Edit</button>
                <button onClick={() => handleDeletePlan(p.id)} style={{ fontFamily: C.fontBody, fontSize: 12, color: C.red, background: "none", border: `1px solid ${C.red}40`, padding: "6px 14px", borderRadius: 6, cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main SiteSettings Component ─────────────────────────────────
export default function SiteSettings() {
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const { toggleTheme, isDark, colors: t } = useTheme();
  const C = makeC(t);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState("general");
  const [message, setMessage] = useState(null);
  const [editedValues, setEditedValues] = useState({});

  const canEdit = isAdmin || isSuperAdmin;

  useEffect(() => { if (canEdit) fetchSettings(); }, [canEdit]);

  async function fetchSettings() {
    setLoading(true);
    const { data, error } = await supabase.from("site_settings").select("*").order("sort_order");
    if (!error && data) {
      setSettings(data);
      const vals = {};
      data.forEach(s => { vals[s.setting_key] = s.setting_value || ""; });
      setEditedValues(vals);
    }
    setLoading(false);
  }

  function handleChange(key, value) {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const updates = Object.entries(editedValues).map(([key, value]) =>
      supabase.from("site_settings").update({ setting_value: value }).eq("setting_key", key)
    );
    await Promise.all(updates);
    setMessage({ type: "success", text: "Settings saved!" });
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  }

  const filteredSettings = settings.filter(s => s.category === activeCategory);

  return (
    <SettingsCtx.Provider value={C}>
      <div className="admin-page" style={{ minHeight: "100vh", background: C.bg, color: C.txt, fontFamily: C.fontBody }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg === "#FAFAFA" ? "rgba(255,255,255,0.92)" : "rgba(9,9,11,0.92)", backdropFilter: "blur(6px)", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href="/dashboard" style={{ fontFamily: C.fontBody, fontSize: 13, color: C.txtSec, textDecoration: "none" }}>{"\u2190"} Dashboard</a>
            <h1 style={{ fontFamily: C.fontDisplay, fontSize: 18, fontWeight: 700 }}>Site Settings</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={toggleTheme} style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.txtSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title={isDark ? "Light mode" : "Dark mode"}>
              {isDark ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            {canEdit && (
              <button onClick={handleSave} disabled={saving} style={{ fontFamily: C.fontBody, fontSize: 13, fontWeight: 600, color: "#fff", background: C.accent, padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>

        {message && (
          <div style={{ padding: "12px 32px", background: message.type === "error" ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)", color: message.type === "error" ? C.red : C.green, borderBottom: `1px solid ${message.type === "error" ? C.red : C.green}20` }}>
            {message.text}
          </div>
        )}

        <div style={{ display: "flex", maxWidth: 1200, margin: "0 auto", padding: "32px" }}>
          {/* Sidebar */}
          <div style={{ width: 220, flexShrink: 0, marginRight: 32 }}>
            {categories.map(cat => (
              <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", borderRadius: 8, border: "none", background: activeCategory === cat.key ? `${C.accent}15` : "transparent", color: activeCategory === cat.key ? C.accent : C.txtSec, fontFamily: C.fontBody, fontSize: 13, cursor: "pointer", textAlign: "left", marginBottom: 2, transition: "all 0.2s" }}>
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {activeCategory === "partners" ? (
              <PartnersManager onMessage={setMessage} />
            ) : activeCategory === "pricing" ? (
              <PricingManager onMessage={setMessage} />
            ) : loading ? (
              <div style={{ textAlign: "center", padding: 60, color: C.txtDim }}>Loading...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filteredSettings.map(setting => (
                  <Field key={setting.id} label={setting.label} description={setting.description}>
                    {setting.setting_type === "textarea" ? <Textarea value={editedValues[setting.setting_key] || ""} onChange={v => handleChange(setting.setting_key, v)} />
                      : setting.setting_type === "color" ? <ColorInput value={editedValues[setting.setting_key] || ""} onChange={v => handleChange(setting.setting_key, v)} />
                      : <TextInput value={editedValues[setting.setting_key] || ""} onChange={v => handleChange(setting.setting_key, v)} />}
                  </Field>
                ))}
                {filteredSettings.length === 0 && <div style={{ textAlign: "center", padding: 60, color: C.txtDim }}>No settings here.</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .admin-page > div:first-child { padding: 12px 16px !important; }
          .admin-page main { padding: 20px 16px !important; }
          .admin-page .grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </SettingsCtx.Provider>
  );
}
