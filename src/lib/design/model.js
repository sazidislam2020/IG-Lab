// ============================================================
// Design model — the shared language for certificates & posters.
//
// A "design" is { canvas, elements }:
//   canvas   = size + background + frame (the paper itself)
//   elements = ordered layer list (text, image, shape, certificate)
//
// Every element can be `mode: "fixed"` (static content authored by the
// admin) or `mode: "variable"` (a template string with {placeholders}
// that resolve from the issued certificate / poster data at render time).
// The admin toggles this per element — any item can be fixed or variable.
// ============================================================

// ── Variable bindings an admin can drop into a variable element ──
export const BINDINGS = [
  { key: "student_name", label: "Student name", sample: "Abir Islam", group: "Student" },
  { key: "student_email", label: "Student email", sample: "abir@example.com", group: "Student" },
  { key: "student_details", label: "Student details", sample: "ID: STU-1024", group: "Student" },
  { key: "course_title", label: "Course title", sample: "Python Fundamentals", group: "Course" },
  { key: "course_details", label: "Course details", sample: "Completed all tasks", group: "Course" },
  { key: "teacher_name", label: "Teacher name", sample: "Abirul Islam", group: "Course" },
  { key: "certificate_id", label: "Certificate ID", sample: "IL-2026-00123", group: "Certificate" },
  { key: "completion_date", label: "Completion date", sample: "October 24, 2026", group: "Certificate" },
  { key: "total_points", label: "Total points", sample: "20", group: "Certificate" },
  { key: "org_name", label: "Organization name", sample: "IGNITE LAB", group: "Organization" },
  { key: "org_tagline", label: "Organization tagline", sample: "Robotics Education Platform", group: "Organization" },
  { key: "org_details", label: "Organization details", sample: "Made in Bangladesh", group: "Organization" },
];

export const BINDING_KEYS = BINDINGS.map((b) => b.key);

// ── Canvas presets (design space dimensions) ───────────────
export const CERT_CANVAS = { width: 1414, height: 1000 }; // A4 landscape ratio
export const POSTER_CANVAS = { width: 1080, height: 1350 }; // 4:5 portrait

export const FONT_CHOICES = [
  "'Space Grotesk', sans-serif",
  "'Inter', sans-serif",
  "Georgia, serif",
  "'Times New Roman', serif",
  "'Courier New', monospace",
  "Arial, sans-serif",
  "Impact, sans-serif",
  "Verdana, sans-serif",
];

// ── uid + element factory ───────────────────────────────────
let _seq = 0;
export function uid(prefix = "el") {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

const TEXT_STYLE = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: 24,
  fontWeight: 700,
  italic: false,
  color: "#FFFFFF",
  align: "center",
  lineHeight: 1.2,
  letterSpacing: 0,
  uppercase: false,
  shadow: false,
};

export function makeElement(type, props = {}) {
  const base = {
    id: uid(),
    type,
    x: 100,
    y: 100,
    w: 300,
    h: 60,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    name: type,
    mode: "fixed",
  };

  if (type === "text") {
    return {
      ...base,
      name: "Text",
      text: "Your text here",
      w: 500,
      h: 60,
      style: { ...TEXT_STYLE },
      ...props,
    };
  }
  if (type === "image") {
    return { ...base, name: "Image", src: "", fit: "contain", w: 240, h: 140, ...props };
  }
  if (type === "shape") {
    return {
      ...base,
      name: "Shape",
      shape: "rect",
      fill: "#FF6B2B",
      stroke: "transparent",
      strokeWidth: 0,
      radius: 0,
      w: 240,
      h: 8,
      ...props,
    };
  }
  if (type === "certificate") {
    // A frame that renders the student's issued certificate (poster "with certificate")
    return { ...base, name: "Certificate", w: 760, h: 537, ...props };
  }
  return { ...base, ...props };
}

// ── Template resolution ─────────────────────────────────────
// Replaces {placeholders} in a string with values from data.
export function resolveTemplate(str, data = {}) {
  if (str == null) return "";
  return String(str).replace(/\{(\w+)\}/g, (m, key) => {
    const v = data[key];
    return v == null || v === "" ? "" : String(v);
  });
}

// Resolve the final text of an element given its mode + data.
export function elementText(el, data = {}) {
  const raw = el.text ?? "";
  if (el.mode === "variable") return resolveTemplate(raw, data);
  return raw;
}

// ── Sample data (editor preview) ────────────────────────────
export function sampleData() {
  const d = {};
  BINDINGS.forEach((b) => (d[b.key] = b.sample));
  return d;
}

// ── Build render data from app records ──────────────────────
export function buildData({ cert, course, profile, site, teacherName, courseDetails } = {}) {
  const email = profile?.email || cert?.student_email || "";
  const local = email ? email.split("@")[0] : "";
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "";
  return {
    student_name: cert?.student_name || profile?.full_name || local || "Student",
    student_email: email,
    student_details: profile?.full_name ? email : local || email,
    course_title: cert?.course_name || course?.title || "Course",
    course_details: courseDetails || course?.description || "Completed all required tasks",
    teacher_name: teacherName || "",
    certificate_id: cert?.certificate_id || "—",
    completion_date: fmtDate(cert?.earned_at || cert?.completed_at) || fmtDate(new Date()),
    total_points: cert?.total_points ?? 0,
    org_name: site?.site_name || "IGNITE LAB",
    org_tagline: site?.site_tagline || "Robotics Education Platform",
    org_details: site?.org_details || "Made in Bangladesh",
  };
}

// ── Default certificate design (dark paper + Ignite orange) ──
export function defaultCertificateDesign() {
  const W = CERT_CANVAS.width;
  const cx = W / 2;

  const canvas = {
    width: CERT_CANVAS.width,
    height: CERT_CANVAS.height,
    background: { type: "color", color: "#0A0E16" },
    frame: {
      color: "#FF6B2B",
      width: 3,
      inset: 18,
      innerColor: "rgba(255,107,43,0.30)",
      innerWidth: 1,
      innerInset: 30,
    },
  };

  const t = (props) => makeElement("text", props);

  const elements = [
    t({
      name: "Org name",
      mode: "variable",
      text: "{org_name}",
      x: 0, w: W, y: 62, h: 34,
      style: { ...TEXT_STYLE, fontSize: 20, color: "#FF6B2B", letterSpacing: 5 },
    }),
    t({
      name: "Title",
      text: "CERTIFICATE",
      x: 0, w: W, y: 112, h: 92,
      style: { ...TEXT_STYLE, fontSize: 66, color: "#FFFFFF", letterSpacing: 6 },
    }),
    t({
      name: "Subtitle",
      text: "OF COMPLETION",
      x: 0, w: W, y: 208, h: 30,
      style: { ...TEXT_STYLE, fontSize: 15, color: "rgba(160,160,170,0.85)", letterSpacing: 9, fontWeight: 500 },
    }),
    makeElement("shape", {
      name: "Divider",
      x: cx - 180, y: 258, w: 360, h: 3, fill: "#FF6B2B",
    }),
    t({
      name: "Certifies line",
      text: "This certifies that",
      x: 0, w: W, y: 300, h: 30,
      style: { ...TEXT_STYLE, fontSize: 17, color: "rgba(224,224,224,0.85)", fontWeight: 500 },
    }),
    t({
      name: "Student name",
      mode: "variable",
      text: "{student_name}",
      x: 0, w: W, y: 342, h: 66,
      style: { ...TEXT_STYLE, fontSize: 46, color: "#FF6B2B" },
    }),
    t({
      name: "Completed line",
      text: "has successfully completed the course",
      x: 0, w: W, y: 428, h: 30,
      style: { ...TEXT_STYLE, fontSize: 17, color: "rgba(224,224,224,0.85)", fontWeight: 500 },
    }),
    t({
      name: "Course title",
      mode: "variable",
      text: "{course_title}",
      x: 0, w: W, y: 468, h: 50,
      style: { ...TEXT_STYLE, fontSize: 32, color: "#FFFFFF" },
    }),
    t({
      name: "Points",
      mode: "variable",
      text: "TOTAL POINTS EARNED: {total_points}",
      x: 0, w: W, y: 528, h: 26,
      style: { ...TEXT_STYLE, fontSize: 14, color: "rgba(160,160,170,0.85)", letterSpacing: 2, fontWeight: 500 },
    }),
    makeElement("shape", {
      name: "Rule",
      x: cx - 180, y: 578, w: 360, h: 1, fill: "rgba(255,107,43,0.5)",
    }),
    t({
      name: "Date",
      mode: "variable",
      text: "DATE: {completion_date}",
      x: 90, w: 460, y: 604, h: 28, align: "left",
      style: { ...TEXT_STYLE, fontSize: 15, color: "rgba(160,160,170,0.9)", align: "left", fontWeight: 500 },
    }),
    t({
      name: "Certificate ID",
      mode: "variable",
      text: "ID: {certificate_id}",
      x: W - 550, w: 460, y: 604, h: 28, align: "right",
      style: { ...TEXT_STYLE, fontSize: 15, color: "rgba(160,160,170,0.9)", align: "right", fontWeight: 500 },
    }),
    // Signature slot (admin uploads a teacher signature image)
    makeElement("image", {
      name: "Signature",
      x: cx - 150, y: 660, w: 300, h: 92, fit: "contain",
    }),
    t({
      name: "Teacher name",
      mode: "variable",
      text: "{teacher_name}",
      x: cx - 150, w: 300, y: 758, h: 26,
      style: { ...TEXT_STYLE, fontSize: 16, color: "rgba(224,224,224,0.9)", fontWeight: 600 },
    }),
    t({
      name: "Teacher role",
      text: "Course Instructor",
      x: cx - 150, w: 300, y: 784, h: 22,
      style: { ...TEXT_STYLE, fontSize: 12, color: "rgba(160,160,170,0.7)", letterSpacing: 2, fontWeight: 500 },
    }),
    t({
      name: "Footer",
      mode: "variable",
      text: "{org_name} — {org_tagline}",
      x: 0, w: W, y: 938, h: 24,
      style: { ...TEXT_STYLE, fontSize: 12, color: "rgba(120,120,130,0.7)", letterSpacing: 2, fontWeight: 500 },
    }),
  ];

  return { canvas, elements };
}

// ── Default congratulation poster (portrait 4:5) ────────────
export function defaultPosterDesign() {
  const W = POSTER_CANVAS.width;
  const cx = W / 2;

  const canvas = {
    width: POSTER_CANVAS.width,
    height: POSTER_CANVAS.height,
    background: { type: "color", color: "#0A0E16" },
    frame: {
      color: "#FF6B2B",
      width: 3,
      inset: 20,
      innerColor: "rgba(255,107,43,0.28)",
      innerWidth: 1,
      innerInset: 34,
    },
  };

  const t = (props) => makeElement("text", props);

  const elements = [
    t({
      name: "Org name",
      mode: "variable",
      text: "{org_name}",
      x: 0, w: W, y: 74, h: 34,
      style: { ...TEXT_STYLE, fontSize: 22, color: "#FF6B2B", letterSpacing: 6 },
    }),
    t({
      name: "Congrats",
      text: "CONGRATULATIONS!",
      x: 0, w: W, y: 150, h: 110,
      style: { ...TEXT_STYLE, fontSize: 62, color: "#FFFFFF", letterSpacing: 1 },
    }),
    makeElement("shape", {
      name: "Divider",
      x: cx - 150, y: 274, w: 300, h: 3, fill: "#FF6B2B",
    }),
    t({
      name: "Student name",
      mode: "variable",
      text: "{student_name}",
      x: 0, w: W, y: 316, h: 60,
      style: { ...TEXT_STYLE, fontSize: 44, color: "#FF6B2B" },
    }),
    t({
      name: "Message",
      mode: "variable",
      text: "has completed {course_title}",
      x: 60, w: W - 120, y: 386, h: 44,
      style: { ...TEXT_STYLE, fontSize: 26, color: "rgba(224,224,224,0.92)", fontWeight: 600 },
    }),
    // Certificate embed (delete this element for a poster "without certificate")
    makeElement("certificate", {
      name: "Certificate preview",
      x: cx - 360, y: 470, w: 720, h: 509,
    }),
    t({
      name: "Date",
      mode: "variable",
      text: "{completion_date}",
      x: 0, w: W, y: 1010, h: 30,
      style: { ...TEXT_STYLE, fontSize: 20, color: "rgba(160,160,170,0.9)", fontWeight: 500 },
    }),
    t({
      name: "CTA",
      mode: "variable",
      text: "Earned on {org_name}",
      x: 0, w: W, y: 1180, h: 28,
      style: { ...TEXT_STYLE, fontSize: 16, color: "rgba(160,160,170,0.75)", letterSpacing: 3, fontWeight: 500 },
    }),
    t({
      name: "Footer",
      mode: "variable",
      text: "{org_tagline} · {org_details}",
      x: 0, w: W, y: 1244, h: 26,
      style: { ...TEXT_STYLE, fontSize: 14, color: "rgba(120,120,130,0.7)", letterSpacing: 1, fontWeight: 500 },
    }),
  ];

  return { canvas, elements };
}

// Deep clone (safe for jsonb round-trips)
export function cloneDesign(design) {
  return JSON.parse(JSON.stringify(design));
}