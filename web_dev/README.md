# Ignite Lab — Web Development Design Skills Package

> Consolidated from: high-end-visual-design, design-taste-frontend (v1 & v2), brandkit, premium, clean, spacious, bold, futuristic, glassmorphism

## Quick Reference Dials

| Dial | Value | Meaning |
|------|-------|---------|
| DESIGN_VARIANCE | 8 | Asymmetric bento, not symmetrical grids |
| MOTION_INTENSITY | 6 | Fluid CSS transitions, not cinematic |
| VISUAL_DENSITY | 4 | Spacious, breathing, expensive |

## 1. Design System — Tokens

### Colors (Dark Mode — Ethereal Glass)
```
bg:       #050508
surface:  #0C0F18
card:     #111624
txt:      #EDEFF3
txtSec:   #8A93A6
txtDim:   #5C6478
accent:   #FF5A1F (Ignite Orange)
cyan:     #2FD1D6
green:    #3ECF8E
gold:     #FFB238
red:      #F87171
line:     rgba(237,239,243,0.07)
```

### Typography
- Display: Space Grotesk (700, -0.04em tracking)
- Body: Inter (400-600)
- Mono: JetBrains Mono (400-500)
- Scale: 11/13/14/15/16/17/18/20/28/32/36/44/52/72

### Spacing
- Section padding: 140px 40px (desktop), 80px 20px (mobile)
- Card padding: 32px 28px
- Gap: 16px (cards), 32px (sections)
- Max width: 1280px

### Animation
```css
bezier: cubic-bezier(0.16, 1, 0.3, 1)
```

## 2. Absolute Zero — Banned Patterns

### Fonts
- ❌ Inter for display headings (OK for body)
- ❌ Roboto, Arial, Open Sans, Helvetica
- ❌ Fraunces, Instrument_Serif

### Icons
- ❌ Lucide, FontAwesome, Material Icons (thick strokes)
- ✅ Phosphor Light, Remix Line, custom SVG (strokeWidth: 1.5)

### Colors
- ❌ AI purple/blue gradients (the "Lila Rule")
- ❌ Pure black #000000
- ❌ Oversaturated accents
- ❌ Warm beige + brass (default premium consumer ban)

### Shadows
- ❌ Generic 1px solid gray borders
- ❌ Harsh dark shadows (rgba(0,0,0,0.3))
- ✅ Tinted shadows matching background hue

### Layout
- ❌ Centered hero (when VARIANCE > 4) — use split/asymmetric
- ❌ 3 equal cards horizontally
- ❌ Edge-to-edge sticky navbars
- ❌ `h-screen` — use `min-h-[100dvh]`

### Motion
- ❌ `linear` or `ease-in-out` transitions
- ❌ `useState` for continuous mouse/scroll values
- ❌ `window.addEventListener('scroll')` — use IntersectionObserver
- ✅ Custom cubic-bezier curves
- ✅ transform + opacity only (no top/left/width/height)

### Content
- ❌ Generic names (John Doe, Sarah Chan)
- ❌ Fake precise numbers (99.99%, 50%)
- ❌ Emojis in code/markup (use SVG icons)
- ❌ "Elevate", "Seamless", "Unleash", "Next-Gen"
- ❌ Long paragraphs in hero section

## 3. Component Architecture

### Nav (Floating Glass Pill)
- Detached from top: `mt-6 mx-auto w-max rounded-full`
- `backdrop-blur(20px) saturate(1.4)` — ONLY on fixed/sticky elements
- `pointer-events: none` on wrapper, `pointer-events: auto` on pill
- Z-index: 9999 (only nav needs this)

### Cards (Double-Bezel / Doppelrand)
```jsx
// Outer Shell
{ background: rgba(237,239,243,0.03), border: 1px solid line, borderRadius: 20, padding: 3 }
// Inner Core
{ background: card, borderRadius: 17, padding: "32px 24px" }
```
- NO `backdrop-blur` on scrolling card content
- Tinted shadows, not pure black

### CTAs (Button-in-Button)
- Primary: pill-shaped, gradient background, trailing arrow in nested circle
- Ghost: transparent, hairline border
- Active: `scale(0.98)` for tactile press
- Max 1 CTA intent per page

### Bento Grid
- Asymmetric: `col-span-2` mixed with `col-span-1`
- At least 2-3 cells with real visual variation (not all text cards)
- Mobile: aggressive collapse to single column

### Footer
- `background: surface` (not transparent)
- `position: relative; z-index: 1` (above canvas if present)
- NEVER transparent over 3D scenes

## 4. Hero Discipline

- **Max 2 lines** headline on desktop
- **Max 20 words** subtext
- **Max 4 text elements** total: eyebrow, headline, subtext, CTAs
- Trust logos go BELOW hero, not inside
- Top padding max `pt-24` (6rem)
- Must fit in initial viewport

## 5. Section Variety Rules

- Once a layout family is used, it can appear at most ONCE
- Max 1 eyebrow per 3 sections
- No more than 2 consecutive zigzag (left-image + right-text) patterns
- Bento backgrounds must have visual diversity (gradients, images, patterns)

## 6. Performance Rules

- `backdrop-blur` ONLY on fixed/sticky elements
- Animate only `transform` and `opacity`
- `will-change: transform` sparingly
- Grain/noise: `position: fixed; pointer-events: none; z-index: 1`
- GPU-safe: never animate layout-triggering properties

## 7. Accessibility

- WCAG 2.2 AA contrast minimum
- 44px+ touch targets
- `prefers-reduced-motion` support (disable all animations)
- Semantic HTML before ARIA
- Visible focus states (`outline: 2px solid accent`)
- Keyboard-first interactions

## 8. Responsive Rules

- Breakpoints: sm 640, md 768, lg 1024, xl 1280
- Layout max: `max-w-[1400px] mx-auto`
- Grid over flex math
- `min-h-[100dvh]` not `h-screen`
- Mobile: single column, px-4, py-8
- Hamburger at 768px

## 9. Ignite Lab Specific

- Brand color: `#FF5A1F` (Ignite Orange)
- Bangladesh BDT pricing: ৳500, ৳1,200
- Footer: "Made in Bangladesh"
- Audience: Students in Bangladesh (EdTech/Robotics)
- Vibe: Dark tech, futuristic, premium education
- Code preview card with syntax highlighting in hero
- Tech stack badges: Python, Java, C++, JavaScript, Three.js, Monaco, Supabase
