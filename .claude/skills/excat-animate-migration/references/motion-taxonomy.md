# Motion Taxonomy

Every detected animation **must** be classified into exactly one primary category before analysis or migration planning.

## Required Categories

| Category | Definition | Evidence Required |
|----------|------------|-------------------|
| **CSS-only** | Pure CSS transitions, `@keyframes`, or `:hover`/`:focus` effects with no JS driver | Computed `animation-*` or `transition-*` on elements; no scroll/IO/JS hooks |
| **Scroll-linked CSS/WAAPI** | CSS or Web Animations API tied to scroll position, sticky sections, or scroll-driven animations | `animation-timeline: scroll()`, scroll listeners updating CSS vars, sticky + transform, or WAAPI with scroll progress |
| **GSAP timeline** | GSAP/TweenMax timelines, ScrollTrigger, or timeline-based sequencing | `window.gsap`, `ScrollTrigger`, timeline markup in DOM/scripts |
| **Lottie** | Bodymovin/Lottie JSON vector animations | `<lottie-player>`, `lottie.loadAnimation`, `.json` animation assets |
| **SVG / mask / clip-path** | Inline SVG motion via SMIL, CSS on SVG, or animated mask/clip-path | `<svg>` with SMIL/CSS animation; `clip-path` or `mask` property changes |
| **Canvas** | 2D canvas drawing animated via rAF or library | `<canvas>` with draw loop, Chart.js, particles on canvas |
| **WebGL / Three.js** | 3D scenes, shaders, WebGL contexts | `THREE`, `<canvas>` with WebGL context, PixiJS with WebGL |
| **Video fallback** | Motion conveyed by `<video>`, GIF, or animated WebP | Autoplay video, background video, no programmatic motion |
| **Custom interaction / microinteraction** | Small motion tied to hover, focus, click, or toggle — not page-level narrative | `:hover` lift, button ripple, accordion expand, tooltip fade, hamburger → cross |
| **Do not migrate as-is; redesign** | Motion is inseparable from proprietary runtime, fragile, or EDS-incompatible at reasonable cost | Full-page WebGL narrative, physics sim, custom SPA router transitions, motion tied to unavailable APIs |

## Classification Rules

Apply in order — first match wins unless evidence supports a more specific category:

```
1. WebGL context or THREE/PIXI global?       → WebGL / Three.js
2. Canvas with rAF draw loop?                → Canvas
3. Lottie player or .json animation path?    → Lottie
4. Autoplay video as primary motion?         → Video fallback
5. GSAP/ScrollTrigger in scripts?            → GSAP timeline
6. Scroll-linked (scrub, pin, parallax)?     → Scroll-linked CSS/WAAPI
7. SVG SMIL or animated mask/clip-path?      → SVG / mask / clip-path
8. Hover/focus/click-only microinteraction?  → Custom interaction / microinteraction
9. CSS @keyframes/transitions only?          → CSS-only
10. Cannot isolate or cost exceeds value?    → Do not migrate as-is; redesign
```

**Disambiguation:** If SVG motion is scroll-scrubbed, classify as **Scroll-linked CSS/WAAPI** (driver wins). If a hover effect uses complex JS (not CSS), classify as **Custom interaction / microinteraction**.

## Secondary Tags (optional, additive)

- `trigger: page-load | scroll-into-view | scroll-progress | hover | click | timer`
- `motion_behavior: repeat | once | scrub | pin | sequence` (required — see output-schema.md)
- `scope: element | section | page | viewport`
- `complexity: low | medium | high | extreme`

## Output Field

Each animation entry must include:

```yaml
motion_taxonomy: CSS-only  # one of the 10 required categories
motion_behavior: once  # repeat | once | scrub | pin | sequence
taxonomy_evidence:
  - "Computed animation-name: fadeInUp on .hero-title"
  - "No GSAP or scroll listeners detected on hero"
taxonomy_confidence: high | medium | low
```

If `taxonomy_confidence` is `low`, state what observation would resolve uncertainty.
