import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { supabase } from "../lib/supabase";
import { TEMPLATES, getMonacoLang, buildFileTree } from "../lib/projectTemplates";

export default function ProjectEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [fileTree, setFileTree] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [output, setOutput] = useState([]);
  const [showOutput, setShowOutput] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState({});
  const editorRef = useRef(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    const { data: proj } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();
    if (!proj) { navigate("/projects"); return; }
    setProject(proj);

    const { data: fileData } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", projectId)
      .order("path");

    if (fileData) {
      setFiles(fileData);
      setFileTree(buildFileTree(fileData));
      if (fileData.length > 0) {
        openFile(fileData[0]);
      }
      // Auto-expand root folders
      const folders = {};
      fileData.forEach((f) => {
        const parts = f.path.split("/");
        if (parts.length > 1) folders[parts[0]] = true;
      });
      setExpandedFolders(folders);
    }
  }

  function openFile(file) {
    if (!openFiles.find((f) => f.id === file.id)) {
      setOpenFiles((prev) => [...prev, file]);
    }
    setActiveFile(file);
  }

  function closeFile(fileId, e) {
    e?.stopPropagation();
    const remaining = openFiles.filter((f) => f.id !== fileId);
    setOpenFiles(remaining);
    if (activeFile?.id === fileId) {
      setActiveFile(remaining.length > 0 ? remaining[remaining.length - 1] : null);
    }
  }

  function handleCodeChange(value) {
    if (!activeFile) return;
    // Update in-memory
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFile.id ? { ...f, content: value } : f))
    );
    setOpenFiles((prev) =>
      prev.map((f) => (f.id === activeFile.id ? { ...f, content: value } : f))
    );
    setActiveFile((prev) => ({ ...prev, content: value }));
    setDirty((prev) => ({ ...prev, [activeFile.id]: true }));
  }

  async function saveAll() {
    setSaving(true);
    for (const file of files) {
      if (dirty[file.id]) {
        await supabase
          .from("project_files")
          .update({ content: file.content, updated_at: new Date().toISOString() })
          .eq("id", file.id);
      }
    }
    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", projectId);
    setDirty({});
    setSaving(false);
  }

  async function createFile() {
    if (!newFileName.trim()) return;
    const path = newFileName.trim().replace(/^\//, "");
    const { data: f, error } = await supabase
      .from("project_files")
      .insert({ project_id: projectId, path, content: "" })
      .select()
      .single();
    if (!error) {
      setFiles((prev) => [...prev, f]);
      setFileTree(buildFileTree([...files, f]));
      openFile(f);
    }
    setShowNewFile(false);
    setNewFileName("");
  }

  async function deleteFile(file, e) {
    e.stopPropagation();
    if (!confirm(`Delete ${file.path}?`)) return;
    await supabase.from("project_files").delete().eq("id", file.id);
    const updated = files.filter((f) => f.id !== file.id);
    setFiles(updated);
    setFileTree(buildFileTree(updated));
    closeFile(file.id);
  }

  function toggleFolder(name) {
    setExpandedFolders((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  // Run code — for single-file languages, execute via Judge0; for multi-file, show output
  async function runProject() {
    if (!project || isRunning) return;
    setIsRunning(true);
    setOutput([]);
    setShowOutput(true);

    const template = TEMPLATES[project.stack];

    if (project.stack === "html") {
      // Generate preview HTML
      const htmlFile = files.find((f) => f.path === "index.html");
      const cssFile = files.find((f) => f.path.endsWith(".css"));
      const jsFile = files.find((f) => f.path.endsWith(".js") || f.path.endsWith(".jsx"));
      if (htmlFile) {
        let html = htmlFile.content;
        if (cssFile) {
          html = html.replace(
            /<link\s+rel="stylesheet"\s+href="[^"]*"\s*\/?>/i,
            `<style>${cssFile.content}</style>`
          );
        }
        if (jsFile) {
          html = html.replace(
            /<script\s+src="[^"]*"\s*><\/script>/i,
            `<script>${jsFile.content}<\/script>`
          );
        }
        // Open in new window as preview
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setOutput(["✅ Preview opened in new tab!"]);
      } else {
        setOutput(["❌ No index.html found"]);
      }
      setIsRunning(false);
      return;
    }

    if (project.stack === "python") {
      const mainFile = files.find((f) => f.path === "main.py" || f.path.endsWith(".py"));
      if (!mainFile) {
        setOutput(["❌ No Python file found (main.py)"]);
        setIsRunning(false);
        return;
      }
      try {
        const resp = await fetch(
          "https://ce.judge0.com/submissions?base64_encoded=false&wait=true",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language_id: 100, source_code: mainFile.content }),
          }
        );
        const result = await resp.json();
        const lines = [];
        if (result.status?.id === 3) lines.push("✅ " + result.status.description);
        else lines.push("❌ " + (result.status?.description || "Error"));
        lines.push("");
        if (result.stdout) lines.push(...result.stdout.split("\n"));
        if (result.stderr) { lines.push("⚠️ stderr:"); lines.push(result.stderr); }
        if (result.time) lines.push(`\n⏱ Time: ${result.time}s | Memory: ${result.memory} KB`);
        if (lines.length <= 2) lines.push("(no output)");
        setOutput(lines);
      } catch (err) {
        setOutput(["❌ Connection failed: " + err.message]);
      }
      setIsRunning(false);
      return;
    }

    if (project.stack === "java") {
      const mainFile = files.find((f) => f.path.endsWith(".java"));
      if (!mainFile) {
        setOutput(["❌ No Java file found"]);
        setIsRunning(false);
        return;
      }
      // Combine all java files
      const allJava = files.filter((f) => f.path.endsWith(".java")).map((f) => f.content).join("\n\n");
      try {
        const resp = await fetch(
          "https://ce.judge0.com/submissions?base64_encoded=false&wait=true",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language_id: 91, source_code: allJava }),
          }
        );
        const result = await resp.json();
        const lines = [];
        if (result.status?.id === 3) lines.push("✅ " + result.status.description);
        else lines.push("❌ " + (result.status?.description || "Error"));
        lines.push("");
        if (result.compile_output) { lines.push("📝 Compile:"); lines.push(result.compile_output); lines.push(""); }
        if (result.stdout) lines.push(...result.stdout.split("\n"));
        if (result.stderr) { lines.push("⚠️ stderr:"); lines.push(result.stderr); }
        if (result.time) lines.push(`\n⏱ Time: ${result.time}s | Memory: ${result.memory} KB`);
        if (lines.length <= 2) lines.push("(no output)");
        setOutput(lines);
      } catch (err) {
        setOutput(["❌ Connection failed: " + err.message]);
      }
      setIsRunning(false);
      return;
    }

    if (project.stack === "cpp") {
      const mainFile = files.find((f) => f.path.endsWith(".cpp") || f.path.endsWith(".c"));
      if (!mainFile) {
        setOutput(["❌ No C/C++ file found"]);
        setIsRunning(false);
        return;
      }
      const allCpp = files
        .filter((f) => f.path.endsWith(".cpp") || f.path.endsWith(".c") || f.path.endsWith(".h") || f.path.endsWith(".hpp"))
        .map((f) => f.content).join("\n\n");
      try {
        const resp = await fetch(
          "https://ce.judge0.com/submissions?base64_encoded=false&wait=true",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language_id: 105, source_code: allCpp }),
          }
        );
        const result = await resp.json();
        const lines = [];
        if (result.status?.id === 3) lines.push("✅ " + result.status.description);
        else lines.push("❌ " + (result.status?.description || "Error"));
        lines.push("");
        if (result.compile_output) { lines.push("📝 Compile:"); lines.push(result.compile_output); lines.push(""); }
        if (result.stdout) lines.push(...result.stdout.split("\n"));
        if (result.stderr) { lines.push("⚠️ stderr:"); lines.push(result.stderr); }
        if (result.time) lines.push(`\n⏱ Time: ${result.time}s | Memory: ${result.memory} KB`);
        if (lines.length <= 2) lines.push("(no output)");
        setOutput(lines);
      } catch (err) {
        setOutput(["❌ Connection failed: " + err.message]);
      }
      setIsRunning(false);
      return;
    }

    // Node.js — show instructions (can't run server in browser)
    if (project.stack === "node") {
      setOutput([
        "📋 Node.js projects can't run in the browser.",
        "",
        "To run locally:",
        "1. Download the project (click ↓ button)",
        "2. Open terminal in the project folder",
        "3. Run: node server.js",
        "",
        "Or use the code sandbox for single-file scripts.",
      ]);
      setIsRunning(false);
      return;
    }

    setOutput(["⚠️ Run not supported for this stack yet."]);
    setIsRunning(false);
  }

  // Download project as ZIP
  async function downloadProject() {
    // Dynamic import jszip
    let JSZip;
    try {
      JSZip = (await import("jszip")).default;
    } catch {
      // If jszip not installed, download as individual files
      downloadAsText();
      return;
    }

    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.path, file.content);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, "_")}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadAsText() {
    // Fallback: download main file
    const mainFile = files[0];
    if (!mainFile) return;
    const blob = new Blob([mainFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mainFile.path.split("/").pop();
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleEditorDidMount(editor) {
    editorRef.current = editor;
  }

  function renderTree(node, prefix = "") {
    const entries = Object.entries(node).sort(([a, aVal], [b, bVal]) => {
      if (aVal._file && !bVal._file) return 1;
      if (!aVal._file && bVal._file) return -1;
      return a.localeCompare(b);
    });

    return entries.map(([name, val]) => {
      if (val._file) {
        const isActive = activeFile?.id === val.id;
        const isDirty = dirty[val.id];
        return (
          <div key={val.id} style={{ ...S.treeItem, ...(isActive ? S.treeItemActive : {}) }}
            onClick={() => openFile(val)}>
            <span style={S.treeIcon}>{getFileIcon(name)}</span>
            <span style={S.treeName}>{name}</span>
            {isDirty && <span style={S.dirtyDot}>●</span>}
            <button onClick={(e) => deleteFile(val, e)} style={S.treeDelBtn} title="Delete">×</button>
          </div>
        );
      } else {
        const isExpanded = expandedFolders[name];
        return (
          <div key={prefix + name}>
            <div style={S.treeFolder} onClick={() => toggleFolder(name)}>
              <span style={S.treeChevron}>{isExpanded ? "▾" : "▸"}</span>
              <span>📁 {name}</span>
            </div>
            {isExpanded && (
              <div style={{ paddingLeft: 16 }}>
                {renderTree(val, prefix + name + "/")}
              </div>
            )}
          </div>
        );
      }
    });
  }

  if (!project) {
    return <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", color: "#8A93A6" }}>Loading...</div>;
  }

  const template = TEMPLATES[project.stack];

  return (
    <div style={S.page}>
      {/* Top Bar */}
      <div style={S.topBar}>
        <div style={S.topLeft}>
          <Link to="/projects" style={S.backLink}>← Projects</Link>
          <span style={S.projectName}>{template?.icon} {project.name}</span>
          <span style={S.stackBadge}>{template?.name || project.stack}</span>
        </div>
        <div style={S.topRight}>
          <button onClick={saveAll} disabled={saving || Object.keys(dirty).length === 0} style={{
            ...S.saveBtn,
            opacity: Object.keys(dirty).length === 0 ? 0.4 : 1,
          }}>
            {saving ? "Saving..." : "💾 Save"}
          </button>
          <button onClick={runProject} disabled={isRunning} style={S.runBtn}>
            {isRunning ? "⏳ Running..." : "▶ " + (template?.runLabel || "Run")}
          </button>
          <button onClick={downloadProject} style={S.downloadBtn} title="Download project">
            ↓ Download
          </button>
        </div>
      </div>

      <div style={S.body}>
        {/* Sidebar — File Tree */}
        <div style={S.sidebar}>
          <div style={S.sidebarHeader}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#5C6478", letterSpacing: 1.2 }}>
              FILES
            </span>
            <button onClick={() => setShowNewFile(true)} style={S.newFileBtn} title="New file">+</button>
          </div>
          <div style={S.fileTree}>
            {renderTree(fileTree)}
          </div>
          {showNewFile && (
            <div style={{ padding: "8px 12px" }}>
              <input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="src/App.jsx"
                style={S.newFileInput}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") createFile();
                  if (e.key === "Escape") { setShowNewFile(false); setNewFileName(""); }
                }}
              />
            </div>
          )}
        </div>

        {/* Editor Area */}
        <div style={S.editorArea}>
          {/* Tabs */}
          {openFiles.length > 0 && (
            <div style={S.tabs}>
              {openFiles.map((f) => (
                <div
                  key={f.id}
                  style={{ ...S.tab, ...(activeFile?.id === f.id ? S.tabActive : {}) }}
                  onClick={() => setActiveFile(f)}
                >
                  <span>{getFileIcon(f.path.split("/").pop())}</span>
                  <span style={{ marginLeft: 4 }}>{f.path.split("/").pop()}</span>
                  {dirty[f.id] && <span style={{ color: "#FFB238", marginLeft: 4 }}>●</span>}
                  <button onClick={(e) => closeFile(f.id, e)} style={S.tabClose}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Monaco Editor */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {activeFile ? (
              <Editor
                height="100%"
                language={getMonacoLang(activeFile.path)}
                value={activeFile.content || ""}
                onChange={handleCodeChange}
                onMount={handleEditorDidMount}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: true, scale: 1 },
                  scrollBeyondLastLine: false,
                  padding: { top: 12 },
                  lineNumbers: "on",
                  renderLineHighlight: "all",
                  bracketPairColorization: { enabled: true },
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: "on",
                  formatOnPaste: true,
                  formatOnType: true,
                }}
              />
            ) : (
              <div style={S.noFile}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
                <div style={{ fontSize: 14, color: "#5C6478" }}>
                  Select a file from the sidebar or create a new one
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Output Panel */}
        {showOutput && (
          <div style={S.outputPanel}>
            <div style={S.outputHeader}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, color: "#5C6478" }}>
                OUTPUT
              </span>
              <button onClick={() => setShowOutput(false)} style={S.closeOutput}>×</button>
            </div>
            <div style={S.outputContent}>
              {output.length === 0 ? (
                <div style={{ color: "#5C6478", textAlign: "center", marginTop: 40 }}>
                  Click ▶ Run to execute
                </div>
              ) : (
                output.map((line, i) => (
                  <div key={i} style={{
                    ...S.outputLine,
                    color: line.startsWith("❌") ? "#F87171" :
                           line.startsWith("✅") ? "#3ECF8E" :
                           line.startsWith("⚠") ? "#FFB238" :
                           line.startsWith("📝") ? "#8A93A6" : "#EDEFF3",
                  }}>{line}</div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* New File Modal */}
      {showNewFile && (
        <div style={S.modalOverlay} onClick={() => setShowNewFile(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Create New File</h3>
            <input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="src/components/Header.jsx"
              style={S.modalInput}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") createFile();
                if (e.key === "Escape") { setShowNewFile(false); setNewFileName(""); }
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button onClick={() => { setShowNewFile(false); setNewFileName(""); }}
                style={S.cancelBtn}>Cancel</button>
              <button onClick={createFile} disabled={!newFileName.trim()}
                style={{ ...S.goBtn, opacity: !newFileName.trim() ? 0.5 : 1 }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getFileIcon(name) {
  const ext = name.split(".").pop().toLowerCase();
  const icons = {
    js: "🟨", jsx: "⚛️", ts: "🔷", tsx: "⚛️",
    py: "🐍", java: "☕", cpp: "⚙️", c: "⚙️", h: "⚙️", hpp: "⚙️",
    html: "🌐", css: "🎨", json: "📋", md: "📝",
    xml: "📄", yml: "⚙️", yaml: "⚙️", sql: "🗄️",
    sh: "🖥️", txt: "📄",
  };
  return icons[ext] || "📄";
}

const BG = "#0A0E16";
const BG2 = "#0F1420";
const PANEL = "#131926";
const LINE = "rgba(237,239,243,0.09)";
const TXT = "#EDEFF3";
const DIM = "#8A93A6";
const FAINT = "#5C6478";
const ORG = "#FF5A1F";

const S = {
  page: { height: "100vh", display: "flex", flexDirection: "column", background: BG, color: TXT, fontFamily: "Inter,sans-serif", overflow: "hidden" },

  // Top bar
  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 20px", background: PANEL, borderBottom: "1px solid " + LINE,
    flexShrink: 0, height: 48,
  },
  topLeft: { display: "flex", alignItems: "center", gap: 12 },
  topRight: { display: "flex", alignItems: "center", gap: 8 },
  backLink: { color: DIM, fontSize: 12, textDecoration: "none" },
  projectName: { fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600 },
  stackBadge: { fontSize: 10, fontWeight: 600, color: ORG, background: ORG + "18", padding: "2px 8px", borderRadius: 100 },
  saveBtn: {
    background: "transparent", border: "1px solid " + LINE, color: TXT,
    padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer",
  },
  runBtn: {
    background: "linear-gradient(135deg,#FF5A1F,#ef4444)", color: "#fff", border: "none",
    padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
  },
  downloadBtn: {
    background: "rgba(56,189,248,0.12)", color: "#38BDF8", border: "1px solid rgba(56,189,248,0.2)",
    padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
  },

  // Body
  body: { flex: 1, display: "flex", overflow: "hidden" },

  // Sidebar
  sidebar: {
    width: 220, background: BG2, borderRight: "1px solid " + LINE,
    display: "flex", flexDirection: "column", flexShrink: 0,
  },
  sidebarHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 12px", borderBottom: "1px solid " + LINE,
  },
  newFileBtn: {
    background: "transparent", border: "1px solid " + LINE, color: TXT,
    width: 22, height: 22, borderRadius: 4, fontSize: 14, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  fileTree: { flex: 1, overflow: "auto", padding: "4px 0" },
  treeItem: {
    display: "flex", alignItems: "center", gap: 6, padding: "4px 12px",
    cursor: "pointer", fontSize: 12, color: DIM, transition: "background 0.1s",
  },
  treeItemActive: { background: ORG + "18", color: TXT, borderRight: "2px solid " + ORG },
  treeIcon: { fontSize: 13, flexShrink: 0 },
  treeName: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  dirtyDot: { color: "#FFB238", fontSize: 10, flexShrink: 0 },
  treeDelBtn: {
    background: "transparent", border: "none", color: "#F87171", fontSize: 14,
    cursor: "pointer", padding: 0, opacity: 0, flexShrink: 0, width: 16,
  },
  treeFolder: {
    display: "flex", alignItems: "center", gap: 6, padding: "4px 12px",
    cursor: "pointer", fontSize: 12, color: DIM, fontWeight: 600,
  },
  treeChevron: { fontSize: 10, width: 12 },
  newFileInput: {
    width: "100%", padding: "6px 8px", fontSize: 12, background: BG,
    border: "1px solid " + LINE, borderRadius: 4, color: TXT, outline: "none",
    boxSizing: "border-box",
  },

  // Editor
  editorArea: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  tabs: {
    display: "flex", background: BG2, borderBottom: "1px solid " + LINE,
    overflow: "auto", flexShrink: 0,
  },
  tab: {
    display: "flex", alignItems: "center", gap: 4, padding: "6px 14px",
    fontSize: 12, color: DIM, cursor: "pointer", borderRight: "1px solid " + LINE,
    whiteSpace: "nowrap", transition: "background 0.1s",
  },
  tabActive: { background: BG, color: TXT, borderBottom: "2px solid " + ORG },
  tabClose: {
    background: "transparent", border: "none", color: FAINT, fontSize: 14,
    cursor: "pointer", padding: "0 2px", marginLeft: 4,
  },
  noFile: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", color: FAINT,
  },

  // Output
  outputPanel: {
    height: 200, background: BG2, borderTop: "1px solid " + LINE,
    display: "flex", flexDirection: "column", flexShrink: 0,
  },
  outputHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "6px 12px", borderBottom: "1px solid " + LINE,
  },
  closeOutput: {
    background: "transparent", border: "none", color: DIM, fontSize: 16,
    cursor: "pointer",
  },
  outputContent: {
    flex: 1, overflow: "auto", padding: 12,
    fontFamily: "'JetBrains Mono',monospace", fontSize: 12, lineHeight: 1.6,
  },
  outputLine: { whiteSpace: "pre-wrap", wordBreak: "break-all" },

  // Modal
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
  },
  modal: {
    background: PANEL, border: "1px solid " + LINE, borderRadius: 12,
    padding: 24, width: "90%", maxWidth: 400,
  },
  modalInput: {
    width: "100%", padding: "8px 12px", fontSize: 13, background: BG,
    border: "1px solid " + LINE, borderRadius: 6, color: TXT, outline: "none",
    boxSizing: "border-box", fontFamily: "'JetBrains Mono',monospace",
  },
  cancelBtn: {
    background: "transparent", border: "1px solid " + LINE, color: TXT,
    padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
  },
  goBtn: {
    background: "linear-gradient(135deg,#FF5A1F,#ef4444)", color: "#fff", border: "none",
    padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
  },
};
