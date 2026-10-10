# Ignite Lab — UI/UX Audit (full site)

**Date:** 2026-10-04 · **Method:** audit-first review (Taste Skill redesign protocol) using four
learned skill guides as the rubric:

1. **Taste Skill** — brief inference, design-system mapping, dark-mode parity protocol, audit-first redesign
2. **UI/UX Pro Max** — pre-delivery checklist (SVG icons, 4.5:1 contrast, focus states, reduced-motion, resilient text, breakpoints 375/768/1024/1440)
3. **Awesome Claude Design** — 9-section DESIGN.md structure (theme, color roles, type scale, components, layout, depth, do/don'ts, responsive, prompts)
4. **Design Motion Principles** — three lenses (Emil = restraint, Jakub = production polish, Jhey = play), motion-gap analysis, anti-AI-slop checklist

**Brief inference (Taste Skill):** industry = education / robotics; audience = students (teens),
teachers, and parents evaluating credibility; mood = energetic but trustworthy; motion depth =
moderate; layout family = card-based dashboard + editorial landing. Recommended lenses:
**Jakub (production polish) primary, Jhey (playful) secondary for gamified elements, Emil
(restraint) for the code editor controls.**

---

## 0. Strengths to preserve (audit-first rule)

- Strong, consistent brand: orange accent + Space Grotesk display + Inter body + JetBrains Mono code.
- Hero copy is concrete and benefit-led ("Code. Build. Ship robots.").
- `focus-visible` outlines and a global `prefers-reduced-motion` kill-switch already exist — better than most AI-built sites.
- Robot lab's "How to pick up objects" step panel is excellent teaching UX.
- Clear irreversible-action messaging (one-attempt locks, revoke/block confirms).
- Partner marquee pauses on hover; `cursor: pointer` on 100% of buttons.
- Pending/rejected account screens show a clear 3-step status (great expectation setting).

---

## 1. P0 — Understanding & accessibility (fix first; "any viewer can understand")

### 1.1 Contrast failures (measured, WCAG AA = 4.5:1)
| Element | Ratio | Verdict |
|---|---|---|
| Light mode `txtDim` #A1A1AA on #FAFAFA / #F4F4F5 | **2.46 / 2.33** | ❌ fails — used for all meta text in light mode |
| Dark mode `txtDim` #71717A on #1C1C21 card | **3.51** | ❌ fails |
| Primary CTA: white on orange #FF6B2B (gradient to #FF8A3D) | **2.84 → 2.35** | ❌ fails even large-text 3:1 |
| Light mode links/accents #FF6B2B on #FAFAFA | **2.72** | ❌ "Forgot password?", active nav in light |
| Landing eyebrow #5C6478 on #09090B | **3.36** | ❌ small mono text |
| ✅ dark `txtSec` 7.76, light `txtSec` 7.41, orange-on-dark 7.00, sim joint labels 6.4–11.5 | | pass |

**Fix:** redefine token roles — dark `txtDim: #8B8B93`, light `txtDim: #71717A`;
primary CTA label → near-black `#18181B` on orange (≈6.2:1, keeps the vivid brand) or deepen
gradient to ≥ #C2410C for white text; light-mode accent for links → #EA580C-class darker orange.

### 1.2 Light/dark parity is broken (Taste Skill protocol #8)
**13 of 19 pages never read ThemeContext** and hardcode `#0a0a0f`: AdminCourses, AuditLog,
CodeSandbox, CreateClass, Leaderboard, LiveClassRoom, LiveClassesPage, ProjectEditor,
ProjectsPage, Simulation, StudentProfile, TaskPage, TeacherDashboard (+ CertificateView).
Toggling light mode flips roughly half the app back to dark, mid-session.
Also: the global scrollbar is hardcoded near-black (`::-webkit-scrollbar-track: #09090B`) —
a black scrollbar rail shows on light pages.

**Fix:** wire `useTheme()` into the 13 pages (theme tokens already exist), make scrollbar
tokens themed. Keep editor surfaces dark-on-purpose (CodeSandbox/ProjectEditor) but note it in DESIGN.md.

### 1.3 Emoji used as the icon system (UI/UX Pro Max rule #1)
16 files / ~850 emoji strings serve as UI icons (🏠 📚 📡 👤 🎓 📝 🎨 🔐 …) — in the bottom nav
one emoji already renders as a broken glyph (satellite dish + stray letter), emojis render
differently per OS, and they carry no accessible label.

**Fix:** introduce one inline SVG icon set (Lucide-style, ~15 icons: home, book, code, video,
user, graduation-cap, settings, shield, folder, palette, chart, plus, x, chevrons) as a single
`Icon.jsx` component; replace nav, section headers, buttons. Keep emoji only in *content*
messages (🎉 in celebratory copy) where they're speech, not chrome.

### 1.4 Navigation discoverability
**Correction (post-audit verification): the desktop inline nav DOES exist** — the original
"no desktop nav" reading was a viewport artifact (the audit capture ran at ≤1024px where the
header collapses to a hamburger). Verified after the redesign pass: >1024px shows inline nav
(Features · Pricing · Sign in · Start Building); ≤1024px collapses to hamburger + bottom nav,
which is a normal responsive pattern. Remaining, lower priority: tablet widths could keep 1–2
priority links (e.g. Sign in) visible beside the hamburger so first-time visitors don't have
to discover the menu.
Footer link tap targets: **10 elements are < 32px tall** (recommend ≥ 44px).

### 1.5 Empty states explain nothing (viewer-understanding critical)
With no data, the Dashboard shows a greeting + "Quick Actions" heading over ~500px of void;
Courses shows a bare line; a freshly assigned-teacher sees "No students" with no reason.
Every list/panel needs: illustration/icon + one sentence of *why it's empty* + a primary
button to the next action ("No courses yet — browse the catalog", "No students yet — ask an
admin to assign you to a course", "0 runs used today — open the sandbox").

---

## 2. P1 — Comprehension & flow, page by page

### 2.1 Landing (measured: 5375px total, hero section alone = 1312px on a 715px viewport)
- **Hero has ~2 viewports of content and large dead gaps** (badge starts ~250px below the navbar; stats fall below the fold). Compress hero to ≤100vh at 1440×900: headline + subcopy + CTAs + inline stat row (500+ students / 7 languages / 100% free core), moving the code-card demo beside the copy on desktop (2-col).
- **Secondary CTA "Explore Features"** is nearly invisible (hairline border, low-emphasis) — give it a visible border (`t.border` strong) and equal height; only color differentiates primary/secondary.
- Add a **trust row next to the primary CTA** (partner logos already exist in the marquee — lift 3–4 above the fold).
- Section rhythm is fine (60/60 padding) but *within-section* gaps read as emptiness — tighten heading→content from ~250px to ~64–96px.
- Features copy is good; keep. Cards should get a subtle hover lift (transition 150ms — Jakub) — currently static.

### 2.2 Login / signup / reset
- Clean hierarchy; forgot-password flow verified. Improvements: show/hide password toggle;
  "Forgot password?" needs a ≥44px tap area (it's ~24px); input focus ring exists globally ✓
  but placeholder color is too dim (contrast) — use `txtDim` new value.
- Reset-password page states (expired / form / success) are clear ✓.

### 2.3 Student dashboard
- "Good afternoon, there 👋" — fix the template ("Good afternoon!" or greet by name once
  profile loads — currently shows before name is known, reading oddly).
- Stats row (points/tasks/rank) + Top Performers + Upcoming Classes structure is solid.
- Replace text-only "Loading your dashboard..." with **skeleton cards** (motion lens: a
  1.2s shimmer is production polish, not slop — it's the one sanctioned pulse).
- Course cards: ensure a visible progress bar (not just % text) so progress is glanceable.
- Top Performers shows "Student 2", "Student 3" — use display names from the leaderboard RPC
  (data already returns `display_name`); anonymity here confuses ("who are these people?").

### 2.4 Courses & course detail
- Card grid with enroll + progress ✓. Add: duration/task-count metadata line, level chips with
  text labels (not color-only badges), and a clearer locked-state explanation that says *what*
  unlocks it ("Complete Module 1" / "Upgrade to Builder — ৳500/mo") instead of a bare lock.
- Module list: mark the recommended "next" module visually (progress continuity).

### 2.5 Task page (learning core)
- Split prompt/editor/output works. Fixes:
  - Prompt panel is capped at `maxHeight: 200px` with scroll — long prompts get clipped with
    no affordance; make it collapsible with "Show more" or move prompt above editor on mobile.
  - Surface the **one-attempt rule before submitting** (banner in the header, not only after),
    so students don't burn their attempt learning the rule.
  - Server grading now decides pass/fail — show "graded automatically against expected output"
    so the result is trusted and understood; on failure show expected vs actual side-by-side.
  - Boss-level badge ✓; add points-to-earn next to Submit for motivation.

### 2.6 Code sandbox (code panel)
- Language switch **silently overwrites edited code** (`setCode(STARTER_CODE[lang])`) — the
  single worst data-loss UX on the site. Warn when the buffer is dirty ("Replace your code?").
- Runs badge added ✓ — also add the daily-limit sentence in the output placeholder so free
  users understand before their first block.
- Add a one-line "what you can do here" under the title (sandbox vs. task pages differ).
- Keep editor intentionally dark in light mode, but theme the page chrome around it.

### 2.7 Robot lab (robotic panel)
From the captured screenshot:
- **Joint angle values are rainbow-colored** (orange/cyan/purple/green/yellow/red with no
  meaning) — badge meaning must not rely on color (UI/UX Pro Max). Use one value color; use a
  second color only for *out-of-neutral* states (e.g., gripper closed = green).
- Sliders show no **min/max range** — the instructions say "Set Joint 2 = −75°" but nothing
  shows that limit. Label each slider with its range and current value in a numeric input
  (keyboard-accessible; sliders alone are a11y-poor).
- The instruction list is **clipped at the panel bottom** ("6. Object will be attracted…"
  cut off) — give the help card internal scroll + bottom fade, or collapse to 3 steps + "more".
- Replace emoji in Reset/tab icons (🗑 / ▶) with SVG; title emoji optional (content, ok).
- The legend chips (Drag empty: orbit / Drag objects: push / Scroll: zoom) are a strength ✓ —
  keep them pinned above the fold on mobile too.
- Add a first-run coach-mark: "Drag the sliders or hit ▶ Wave Demo to move the arm" — the
  empty scene gives no starting move.

### 2.8 Teacher dashboard & submission review (always-dark today)
- Stats + table layout is serviceable; replace raw-email identity with name + email-as-subtitle.
- With roster scoping, add the onboarding empty state (see 1.5) and a course filter chip row
  (assignment is per-course now — let teachers switch context).
- SubmissionReview is the strongest flow (expand → code/output/expected → Pass/Fail with
  note) ✓ — add keyboard shortcuts (P/F) for graders and a "needs review" count badge.

### 2.9 Admin pages (approvals, courses, settings, users, audit)
- Table+modal pattern is consistent. Improvements: status pills with icon+text (not color
  alone), confirm dialogs instead of `window.prompt` for certificate blocks (browser prompts
  feel unfinished), and page-level empty states. AuditLog: group entries by day; show actor
  avatar/name first, action second.

---

## 3. P2 — Motion audit (Design Motion Principles)

**Weighting:** Jakub primary · Jhey secondary (gamified bits) · Emil for editor controls.

**Motion gaps (things that should animate but don't):**
- All modals/panels/tab content mount **instantly** (no AnimatePresence/framer-motion anywhere) — add 150–200ms fade+4px rise for modals and expandable panels; 120ms crossfade for tab content (Code/Sandbox/Output tabs).
- Card hover states: add `transition: 150ms` + 1–2px lift on course/feature cards; no scale spam.
- Enrollment/submit buttons: pending state exists (opacity 0.6) ✓ — add a subtle inline spinner instead of only text swap.

**Anti-slop check (passed mostly):** no hover-scale-everything ✓, no stagger-spam ✓, no blur
entrances ✓, pulse used only 2× (approval step dot — legitimate status), marquee pauses on
hover ✓. Global `prefers-reduced-motion` kill-switch ✓ (keep any new motion inside it).

**Avoid:** springy bounces on utility actions (Sign out, Delete), scroll-jacking, motion on
static content (stats, tables).

---

## 4. Design-system foundation (Awesome Claude Design → create `DESIGN.md`)

Codify what exists into a 9-section DESIGN.md so every future screen stays on-system:

1. **Theme & atmosphere** — "energetic workshop": dark-first, warm orange spark, technical mono accents.
2. **Color roles** — `--bg/--card/--border/--txt/--txt-sec/--txt-dim` (fixed values §1.1), accent `#FF6B2B`, success `#3ECF8E`, warn `#FACC15`, danger `#F87171`, info `#22D3EE`; rule: accents carry *labels, never meaning alone*.
3. **Type scale** — display Space Grotesk 700 (44/32/24/18), body Inter 400–600 (16/15/14/13), code JetBrains Mono 13–14; line-heights 1.1 display / 1.6 body.
4. **Components** — button (primary=orange+ink label, ghost, danger), input (+focus ring), card, badge/pill (icon+text), modal, table row, empty-state, skeleton.
5. **Layout** — 8px spacing grid; section padding 64–96 (never 250); container 1180px; breakpoints 375/768/1024/1440.
6. **Depth** — one border + one shadow tier (cards: `0 1px 0 border` + hover `0 8px 24px rgba(0,0,0,.25)`); no glassmorphism drift.
7. **Do/Don't** — no emoji chrome; no rainbow value colors; no hard-coded hex outside tokens; no silent data overwrites.
8. **Responsive** — bottom nav ≤768 ✓; tables → cards; tap targets ≥44px; test 375 first.
9. **Agent prompt guide** — reusable prompt so future screens (AI or human) inherit the system.

---

## 5. Pre-flight checklist (run before every ship)

- [ ] Contrast ≥ 4.5:1 for text (3:1 large) in **both** themes
- [ ] SVG icons in chrome; emoji only inside conversational copy
- [ ] `cursor: pointer` on all clickables · visible `:focus-visible` on links too
- [ ] Every list has an empty state with a next action
- [ ] No silent overwrite of user input; confirm irreversible actions in-app (not `window.prompt`)
- [ ] Tap targets ≥ 44px; badges have text, not color-only
- [ ] Motion respects `prefers-reduced-motion`; no new anti-slop patterns (§3)
- [ ] Verified at 375 / 768 / 1024 / 1440 widths

**Suggested build order:** §1.1–1.3 (one focused pass: tokens + icons + themes) → §1.4–1.5
(nav + empty states) → §2.7 robot lab (it's the flagship) → §2.1 landing compress → §3 motion
pass → §4 DESIGN.md freeze.

---

## 6. Fixes applied — P0 pass (2026-10-06)

**Status: P0 complete.** ESLint 0 errors / 0 warnings, production build green, dark + light
mode browser-verified (computed-style checks). All changes currently **uncommitted**.

### §1.1 Contrast — done
- `txtDim` retuned in both themes (dark `#8B8B93`, light `#6B7280`); new `txtSec` check passes.
- Primary CTA labels now use `accentInk` (near-black on orange, ≈6.2:1) — Landing, buttons.
- Light-mode links use deeper `accentLink #C2410C` ("Forgot password?", active nav, eyebrows).
- New semantic tokens: `success / danger / info / warn / violet` for status text in both themes.

### §1.2 Theme parity — done
- All **13 hardcoded-dark pages** converted to `makeStyles(t)` + `useTheme()`: AdminCourses,
  AuditLog, CodeSandbox, CreateClass, Leaderboard, LiveClassRoom, LiveClassesPage,
  ProjectEditor, ProjectsPage, Simulation, StudentProfile, TaskPage, TeacherDashboard
  (+ Login, ResetPassword, Landing, Dashboard, BottomNav, SearchModal from earlier batches).
- `grep #0a0a0f|#0A0E16|#131926 src` → **zero app-chrome hits left**; the only remaining
  occurrences are intentional: `CertificateView` + its PDF generator (branded plaque artifact,
  keeps its design in both themes — commented as such).
- Global scrollbar is theme-agnostic; static media-query borders use `var(--border)`.
- Starter code templates (CodeSandbox HTML/CSS starters, projectTemplates styles.css /
  App.jsx / Node public/index.html) converted to light defaults with AA text colors.

### §1.3 Emoji-as-icons — mostly done
- New `src/components/Icon.jsx` (~20 Lucide-style inline SVGs, `currentColor`, aria-hidden).
- BottomNav, section headers, buttons, badges on all converted pages now use SVG icons;
  output/console prefixes standardized to `[ok] / [error] / [warn] / [stderr]`.
- **Remaining:** emoji on unconverted surfaces (Courses/Dashboard section headers,
  projectTemplates file-type glyphs in the new-project modal).

### §2.6 Data-loss bug — done (P1 pulled forward)
- CodeSandbox language switch now confirms before overwriting edited code; declining keeps
  the current selection (controlled select).

### §1.4 Nav finding — corrected (see above; was a viewport artifact)

### Not yet done (next batches)
§1.5 empty states · §2.1 landing hero compress · §2.5 task-page prompt/attempt UX ·
§2.7 robot-lab joint colors + slider ranges + instruction scroll · §2.8–2.9 teacher/admin
polish · §3 motion pass · §4 DESIGN.md · footer tap targets · remaining emoji sweep.

---

## 7. Follow-up deep audit — remaining items (2026-10-10)

**Method:** re-measured in the running dev server (computed styles + DOM geometry at
1440×900, 1280×715, 375×812) plus static sweeps. Companion document: `FUNCTIONAL_AUDIT.md`
(functional review of teacher/admin/student flows). **No fixes applied in this pass —
findings only.**

### 7.1 §1.5 Empty states — improved but uneven
Since the original audit a reusable `EmptyCard` exists in Dashboard (dashed border,
message + one-line action, whole card clickable). Status by page (code-reviewed):

| Page | Current state | Gap |
|---|---|---|
| Dashboard | `EmptyCard` for courses/activity; Top Performers shows bare `No data yet` (L397) | no icon, no button; one bare line remains |
| CoursesPage | 48px 📚 icon + "No courses yet" + role-aware *why* + guidance text (L124–131) | icon is emoji (§1.3); no CTA button |
| TeacherDashboard | "No students… after an admin assigns you (Admin → Courses → Teachers)" (L164–169) | excellent *why*; no button |
| AdminApprovals | bare `<p>No users found.</p>` (L153–156) | worst offender — nothing else |
| Leaderboard / SubmissionReview / TaskPage / ProjectsPage / SiteSettings / AuditLog | one-line `No …` texts exist | text-only, no icon/action |

**Verdict:** the "500px of void" claim no longer reproduces on Dashboard (EmptyCard), but
the *formula* (icon + why + primary button) is only ~50% applied. **Fix:** promote
`EmptyCard` into a shared `EmptyState({ icon, message, why, action })`, add the missing CTA
buttons, and replace the bare lines (AdminApprovals, Top Performers). Live empty-account
verification still [blocked] — needs a real approved account with zero data.

### 7.2 §2.1 Landing hero — desktop solved; mobile still 1.85 viewports
- **1440×900:** hero = exactly **900px (100vh)**; 2-col (copy 502px incl. badge + h1 + sub +
  CTAs + inline stat row; code card 348px beside it). All §2.1 desktop asks — compress,
  2-col code card, stats above fold — are **met**.
- **1280×715:** hero = exactly **715px**; content box 702px (padding 120/80) — fits.
- The historic *"1312px hero"* measured the **stacked** mode: `flex-direction: column`
  below 769px (Landing.jsx:553). Re-measured **375×812: hero = 1500px (+688 ≈ 1.85vh)**.
  Mobile shows badge → h1 → sub → CTAs → stats → code card, all stacked. **Fix:** on
  ≤480px hide the code card (or cap it to ~200px) and keep CTA + stats inside the first
  viewport.
- **Secondary CTA "Explore Features":** equal height (53 vs 51px) ✓ but border
  `0.8px solid rgb(39,39,42)` + label `rgb(161,161,170)` → reads disabled even in dark.
  **Fix:** 1px solid `#52525B` (dark) / `#A1A1AA` (light), label `txtSec`.
- **Trust row above fold:** partner marquee measured at y=900 (first thing *after* the
  hero) — not above the fold. Lift 3–4 logos under the CTAs, or accept marquee position.
- **Heading→content gaps:** features subtitle → grid = **56px** (already inside the
  64–96 target zone); the "~250px" figure does not reproduce at these widths — that
  finding is stale.
- **Feature-card hover lift:** exists (`transition: all 0.4s ${ease}` + translateY(-4px)).
  Tune: **0.15s** and transition only `transform, box-shadow, border-color` (Jakub polish).

### 7.3 §2.7 Robot lab — browser-verified, all three claims confirmed
Verified live on `/simulation` at 1280×715 and 375×812:
- **Rainbow joint values CONFIRMED:** each joint's value is a different hue — J1
  `rgb(249,115,22)` (#F97316), J2 `rgb(56,189,248)` (#38BDF8), … **Fix:** one value color
  (`txt`); use a second color only for *out-of-neutral* state (e.g. gripper ≠ 100%).
- **Slider ranges never displayed:** native `min/max` exist (J1/J4/J5 −180…180, J2
  −75…90, J3 −135…135, J6 −360…360, gripper 0…100 — J2's −75 matches the instruction),
  but the visible row reads only `Joint 2 (Shoulder)  0°`. **Fix:** print the range
  endpoints under the track (and/or `−75°…90°` in the label row). Native inputs already
  expose min/max to screen readers ✓.
- **Instructions clipped CONFIRMED:** help card measured `scrollHeight 660 > clientHeight
  626` at 1280×715 → steps 6–7 need scrolling with **no fade or affordance**. **Fix:**
  bottom gradient + slight padding, or expand the card; on mobile the whole panel is
  collapsed behind an unlabeled `▶` button — add `aria-label="Show controls"` + a visible
  "Controls" handle.
- **Chrome emoji remaining:** legend `🖱️ 📦 🔍`, play `▶`, panel-collapse `▶` (5 total).
  Tabs (Controls/Code/Output) and Reset are clean text ✓ (🗑 gone).
- **Legend on mobile:** measured bottom 740 ≤ 812 → **above the fold ✓** (audit
  requirement met).
- **Mobile header (375):** title wraps to 4 lines, Dashboard link wraps — cramped single
  row with gear + select + Run.
- **Still missing:** first-run coach mark ("Drag a slider or hit Run to move the arm").

### 7.4 §3 Motion pass — inventory measured
- Keyframes present: `pulse, pulseGlow, fadeIn, spin, marquee, marqueeReverse`
  (index.css:29–54); `transition:` in 21 files; **global reduced-motion kill-switch ✓**
  (index.css:120–125).
- **Landing `Reveal` is heavier than the anti-slop checklist allows:**
  `opacity 0→1 + translateY(40px) + blur(8px)→0, 0.9s` with 0.1s stagger (Landing:105–112).
  **Fix:** 300ms, ≤12px travel, drop the blur, keep ≤3 stagger steps.
- **Modals mount instantly:** `fadeIn` is used only for the mobile nav overlay
  (Landing:168). SearchModal, ProjectsPage, ProjectEditor, AdminCourses,
  AdminUserManagement modals have **zero entrance animation**. **Fix:** one shared
  `.modal-enter` class (150ms fade + 4px rise) — automatically covered by the
  reduced-motion kill-switch.
- Tab content (Code/Sandbox/Output) swaps instantly — 120ms crossfade candidate.
- Pending-button state = opacity swap ✓; inline spinner still missing (as §3 noted).
- No new anti-slop patterns introduced by the P0 pass.

### 7.5 §4 DESIGN.md — readiness check
Ready to codify today: theme tokens in `ThemeContext` (incl. §1.1 retuned `txtDim`,
`accentInk`, `accentLink`, semantic `success/danger/info/warn/violet` in both themes);
type trio (Space Grotesk / Inter / JetBrains Mono); 8px rhythm + section padding 60 +
container `T.maxW` + breakpoints 375/768/1024/1440 (Landing:549–574); component patterns
`SectionHeader`, `EmptyCard`, `Icon` (~20 glyphs), `BottomNav`, `SearchModal`,
`thStyle/tdStyle` tables; intentional theme-independent artifacts (CertificateView plaque,
3D viewport, editor canvases).
**Blocking gaps:** shared modal-animation class, shared `EmptyState`, skeleton component —
otherwise DESIGN.md would document components that don't exist yet. **Verdict:** write it
after the §7.4 + §7.1 fixes land (they create the final three components).

### 7.6 §1.4 Footer tap targets — measured precisely
At both 1440×900 and 375×812: **all 9 footer links are 16px tall** (desktop widths 48–93px;
mobile full-width 330px). Zero reach the 44px target — none even reach 32px. **Fix:**
`padding: 12px 0` per link (→ ~40–44px hit area) without changing the visual column rhythm.

### 7.7 §1.3 Emoji sweep — current count: 202 across 20 files
| File | Count | Notes |
|---|---|---|
| Dashboard.jsx | 44 | section headers 📡📝🏆📊, medals 🥇🥈🥉, stats ⭐ |
| ProjectEditor.jsx | 31 | file-tree glyphs 📄⚛️🟨🔷, ⚙️ |
| CourseDetailPage.jsx | 26 | 🔒 module locks, 💳, 🎓 |
| projectTemplates.js | 16 | starter-template glyphs (content-ish — lower priority) |
| SubmissionReview.jsx | 16 | ✅❌ badges, 👩🏫 identity |
| CoursesPage.jsx | 14 | 📚 header, 👥, 🗑 |
| AdminAnalytics / PaymentPage | 13 / 13 | headers, feature rows |
| AdminUserManagement, Simulation, AdminCourses | 5 / 5 / 4 | buttons/labels |
| LabGate, certificate.js, ErrorBoundary, ProtectedRoute, Login, Reset, ProjectsPage, CertificateView, main | 1–3 each | ⏳❌ pending-screen icons, ⚠️ error icon are high-visibility |

**Fix order:** (1) Dashboard/CourseDetail/CoursesPage section headers + locks → `Icon.jsx`;
(2) ProjectEditor file-tree + SubmissionReview badges → icons/text; (3) ProtectedRoute
pending `⏳/❌` + ErrorBoundary `⚠` → icons (they render at 48px); (4) keep ✅/❌/🎉 only
inside conversational sentences.
