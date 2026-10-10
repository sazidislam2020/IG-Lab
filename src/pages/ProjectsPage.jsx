import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { TEMPLATES } from "../lib/projectTemplates";
import { useTheme } from "../contexts/ThemeContext";
import Icon from "../components/Icon";

export default function ProjectsPage() {
  const { profile } = useAuth();
  const { colors: t } = useTheme();
  const S = makeStyles(t);
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedStack, setSelectedStack] = useState("html");
  const [projectName, setProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (profile) loadProjects();
  }, [profile]);

  async function loadProjects() {
    setLoading(true);
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false });
    setProjects(data || []);
    setLoading(false);
  }

  async function createProject() {
    if (!projectName.trim() || creating) return;
    setCreating(true);

    const template = TEMPLATES[selectedStack];

    // Create project
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .insert({
        user_id: profile.id,
        name: projectName.trim(),
        stack: selectedStack,
        description: template.description,
      })
      .select()
      .single();

    if (projErr) {
      console.error("Create project error:", projErr);
      setCreating(false);
      return;
    }

    // Create files from template
    const fileRows = template.files.map((f) => ({
      project_id: project.id,
      path: f.path,
      content: f.content,
    }));

    const { error: filesErr } = await supabase.from("project_files").insert(fileRows);
    if (filesErr) {
      console.error("Create files error:", filesErr);
    }

    setCreating(false);
    navigate(`/projects/${project.id}`);
  }

  async function deleteProject(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this project? This cannot be undone.")) return;
    await supabase.from("projects").delete().eq("id", id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navLeft}>
          <Link to="/dashboard" style={S.backLink}>← Dashboard</Link>
          <span style={S.brand}><Icon name="folder" size={18} /> My Projects</span>
        </div>
        <button onClick={() => setShowCreate(true)} style={S.createBtn}>
          + New Project
        </button>
      </nav>

      <main style={S.main}>
        {loading ? (
          <div style={S.loading}>Loading projects...</div>
        ) : projects.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 48, marginBottom: 16, display: "flex", justifyContent: "center", color: t.accent }}><Icon name="folder" size={44} /></div>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>No projects yet</h2>
            <p style={{ color: t.txtDim, marginBottom: 24 }}>
              Create your first project to start coding!
            </p>
            <button onClick={() => setShowCreate(true)} style={S.createBtn}>
              + Create Project
            </button>
          </div>
        ) : (
          <div style={S.grid}>
            {projects.map((p) => (
              <div
                key={p.id}
                style={S.card}
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <div style={S.cardHeader}>
                  <span style={S.cardIcon}>{TEMPLATES[p.stack]?.icon || "📄"}</span>
                  <button onClick={(e) => deleteProject(p.id, e)} style={S.deleteBtn} title="Delete" aria-label="Delete project">
                    <Icon name="x" size={16} />
                  </button>
                </div>
                <h3 style={S.cardTitle}>{p.name}</h3>
                <p style={S.cardDesc}>{p.description}</p>
                <div style={S.cardMeta}>
                  <span style={S.stackBadge}>{TEMPLATES[p.stack]?.name || p.stack}</span>
                  <span style={S.dateText}>{formatDate(p.updated_at || p.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreate && (
        <div style={S.modalOverlay} onClick={() => setShowCreate(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={S.modalTitle}>Create New Project</h2>

            <div style={S.field}>
              <label style={S.label}>Project Name</label>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Awesome Project"
                style={S.input}
                autoFocus
              />
            </div>

            <div style={S.field}>
              <label style={S.label}>Choose a Stack</label>
              <div style={S.templateGrid}>
                {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                  <div
                    key={key}
                    style={{
                      ...S.templateCard,
                      ...(selectedStack === key ? S.templateCardActive : {}),
                    }}
                    onClick={() => setSelectedStack(key)}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{tmpl.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{tmpl.name}</div>
                    <div style={{ fontSize: 11, color: t.txtDim, marginTop: 2 }}>
                      {tmpl.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={S.modalActions}>
              <button onClick={() => setShowCreate(false)} style={S.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!projectName.trim() || creating}
                style={{
                  ...S.goBtn,
                  opacity: !projectName.trim() || creating ? 0.5 : 1,
                }}
              >
                {creating ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const makeStyles = (t) => {
  const ORG = t.accent;
  return {
  page: { minHeight: "100vh", background: t.bg, color: t.txt, fontFamily: "Inter,sans-serif" },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 32px", borderBottom: "1px solid " + t.border, background: t.surface,
    position: "sticky", top: 0, zIndex: 100,
  },
  navLeft: { display: "flex", alignItems: "center", gap: 16 },
  backLink: { color: t.txtDim, textDecoration: "none", fontSize: 13 },
  brand: { fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 },
  createBtn: {
    background: "linear-gradient(135deg,#FF5A1F,#ef4444)", color: t.accentInk, border: "none",
    padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  main: { maxWidth: 1100, margin: "0 auto", padding: "48px 32px" },
  loading: { textAlign: "center", padding: 60, color: t.txtDim },
  empty: { textAlign: "center", padding: 80, color: t.txt },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
  card: {
    background: t.card, border: "1px solid " + t.border, borderRadius: 12,
    padding: "20px 22px", cursor: "pointer", transition: "border-color 0.2s",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardIcon: { fontSize: 28 },
  deleteBtn: {
    background: "transparent", border: "none", color: t.danger, fontSize: 16,
    cursor: "pointer", padding: 4, opacity: 0.5, display: "flex",
  },
  cardTitle: { fontSize: 16, fontWeight: 600, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: t.txtDim, lineHeight: 1.5, marginBottom: 12 },
  cardMeta: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  stackBadge: {
    fontSize: 11, fontWeight: 600, color: t.accentLink, background: ORG + "18",
    padding: "3px 10px", borderRadius: 100,
  },
  dateText: { fontSize: 11, color: t.txtDim },

  // Modal
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 200,
  },
  modal: {
    background: t.card, border: "1px solid " + t.border, borderRadius: 16,
    padding: 32, width: "90%", maxWidth: 560, maxHeight: "85vh", overflow: "auto",
  },
  modalTitle: { fontSize: 20, fontWeight: 700, marginBottom: 24 },
  field: { marginBottom: 20 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: t.txtDim, marginBottom: 8 },
  input: {
    width: "100%", padding: "10px 14px", fontSize: 14, background: t.bg,
    border: "1px solid " + t.border, borderRadius: 8, color: t.txt, outline: "none",
    boxSizing: "border-box",
  },
  templateGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 },
  templateCard: {
    background: t.bg, border: "2px solid " + t.border, borderRadius: 10, padding: "14px 10px",
    textAlign: "center", cursor: "pointer", transition: "border-color 0.15s",
  },
  templateCardActive: { borderColor: ORG },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 },
  cancelBtn: {
    background: "transparent", border: "1px solid " + t.border, color: t.txt,
    padding: "8px 18px", borderRadius: 8, fontSize: 13, cursor: "pointer",
  },
  goBtn: {
    background: "linear-gradient(135deg,#FF5A1F,#ef4444)", color: t.accentInk, border: "none",
    padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  };
};
