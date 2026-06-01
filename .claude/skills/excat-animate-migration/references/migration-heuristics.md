# Migration Heuristics

Quick rules for mapping source motion to EDS-compatible approaches. Use during **Recommend** phase after Extract is complete.

## EDS Compatibility Constraints

1. **No build step** — Vanilla JS (ES6+) and CSS only
2. **No frameworks** — No GSAP, anime.js, AOS (exception: `lottie-web` via delayed.js)
3. **Three-phase loading** — `loadEager` (no animations, LCP), `loadLazy` (IO animations), `loadDelayed` (Lottie)
4. **Progressive enhancement** — Content usable without motion
5. **Accessibility** — `prefers-reduced-motion: reduce`; keep `:focus-visible` transitions
6. **Performance** — Prefer IO over scroll listeners; animate only `transform` and `opacity`

## Taxonomy → EDS Pattern Map

| Taxonomy | Preferred EDS Pattern | Notes |
|----------|----------------------|-------|
| CSS-only | preserve in block CSS / lazy-styles | Refactor layout-thrash props to transform |
| Scroll-linked CSS/WAAPI | G (parallax) or B (scripted) | Simplify scrubbed timelines to step reveals |
| GSAP timeline | B or A | Rebuild with rAF + IO; do not port GSAP |
| Lottie | F | DA link-text authoring for JSON path |
| SVG / mask / clip-path | preserve in block CSS | Inline SVG; avoid SMIL — use CSS `@keyframes` on SVG props |
| Canvas | B or static fallback | Decorative canvas → PNG sequence or static |
| WebGL / Three.js | video fallback, static, or embedded external | Export loop video; or iframe embed if vendor provides |
| Video fallback | native `<video>` | autoplay muted loop playsinline |
| Custom interaction / microinteraction | D | CSS transitions in block CSS; preserve `:focus-visible` |
| Redesign | stakeholder review | Propose static comp or simplified story |

## Difficulty Rubric

| Level | Signals |
|-------|---------|
| **low** | CSS-only, single trigger, no external assets |
| **medium** | IO reveal, Lottie <200KB, counter, hover suites |
| **high** | Scroll-scrub, multi-element stagger, GSAP timeline >3 steps |
| **extreme** | WebGL, canvas physics, full-page pinned narrative, cross-page transitions |

## File Placement

| Animation Type | File | Load Phase |
|----------------|------|------------|
| Scroll-reveal init | `scripts/scripts.js` → `loadLazy()` | Lazy |
| Scroll-reveal CSS | `styles/lazy-styles.css` | Lazy |
| Lottie loader | `scripts/delayed.js` | Delayed |
| Block-specific | `blocks/{name}/{name}.js` + `.css` | With block |
| Parallax | `scripts.js` or block JS | Lazy |

## Reuse Before Creating

Check project for existing:
- `initScrollReveal()` in `scripts.js`
- Counter utilities in block JS
- Lottie init in `delayed.js`
- Shared classes (`.scroll-reveal`, `.is-visible`)

**Extend existing infrastructure; do not duplicate.**

## Quick Decision Tree (post-taxonomy)

```
Classified animation
├── Lottie? → Pattern F (or static fallback if decorative)
├── Scroll-triggered?
│   ├── Numeric value? → Pattern C
│   ├── Simple reveal? → Pattern A
│   └── Complex sequence? → Pattern B (or simplify)
├── Hover/focus? → Pattern D
├── Page load? → Pattern E
├── Parallax/scrub? → Pattern G (or simplify)
└── WebGL/Canvas? → static/video fallback (decision matrix)
```
