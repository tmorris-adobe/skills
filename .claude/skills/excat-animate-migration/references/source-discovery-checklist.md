# Source Discovery Checklist

Run this checklist during **Phase 1: Extract**. Report findings for every section — use `unknown` or `not observed` when evidence is missing; do not infer.

## Checklist

Copy and fill for each page or major section:

```markdown
## Source Discovery — [page URL or section name]

### HTML structure and triggers
- [ ] DOM regions that animate (hero, sticky panels, pinned sections, modals)
- [ ] Data attributes used as triggers (`data-aos`, `data-scroll`, custom `data-*`)
- [ ] Class-based trigger patterns (`.animate`, `.reveal`, `.is-inview`)
- [ ] Event triggers observed: load / scroll / hover / click / resize
- [ ] Motion behavior per effect: repeat / once / scrub / pin / sequence
- **Findings:**

### CSS transitions and animations
- [ ] `@keyframes` rules (names, properties animated)
- [ ] Elements with active `animation-*` computed styles
- [ ] Transition properties and durations on interactive elements
- [ ] Scroll-driven CSS (`animation-timeline`, `@scroll-timeline`)
- **Findings:**

### JS animation libraries
- [ ] Globals detected (GSAP, AOS, Lottie, Three.js, Swiper, etc.)
- [ ] Script sources loaded (CDN URLs, bundled chunks)
- [ ] Custom animation modules (search for `requestAnimationFrame`, `Tween`, `timeline`)
- **Findings:**

### Scroll listeners and IntersectionObserver
- [ ] Scroll event listeners (count; cannot enumerate handlers — note behavioral evidence)
- [ ] Sticky/fixed positioning used with scroll-linked transforms
- [ ] Pinning or scrubbing behavior (progress tied to scroll position)
- [ ] IntersectionObserver-driven class toggles (opacity/transform changes on scroll)
- **Findings:**

### SVG / Lottie / Canvas / WebGL usage
- [ ] Inline SVG with SMIL or CSS animation
- [ ] SVG mask/clip-path animation
- [ ] Lottie containers and JSON asset paths
- [ ] `<canvas>` elements and draw loops
- [ ] WebGL contexts / Three.js scenes
- **Findings:**

### Asset dependencies
- [ ] External JSON (Lottie), sprite sheets, video files
- [ ] Font/icon animation assets
- [ ] CDN-hosted libraries required at runtime
- [ ] Lazy-loaded chunks that gate animation init
- **Findings:**

### Breakpoints and mobile behavior
- [ ] Animations disabled or simplified at mobile breakpoints
- [ ] Different motion on touch vs hover
- [ ] Reduced-height viewports (sticky sections collapse?)
- [ ] `prefers-reduced-motion` handling on source (if detectable)
- **Findings:**
```

## Detection Script

Run `detect-animations.js` via browser evaluate for structured raw inventory:

```bash
# Paste detect-animations.js into browser_evaluate on source page
# Returns: cssKeyframes, cssAnimations, lottie, scrollTriggered, jsLibraries, etc.
```

Supplement script output with:
- Full-page scroll pass (400px steps, 200ms delay)
- Screenshots at key scroll positions
- Mobile viewport pass if migration target includes mobile

## Section Grouping

Group findings by **page section** (hero, stats band, sticky story, footer CTA), not by technology alone. One section may contain multiple taxonomy classes.
