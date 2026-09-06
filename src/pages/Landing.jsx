import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";

/* ═══════════════════════════════════════════════════════════════════════
   IGNITE LAB — Landing Page v3
   Strong, bold, high-contrast design
   Inspired by Replit, Codecademy, Linear
   ═══════════════════════════════════════════════════════════════════════ */

// ─── Tokens ──────────────────────────────────────────────────────
const T = {
  bg: "#09090B",
  surface: "#18181B",
  card: "#1C1C21",
  border: "#27272A",
  borderLight: "#3F3F46",
  txt: "#FAFAFA",
  txtSec: "#A1A1AA",
  txtDim: "#71717A",
  accent: "#FF6B2B",
  accentLight: "#FF8A50",
  accentDark: "#E85D1A",
  cyan: "#22D3EE",
  green: "#4ADE80",
  gold: "#FACC15",
  red: "#F87171",
  purple: "#A78BFA",
  fontDisplay: "'Space Grotesk', system-ui, sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  maxW: 1200,
  ease: "cubic-bezier(0.16, 1, 0.3, 1)",
};

// ─── Site Settings Hook ──────────────────────────────────────────
const DEFAULTS = {
  site_name: "IGNITE LAB",
  site_tagline: "Robotics Education Platform",
  hero_badge: "Free robotics education platform",
  hero_title_line1: "Code. Build.",
  hero_title_accent: "Ship robots.",
  hero_subtitle: "The hands-on platform where students write real code, control 3D robots, and master programming through gamified courses.",
  hero_cta_text: "Start Building Free",
  hero_cta_link: "/signup",
  hero_stat1_num: "500+", hero_stat1_label: "Students",
  hero_stat2_num: "7", hero_stat2_label: "Languages",
  hero_stat3_num: "100%", hero_stat3_label: "Free Core",
  features_title: "Everything you need. Nothing you don't.",
  features_subtitle: "From code execution to 3D simulation to live classes — a complete platform.",
  feature_1_title: "3D Robot Simulation", feature_1_desc: "Control physically accurate robot arms and joints in real-time. Write code, see it move.", feature_1_color: "#FF6B2B",
  feature_2_title: "Multi-Language Sandbox", feature_2_desc: "Python, Java, C, C++, JavaScript. Instant execution with syntax highlighting.", feature_2_color: "#22D3EE",
  feature_3_title: "Gamified Learning", feature_3_desc: "Earn points, unlock levels, face boss exams, and climb the leaderboard.", feature_3_color: "#4ADE80",
  feature_4_title: "Teacher Dashboard", feature_4_desc: "Assign tasks, track progress, run live evaluations, manage your classroom.", feature_4_color: "#FACC15",
  feature_5_title: "Project Editor", feature_5_desc: "VS Code-like editor with file trees, tabs, and one-click ZIP download.", feature_5_color: "#F87171",
  feature_6_title: "Live Video Classes", feature_6_desc: "Free Jitsi Meet video calls. Schedule, join, track attendance. Up to 100 participants.", feature_6_color: "#22D3EE",
  how_title: "From zero to builder in three steps",
  how_step1_title: "Sign Up Free", how_step1_desc: "Create your account in 30 seconds. No credit card needed.",
  how_step2_title: "Pick a Course", how_step2_desc: "Python, Web Dev, and more. Each has live sessions, classwork, and boss exams.",
  how_step3_title: "Build & Ship", how_step3_desc: "Write code, control 3D robots, build projects, submit for evaluation.",
  pricing_title: "Built for students in Bangladesh",
  pricing_subtitle: "Start free. Upgrade when you're ready.",
  cta_title: "Ready to start building?",
  cta_subtitle: "Join 500+ students already learning robotics and programming.",
  cta_button_text: "Create Free Account",
  footer_description: "Robotics and programming education. Built for students in Bangladesh.",
  footer_copyright: "© 2025 Ignite Lab by DRILL",
  footer_made_in: "Made in Bangladesh",
  accent_color: "#FF6B2B",
  accent_color_dark: "#E85D1A",
};

function useSiteSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  useEffect(() => {
    supabase.from("site_settings").select("setting_key, setting_value")
      .then(({ data }) => {
        if (data) {
          const map = { ...DEFAULTS };
          data.forEach(s => { if (s.setting_value) map[s.setting_key] = s.setting_value; });
          setSettings(map);
        }
      }).catch(() => {});
  }, []);
  return settings;
}

// ─── Reveal ──────────────────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; el.style.filter = "blur(0)"; obs.unobserve(el); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

function Reveal({ children, delay = 0, style = {} }) {
  const ref = useReveal();
  return (
    <div ref={ref} style={{ opacity: 0, transform: "translateY(40px)", filter: "blur(8px)", transition: `all 0.9s ${T.ease} ${delay * 0.1}s`, ...style }}>
      {children}
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────
function Nav({ S, TC }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { toggleTheme, isDark } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, display: "flex", justifyContent: "center", padding: "14px 16px 0", pointerEvents: "none" }}>
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", maxWidth: 1100, padding: "8px 8px 8px 20px",
          borderRadius: 999, background: scrolled ? (TC.bg === "#FAFAFA" ? "rgba(255,255,255,0.95)" : "rgba(9,9,11,0.95)") : (TC.bg === "#FAFAFA" ? "rgba(255,255,255,0.8)" : "rgba(9,9,11,0.8)"),
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${scrolled ? T.borderLight : T.border}`,
          boxShadow: scrolled ? (TC.bg === "#FAFAFA" ? "0 8px 32px rgba(0,0,0,0.08)" : "0 8px 32px rgba(0,0,0,0.5)") : (TC.bg === "#FAFAFA" ? "0 4px 16px rgba(0,0,0,0.05)" : "0 4px 16px rgba(0,0,0,0.3)"),
          pointerEvents: "auto", transition: "all 0.4s " + T.ease,
        }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <span style={{ fontFamily: T.fontDisplay, fontSize: 16, fontWeight: 700, color: TC.txt, letterSpacing: "-0.03em" }}>{S.site_name}</span>
          </Link>
          <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {["Features", "Pricing"].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} style={{ fontFamily: T.fontBody, fontSize: 13, fontWeight: 500, color: TC.txtSec, textDecoration: "none", padding: "8px 14px", borderRadius: 8, transition: "color 0.2s", whiteSpace: "nowrap" }}>{l}</a>
            ))}
            <Link to="/login" style={{ fontFamily: T.fontBody, fontSize: 13, fontWeight: 500, color: TC.txtSec, textDecoration: "none", padding: "8px 14px", borderRadius: 8, whiteSpace: "nowrap" }}>Sign in</Link>
            <Link to="/signup" style={{ fontFamily: T.fontBody, fontSize: 13, fontWeight: 600, color: "#fff", background: T.accent, padding: "8px 18px", borderRadius: 999, textDecoration: "none", marginLeft: 4, whiteSpace: "nowrap", transition: "all 0.3s " + T.ease }}>Get Started</Link>
            <button onClick={toggleTheme} style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: `1px solid ${TC.border}`, color: TC.txtSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 4, transition: "all 0.2s" }} title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
          </div>
          <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} style={{ display: "none", flexDirection: "column", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 8, flexShrink: 0 }} aria-label="Menu">
            <span style={{ width: 20, height: 2, background: TC.txt, borderRadius: 1, transition: "all 0.3s", transform: mobileOpen ? "rotate(45deg) translate(5px,5px)" : "none" }} />
            <span style={{ width: 20, height: 2, background: TC.txt, borderRadius: 1, opacity: mobileOpen ? 0 : 1, transition: "all 0.3s" }} />
            <span style={{ width: 20, height: 2, background: TC.txt, borderRadius: 1, transition: "all 0.3s", transform: mobileOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
          </button>
        </nav>
      </div>
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(9,9,11,0.95)", backdropFilter: "blur(24px)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.3s ease" }} onClick={() => setMobileOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }} onClick={e => e.stopPropagation()}>
            {["Features", "Pricing"].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, color: TC.txtSec, textDecoration: "none", padding: "12px 24px" }} onClick={() => setMobileOpen(false)}>{l}</a>
            ))}
            <Link to="/signup" style={{ fontFamily: T.fontDisplay, fontSize: 18, fontWeight: 700, color: "#fff", background: T.accent, padding: "14px 40px", borderRadius: 999, textDecoration: "none", marginTop: 16 }} onClick={() => setMobileOpen(false)}>Get Started</Link>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Hero ────────────────────────────────────────────────────────
function Hero({ S, TC }) {
  const c = TC; // theme-aware colors
  const [activeLine, setActiveLine] = useState(0);
  const codeLines = [
    { txt: "from ignite import Robot", color: T.cyan },
    { txt: "", color: T.txt },
    { txt: "robot = Robot('arm-01')", color: T.txt },
    { txt: "robot.move(joint=1, angle=45)", color: T.txt },
    { txt: "robot.gripper('close')", color: T.txt },
    { txt: "", color: T.txt },
    { txt: "# Output: Arm moved to 45deg", color: T.green },
    { txt: "# Output: Gripper closed", color: T.green },
  ];

  useEffect(() => {
    const interval = setInterval(() => setActiveLine(p => (p + 1) % codeLines.length), 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero-section" style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}>
      {/* Background effects */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${T.accent}12, transparent 60%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 50% at 80% 50%, ${T.cyan}08, transparent 50%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "72px 72px", maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)", pointerEvents: "none" }} />

      <div className="hero-content" style={{ maxWidth: T.maxW, margin: "0 auto", padding: "120px 40px 80px", width: "100%", display: "flex", alignItems: "center", gap: 64, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
        {/* Left */}
        <div style={{ flex: "1 1 500px", minWidth: 0 }}>
          <Reveal>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: T.fontMono, fontSize: 12, fontWeight: 500, color: T.accent, background: `${T.accent}10`, border: `1px solid ${T.accent}25`, borderRadius: 999, padding: "6px 16px", marginBottom: 28, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, animation: "pulse 2s infinite" }} />
              {S.hero_badge}
            </div>
          </Reveal>

          <Reveal delay={1}>
            <h1 style={{ fontFamily: T.fontDisplay, fontSize: "clamp(44px, 6vw, 80px)", fontWeight: 700, lineHeight: 1.0, letterSpacing: "-0.04em", color: c.txt, marginBottom: 24 }}>
              {S.hero_title_line1}<br />
              <span style={{ background: `linear-gradient(135deg, ${S.accent_color || T.accent}, ${S.accent_color_dark || T.accentDark})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{S.hero_title_accent}</span>
            </h1>
          </Reveal>

          <Reveal delay={2}>              <p style={{ fontFamily: T.fontBody, fontSize: 18, lineHeight: 1.6, color: c.txtSec, maxWidth: 480, marginBottom: 36 }}>
              {S.hero_subtitle}
            </p>
          </Reveal>

          <Reveal delay={3}>
            <div className="cta-buttons" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
              <Link to="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: T.fontBody, fontSize: 16, fontWeight: 600, color: "#fff", background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, padding: "16px 32px", borderRadius: 12, textDecoration: "none", transition: "all 0.4s " + T.ease, boxShadow: `0 0 24px ${T.accent}30, 0 4px 16px rgba(0,0,0,0.4)` }}>
                {S.hero_cta_text}
              </Link>
              <a href="#features" style={{ display: "inline-flex", alignItems: "center", fontFamily: T.fontBody, fontSize: 16, fontWeight: 500, color: c.txtSec, padding: "16px 32px", borderRadius: 12, textDecoration: "none", border: `1px solid ${c.border}`, transition: "all 0.3s" }}>
                Explore Features
              </a>
            </div>
          </Reveal>

          <Reveal delay={4}>
            <div className="stats-row" style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              {[
                { num: S.hero_stat1_num, label: S.hero_stat1_label },
                { num: S.hero_stat2_num, label: S.hero_stat2_label },
                { num: S.hero_stat3_num, label: S.hero_stat3_label },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 700, color: c.txt, letterSpacing: "-0.03em" }}>{s.num}</div>
                  <div style={{ fontFamily: T.fontBody, fontSize: 13, color: T.txtDim }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Right — Code Editor */}
        <Reveal delay={2} style={{ flex: "1 1 420px", minWidth: 0 }}>
          <div style={{ background: "#1C1C21", border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden", boxShadow: `0 24px 80px rgba(0,0,0,0.25), 0 0 0 1px ${c.border}` }}>
            {/* Chrome */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #27272A", background: "#16161A" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
              </div>
              <div style={{ fontFamily: T.fontMono, fontSize: 11, color: c.txtSec, background: `${T.accent}15`, padding: "3px 10px", borderRadius: 6 }}>main.py</div>
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: T.fontMono, fontSize: 10, color: c.txtDim, letterSpacing: "0.05em", textTransform: "uppercase" }}>Python</span>
            </div>
            {/* Code */}
            <div style={{ fontFamily: T.fontMono, fontSize: 14, lineHeight: 2, padding: "20px 24px" }}>
              {codeLines.map((l, i) => (
                <div key={i} style={{ color: l.color, opacity: i === activeLine ? 1 : (i < activeLine ? 0.6 : 0.3), transition: "all 0.5s " + T.ease, background: i === activeLine ? `${T.accent}08` : "transparent", margin: "0 -24px", padding: "0 24px", borderLeft: i === activeLine ? `2px solid ${T.accent}` : "2px solid transparent" }}>
                  {l.txt || "\u00A0"}
                </div>
              ))}
            </div>
            {/* Status */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: "1px solid #27272A", background: "#16161A", fontSize: 12, fontFamily: T.fontMono }}>
              <span style={{ color: T.green, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, animation: "pulse 2s infinite" }} />
                Ran successfully
              </span>
              <span style={{ color: c.txtDim }}>0.12s</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Partners ────────────────────────────────────────────────────
function Partners({ S, TC }) {
  const c = TC;
  const [partners, setPartners] = useState([]);
  useEffect(() => {
    supabase.from("site_partners").select("*").eq("is_active", true).order("sort_order")
      .then(({ data }) => { if (data) setPartners(data); }).catch(() => {});
  }, []);

  // Convert Google Drive link to thumbnail
  function getThumb(url) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w120`;
    return url;
  }

  const doubled = [...partners, ...partners];

  return (
    <section className="section-padding" style={{ padding: "0 40px 80px", maxWidth: T.maxW, margin: "0 auto", position: "relative", zIndex: 1 }}>
      <div className="partners-row" style={{ display: "flex", alignItems: "center", gap: 32, borderBottom: `1px solid ${c.border}`, paddingBottom: 40 }}>
        <div style={{ fontFamily: T.fontMono, fontSize: 11, fontWeight: 500, color: c.txtDim, textTransform: "uppercase", letterSpacing: "0.12em", whiteSpace: "nowrap", flexShrink: 0 }}>{S.site_tagline || "Trusted by educators"}</div>
        <div style={{ overflow: "hidden", flex: 1, maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)" }}>
          <div className="marquee-track">
            {doubled.map((p, i) => (
              <div key={i} style={{ flexShrink: 0, padding: "12px 36px", display: "flex", alignItems: "center", gap: 8, opacity: 0.6 }}>
                <img src={getThumb(p.image_url)} alt={p.name} style={{ height: 24, maxWidth: 100, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
                <span style={{ fontFamily: T.fontDisplay, fontSize: 13, fontWeight: 600, color: T.txtSec }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ────────────────────────────────────────────────────
function Features({ S, TC }) {
  const c = TC;
  const features = [
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>, title: S.feature_1_title, desc: S.feature_1_desc, color: S.feature_1_color || T.accent },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>, title: S.feature_2_title, desc: S.feature_2_desc, color: S.feature_2_color || T.cyan },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, title: S.feature_3_title, desc: S.feature_3_desc, color: S.feature_3_color || T.green },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, title: S.feature_4_title, desc: S.feature_4_desc, color: S.feature_4_color || T.gold },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>, title: S.feature_5_title, desc: S.feature_5_desc, color: S.feature_5_color || T.red },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>, title: S.feature_6_title, desc: S.feature_6_desc, color: S.feature_6_color || T.cyan },
  ];

  return (
    <section id="features" className="section-padding" style={{ padding: "120px 40px", maxWidth: T.maxW, margin: "0 auto" }}>
      <Reveal>
        <h2 style={{ fontFamily: T.fontDisplay, fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.03em", color: c.txt, textAlign: "center", marginBottom: 16 }}>
          {S.features_title}
        </h2>
      </Reveal>
      <Reveal delay={1}>
        <p style={{ fontFamily: T.fontBody, fontSize: 17, lineHeight: 1.6, color: c.txtSec, textAlign: "center", maxWidth: 520, margin: "0 auto 56px" }}>
          {S.features_subtitle}
        </p>
      </Reveal>
      <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {features.map((f, i) => (
          <Reveal key={i} delay={i + 1}>
            <div style={{ position: "relative", background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "32px 28px", transition: "all 0.4s " + T.ease, cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = f.color + "40"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${f.color}15`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${f.color}12`, color: f.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>{f.icon}</div>
              <h3 style={{ fontFamily: T.fontDisplay, fontSize: 18, fontWeight: 600, color: c.txt, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontFamily: T.fontBody, fontSize: 14, lineHeight: 1.6, color: T.txtSec }}>{f.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ─── How It Works ────────────────────────────────────────────────
function HowItWorks({ S, TC }) {
  const c = TC;
  const steps = [
    { num: "01", title: S.how_step1_title, desc: S.how_step1_desc, color: T.accent },
    { num: "02", title: S.how_step2_title, desc: S.how_step2_desc, color: T.cyan },
    { num: "03", title: S.how_step3_title, desc: S.how_step3_desc, color: T.green },
  ];

  return (
    <section id="how" className="section-padding" style={{ padding: "120px 40px", maxWidth: T.maxW, margin: "0 auto" }}>
      <Reveal>
        <h2 style={{ fontFamily: T.fontDisplay, fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.03em", color: c.txt, textAlign: "center", marginBottom: 64 }}>
          {S.how_title}
        </h2>
      </Reveal>
      <div className="how-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
        {steps.map((s, i) => (
          <Reveal key={i} delay={i + 1}>
            <div style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ fontFamily: T.fontDisplay, fontSize: 64, fontWeight: 700, letterSpacing: "-0.05em", color: s.color, opacity: 0.2, marginBottom: 20 }}>{s.num}</div>
              <h3 style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 600, color: c.txt, marginBottom: 12 }}>{s.title}</h3>
              <p style={{ fontFamily: T.fontBody, fontSize: 15, lineHeight: 1.65, color: c.txtSec, maxWidth: 280, margin: "0 auto" }}>{s.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ─── Pricing ─────────────────────────────────────────────────────
function Pricing({ S, TC }) {
  const c = TC;
  const [plans, setPlans] = useState([]);
  useEffect(() => {
    supabase.from("site_pricing_plans").select("*").eq("is_active", true).order("sort_order")
      .then(({ data }) => {
        if (data) setPlans(data.map(p => ({
          ...p,
          features: typeof p.features === "string" ? JSON.parse(p.features) : (p.features || []),
          accent: p.accent_color || T.txtSec,
        })));
      }).catch(() => {});
  }, []);

  return (
    <section id="pricing" className="section-padding" style={{ padding: "120px 40px", maxWidth: T.maxW, margin: "0 auto" }}>
      <Reveal>
        <h2 style={{ fontFamily: T.fontDisplay, fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 700, letterSpacing: "-0.03em", color: c.txt, textAlign: "center", marginBottom: 12 }}>
          {S.pricing_title}
        </h2>
      </Reveal>
      <Reveal delay={1}>
        <p style={{ fontFamily: T.fontBody, fontSize: 17, color: c.txtSec, textAlign: "center", marginBottom: 56 }}>
          {S.pricing_subtitle}
        </p>
      </Reveal>
      <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, alignItems: "start" }}>
        {plans.map((p, i) => (
          <Reveal key={i} delay={Math.min(i + 1, 4)}>
            <div style={{ position: "relative", background: p.popular ? `${T.accent}08` : c.card, border: `1px solid ${p.popular ? T.accent + "40" : c.border}`, borderRadius: 16, padding: "32px 24px", display: "flex", flexDirection: "column", height: "100%", transition: "all 0.4s " + T.ease }}
              onMouseEnter={e => { if (!p.popular) e.currentTarget.style.borderColor = p.accent + "40"; }}
              onMouseLeave={e => { if (!p.popular) e.currentTarget.style.borderColor = c.border; }}
            >
              {p.popular && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontFamily: T.fontMono, fontSize: 10, fontWeight: 600, color: "#fff", background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, padding: "4px 14px", borderRadius: 999, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Most Popular</div>}
              <div style={{ fontFamily: T.fontDisplay, fontSize: 13, fontWeight: 600, color: p.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>{p.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 20 }}>
                <span style={{ fontFamily: T.fontDisplay, fontSize: 36, fontWeight: 700, color: c.txt, letterSpacing: "-0.03em" }}>{p.price}</span>
                {p.discount_price && <span style={{ fontFamily: T.fontDisplay, fontSize: 18, color: c.txtDim, textDecoration: "line-through" }}>{p.discount_price}</span>}
                <span style={{ fontFamily: T.fontBody, fontSize: 13, color: c.txtDim }}>{p.period}</span>
              </div>
              <div style={{ height: 1, background: c.border, marginBottom: 20 }} />
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                {p.features.map((f, j) => (
                  <li key={j} style={{ fontFamily: T.fontBody, fontSize: 13, color: c.txtSec, padding: "7px 0", display: "flex", alignItems: "center" }}>
                    <span style={{ color: p.accent, marginRight: 10 }}>&#10003;</span>{f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" style={{ display: "block", width: "100%", textAlign: "center", fontFamily: T.fontBody, fontSize: 14, fontWeight: 600, padding: "12px 0", borderRadius: 10, textDecoration: "none", transition: "all 0.3s " + T.ease, cursor: "pointer", background: p.popular ? `linear-gradient(135deg, ${T.accent}, ${T.accentDark})` : "transparent",              border: p.popular ? "none" : `1px solid ${c.border}`, color: p.popular ? "#fff" : c.txtSec }}>
                {p.name === "Institution" ? "Contact Us" : "Get Started"}
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────
function CTA({ S, TC }) {
  const c = TC;
  return (
    <section className="section-padding" style={{ padding: "120px 40px", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${T.accent}10, transparent)`, pointerEvents: "none" }} />
      <Reveal>
        <div className="cta-card" style={{ position: "relative", maxWidth: 700, margin: "0 auto", textAlign: "center", padding: "64px 48px", background: c.card, border: `1px solid ${c.border}`, borderRadius: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
          <h2 style={{ fontFamily: T.fontDisplay, fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.03em", color: c.txt, marginBottom: 16 }}>
            {S.cta_title}
          </h2>
          <p style={{ fontFamily: T.fontBody, fontSize: 17, lineHeight: 1.6, color: c.txtSec, maxWidth: 440, margin: "0 auto 36px" }}>
            {S.cta_subtitle}
          </p>
          <Link to="/signup" style={{ display: "inline-flex", alignItems: "center", fontFamily: T.fontBody, fontSize: 17, fontWeight: 600, color: "#fff", background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, padding: "18px 40px", borderRadius: 12, textDecoration: "none", boxShadow: `0 0 24px ${T.accent}30`, transition: "all 0.4s " + T.ease, animation: "pulseGlow 3s ease-in-out infinite" }}>
            {S.cta_button_text}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8 }}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
          <p style={{ fontFamily: T.fontBody, fontSize: 13, color: c.txtDim, marginTop: 20 }}>Free forever. No credit card required.</p>
        </div>
      </Reveal>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────
function Footer({ S, TC }) {
  const c = TC;
  return (
    <footer className="section-padding" style={{ borderTop: `1px solid ${T.border}`, padding: "64px 40px 32px", background: c.surface, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: T.maxW, margin: "0 auto" }}>
        <div className="footer-grid" style={{ display: "flex", justifyContent: "space-between", gap: 48, marginBottom: 40, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <span style={{ fontFamily: T.fontDisplay, fontSize: 14, fontWeight: 700, letterSpacing: "0.05em", color: T.txt }}>{S.site_name}</span>
            </div>
            <p style={{ fontFamily: T.fontBody, fontSize: 13, lineHeight: 1.6, color: T.txtDim }}>{S.footer_description}</p>
          </div>
          <div className="footer-links" style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            {[
              { head: "Platform", links: ["Features", "Pricing", "How It Works"] },
              { head: "Resources", links: ["Documentation", "Community", "Blog"] },
              { head: "Legal", links: ["Privacy", "Terms", "Contact"] },
            ].map((col, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontFamily: T.fontDisplay, fontSize: 12, fontWeight: 600, color: c.txt, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{col.head}</div>
                {col.links.map(l => (
                  <a key={l} href="#" style={{ fontFamily: T.fontBody, fontSize: 13, color: c.txtDim, textDecoration: "none", transition: "color 0.2s" }}>{l}</a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 1, background: T.border, marginBottom: 20 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontFamily: T.fontBody, fontSize: 12, color: T.txtDim }}>{S.footer_copyright}</span>
          <span style={{ fontFamily: T.fontBody, fontSize: 12, color: T.txtDim }}>{S.footer_made_in}</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Main ────────────────────────────────────────────────────────
export default function Landing() {
  const S = useSiteSettings();
  const { colors } = useTheme();
  // Merge theme colors into T for child components
  const TC = { ...T, bg: colors.bg, surface: colors.surface, card: colors.card, border: colors.border, borderLight: colors.borderLight, txt: colors.txt, txtSec: colors.txtSec, txtDim: colors.txtDim };
  return (
    <div style={{ background: colors.bg, minHeight: "100vh", position: "relative", transition: "background 0.3s" }}>
      <div className="grain-overlay" />
      <Nav S={S} TC={TC} />
      <Hero S={S} TC={TC} />
      <Partners S={S} TC={TC} />
      <Features S={S} TC={TC} />
      <HowItWorks S={S} TC={TC} />
      <Pricing S={S} TC={TC} />
      <CTA S={S} TC={TC} />
      <Footer S={S} TC={TC} />
      <style>{`
        /* Mobile Navigation */
        @media (max-width: 768px) {
          nav .desktop-nav { display: none !important; }
          nav .mobile-toggle { display: flex !important; }
          .hero-section { padding: 100px 20px 60px !important; }
          .hero-content { flex-direction: column !important; gap: 32px !important; }
          .hero-left, .hero-right { flex: 1 1 100% !important; min-width: 100% !important; }
          .hero-right { display: none !important; }
          .stats-row { gap: 24px !important; }
          .cta-buttons { flex-direction: column !important; }
          .cta-buttons a, .cta-buttons button { width: 100% !important; justify-content: center !important; }
          .features-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .how-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .pricing-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .footer-grid { flex-direction: column !important; gap: 32px !important; }
          .footer-links { flex-direction: column !important; gap: 24px !important; }
          .partners-row { flex-direction: column !important; gap: 16px !important; }
          .section-padding { padding: 60px 20px !important; }
          .cta-card { padding: 40px 24px !important; }
        }
        @media (min-width: 769px) {
          nav .mobile-toggle { display: none !important; }
        }
        /* Tablet */
        @media (min-width: 769px) and (max-width: 1024px) {
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
