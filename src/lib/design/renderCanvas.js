import { elementText } from "./model";

/**
 * renderToCanvas — draws a { canvas, elements } design onto an offscreen
 * <canvas> so it can be exported as PNG or embedded into a PDF.
 *
 * Mirrors DesignRenderer.jsx so on-screen matches export.
 *
 * @param {object} design
 * @param {object} data      resolved variable values
 * @param {object} opts      { scale=2, certDesign }
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderToCanvas(design, data = {}, opts = {}) {
  const { scale = 2, certDesign = null } = opts;
  const { canvas: c, elements } = design;
  const cw = c.width || 1414;
  const ch = c.height || 1000;

  // Make sure document fonts are ready before we measure/draw text.
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  } catch (_) { /* unsupported */ }

  const cv = document.createElement("canvas");
  cv.width = Math.round(cw * scale);
  cv.height = Math.round(ch * scale);
  const ctx = cv.getContext("2d");
  ctx.scale(scale, scale);

  const bg = c.background || {};

  // ── background ──
  if (bg.type === "image" && bg.src) {
    const img = await loadImage(bg.src);
    if (img) {
      drawCover(ctx, img, 0, 0, cw, ch);
    } else {
      ctx.fillStyle = bg.color || "#0A0E16";
      ctx.fillRect(0, 0, cw, ch);
    }
  } else {
    ctx.fillStyle = bg.color || "#0A0E16";
    ctx.fillRect(0, 0, cw, ch);
  }

  // ── frame ──
  const frame = c.frame || null;
  if (frame && frame.color) {
    const inset = frame.inset || 18;
    ctx.strokeStyle = frame.color;
    ctx.lineWidth = frame.width || 2;
    ctx.strokeRect(inset, inset, cw - inset * 2, ch - inset * 2);
  }
  if (frame && frame.innerColor) {
    const inset = frame.innerInset || 30;
    ctx.strokeStyle = frame.innerColor;
    ctx.lineWidth = frame.innerWidth || 1;
    ctx.strokeRect(inset, inset, cw - inset * 2, ch - inset * 2);
  }

  // Preload images once
  const imgs = await preloadImages(elements);

  // Pre-render an embedded certificate (poster "with certificate") so we can
  // draw it synchronously in the loop below.
  let certCanvas = null;
  const hasCertEl = elements.some((el) => el.type === "certificate" && !el.hidden);
  if (hasCertEl && certDesign) {
    try {
      certCanvas = await renderToCanvas(certDesign, data, { scale: 1.5 });
    } catch (_) {
      certCanvas = null;
    }
  }

  for (const el of elements) {
    if (el.hidden) continue;
    drawElement(ctx, el, data, imgs, { certCanvas });
  }

  return cv;
}

function preloadImages(elements) {
  const srcs = new Set();
  elements.forEach((el) => {
    if (el.type === "image" && el.src) srcs.add(el.src);
  });
  const map = new Map();
  return Promise.all(
    [...srcs].map(async (src) => {
      map.set(src, await loadImage(src));
    })
  ).then(() => map);
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    // data: URLs and same-origin are fine; crossOrigin helps for remote logos.
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
    // Guard against hanging
    setTimeout(() => resolve(null), 8000);
  });
}

function drawCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height;
  const box = w / h;
  let dw, dh;
  if (ir > box) {
    dh = h;
    dw = h * ir;
  } else {
    dw = w;
    dh = w / ir;
  }
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawContain(ctx, img, cx, cy, w, h) {
  const ir = img.width / img.height;
  const box = w / h;
  let dw, dh;
  if (ir > box) {
    dw = w;
    dh = w / ir;
  } else {
    dh = h;
    dw = h * ir;
  }
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
}

function withTransform(ctx, el, fn) {
  ctx.save();
  ctx.globalAlpha = el.opacity ?? 1;
  ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
  if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);
  fn(ctx);
  ctx.restore();
}

function drawElement(ctx, el, data, imgs, opts) {
  if (el.type === "text") {
    drawText(ctx, el, data);
  } else if (el.type === "image") {
    const img = el.src ? imgs.get(el.src) : null;
    if (!img) return;
    withTransform(ctx, el, () => {
      drawContain(ctx, img, 0, 0, el.w, el.h);
    });
  } else if (el.type === "shape") {
    withTransform(ctx, el, () => {
      const x = -el.w / 2;
      const y = -el.h / 2;
      ctx.fillStyle = el.fill || "transparent";
      if (el.shape === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(0, 0, el.w / 2, el.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (el.strokeWidth) {
          ctx.lineWidth = el.strokeWidth;
          ctx.strokeStyle = el.stroke || "transparent";
          ctx.stroke();
        }
      } else {
        const r = el.radius || 0;
        if (r > 0 && ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(x, y, el.w, el.h, r);
          ctx.fill();
          if (el.strokeWidth) {
            ctx.lineWidth = el.strokeWidth;
            ctx.strokeStyle = el.stroke || "transparent";
            ctx.stroke();
          }
        } else {
          ctx.fillRect(x, y, el.w, el.h);
          if (el.strokeWidth) {
            ctx.lineWidth = el.strokeWidth;
            ctx.strokeStyle = el.stroke || "transparent";
            ctx.strokeRect(x, y, el.w, el.h);
          }
        }
      }
    });
  } else if (el.type === "certificate" && opts.certCanvas) {
    withTransform(ctx, el, () => {
      drawContain(ctx, opts.certCanvas, 0, 0, el.w, el.h);
    });
  }
}

function drawText(ctx, el, data) {
  const s = el.style || {};
  const raw = elementText(el, data);
  const content = s.uppercase ? String(raw).toUpperCase() : String(raw);
  const lines = wrapText(ctx, content, el.w, s);

  const weight = s.fontWeight || 400;
  const size = s.fontSize || 24;
  const family = s.fontFamily || "sans-serif";
  const italic = s.italic ? "italic " : "";
  ctx.font = `${italic}${weight} ${size}px ${family}`;
  try { if ("letterSpacing" in ctx) ctx.letterSpacing = `${s.letterSpacing || 0}px`; } catch (_) { /* unsupported */ }
  ctx.fillStyle = s.color || "#fff";
  ctx.textBaseline = "middle";
  ctx.textAlign = s.align === "left" ? "left" : s.align === "right" ? "right" : "center";

  if (s.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
  }

  const lineHeight = size * (s.lineHeight || 1.2);
  const total = lines.length * lineHeight;
  const textX = s.align === "left" ? -el.w / 2 : s.align === "right" ? el.w / 2 : 0;

  withTransform(ctx, el, () => {
    ctx.font = `${italic}${weight} ${size}px ${family}`;
    try { if ("letterSpacing" in ctx) ctx.letterSpacing = `${s.letterSpacing || 0}px`; } catch (_) { /* unsupported */ }
    ctx.fillStyle = s.color || "#fff";
    ctx.textBaseline = "middle";
    ctx.textAlign = s.align === "left" ? "left" : s.align === "right" ? "right" : "center";
    if (s.shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
    }
    let y = -total / 2 + lineHeight / 2;
    for (const line of lines) {
      ctx.fillText(line, textX, y);
      y += lineHeight;
    }
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    try { if ("letterSpacing" in ctx) ctx.letterSpacing = "0px"; } catch (_) { /* unsupported */ }
  });
}

function wrapText(ctx, text, maxWidth, s) {
  const size = s.fontSize || 24;
  const family = s.fontFamily || "sans-serif";
  const weight = s.fontWeight || 400;
  ctx.font = `${s.italic ? "italic " : ""}${weight} ${size}px ${family}`;
  try { if ("letterSpacing" in ctx) ctx.letterSpacing = `${s.letterSpacing || 0}px`; } catch (_) { /* unsupported */ }

  const paragraphs = String(text).split("\n");
  const out = [];
  for (const para of paragraphs) {
    if (!para) { out.push(""); continue; }
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  try { if ("letterSpacing" in ctx) ctx.letterSpacing = "0px"; } catch (_) { /* unsupported */ }
  return out.length ? out : [""];
}