import { jsPDF } from "jspdf";
import { renderToCanvas } from "./renderCanvas";

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function safeName(base) {
  return (base || "design").replace(/[^a-z0-9\-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Export a design as a PNG image and download it.
 */
export async function exportPNG(design, data, { filename = "certificate", scale = 3, certDesign } = {}) {
  const cv = await renderToCanvas(design, data, { scale, certDesign });
  const blob = await new Promise((resolve) => cv.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not render PNG (an image may be cross-origin restricted).");
  triggerDownload(blob, `${safeName(filename)}.png`);
  return blob;
}

/**
 * Export a design as a PDF (one page sized exactly to the design ratio).
 */
export async function exportPDF(design, data, { filename = "certificate", scale = 3, certDesign } = {}) {
  const cv = await renderToCanvas(design, data, { scale, certDesign });
  const w = cv.width;
  const h = cv.height;
  const orientation = w >= h ? "landscape" : "portrait";
  // Use pixel units so the page matches the design exactly.
  const pdf = new jsPDF({ orientation, unit: "px", format: [w, h], compress: true });
  pdf.addImage(cv.toDataURL("image/png"), "PNG", 0, 0, w, h);
  pdf.save(`${safeName(filename)}.pdf`);
}

/**
 * Share a design (Web Share API with a file, falling back to PNG download).
 * Returns 'shared' | 'downloaded' | 'failed'.
 */
export async function shareDesign(design, data, { filename = "certificate", scale = 3, certDesign, title = "My certificate" } = {}) {
  const cv = await renderToCanvas(design, data, { scale, certDesign });
  const blob = await new Promise((resolve) => cv.toBlob(resolve, "image/png"));
  if (!blob) return "failed";

  try {
    const file = new File([blob], `${safeName(filename)}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title, text: `Completed on Ignite Lab!` });
      return "shared";
    }
  } catch (_) {
    /* fall through to download */
  }

  triggerDownload(blob, `${safeName(filename)}.png`);
  return "downloaded";
}

/** Render to a canvas without downloading (for previews/tests). */
export { renderToCanvas };