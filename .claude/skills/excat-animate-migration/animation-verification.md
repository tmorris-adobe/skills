# Animation Import Verification — Criteria, Automation, and EDS Output

## Purpose

Structured criteria and automated checks to verify that animations migrated from a source website were correctly imported and display correctly in Adobe Edge Delivery Services. Every check produces a **PASS / FAIL / WARN** result with evidence. All output formats are EDS-readable (metadata blocks, table blocks, JSON in metadata).

Run verifications against both the **source page** and the **EDS page** (local preview at `http://localhost:3000` or remote at `https://{branch}--{repo}--{owner}.aem.page/`).

---

## 1. Verification Criteria by Animation Pattern

Criteria are organized by **Pattern letter** (A–G) from the animation migration skill, plus global cross-cutting checks. Each criterion has a unique **ID** used in EDS output and automated reports.

### 1.1 Scroll-Reveal (Pattern A)

| Criterion ID | Verification | Pass Condition |
|--------------|--------------|----------------|
| `A-DOM` | Element has EDS classes | Element has `.scroll-reveal` and receives `.is-visible` when in viewport |
| `A-IO` | IntersectionObserver active | `initScrollReveal()` runs in `loadLazy()`; observer uses threshold/rootMargin that triggers on scroll |
| `A-CSS` | Initial/hidden state | Before trigger: `opacity: 0` and transform (e.g. `translateY(24px)`) applied |
| `A-FINAL` | Final/visible state | After trigger: `opacity: 1`, `transform: none` (or equivalent) |
| `A-REDUCED` | Reduced motion | With `prefers-reduced-motion: reduce`, content shows final state immediately; no transition |
| `A-LCP` | No first-section animation | First section (above-fold) does **not** have scroll-reveal; LCP not delayed |

#### Automated Checks

```javascript
// A-DOM + A-FINAL — Verify scroll-reveal classes and final state
// Run on EDS page after scrolling full page
(() => {
  const sections = document.querySelectorAll('.scroll-reveal');
  const results = [];
  sections.forEach((section, i) => {
    const style = getComputedStyle(section);
    results.push({
      section: i,
      hasScrollReveal: true,
      hasIsVisible: section.classList.contains('is-visible'),
      opacity: style.opacity,
      transform: style.transform,
    });
  });
  return {
    criteria: ['A-DOM', 'A-FINAL'],
    total: sections.length,
    triggered: results.filter(r => r.hasIsVisible).length,
    status: results.every(r => r.hasIsVisible) ? 'PASS' : 'WARN',
    details: results,
  };
})()
```

```javascript
// A-LCP — First section must NOT have scroll-reveal
(() => {
  const first = document.querySelector('main > .section');
  if (!first) return { criterion: 'A-LCP', status: 'WARN', note: 'No sections found' };
  const hasReveal = first.classList.contains('scroll-reveal');
  return {
    criterion: 'A-LCP',
    status: hasReveal ? 'FAIL' : 'PASS',
    note: hasReveal ? 'First section has scroll-reveal — will cause LCP flash' : 'First section clean',
  };
})()
```

```javascript
// A-REDUCED — Verify reduced-motion CSS override exists for .scroll-reveal
(() => {
  let hasCoverage = false;
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSMediaRule && rule.conditionText?.includes('prefers-reduced-motion')) {
          if ([...rule.cssRules].some(r => r.selectorText?.includes('scroll-reveal'))) {
            hasCoverage = true;
          }
        }
      }
    } catch(e) {}
  }
  return {
    criterion: 'A-REDUCED',
    status: hasCoverage ? 'PASS' : 'FAIL',
    note: hasCoverage ? 'Reduced-motion override found for .scroll-reveal' : 'Missing @media (prefers-reduced-motion) rule for .scroll-reveal',
  };
})()
```

### 1.2 Scripted Scroll Animation (Pattern B)

| Criterion ID | Verification | Pass Condition |
|--------------|--------------|----------------|
| `B-IO` | Trigger on viewport entry | Animation starts only when element enters viewport (IntersectionObserver) |
| `B-rAF` | JS animation loop | Values updated via `requestAnimationFrame`; no `setInterval` or forced sync layout |
| `B-PROPS` | Compositor-only props | Only `transform` and/or `opacity` animated (no width, height, top, left, margin, padding) |
| `B-REDUCED` | Reduced motion | Animation skipped or final state shown; `matchMedia('prefers-reduced-motion')` checked |

#### Automated Check

```javascript
// B-PROPS — Check that only compositor-friendly properties are in transitions
(() => {
  const layoutProperties = ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding', 'border-width', 'font-size'];
  const violations = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.style?.transitionProperty) {
          const props = rule.style.transitionProperty.split(',').map(p => p.trim());
          const bad = props.filter(p => layoutProperties.some(lp => p.includes(lp)));
          if (bad.length) violations.push({ selector: rule.selectorText, properties: bad });
        }
      }
    } catch(e) {}
  }
  return {
    criterion: 'B-PROPS',
    status: violations.length === 0 ? 'PASS' : 'WARN',
    violations,
    note: violations.length === 0 ? 'Only transform/opacity animated' : `${violations.length} rule(s) animate layout properties`,
  };
})()
```

### 1.3 Counter (Pattern C)

| Criterion ID | Verification | Pass Condition |
|--------------|--------------|----------------|
| `C-VALUE` | Final value correct | Displayed end value matches source (number + suffix, e.g. `750+`) |
| `C-IO` | Triggers in viewport | Counter starts when block/section enters viewport |
| `C-EASING` | Count behavior | Count progresses with easing (e.g. ease-out cubic); no instant jump |
| `C-REDUCED` | Reduced motion | With reduced motion, final number shown immediately (not stuck at 0) |
| `C-PARSE` | Number parsing | Regex/parse correctly handles decimals, thousands separators, suffix (%, K, M, +, etc.) |

#### Automated Check

```javascript
// C-VALUE + C-PARSE — Verify counter final values and suffix parsing
(() => {
  const counters = document.querySelectorAll('.counter-animate');
  const results = [];
  counters.forEach(el => {
    const text = el.textContent.trim();
    const isNumeric = /^\d/.test(text);
    const isZero = text.startsWith('0');
    const hasSuffix = /\d[+%KMBkmb]/.test(text);
    results.push({
      value: text,
      isNumeric,
      isZero,
      hasSuffix,
      status: isNumeric && !isZero ? 'PASS' : isZero ? 'FAIL' : 'WARN',
    });
  });
  return {
    criteria: ['C-VALUE', 'C-PARSE'],
    total: counters.length,
    status: results.every(r => r.status === 'PASS') ? 'PASS' : 'FAIL',
    details: results,
  };
})()
```

### 1.4 Hover / Focus (Pattern D)

| Criterion ID | Verification | Pass Condition |
|--------------|--------------|----------------|
| `D-HOVER` | Hover effect visible | Transition or transform applied on `:hover` matches source intent |
| `D-FOCUS` | Focus visible | `:focus-visible` styling present for keyboard navigation (functional, not decorative) |
| `D-CSS` | Transitions only | Effect uses CSS transitions (no JS required); compositor-friendly properties |
| `D-REDUCED` | Reduced motion | Hover/focus **decorative transitions** can be disabled; **`:focus-visible` outline/offset must remain** for a11y |

### 1.5 Page-Load Entry (Pattern E)

| Criterion ID | Verification | Pass Condition |
|--------------|--------------|----------------|
| `E-LOAD` | Runs after loadLazy | Animation triggered in lazy phase (not in `loadEager`) |
| `E-KEYFRAMES` | Keyframes present | `@keyframes` defined and applied via class; duration/easing match source |
| `E-REDUCED` | Reduced motion | With reduced motion, element shows final state (no animation) |

### 1.6 Lottie (Pattern F)

| Criterion ID | Verification | Pass Condition |
|--------------|--------------|----------------|
| `F-DELAYED` | Load phase | Lottie loaded in `delayed.js` (`loadDelayed`), not blocking LCP |
| `F-CONTAINER` | Container and path | Element has `data-lottie-path`; path resolves to correct JSON. DA: use link **text** for path, not href |
| `F-RENDER` | SVG renders | After delayed load, Lottie SVG is visible with non-zero dimensions; no empty or broken container |
| `F-LOOP` | Loop/autoplay | `data-lottie-loop` and autoplay behavior match source |
| `F-REDUCED` | Reduced motion | With reduced motion, animation does not play; `goToAndStop(0, true)` shows first frame |
| `F-LIGHT` | Light build | Uses `lottie_light.min.js` (not the full 3x-larger `lottie.min.js`) |
| `F-ASSET` | JSON accessible | Lottie JSON file returns HTTP 200 at expected path on remote |

#### Automated Checks

```javascript
// F-RENDER + F-CONTAINER — Verify Lottie SVG rendered with content
(() => {
  const containers = document.querySelectorAll('[data-lottie-path]');
  const results = [];
  containers.forEach(c => {
    const svg = c.querySelector('svg');
    const hasContent = svg && svg.children.length > 0;
    const dims = c.getBoundingClientRect();
    results.push({
      path: c.dataset.lottiePath,
      loop: c.dataset.lottieLoop,
      hasSvg: !!svg,
      svgHasContent: hasContent,
      width: Math.round(dims.width),
      height: Math.round(dims.height),
      status: hasContent && dims.width > 0 && dims.height > 0 ? 'PASS' : 'FAIL',
    });
  });
  return {
    criteria: ['F-RENDER', 'F-CONTAINER'],
    total: containers.length,
    status: results.every(r => r.status === 'PASS') ? 'PASS' : 'FAIL',
    details: results,
  };
})()
```

```javascript
// F-DELAYED — Lottie should load after delay, not in <head>
(() => {
  const scripts = [...document.querySelectorAll('script[src]')];
  const lottieScript = scripts.find(s => s.src.includes('lottie'));
  const inHead = lottieScript && lottieScript.closest('head');
  return {
    criterion: 'F-DELAYED',
    lottieLoaded: !!lottieScript,
    inHead: !!inHead,
    status: lottieScript && !inHead ? 'PASS' : inHead ? 'FAIL' : 'WARN',
    note: inHead ? 'Lottie loaded in <head> — blocks rendering' : lottieScript ? 'Lottie loaded via delayed.js' : 'No lottie script found',
  };
})()
```

```javascript
// F-LIGHT — Verify lottie_light build used
(() => {
  const scripts = [...document.querySelectorAll('script[src]')];
  const lottieScript = scripts.find(s => s.src.includes('lottie'));
  if (!lottieScript) return { criterion: 'F-LIGHT', status: 'PASS', note: 'No lottie loaded' };
  const isLight = lottieScript.src.includes('lottie_light');
  return {
    criterion: 'F-LIGHT',
    status: isLight ? 'PASS' : 'WARN',
    src: lottieScript.src,
    note: isLight ? 'Using lottie_light.min.js' : 'Using full lottie build — consider switching to lottie_light',
  };
})()
```

```javascript
// F-ASSET — Verify Lottie JSON files are accessible on remote
(async () => {
  const containers = document.querySelectorAll('[data-lottie-path]');
  const results = [];
  for (const c of containers) {
    const path = c.dataset.lottiePath;
    const url = new URL(path, window.location.origin).href;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      results.push({ path, url, httpStatus: res.status, status: res.ok ? 'PASS' : 'FAIL' });
    } catch (e) {
      results.push({ path, url, status: 'FAIL', error: e.message });
    }
  }
  return { criterion: 'F-ASSET', results };
})()
```

### 1.7 Parallax (Pattern G)

| Criterion ID | Verification | Pass Condition |
|--------------|--------------|----------------|
| `G-IO` | Active in viewport only | Parallax applied only when element is in view (`parallax-active` or similar) |
| `G-rAF` | Scroll tied to rAF | Scroll position applied via `requestAnimationFrame`; passive scroll listener |
| `G-PROPS` | Transform only | Only `transform: translateY(...)` (or equivalent) used; no layout properties |
| `G-REDUCED` | Reduced motion | Parallax disabled when `prefers-reduced-motion: reduce` |

### 1.8 Global / Cross-Cutting

| Criterion ID | Verification | Pass Condition |
|--------------|--------------|----------------|
| `GLOB-NO-LIB` | No forbidden libs | No GSAP, anime.js, AOS, ScrollMagic, etc. in EDS code (exception: `lottie-web` in delayed) |
| `GLOB-VANILLA` | Vanilla only | No build step; ES6+ JS and plain CSS only |
| `GLOB-PROGRESSIVE` | Progressive enhancement | Content is visible and usable with animations disabled |
| `GLOB-CONSOLE` | No errors | Console free of animation-related errors on load and scroll |
| `GLOB-DA` | DA authoring integrity | Animation triggers survive Document Authoring round-trip (link text, `<strong>` tags, section metadata) |

#### Automated Checks

```javascript
// GLOB-NO-LIB — No banned animation libraries
(() => {
  const banned = ['gsap', 'greensock', 'anime.min', 'aos.js', 'scrollmagic', 'waypoints', 'scrollreveal'];
  const scripts = [...document.querySelectorAll('script[src]')].map(s => s.src.toLowerCase());
  const found = banned.filter(lib => scripts.some(src => src.includes(lib)));
  return {
    criterion: 'GLOB-NO-LIB',
    status: found.length === 0 ? 'PASS' : 'FAIL',
    bannedFound: found,
    note: found.length === 0 ? 'No banned animation libraries' : `Found: ${found.join(', ')}`,
  };
})()
```

```javascript
// GLOB-PROGRESSIVE — No permanently hidden content
(() => {
  const hidden = [];
  document.querySelectorAll('.scroll-reveal').forEach(el => {
    const style = getComputedStyle(el);
    if (style.opacity === '0' && style.transitionDuration === '0s') {
      hidden.push({ element: `${el.tagName}.${[...el.classList].join('.')}`, issue: 'opacity:0 with no transition' });
    }
  });
  return {
    criterion: 'GLOB-PROGRESSIVE',
    status: hidden.length === 0 ? 'PASS' : 'FAIL',
    permanentlyHidden: hidden,
  };
})()
```

```javascript
// GLOB-DA — Verify DA authoring integrity (run on remote .aem.page)
(() => {
  const results = [];

  // Check Lottie links survived DA
  document.querySelectorAll('.hero').forEach(hero => {
    const imageCol = hero.querySelector(':scope > div > div:nth-child(2)');
    if (!imageCol) return;
    const lottieContainer = imageCol.querySelector('[data-lottie-path]');
    if (lottieContainer) {
      results.push({ check: 'Lottie link', status: 'PASS', path: lottieContainer.dataset.lottiePath });
    } else {
      const links = imageCol.querySelectorAll('a');
      const jsonLink = [...links].find(a => a.textContent.trim().endsWith('.json'));
      results.push({
        check: 'Lottie link',
        status: jsonLink ? 'WARN' : 'FAIL',
        note: jsonLink ? 'Link exists but hero.js did not convert' : 'No .json link — DA may have stripped it',
      });
    }
  });

  // Check counter <strong> tags survived DA
  document.querySelectorAll('.cards.block').forEach(block => {
    const strongs = block.querySelectorAll('strong');
    const numericStrongs = [...strongs].filter(el => /^\d/.test(el.textContent.trim()));
    results.push({
      check: 'Counter strong tags',
      status: numericStrongs.length > 0 ? 'PASS' : 'WARN',
      found: numericStrongs.length,
    });
  });

  // Check section metadata
  document.querySelectorAll('.section[class*="center"]').forEach(section => {
    results.push({ check: 'Section metadata', status: 'PASS', classes: [...section.classList] });
  });

  return {
    criterion: 'GLOB-DA',
    status: results.every(r => r.status === 'PASS') ? 'PASS' : results.some(r => r.status === 'FAIL') ? 'FAIL' : 'WARN',
    details: results,
  };
})()
```

---

## 2. Visual Fidelity Verification

Visual checks that cannot be fully automated — require screenshot comparison.

### Criteria

| ID | Check | PASS | FAIL |
|----|-------|------|------|
| `VIS-START` | Animation start state matches source (before trigger) | Element position, opacity, scale match within tolerance | Visible difference in initial state |
| `VIS-END` | Animation end state matches source (after trigger) | Final visual state matches source | Different final position, opacity, or layout |
| `VIS-PATH` | Animation motion path is equivalent | Same direction (fade-up, slide-left, scale, etc.) | Different motion direction or effect type |
| `VIS-LOTTIE` | Lottie SVG renders identically to source | SVG content visible, correct aspect ratio, animating | Empty container, wrong aspect ratio, or static |

### Screenshot Comparison Process

1. **Screenshot source page** at key scroll positions (0%, 25%, 50%, 75%, 100%)
2. **Screenshot EDS page** at matching positions
3. **Compare pairs** — check:
   - Same elements are visible/hidden at each position
   - Animation effects match (fade vs slide vs scale)
   - Color, size, and position are comparable
   - Lottie SVGs show same visual content

### Automated Screenshot Script

```javascript
// Run on both source and EDS pages via Playwright
async (page) => {
  const positions = [0, 25, 50, 75, 100];
  const totalHeight = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
  for (const pct of positions) {
    const y = Math.round((pct / 100) * totalHeight);
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `verify-${pct}pct.png` });
  }
}
```

---

## 3. Cross-Environment Verification

### Criteria

| ID | Check | PASS | FAIL |
|----|-------|------|------|
| `ENV-LOCAL` | Animation renders on `localhost:3000` | All animations visible and functional | Broken or missing locally |
| `ENV-PAGE` | Animation renders on `.aem.page` (preview) | All animations visible after push | Works locally but not on preview |
| `ENV-LIVE` | Animation renders on `.aem.live` (production CDN) | All animations visible after publish | Works on preview but not production |
| `ENV-CORS` | No CORS issues with CDN-loaded libraries | `lottie-web` loads from jsDelivr without error | CORS or CSP blocks the library |

---

## 4. Console Health

### Criteria

| ID | Check | PASS | FAIL |
|----|-------|------|------|
| `CON-SCRIPTS` | No errors from `scripts.js` | Console clean | TypeError, ReferenceError from scripts.js |
| `CON-DELAYED` | No errors from `delayed.js` | Console clean | Lottie load failure or path error |
| `CON-BLOCK` | No errors from block JS | Console clean | Block decoration errors |
| `CON-404` | No 404s for animation assets | Network tab clean | Missing `.json`, `.svg`, or image files |

### Verification via Playwright

```javascript
// Use with browser_console_messages — filter animation errors
(messages) => {
  const keywords = ['lottie', 'animation', 'scroll-reveal', 'counter', 'IntersectionObserver', 'delayed.js', 'hero.js', 'cards.js'];
  const errors = messages
    .filter(m => m.type === 'error')
    .filter(m => keywords.some(kw => m.text.toLowerCase().includes(kw)));
  return {
    criterion: 'GLOB-CONSOLE',
    totalErrors: errors.length,
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errors: errors.map(e => ({ text: e.text, location: e.location })),
  };
}
```

---

## 5. Quick Reference: All Criterion IDs by Pattern

| Pattern | Criterion IDs |
|---------|---------------|
| A (Scroll-reveal) | `A-DOM`, `A-IO`, `A-CSS`, `A-FINAL`, `A-REDUCED`, `A-LCP` |
| B (Scripted scroll) | `B-IO`, `B-rAF`, `B-PROPS`, `B-REDUCED` |
| C (Counter) | `C-VALUE`, `C-IO`, `C-EASING`, `C-REDUCED`, `C-PARSE` |
| D (Hover/focus) | `D-HOVER`, `D-FOCUS`, `D-CSS`, `D-REDUCED` |
| E (Page-load) | `E-LOAD`, `E-KEYFRAMES`, `E-REDUCED` |
| F (Lottie) | `F-DELAYED`, `F-CONTAINER`, `F-RENDER`, `F-LOOP`, `F-REDUCED`, `F-LIGHT`, `F-ASSET` |
| G (Parallax) | `G-IO`, `G-rAF`, `G-PROPS`, `G-REDUCED` |
| Global | `GLOB-NO-LIB`, `GLOB-VANILLA`, `GLOB-PROGRESSIVE`, `GLOB-CONSOLE`, `GLOB-DA` |
| Visual | `VIS-START`, `VIS-END`, `VIS-PATH`, `VIS-LOTTIE` |
| Environment | `ENV-LOCAL`, `ENV-PAGE`, `ENV-LIVE`, `ENV-CORS` |
| Console | `CON-SCRIPTS`, `CON-DELAYED`, `CON-BLOCK`, `CON-404` |

**Total: 45 criteria** across 11 categories.

---

## 6. EDS-Readable Output Formats

Verification results **must** be stored in formats that EDS can consume: metadata blocks, table blocks, or JSON in metadata. This enables tooling like query-index, custom reporting blocks, and automated dashboards.

### 6.1 Page Metadata Block (Overall Status)

Store a page's verification summary as standard EDS metadata key-value pairs. EDS parses these from the metadata block and exposes them to scripts.

| Key | Value |
|-----|-------|
| `animation-verification` | `pass` or `fail` |
| `animation-verification-date` | ISO date (e.g. `2025-02-26`) |
| `animation-source-url` | Source page URL |
| `animation-criteria-passed` | Comma-separated criterion IDs (e.g. `A-DOM,A-IO,A-CSS,F-RENDER,F-DELAYED`) |
| `animation-criteria-failed` | Comma-separated criterion IDs that failed (empty if none) |
| `animation-notes` | Short free-text notes (optional) |

**EDS behavior:** The metadata block is parsed by the metadata block processor; keys become meta names or document attributes. Scripts read them via `getMetadata('animation-verification')`.

### 6.2 Table Block (Per-Animation Detail)

Store per-criterion verification results as an EDS table block for detailed reporting.

**Block name:** `animation-verification`

| Criterion ID | Pattern | Expected | Result | Notes |
|--------------|---------|----------|--------|-------|
| A-DOM | scroll-reveal | .scroll-reveal and .is-visible present | pass | |
| A-LCP | scroll-reveal | First section has no scroll-reveal | pass | |
| F-RENDER | lottie | Lottie SVG visible after delayed load | pass | |
| F-CONTAINER | lottie | data-lottie-path set with correct path | pass | |
| C-VALUE | counter | Final value matches source (750+) | fail | Suffix + missing |
| GLOB-NO-LIB | global | No banned animation libraries | pass | |

**EDS behavior:** Content is authored as a table; EDS converts it to a block. A dedicated block JS can read the table and expose data to scripts or render a verification dashboard.

### 6.3 JSON in Metadata (Machine-Readable)

For tooling, query-index, or automation, store a single metadata key whose value is a JSON string.

**Metadata key:** `animation-verification-json`

**Value example:**

```json
{
  "page": "/content/index",
  "sourceUrl": "https://www.zelis.com/",
  "verifiedAt": "2025-02-26T12:00:00Z",
  "overall": "pass",
  "animations": [
    {
      "id": "hero-lottie",
      "pattern": "F",
      "criteria": ["F-DELAYED", "F-CONTAINER", "F-RENDER", "F-LOOP", "F-REDUCED", "F-LIGHT", "F-ASSET"],
      "passed": ["F-DELAYED", "F-CONTAINER", "F-RENDER", "F-LOOP", "F-REDUCED", "F-LIGHT", "F-ASSET"],
      "failed": [],
      "notes": ""
    },
    {
      "id": "scroll-reveal-sections",
      "pattern": "A",
      "criteria": ["A-DOM", "A-IO", "A-CSS", "A-FINAL", "A-REDUCED", "A-LCP"],
      "passed": ["A-DOM", "A-IO", "A-CSS", "A-FINAL", "A-REDUCED", "A-LCP"],
      "failed": [],
      "notes": ""
    },
    {
      "id": "stats-counters",
      "pattern": "C",
      "criteria": ["C-VALUE", "C-IO", "C-EASING", "C-REDUCED", "C-PARSE"],
      "passed": ["C-IO", "C-EASING", "C-REDUCED", "C-PARSE"],
      "failed": ["C-VALUE"],
      "notes": "Suffix % not displayed"
    }
  ]
}
```

**EDS behavior:** Stored as a metadata key-value pair; scripts read the metadata block, get the value for `animation-verification-json`, and `JSON.parse()` it. Works with query-index for cross-page verification dashboards.

---

## 7. Verification Workflow

### Step-by-Step Execution Order

1. **Run detection** — Use `detect-animations.js` on the **source** page to build the animation inventory
2. **Run source inventory script** (§1 automated check for source) → save result
3. **Navigate to EDS page** (`localhost:3000` or `.aem.page`)
4. **Wait 2+ seconds** (for `delayed.js` to load Lottie)
5. **Scroll full page** incrementally (400px steps, 200ms pause) to trigger all IntersectionObservers
6. **Run `verify-animations.js`** (full verification script) → save JSON report
7. **Compare inventories** (source vs EDS) — every source animation should have an EDS counterpart
8. **Take comparison screenshots** at 0%, 25%, 50%, 75%, 100% scroll (both pages)
9. **Check console messages** via `browser_console_messages` for animation errors
10. **Run DA integrity checks** (if on remote) — `GLOB-DA` automated script
11. **Run asset accessibility check** — `F-ASSET` automated script
12. **Compile final report** using EDS output format (§6)

### Interpreting Results

| Overall Status | Meaning | Action |
|----------------|---------|--------|
| **PASS** | All checks green | Animation migration verified — ready for review |
| **WARN** | Minor issues detected | Review warnings — may be acceptable trade-offs |
| **FAIL** | Critical issues found | Fix failures before considering migration complete |

### Required Evidence for Sign-Off

- [ ] Source page screenshots at 5 scroll positions
- [ ] EDS page screenshots at matching 5 scroll positions
- [ ] Full verification JSON report with all criteria PASS
- [ ] Console error log showing zero animation-related errors
- [ ] Reduced-motion test confirming decorative animations disabled
- [ ] `:focus-visible` test confirming functional transitions preserved
- [ ] Confirmation on both local (`localhost:3000`) and remote (`.aem.page`)
- [ ] EDS metadata block or JSON written with verification results (§6)
