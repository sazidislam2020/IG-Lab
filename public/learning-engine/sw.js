// Serves stored original PDFs at /pdf-view/:bookId.
//
// Why this exists: the embedded browser only renders native PDFs for top-level
// http(s) URLs — blob: links are blocked and blob frames never navigate. The
// bytes live in IndexedDB (le.pdfs), so a service worker is the only way to
// hand them to the browser over an http URL the native viewer accepts.
const DB_NAME = "le.pdfs";
const STORE = "pdfs";
// Derive the route prefix from this worker's own scope so the same file works
// at the root ("/pdf-view/") and inside the Ignite Lab embed
// ("/learning-engine/pdf-view/").
const PREFIX = new URL(self.registration.scope).pathname + "pdf-view/";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function servePdf(bookId) {
  try {
    const db = await openDb();
    const blob = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(bookId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!blob) return new Response("PDF not stored for this book", { status: 404 });
    const bytes = await blob.arrayBuffer();
    const name = (bookId.replace(/[^\w.-]+/g, "_") || "book") + ".pdf";
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response("Could not read stored PDF: " + (e && e.message), { status: 500 });
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith(PREFIX)) {
    event.respondWith(servePdf(decodeURIComponent(url.pathname.slice(PREFIX.length))));
  }
});
