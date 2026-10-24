import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { makeElement, FONT_CHOICES, BINDINGS, elementText, uid, CERT_CANVAS, POSTER_CANVAS } from "../../lib/design/model";
import DesignRenderer from "./DesignRenderer";

/**
 * DesignEditor — a Canva-style canvas editor for certificates & posters.
 *
 * Fully client-side: drag, resize (rotation-aware), rotate, layers, properties,
 * image upload (stored as data URLs), fixed/variable toggle, live preview with
 * sample data, undo/redo, and PNG/PDF export callbacks supplied by the caller.
 *
 * Props:
 *   initialDesign  { canvas, elements }
 *   kind           'certificate' | 'poster'
 *   title
 *   onSave(design) → caller persists
 *   onExportPNG(design) / onExportPDF(design)
 *   certDesign  certificate design embedded in `certificate` elements (poster preview)
 *   onBack()
 */
export default function DesignEditor({
  initialDesign,
  kind = "certificate",
  title = "Design",
  onSave,
  onExportPNG,
  onExportPDF,
  certDesign = null,
  onBack,
}) {
  const [design, setDesign] = useState(() =>
    initialDesign ? JSON.parse(JSON.stringify(initialDesign)) : defaultFor(kind)
  );
  const [selectedId, setSelectedId] = useState(null);
  const [preview, setPreview] = useState(false);
  const [scale, setScale] = useState(0.5);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [savedMsg, setSavedMsg] = useState("");

  const designRef = useRef(design);
  designRef.current = design;
  const wrapperRef = useRef(null);
  const stageRef = useRef(null);
  const lastPushRef = useRef(0);
  const idRef = useRef(selectedId);
  idRef.current = selectedId;

  const cw = design.canvas.width;
  const ch = design.canvas.height;
  const selected = useMemo(() => design.elements.find((e) => e.id === selectedId) || null, [design, selectedId]);

  // ── history ─────────────────────────────────────────────────
  const pushPast = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastPushRef.current < 400) return;
    lastPushRef.current = now;
    setPast((p) => [...p.slice(-59), JSON.parse(JSON.stringify(designRef.current))]);
    setFuture([]);
  }, []);

  const setAndPush = useCallback(
    (updater, force = false) => {
      pushPast(force);
      setDesign((d) => (typeof updater === "function" ? updater(d) : updater));
    },
    [pushPast]
  );

  const undo = () => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setFuture((f) => [...f, JSON.parse(JSON.stringify(designRef.current))]);
    setDesign(prev);
    setPast((p) => p.slice(0, -1));
  };
  const redo = () => {
    if (!future.length) return;
    const next = future[future.length - 1];
    setPast((p) => [...p, JSON.parse(JSON.stringify(designRef.current))]);
    setDesign(next);
    setFuture((f) => f.slice(0, -1));
  };

  // ── keyboard ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (typing) return;
      if ((e.key === "Delete" || e.key === "Backspace") && idRef.current) {
        e.preventDefault();
        removeSelected();
      }
      if (e.key === "Escape") setSelectedId(null);
      // nudge
      if (idRef.current && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        mutateSelected((el) => ({ ...el, x: el.x + dx, y: el.y + dy }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── fit to stage ────────────────────────────────────────────
  const fit = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const availW = el.clientWidth - 48;
    const availH = Math.max(320, window.innerHeight - 260);
    const s = Math.min(availW / cw, availH / ch, 1);
    setScale(Math.max(0.15, s));
  }, [cw, ch]);

  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit, cw, ch]);

  // ── element helpers ────────────────────────────────────────
  const updateEl = (id, patch) =>
    setDesign((d) => ({ ...d, elements: d.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));

  const mutateSelected = (fn) => {
    const id = idRef.current;
    if (!id) return;
    setAndPush((d) => ({ ...d, elements: d.elements.map((e) => (e.id === id ? fn(e) : e)) }));
  };

  const addElement = (type) => {
    const base = makeElement(type, {
      x: Math.round(cw / 2 - 150),
      y: Math.round(ch / 2 - 30),
    });
    if (type === "certificate") {
      base.x = Math.round(cw / 2 - base.w / 2);
      base.y = Math.round(ch / 2 - base.h / 2);
    }
    setAndPush((d) => ({ ...d, elements: [...d.elements, base] }), true);
    setSelectedId(base.id);
    setPreview(false);
  };

  const removeSelected = () => {
    const id = idRef.current;
    if (!id) return;
    setAndPush((d) => ({ ...d, elements: d.elements.filter((e) => e.id !== id) }), true);
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    const id = idRef.current;
    const el = designRef.current.elements.find((e) => e.id === id);
    if (!el) return;
    const copy = { ...JSON.parse(JSON.stringify(el)), id: uid(), x: el.x + 24, y: el.y + 24 };
    setAndPush((d) => ({ ...d, elements: [...d.elements, copy] }), true);
    setSelectedId(copy.id);
  };

  const reorder = (id, dir) => {
    setAndPush((d) => {
      const arr = [...d.elements];
      const i = arr.findIndex((e) => e.id === id);
      const j = dir === "up" ? i + 1 : i - 1;
      if (i < 0 || j < 0 || j >= arr.length) return d;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...d, elements: arr };
    }, true);
  };

  // ── pointer drag (move) ────────────────────────────────────
  const startMove = (e, el) => {
    if (preview || el.locked) return;
    e.stopPropagation();
    setSelectedId(el.id);
    pushPast(true);
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = el.x;
    const oy = el.y;
    const move = (ev) => {
      const dx = (ev.clientX - sx) / scale;
      const dy = (ev.clientY - sy) / scale;
      updateEl(el.id, { x: Math.round(ox + dx), y: Math.round(oy + dy) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // ── pointer resize (rotation-aware) ────────────────────────
  const startResize = (e, el, hx, hy) => {
    if (preview || el.locked) return;
    e.stopPropagation();
    e.preventDefault();
    pushPast(true);
    const sx = e.clientX;
    const sy = e.clientY;
    const w0 = el.w;
    const h0 = el.h;
    const cx0 = el.x + el.w / 2;
    const cy0 = el.y + el.h / 2;
    const rad = ((el.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const MIN = 16;
    const move = (ev) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      // project screen delta into local axes
      const dlx = (dx * cos + dy * sin) / scale;
      const dly = (-dx * sin + dy * cos) / scale;
      let nw = w0;
      let nh = h0;
      if (hx !== 0) nw = Math.max(MIN, w0 + hx * dlx);
      if (hy !== 0) nh = Math.max(MIN, h0 + hy * dly);
      const dW = nw - w0;
      const dH = nh - h0;
      // center shifts by half the changed edges, in local space → screen
      const lcx = (hx * dW) / 2;
      const lcy = (hy * dH) / 2;
      const scx = cx0 + lcx * cos - lcy * sin;
      const scy = cy0 + lcx * sin + lcy * cos;
      updateEl(el.id, {
        w: Math.round(nw),
        h: Math.round(nh),
        x: Math.round(scx - nw / 2),
        y: Math.round(scy - nh / 2),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // ── pointer rotate ─────────────────────────────────────────
  const startRotate = (e, el) => {
    if (preview || el.locked) return;
    e.stopPropagation();
    e.preventDefault();
    pushPast(true);
    const rect = stageRef.current.getBoundingClientRect();
    const cx = rect.left + (el.x + el.w / 2) * scale;
    const cy = rect.top + (el.y + el.h / 2) * scale;
    const move = (ev) => {
      const ang = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
      updateEl(el.id, { rotation: Math.round(ang) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // ── image upload → data URL ────────────────────────────────
  async function fileToDataUrl(file, maxDim = 1000) {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const s = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * s));
    const h = Math.max(1, Math.round(img.height * s));
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    return cv.toDataURL("image/png");
  }

  const onUpload = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      if (idRef.current && selected?.type === "image") {
        setAndPush((d) => ({ ...d, elements: d.elements.map((e) => (e.id === idRef.current ? { ...e, src: dataUrl } : e)) }), true);
      } else {
        const img = makeElement("image", { x: Math.round(cw / 2 - 120), y: Math.round(ch / 2 - 70), src: dataUrl, name: file.name || "Image" });
        setAndPush((d) => ({ ...d, elements: [...d.elements, img] }), true);
        setSelectedId(img.id);
      }
      setPreview(false);
    } catch (err) {
      alert("Could not read that image: " + (err?.message || err));
    }
  };

  // ── canvas / frame settings ────────────────────────────────
  const setCanvas = (patch) => setAndPush((d) => ({ ...d, canvas: { ...d.canvas, ...patch } }));
  const setFrame = (patch) =>
    setAndPush((d) => ({ ...d, canvas: { ...d.canvas, frame: { ...(d.canvas.frame || {}), ...patch } } }));
  const setBg = (patch) =>
    setAndPush((d) => ({ ...d, canvas: { ...d.canvas, background: { ...(d.canvas.background || {}), ...patch } } }));

  // Background image → data URL so it survives save/reload (blob URLs die with the tab).
  const onBgUpload = async (file) => {
    if (!file) return;
    try {
      const url = await fileToDataUrl(file, 2000);
      setBg({ type: "image", src: url });
    } catch (err) {
      alert("Could not read that image: " + (err?.message || err));
    }
  };

  const handleSave = () => {
    onSave && onSave(JSON.parse(JSON.stringify(design)));
    setSavedMsg("Saved ✓");
    setTimeout(() => setSavedMsg(""), 2200);
  };

  const sample = useMemo(() => {
    const s = {};
    BINDINGS.forEach((b) => (s[b.key] = b.sample));
    return s;
  }, []);

  // hit boxes (only in edit mode)
  const hits = preview ? [] : design.elements;

  return (
    <div style={styles.root}>
      {/* Top toolbar */}
      <div style={styles.toolbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={styles.tBtn}>← Back</button>
          <span style={styles.title}>{title}</span>
          <span style={styles.kindBadge}>{kind}</span>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => addElement("text")} style={styles.tBtn}>+ Text</button>
          <label style={styles.tBtn}>
            + Image
            <input type="file" accept="image/*" hidden onChange={(e) => onUpload(e.target.files?.[0])} />
          </label>
          <button onClick={() => addElement("shape")} style={styles.tBtn}>+ Shape</button>
          <button onClick={() => addElement("certificate")} style={styles.tBtn} title="Embed the student's certificate (poster)">+ Certificate</button>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={() => setPreview((p) => !p)} style={{ ...styles.tBtn, ...(preview ? styles.tBtnActive : {}) }}>
            {preview ? "Preview: ON" : "Preview"}
          </button>
          <button onClick={() => setScale((s) => Math.max(0.15, s - 0.1))} style={styles.tBtn}>−</button>
          <span style={{ fontSize: 11, color: "#9a9aa4", minWidth: 38, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(2, s + 0.1))} style={styles.tBtn}>+</button>
          <button onClick={undo} style={styles.tBtn} disabled={!past.length}>↶</button>
          <button onClick={redo} style={styles.tBtn} disabled={!future.length}>↷</button>
          <button onClick={() => onExportPNG && onExportPNG(design)} style={{ ...styles.tBtn, ...styles.primaryBtn }}>PNG</button>
          <button onClick={() => onExportPDF && onExportPDF(design)} style={{ ...styles.tBtn, ...styles.primaryBtn }}>PDF</button>
          <button onClick={handleSave} style={{ ...styles.tBtn, ...styles.saveBtn }}>{savedMsg || "Save"}</button>
        </div>
      </div>

      <div className="de-body" style={styles.body}>
        {/* Layers */}
        <div style={styles.layers}>
          <div style={styles.panelHead}>Layers</div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {[...design.elements].reverse().map((el) => (
              <div
                key={el.id}
                onClick={() => { setSelectedId(el.id); setPreview(false); }}
                style={{
                  ...styles.layerRow,
                  background: el.id === selectedId ? "rgba(255,107,43,0.14)" : "transparent",
                  opacity: el.hidden ? 0.45 : 1,
                }}
              >
                <span style={{ fontSize: 11, color: "#FF6B2B", width: 16 }}>{iconFor(el.type)}</span>
                <span style={{ flex: 1, fontSize: 12, color: "#e5e5ea", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{el.name || el.type}</span>
                <button onClick={(e) => { e.stopPropagation(); updateEl(el.id, { hidden: !el.hidden }); }} style={styles.mini} title="Toggle visibility">{el.hidden ? "🙈" : "👁"}</button>
                <button onClick={(e) => { e.stopPropagation(); updateEl(el.id, { locked: !el.locked }); }} style={styles.mini} title="Lock">{el.locked ? "🔒" : "🔓"}</button>
              </div>
            ))}
            {!design.elements.length && <div style={{ padding: 16, fontSize: 12, color: "#777" }}>No layers yet. Add text, an image, or a shape.</div>}
          </div>
        </div>

        {/* Stage */}
        <div style={styles.stage} ref={stageRef} onClick={() => setSelectedId(null)}>
          <div ref={wrapperRef} style={{ position: "relative", width: cw * scale, height: ch * scale, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            {/* static visual */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <DesignRenderer design={design} data={sample} width={cw * scale} showPlaceholders={!preview} certDesign={certDesign} />
            </div>

            {/* hit boxes + selection */}
            {!preview &&
              hits.map((el) => (
                <div
                  key={el.id}
                  onPointerDown={(e) => startMove(e, el)}
                  style={{
                    position: "absolute",
                    left: el.x * scale,
                    top: el.y * scale,
                    width: el.w * scale,
                    height: el.h * scale,
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                    cursor: el.locked ? "not-allowed" : "move",
                    outline: el.id === selectedId ? "1.5px solid #FF6B2B" : "none",
                    outlineOffset: 0,
                  }}
                >
                  {el.id === selectedId && !el.locked && (
                    <>
                      {[
                        [-1, -1], [0, -1], [1, -1],
                        [-1, 0], [1, 0],
                        [-1, 1], [0, 1], [1, 1],
                      ].map(([hx, hy]) => (
                        <div
                          key={`${hx},${hy}`}
                          onPointerDown={(e) => startResize(e, el, hx, hy)}
                          style={{
                            position: "absolute",
                            left: `${(hx + 1) * 50}%`,
                            top: `${(hy + 1) * 50}%`,
                            width: 11,
                            height: 11,
                            marginLeft: -5.5,
                            marginTop: -5.5,
                            background: "#fff",
                            border: "1.5px solid #FF6B2B",
                            borderRadius: "50%",
                            cursor: cursorFor(hx, hy),
                          }}
                        />
                      ))}
                      {/* rotate handle */}
                      <div
                        onPointerDown={(e) => startRotate(e, el)}
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: -26,
                          marginLeft: -8,
                          width: 16,
                          height: 16,
                          background: "#FF6B2B",
                          border: "2px solid #fff",
                          borderRadius: "50%",
                          cursor: "grab",
                        }}
                      />
                    </>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Properties */}
        <div style={styles.props}>
          <div style={styles.panelHead}>{selected ? "Element" : "Canvas"}</div>
          <div style={{ overflowY: "auto", flex: 1, padding: 12 }}>
            {selected ? (
              <PropPanel
                el={selected}
                onChange={(patch) => mutateSelected((e) => ({ ...e, ...patch }))}
                onStyle={(patch) => mutateSelected((e) => ({ ...e, style: { ...(e.style || {}), ...patch } }))}
                onDelete={removeSelected}
                onDuplicate={duplicateSelected}
                onReorder={(dir) => reorder(selected.id, dir)}
                onUpload={onUpload}
              />
            ) : (
              <CanvasPanel design={design} setCanvas={setCanvas} setBg={setBg} setFrame={setFrame} kind={kind} onBgUpload={onBgUpload} />
            )}
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 960px){ .de-body{ flex-direction: column; } }`}</style>
    </div>
  );
}

function defaultFor(kind) {
  // supplied by caller normally; safe empty fallback
  return { canvas: kind === "poster" ? { ...POSTER_CANVAS } : { ...CERT_CANVAS }, elements: [] };
}

function iconFor(t) {
  return t === "text" ? "T" : t === "image" ? "🖼" : t === "shape" ? "◻" : t === "certificate" ? "★" : "•";
}
function cursorFor(hx, hy) {
  if (hx === -1 && hy === -1) return "nwse-resize";
  if (hx === 1 && hy === 1) return "nwse-resize";
  if (hx === 1 && hy === -1) return "nesw-resize";
  if (hx === -1 && hy === 1) return "nesw-resize";
  if (hy !== 0) return "ns-resize";
  return "ew-resize";
}

// ── Canvas settings panel ───────────────────────────────────
function CanvasPanel({ design, setCanvas, setBg, setFrame, kind, onBgUpload }) {
  const bg = design.canvas.background || {};
  const fr = design.canvas.frame || {};
  const row = { display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 12, color: "#b7b7c0" };
  const input = { background: "#17171c", border: "1px solid #2a2a31", color: "#e5e5ea", borderRadius: 6, padding: "6px 8px", fontSize: 12 };
  return (
    <div>
      <div style={styles.hint}>Select an element to edit it, or change the paper below.</div>
      <div style={row}><span style={{ width: 74 }}>Size</span>
        <input style={{ ...input, width: 64 }} type="number" value={design.canvas.width} onChange={(e) => setCanvas({ width: +e.target.value || 1 })} />
        <span>×</span>
        <input style={{ ...input, width: 64 }} type="number" value={design.canvas.height} onChange={(e) => setCanvas({ height: +e.target.value || 1 })} />
      </div>
      <div style={row}><span style={{ width: 74 }}>Background</span>
        <select style={input} value={bg.type || "color"} onChange={(e) => setBg({ type: e.target.value })}>
          <option value="color">Color</option>
          <option value="image">Image</option>
        </select>
        {bg.type !== "image" && (
          <input type="color" value={bg.color || "#0A0E16"} onChange={(e) => setBg({ color: e.target.value })} style={{ width: 34, height: 28, padding: 0, background: "none", border: "none" }} />
        )}
      </div>
      {bg.type === "image" && (
        <label style={row}><span style={{ width: 74 }}>Image</span>
          <input type="file" accept="image/*" onChange={(e) => onBgUpload(e.target.files?.[0])} style={{ fontSize: 11, color: "#9a9aa4" }} />
        </label>
      )}
      <div style={{ borderTop: "1px solid #26262d", margin: "12px 0", paddingTop: 12 }}>
        <div style={row}><span style={{ width: 74 }}>Frame</span>
          <input type="color" value={toHex(fr.color)} onChange={(e) => setFrame({ color: e.target.value })} style={{ width: 34, height: 28, padding: 0, background: "none", border: "none" }} />
          <input style={{ ...input, width: 54 }} type="number" value={fr.width ?? 3} onChange={(e) => setFrame({ width: +e.target.value })} />
        </div>
        <div style={row}><span style={{ width: 74 }}>Frame inset</span>
          <input style={{ ...input, width: 60 }} type="number" value={fr.inset ?? 18} onChange={(e) => setFrame({ inset: +e.target.value })} />
        </div>
        <div style={row}><span style={{ width: 74 }}>Inner line</span>
          <input type="color" value={toHex(fr.innerColor)} onChange={(e) => setFrame({ innerColor: e.target.value })} style={{ width: 34, height: 28, padding: 0, background: "none", border: "none" }} />
          <span style={{ fontSize: 11, color: "#777" }}>(blank = off)</span>
        </div>
      </div>
      <div style={styles.hint}>
        Tip: toggle any element between <b>Fixed</b> (same everywhere) and <b>Variable</b> ({`{student_name}`} etc.) in its properties.
      </div>
    </div>
  );
}

function toHex(c) {
  if (!c) return "#FF6B2B";
  if (c.startsWith("#")) return c.length === 4 ? "#" + [1, 2, 3].map((i) => c[i] + c[i]).join("") : c.slice(0, 7);
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return "#" + [1, 2, 3].map((i) => (+m[i]).toString(16).padStart(2, "0")).join("");
  return "#FF6B2B";
}

// ── Element properties panel ────────────────────────────────
function PropPanel({ el, onChange, onStyle, onDelete, onDuplicate, onReorder, onUpload }) {
  const inp = { background: "#17171c", border: "1px solid #2a2a31", color: "#e5e5ea", borderRadius: 6, padding: "6px 8px", fontSize: 12, width: "100%" };
  const row = { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12, color: "#b7b7c0" };
  const s = el.style || {};

  const insertBinding = (key) => {
    onChange({ text: (el.text || "") + `{${key}}` });
  };

  return (
    <div>
      <div style={{ ...row, justifyContent: "space-between" }}>
        <input style={{ ...inp, fontWeight: 600 }} value={el.name || ""} onChange={(e) => onChange({ name: e.target.value })} />
      </div>

      {/* position / size / rotation / opacity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
        {[
          ["X", "x"], ["Y", "y"], ["W", "w"], ["H", "h"], ["Rotate", "rotation"],
        ].map(([label, key]) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9a9aa4" }}>
            {label}
            <input style={inp} type="number" value={Math.round(el[key] || 0)} onChange={(e) => onChange({ [key]: +e.target.value })} />
          </label>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9a9aa4" }}>
          Opacity
          <input style={inp} type="number" min={0} max={1} step={0.05} value={el.opacity ?? 1} onChange={(e) => onChange({ opacity: +e.target.value })} />
        </label>
      </div>

      {el.type === "text" && (
        <>
          {/* Fixed / Variable toggle */}
          <div style={row}>
            <span style={{ width: 54 }}>Content</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => onChange({ mode: "fixed" })} style={chip(el.mode === "fixed")}>Fixed</button>
              <button onClick={() => onChange({ mode: "variable" })} style={chip(el.mode === "variable")}>Variable</button>
            </div>
          </div>

          <textarea
            rows={3}
            style={{ ...inp, marginBottom: 6, resize: "vertical" }}
            value={el.text || ""}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder={el.mode === "variable" ? "Template, e.g. Hello {student_name}" : "Literal text"}
          />

          {el.mode === "variable" && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#9a9aa4", marginBottom: 4 }}>Insert variable (appends to text):</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {BINDINGS.map((b) => (
                  <button key={b.key} onClick={() => insertBinding(b.key)} style={{ ...chip(false), fontSize: 10 }} title={b.label}>
                    {`{${b.key}}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* font style controls */}
          <div style={row}>
            <span style={{ width: 54 }}>Font</span>
            <select style={{ ...inp, flex: 1 }} value={s.fontFamily} onChange={(e) => onStyle({ fontFamily: e.target.value })}>
              {FONT_CHOICES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9a9aa4" }}>Size
              <input style={inp} type="number" value={s.fontSize || 24} onChange={(e) => onStyle({ fontSize: +e.target.value })} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9a9aa4" }}>Weight
              <select style={inp} value={s.fontWeight || 400} onChange={(e) => onStyle({ fontWeight: +e.target.value })}>
                {[300, 400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9a9aa4" }}>Align
              <select style={inp} value={s.align || "center"} onChange={(e) => onStyle({ align: e.target.value })}>
                {["left", "center", "right"].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9a9aa4" }}>Color
              <input type="color" value={toHex(s.color)} onChange={(e) => onStyle({ color: e.target.value })} style={{ width: 34, height: 26, padding: 0, background: "none", border: "none" }} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9a9aa4" }}>Spacing
              <input style={inp} type="number" value={s.letterSpacing || 0} onChange={(e) => onStyle({ letterSpacing: +e.target.value })} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9a9aa4" }}>Line h
              <input style={inp} type="number" step={0.1} value={s.lineHeight || 1.2} onChange={(e) => onStyle({ lineHeight: +e.target.value })} />
            </label>
          </div>
          <div style={{ ...row, gap: 10 }}>
            <label style={{ display: "flex", gap: 5, alignItems: "center" }}><input type="checkbox" checked={!!s.italic} onChange={(e) => onStyle({ italic: e.target.checked })} /> Italic</label>
            <label style={{ display: "flex", gap: 5, alignItems: "center" }}><input type="checkbox" checked={!!s.uppercase} onChange={(e) => onStyle({ uppercase: e.target.checked })} /> UPPERCASE</label>
            <label style={{ display: "flex", gap: 5, alignItems: "center" }}><input type="checkbox" checked={!!s.shadow} onChange={(e) => onStyle({ shadow: e.target.checked })} /> Shadow</label>
          </div>
        </>
      )}

      {el.type === "image" && (
        <>
          <div style={row}>
            <label style={{ ...chip(true), cursor: "pointer" }}>
              Upload image
              <input type="file" accept="image/*" hidden onChange={(e) => onUpload(e.target.files?.[0])} />
            </label>
          </div>
          <div style={row}>
            <span style={{ width: 54 }}>Fit</span>
            <select style={inp} value={el.fit || "contain"} onChange={(e) => onChange({ fit: e.target.value })}>
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="fill">Stretch</option>
            </select>
          </div>
          {el.src ? (
            <div style={{ ...styles.hint, marginBottom: 8 }}><img src={el.src} alt="" style={{ maxWidth: "100%", maxHeight: 90, borderRadius: 6 }} /></div>
          ) : (
            <div style={styles.hint}>No image yet — upload a logo or signature.</div>
          )}
        </>
      )}

      {el.type === "shape" && (
        <>
          <div style={row}>
            <span style={{ width: 54 }}>Shape</span>
            <select style={inp} value={el.shape || "rect"} onChange={(e) => onChange({ shape: e.target.value })}>
              <option value="rect">Rectangle</option>
              <option value="ellipse">Ellipse</option>
              <option value="line">Line</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9a9aa4" }}>Fill
              <input type="color" value={toHex(el.fill)} onChange={(e) => onChange({ fill: e.target.value })} style={{ width: 34, height: 26, padding: 0, background: "none", border: "none" }} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9a9aa4" }}>Radius
              <input style={inp} type="number" value={el.radius || 0} onChange={(e) => onChange({ radius: +e.target.value })} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9a9aa4" }}>Stroke
              <input style={inp} type="number" value={el.strokeWidth || 0} onChange={(e) => onChange({ strokeWidth: +e.target.value })} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9a9aa4" }}>Stroke col
              <input type="color" value={toHex(el.stroke)} onChange={(e) => onChange({ stroke: e.target.value })} style={{ width: 34, height: 26, padding: 0, background: "none", border: "none" }} />
            </label>
          </div>
        </>
      )}

      {el.type === "certificate" && (
        <div style={styles.hint}>This frame shows the student's issued certificate inside the poster. Resize/place it; delete it for a poster without the certificate.</div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
        <button onClick={() => onReorder("up")} style={{ ...chip(false) }}>Forward</button>
        <button onClick={() => onReorder("down")} style={{ ...chip(false) }}>Back</button>
        <button onClick={onDuplicate} style={{ ...chip(false) }}>Duplicate</button>
        <button onClick={onDelete} style={{ ...chip(false), color: "#F87171", borderColor: "rgba(248,113,113,0.4)" }}>Delete</button>
      </div>
    </div>
  );
}

function chip(active) {
  return {
    fontSize: 11,
    fontWeight: 600,
    padding: "5px 10px",
    borderRadius: 6,
    cursor: "pointer",
    background: active ? "#FF6B2B" : "#17171c",
    color: active ? "#fff" : "#c9c9d1",
    border: `1px solid ${active ? "#FF6B2B" : "#2a2a31"}`,
  };
}

const styles = {
  root: { display: "flex", flexDirection: "column", height: "100vh", background: "#0c0c10", color: "#e5e5ea", fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", borderBottom: "1px solid #26262d", background: "#111116", flexWrap: "wrap" },
  title: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15 },
  kindBadge: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#FF6B2B", border: "1px solid rgba(255,107,43,0.4)", padding: "2px 7px", borderRadius: 20 },
  tBtn: { fontSize: 12, fontWeight: 600, padding: "7px 11px", borderRadius: 7, background: "#17171c", color: "#d5d5dc", border: "1px solid #2a2a31", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 },
  tBtnActive: { background: "rgba(255,107,43,0.18)", color: "#FF6B2B", borderColor: "#FF6B2B" },
  primaryBtn: { background: "#1d1d24" },
  saveBtn: { background: "#FF6B2B", color: "#fff", borderColor: "#FF6B2B" },
  body: { display: "flex", flex: 1, minHeight: 0 },
  layers: { width: 220, borderRight: "1px solid #26262d", display: "flex", flexDirection: "column", background: "#0f0f14", minHeight: 0 },
  props: { width: 300, borderLeft: "1px solid #26262d", display: "flex", flexDirection: "column", background: "#0f0f14", minHeight: 0 },
  panelHead: { fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#8a8a94", padding: "12px 14px", borderBottom: "1px solid #26262d" },
  stage: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: 24, background: "repeating-conic-gradient(#141419 0% 25%, #0f0f13 0% 50%) 50% / 24px 24px" },
  layerRow: { display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", cursor: "pointer", borderBottom: "1px solid #17171c" },
  mini: { background: "none", border: "none", cursor: "pointer", fontSize: 12, padding: 0, opacity: 0.8 },
  hint: { fontSize: 11, color: "#8a8a94", lineHeight: 1.5, marginBottom: 10 },
};