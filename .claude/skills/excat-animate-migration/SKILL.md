---
name: excat-animate-migration
description: Auto-detect, analyze, and replicate animations from source webpages into Adobe Edge Delivery Services. Handles CSS animations, JavaScript animations, Lottie/bodymovin, scroll-triggered effects, counter animations, parallax, and any custom animation regardless of original implementation. Recreates animations using EDS-compatible vanilla JS, CSS, and IntersectionObserver patterns. Invoke when user says "migrate animations", "replicate animations", "detect animations", "recreate animations", or references animation work on a source site.
---

# EXECUTION MINDSET

**You are an ACTION-ORIENTED agent. Your job is to DETECT, ANALYZE, and RECREATE animations, not write reports about them.**

- DO: Navigate source pages, detect all animations, analyze their behavior, and recreate them
- DO: Write working EDS-compatible vanilla JS and CSS
- DO: Test animations locally at http://localhost:3000 and verify visually
- DON'T: Generate markdown reports or summaries unless explicitly requested
- DON'T: Skip animations because they're "too complex" — find an EDS-compatible equivalent

**Your output should be working animated code, not documentation about your process.**

---

# Animation Migration Skill

## Purpose

Automatically detect, analyze, and faithfully replicate all animations from a source webpage into an Adobe Edge Delivery Services project. This skill handles ANY animation type regardless of original implementation technology, and recreates them using only EDS-compatible techniques (vanilla JS, CSS, IntersectionObserver).

## Scope

This skill covers ALL animation types found on webpages:

| Animation Type | Detection Method | EDS Recreation Approach |
|---|---|---|
| CSS transitions/animations | Computed styles, `@keyframes` in stylesheets | Vanilla CSS `@keyframes` + class toggles |
| JavaScript animations | `requestAnimationFrame`, `setInterval`, GSAP, anime.js | Vanilla `requestAnimationFrame` |
| Lottie / Bodymovin | `<lottie-player>`, `.json` animation files, `lottie.loadAnimation` | `lottie-web` via `delayed.js` |
| Scroll-triggered reveals | IntersectionObserver, scroll listeners, Waypoints, AOS, ScrollMagic | IntersectionObserver + CSS class toggle |
| Counter/number animations | Animated numeric values on scroll | `requestAnimationFrame` + IntersectionObserver |
| Parallax effects | Transform on scroll, background-attachment | CSS `transform` via scroll listener or IO |
| SVG animations | SMIL, CSS on SVG elements, JS-driven SVG | Inline SVG + CSS animations |
| Video backgrounds | `<video autoplay>`, embedded players | Native `<video>` element |
| Hover/interaction effects | `:hover`, `:focus`, mouse-tracking | CSS pseudo-class transitions |
| Page load animations | Entry animations, splash screens | CSS animations triggered by class addition |
| Carousel/slider motion | Swiper, Slick, Flickity, custom | EDS carousel block pattern |
| Typed text / morphing | Typewriter effects, text scramble | Vanilla JS character-by-character |

## Quick Decision Tree

Use this to rapidly classify each detected animation and choose the right EDS pattern:

```
Detected Animation
├── Is it a Lottie/Bodymovin JSON animation?
│   └── YES → Pattern F: Lottie via delayed.js
├── Is it triggered by scroll (enters viewport)?
│   ├── Does it animate a numeric value?
│   │   └── YES → Pattern C: Counter via rAF + IntersectionObserver
│   ├── Is it a simple reveal (fade/slide/scale)?
│   │   └── YES → Pattern A: Scroll-reveal via IO + CSS class toggle
│   └── Is it a complex multi-step animation?
│       └── YES → Pattern B: rAF-driven animation + IO trigger
├── Is it triggered by hover/focus?
│   └── YES → Pattern D: CSS :hover/:focus-visible transitions
├── Is it triggered on page load?
│   └── YES → Pattern E: CSS @keyframes (deferred to loadLazy)
├── Is it a parallax/scroll-linked effect?
│   └── YES → Pattern G: IO + scroll listener with rAF
└── Is it a video background?
    └── YES → Native <video autoplay muted loop>
```

### EDS Animation Patterns (A–G)

| Pattern | Name | Trigger | EDS Technique | File Location |
|---------|------|---------|---------------|---------------|
| A | Scroll Reveal | Viewport entry | `IntersectionObserver` + CSS class toggle | `scripts.js` + `lazy-styles.css` |
| B | Scripted Scroll Animation | Viewport entry | `IntersectionObserver` + `requestAnimationFrame` | Block JS |
| C | Counter | Viewport entry | `rAF` + `IntersectionObserver` + easing | Block JS |
| D | Hover/Focus | `:hover` / `:focus-visible` | CSS transitions | Block CSS |
| E | Page-Load Entry | `loadLazy` completes | CSS `@keyframes` | `lazy-styles.css` |
| F | Lottie | `delayed.js` loads | `lottie-web` + `data-lottie-path` | `delayed.js` + Block JS |
| G | Parallax | Scroll position | IO + scroll listener + `rAF` | `scripts.js` or Block JS |

Reference these patterns by letter in code comments (e.g., `// Pattern A: scroll-reveal`) for consistency across the project.

## EDS Compatibility Constraints

All recreated animations MUST follow these rules:

1. **No build step** — Vanilla JS (ES6+) and CSS only, no transpilation
2. **No frameworks** — No GSAP, anime.js, AOS, or animation libraries (exception: `lottie-web` for Lottie files)
3. **Three-phase loading** — Respect EDS load phases:
   - `loadEager` — First section only, no animations here (LCP)
   - `loadLazy` — Remaining sections, scroll-reveal and IO-based animations initialize here
   - `loadDelayed` — Heavy libraries (Lottie) load here via `delayed.js`
4. **Progressive enhancement** — Content must be visible/usable without animations
5. **Accessibility** — Always respect `prefers-reduced-motion: reduce`; preserve `:focus-visible` transitions for keyboard navigation (these are functional, not decorative)
6. **Performance** — Use `IntersectionObserver` over scroll listeners; use `requestAnimationFrame` for JS animations; **only animate `transform` and `opacity`** (these are compositor-friendly and avoid layout thrashing — never animate `width`, `height`, `top`, `left`, `margin`, or `padding`)

## Workflow

### Phase 1: Detection

**Goal:** Identify every animation on the source page.

**Steps:**

1. **Navigate to source URL** using Playwright `browser_navigate`

2. **Take full-page screenshot** for visual reference

3. **Detect CSS animations and transitions:**
   ```javascript
   // Evaluate in browser
   () => {
     const animations = [];
     // Check all stylesheets for @keyframes and transitions
     for (const sheet of document.styleSheets) {
       try {
         for (const rule of sheet.cssRules) {
           if (rule instanceof CSSKeyframesRule) {
             animations.push({ type: 'keyframes', name: rule.name, css: rule.cssText });
           }
         }
       } catch(e) { /* cross-origin stylesheet */ }
     }
     // Check computed styles for transition/animation properties
     document.querySelectorAll('*').forEach(el => {
       const style = getComputedStyle(el);
       if (style.animationName !== 'none') {
         animations.push({ type: 'css-animation', element: el.tagName + '.' + el.className, animation: style.animationName });
       }
       if (style.transitionProperty !== 'all' && style.transitionDuration !== '0s') {
         animations.push({ type: 'css-transition', element: el.tagName + '.' + el.className, property: style.transitionProperty });
       }
     });
     return animations;
   }
   ```

4. **Detect Lottie animations:**
   ```javascript
   () => {
     const lotties = [];
     // <lottie-player> web components
     document.querySelectorAll('lottie-player').forEach(el => {
       lotties.push({ type: 'lottie-player', src: el.getAttribute('src'), loop: el.hasAttribute('loop'), autoplay: el.hasAttribute('autoplay') });
     });
     // lottie.loadAnimation calls (check for lottie global)
     if (window.lottie) lotties.push({ type: 'lottie-web', note: 'lottie-web library detected' });
     // Bodymovin containers
     document.querySelectorAll('[data-animation-path], [data-bm-renderer]').forEach(el => {
       lotties.push({ type: 'bodymovin', path: el.dataset.animationPath });
     });
     return lotties;
   }
   ```

5. **Detect scroll-triggered animations:**
   ```javascript
   () => {
     const scrollAnimated = [];
     // AOS library
     document.querySelectorAll('[data-aos]').forEach(el => {
       scrollAnimated.push({ type: 'aos', effect: el.dataset.aos, delay: el.dataset.aosDelay });
     });
     // Elements with opacity:0 or transform (likely scroll-reveal candidates)
     document.querySelectorAll('.section, [class*="animate"], [class*="reveal"], [class*="fade"]').forEach(el => {
       const style = getComputedStyle(el);
       if (style.opacity === '0' || style.transform !== 'none') {
         scrollAnimated.push({ type: 'hidden-for-reveal', element: el.tagName + '.' + el.className, opacity: style.opacity, transform: style.transform });
       }
     });
     return scrollAnimated;
   }
   ```

6. **Detect counter/number animations:**
   ```javascript
   () => {
     const counters = [];
     // Elements with numeric content that may animate
     document.querySelectorAll('strong, .counter, .stat, [class*="count"], [class*="number"]').forEach(el => {
       const text = el.textContent.trim();
       if (/^\d/.test(text)) {
         counters.push({ type: 'counter-candidate', element: el.tagName + '.' + el.className, value: text });
       }
     });
     return counters;
   }
   ```

7. **Detect JavaScript animation libraries:**
   ```javascript
   () => {
     const libs = [];
     if (window.gsap || window.TweenMax) libs.push('GSAP');
     if (window.anime) libs.push('anime.js');
     if (window.ScrollMagic) libs.push('ScrollMagic');
     if (window.Waypoint) libs.push('Waypoints');
     if (window.AOS) libs.push('AOS');
     if (window.Swiper) libs.push('Swiper');
     if (window.lottie || window.bodymovin) libs.push('Lottie/Bodymovin');
     if (window.Rellax) libs.push('Rellax (parallax)');
     if (window.Typed) libs.push('Typed.js');
     if (window.counterUp) libs.push('CounterUp');
     return libs;
   }
   ```

8. **Scroll the full page** to trigger lazy-loaded animations and observe behavior changes:
   ```javascript
   // Scroll incrementally to trigger IntersectionObservers
   async () => {
     const totalHeight = document.body.scrollHeight;
     for (let y = 0; y < totalHeight; y += 400) {
       window.scrollTo(0, y);
       await new Promise(r => setTimeout(r, 200));
     }
   }
   ```

9. **Take screenshots at multiple scroll positions** to capture animation states

10. **Compile detection results** into a structured animation inventory

### Phase 2: Analysis

**Goal:** For each detected animation, determine its exact behavior and map to an EDS-compatible recreation strategy.

For each animation found in Phase 1, complete this analysis checklist:

1. **Classify** the animation:
   - **Trigger**: page-load | scroll-into-view | hover | focus | click | timer
   - **Effect**: fade | slide | scale | rotate | counter | reveal | parallax | lottie | custom
   - **Duration**: Extract from CSS or estimate from observation
   - **Easing**: Extract easing function (ease-out, cubic-bezier, etc.)
   - **Direction**: up | down | left | right | none
   - **Initial state**: What CSS properties are set before animation (e.g., `opacity: 0; transform: translateY(24px)`)
   - **Final state**: What CSS properties are set after animation (e.g., `opacity: 1; transform: none`)
   - **Animated properties**: List every CSS property that changes (e.g., `opacity, transform`)
   - **Iteration**: once | infinite | specific count
   - **Delay**: Static delay or staggered (index-based)

   Use the **Quick Decision Tree** (above) to assign an EDS pattern letter (A–G).

2. **Check for existing project animation utilities:**
   Before writing new animation code, check if the project already has:
   - `initScrollReveal()` in `scripts.js` — reuse for new scroll-triggered reveals
   - Counter utilities in existing block JS — import or extend rather than duplicate
   - Lottie initialization in `delayed.js` — just add new containers, don't reinitialize
   - Shared CSS classes (`.scroll-reveal`, `.is-visible`) in `lazy-styles.css` — reuse them

   **Always prefer extending existing animation infrastructure over creating parallel systems.**

3. **Map to EDS pattern**:

   | Original Pattern | EDS Recreation |
   |---|---|
   | AOS / ScrollMagic / Waypoints scroll-reveal | `IntersectionObserver` + `.scroll-reveal` / `.is-visible` CSS class toggle |
   | GSAP timeline animations | `requestAnimationFrame` with manual easing |
   | `<lottie-player>` or `lottie.loadAnimation` | `lottie-web` loaded via `delayed.js`, container with `data-lottie-path` |
   | CSS `@keyframes` on page load | Preserve as-is in block CSS or `lazy-styles.css` |
   | Counter/number increment | `requestAnimationFrame` + `IntersectionObserver` with easing |
   | Parallax background | `IntersectionObserver` with `transform: translateY()` ratio |
   | Hover transitions | Preserve as CSS `:hover` transitions |
   | Carousel slide transitions | EDS carousel block with CSS transitions |

4. **Determine file placement**:
   - CSS animations/transitions → block CSS or `lazy-styles.css`
   - Scroll-reveal initialization → `scripts.js` `loadLazy()`
   - Lottie loading → `delayed.js`
   - Block-specific animations → block's `.js` file
   - Global animation utilities → `scripts.js` or dedicated helper

5. **Download external assets**:
   - Lottie JSON files → `/animations/` directory
   - SVG animation files → `/icons/` or `/images/`
   - Sprite sheets → `/images/`

### Phase 3: Recreation

**Goal:** Implement each animation using EDS-compatible code.

#### 3a. Scroll-Reveal Animations

**File:** `scripts/scripts.js` (in `loadLazy`) + `styles/lazy-styles.css`

```javascript
// scripts.js — add to loadLazy()
function initScrollReveal(main) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const sections = main.querySelectorAll('.section');
  sections.forEach((section, i) => {
    if (i === 0) return; // skip first section (above-fold / LCP)
    section.classList.add('scroll-reveal');
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  main.querySelectorAll('.scroll-reveal').forEach((el) => observer.observe(el));
}
```

```css
/* lazy-styles.css */
.scroll-reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

.scroll-reveal.is-visible {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .scroll-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

**Variants** — add alongside base `.scroll-reveal`:
- `.reveal-fade` — opacity only (no transform)
- `.reveal-left` / `.reveal-right` — horizontal slide
- `.reveal-scale` — scale up from 0.95
- `.stagger` — sequential delay using CSS custom property `--stagger-index`

#### 3b. Lottie Animations

**File:** `scripts/delayed.js` + block JS for container creation

```javascript
// delayed.js — Lottie loader
import { loadScript } from './aem.js';

async function initLottie() {
  await loadScript('https://cdn.jsdelivr.net/npm/lottie-web@5/build/player/lottie_light.min.js');

  document.querySelectorAll('[data-lottie-path]').forEach((container) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const anim = window.lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: container.dataset.lottieLoop !== 'false',
      autoplay: !reducedMotion,
      path: container.dataset.lottiePath,
    });

    if (reducedMotion) {
      anim.addEventListener('DOMLoaded', () => { anim.goToAndStop(0, true); });
    }
  });

  window.dispatchEvent(new CustomEvent('lottie-ready'));
}

initLottie();
```

**Content authoring pattern** (DA-compatible):
- In the DA document, place a link where the **display text** is the path to the JSON file (e.g., `/animations/hero-animation.json`)
- Block JS detects links whose text ends in `.json` and converts them to `data-lottie-path` containers
- DA mangles hrefs (dots → hyphens), so always match by **link text content**, not href

```javascript
// Block JS pattern for Lottie link detection
const links = imageCol.querySelectorAll('a');
const lottieLink = [...links].find((a) => a.textContent.trim().endsWith('.json'));
if (lottieLink) {
  const lottieContainer = document.createElement('div');
  lottieContainer.dataset.lottiePath = lottieLink.textContent.trim();
  lottieContainer.dataset.lottieLoop = 'true';
  imageCol.textContent = '';
  imageCol.append(lottieContainer);
}
```

**Lottie CSS:**
```css
[data-lottie-path] {
  position: relative;
}

[data-lottie-path] svg {
  width: 100%;
  height: auto;
}
```

#### 3c. Counter Animations

**File:** Block JS (e.g., `blocks/cards/cards.js`)

```javascript
function animateCounter(el, target, suffix, duration = 2000) {
  const start = performance.now();
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - (1 - progress) ** 3; // ease-out cubic
    const current = Math.round(eased * target);
    el.textContent = `${current}${suffix}`;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function initStatsCounters(block) {
  const statElements = block.querySelectorAll('strong');
  const parsed = [];

  statElements.forEach((el) => {
    const text = el.textContent.trim();
    const match = text.match(/^(\d+(?:\.\d+)?)(.*)/);
    if (match) {
      const target = parseFloat(match[1]);
      const suffix = match[2];
      parsed.push({ el, target, suffix });
      el.textContent = `0${suffix}`; // Initialize at zero
      el.classList.add('counter-animate');
    }
  });

  if (!parsed.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    parsed.forEach(({ el, target, suffix }) => { el.textContent = `${target}${suffix}`; });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        parsed.forEach(({ el, target, suffix }, i) => {
          setTimeout(() => animateCounter(el, target, suffix), i * 150); // stagger
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  observer.observe(block);
}
```

#### 3d. CSS-Only Animations

**File:** Block CSS or `lazy-styles.css`

For hover effects, entry animations, and pure CSS transitions — recreate directly in CSS:

```css
/* Hover lift effect */
.cards li {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.cards li:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
}

/* Entry animation (add class via JS after load) */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.animate-in {
  animation: fadeInUp 0.6s ease-out forwards;
}

/* Focus-visible transitions (Pattern D — always preserve for a11y) */
.cards li a:focus-visible {
  outline: 2px solid var(--link-color);
  outline-offset: 2px;
  transition: outline-offset 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  .cards li { transition: none; }
  .animate-in { animation: none; opacity: 1; transform: none; }
  /* NOTE: Do NOT disable :focus-visible transitions — they are functional, not decorative */
}
```

**Layout-thrash warning:** Never animate properties that trigger layout recalculation (`width`, `height`, `top`, `left`, `margin`, `padding`). Instead, use `transform` (translate, scale, rotate) and `opacity` — these run on the compositor thread and produce smooth 60fps animations.

#### 3e. Parallax Effects

**File:** `scripts/scripts.js` or block JS

```javascript
function initParallax(main) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const parallaxElements = main.querySelectorAll('[data-parallax]');
  if (!parallaxElements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('parallax-active');
      } else {
        entry.target.classList.remove('parallax-active');
      }
    });
  }, { rootMargin: '100px' });

  parallaxElements.forEach((el) => observer.observe(el));

  // Use requestAnimationFrame for smooth parallax
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        parallaxElements.forEach((el) => {
          if (!el.classList.contains('parallax-active')) return;
          const rect = el.getBoundingClientRect();
          const speed = parseFloat(el.dataset.parallax) || 0.3;
          const yOffset = (rect.top - window.innerHeight / 2) * speed;
          el.style.transform = `translateY(${yOffset}px)`;
        });
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}
```

### Phase 4: Integration

**Goal:** Place all animation code in the correct EDS file locations.

**File placement rules:**

| Animation Type | File Location | Load Phase |
|---|---|---|
| Scroll-reveal init | `scripts/scripts.js` → `loadLazy()` | Lazy |
| Scroll-reveal CSS | `styles/lazy-styles.css` | Lazy |
| Lottie library loader | `scripts/delayed.js` | Delayed (1.5s) |
| Lottie container CSS | `styles/lazy-styles.css` | Lazy |
| Lottie container creation | Block JS (e.g., `blocks/hero/hero.js`) | Eager/Lazy |
| Counter animations | Block JS (e.g., `blocks/cards/cards.js`) | Lazy |
| Block-specific hover CSS | Block CSS (e.g., `blocks/cards/cards.css`) | With block |
| Global keyframes | `styles/lazy-styles.css` | Lazy |
| Parallax init | `scripts/scripts.js` → `loadLazy()` | Lazy |

**Integration checklist:**
- [ ] All animations respect `prefers-reduced-motion: reduce`
- [ ] No animations on first section during `loadEager` (protects LCP)
- [ ] Lottie loaded via `delayed.js` (not blocking)
- [ ] IntersectionObserver used instead of scroll listeners where possible
- [ ] No external animation libraries except `lottie-web` (loaded from CDN)
- [ ] All CSS animations have reduced-motion fallbacks
- [ ] Content is visible and functional without animations (progressive enhancement)

### Phase 5: Verification

**Goal:** Visually confirm all animations work correctly and record results in an EDS-readable format.

**Full verification criteria and EDS output format:** See [animation-verification.md](./animation-verification.md) for criterion IDs (e.g. A-DOM, F-RENDER), pass/fail conditions per pattern, and how to output verification results as metadata blocks, table blocks, or JSON so EDS can read them.

1. **Navigate to local preview** at `http://localhost:3000/content/{page}`

2. **Take viewport screenshot** — verify first section renders without animation artifacts

3. **Wait for delayed.js** (1.5s+) — if Lottie is used, wait and verify SVG renders

4. **Scroll through page** incrementally (400px steps, 200ms delay) — verify:
   - Scroll-reveal sections fade in as they enter viewport
   - Counter animations trigger and count to final values
   - Parallax effects move at expected rates
   - No layout shift or jank

5. **Check console for errors** — ensure no animation-related errors

6. **Compare with source** — take screenshots at matching scroll positions and compare:
   - Same animation types present
   - Similar timing and easing
   - Same visual effect (fade, slide, scale, etc.)
   - Comparable visual fidelity

7. **Test reduced motion** — verify `prefers-reduced-motion` behavior:
   - Animations should be disabled or show final state immediately
   - No flickering or layout issues with motion disabled

## Troubleshooting

### Common Issues

**Lottie not rendering:**
- Check that `delayed.js` is imported in `scripts.js` via `loadDelayed()`
- Verify the JSON file path is correct and accessible
- Check for CORS issues if loading from CDN
- Ensure the container has non-zero dimensions

**Scroll-reveal not triggering:**
- Verify `initScrollReveal()` is called in `loadLazy()`
- Check that `threshold` and `rootMargin` values allow triggering
- Programmatic `scrollTo` doesn't trigger IO for intermediate elements — use incremental scrolling for testing

**Counter showing wrong values:**
- Check regex matches the numeric format (integers, decimals, suffixes)
- Verify `parseFloat` handles the value correctly
- Ensure IO threshold allows the block to trigger

**DA mangles animation file paths:**
- DA converts dots to hyphens in URLs (`.json` → `-json`)
- Always match Lottie links by **text content** (`a.textContent.trim().endsWith('.json')`) not by href
- Use the link text as the canonical path, not the href

**Animation appears on local but not remote:**
- Verify all code files are committed and pushed
- Check that DA content includes the animation trigger (e.g., Lottie link in hero)
- Verify the animation JSON file is accessible at the expected path on the remote

## Examples

### Zelis.com Homepage (Reference Implementation)

**Source:** https://www.zelis.com/

**Animations detected and recreated:**

1. **Hero Lottie** — `<lottie-player>` with `HomepageHero-Main-tinified.json`
   - Recreated: `lottie-web` via `delayed.js`, link-based DA authoring in `hero.js`
   - Files: `blocks/hero/hero.js`, `scripts/delayed.js`, `animations/hero-animation.json`

2. **Scroll-reveal sections** — Below-fold sections fade in on scroll
   - Recreated: `IntersectionObserver` + `.scroll-reveal` / `.is-visible` class toggle
   - Files: `scripts/scripts.js` (`initScrollReveal`), `styles/lazy-styles.css`

3. **Counter animations** — Stats section (750+, 850k+, 120M) count up from zero
   - Recreated: `requestAnimationFrame` with ease-out cubic + `IntersectionObserver`
   - Files: `blocks/cards/cards.js` (`animateCounter`, `initStatsCounters`)
