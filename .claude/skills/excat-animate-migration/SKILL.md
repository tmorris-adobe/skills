---
name: excat-animate-migration
description: Analyze animated web experiences and plan migration into Adobe Experience Modernization / Edge Delivery Services. Classifies motion (CSS, scroll-linked, GSAP, Lottie, SVG, canvas, WebGL, video, microinteractions), produces extract and recommend reports, and implements approved patterns. Use when reviewing sites, pages, or components with complex motion and when deciding how to preserve, simplify, replace, or redesign them for EDS. Invoke for "migrate animations", "analyze animations", "animation migration plan", or scroll/canvas/WebGL/Lottie/GSAP effects.
---

# ExCat Animate Migration

## Goal

Identify motion patterns in source experiences and convert them into a practical migration plan for Adobe Experience Modernization / EDS — then implement and verify when approved.

Detect, **classify**, and migrate animations from source webpages. Understand motion systems before prescribing implementation. Output structured **Extract** and **Recommend** reports, then implement approved recommendations.

## Decision Rules

- Do not assume a library unless there is evidence
- Prefer native CSS for simple motion
- Prefer simplification over replication when the original depends on heavy JS or WebGL
- Mark experiences as **Do not migrate as-is; redesign** when the effect is not practical inside EDS
- Call out uncertainty explicitly — see guardrails below

## Guardrails (Always Apply)

Read [references/red-flags-and-guardrails.md](./references/red-flags-and-guardrails.md) before reporting.

- Do not claim exact timing unless observed in CSS or scroll tests
- Do not infer libraries without evidence (`window` global, script src, data attributes)
- Call out uncertainty with `confidence: low` and what would resolve it
- Note when **manual QA in browser** is required (scroll-scrub, hover-only, breakpoints)

---

## Workflow Overview

```
Phase 1: Extract     → What the site does now (no EDS prescriptions)
Phase 2: Classify    → Required motion taxonomy per effect
Phase 3: Recommend   → What EDS should do (decision matrix + pattern)
Phase 4: Implement   → Working EDS code (when user approves or requests)
Phase 5: Verify      → Visual confirmation — see animation-verification.md
```

**Do not skip Extract and Recommend to jump straight to code** unless the user explicitly asks for implementation only on a already-analyzed page.

---

## Phase 1: Extract (Source Discovery)

**Goal:** Document observed motion without migration bias.

1. Navigate to source URL; take full-page screenshot
2. Run [detect-animations.js](./detect-animations.js) via browser evaluate
3. Complete [source-discovery checklist](./references/source-discovery-checklist.md) — all sections
4. Scroll full page (400px steps, 200ms delay); screenshot key states
5. Repeat at mobile viewport if in scope
6. Output **Extract Report** per [output schema](./references/output-schema.md)

**Extract report includes:** observed behavior, evidence, taxonomy (Phase 2), uncertainties. **No** EDS pattern letters or file paths yet.

---

## Phase 2: Classify (Required)

**Every animation must receive exactly one motion taxonomy category** before Recommend.

| Category | Use When |
|----------|----------|
| CSS-only | Transitions/keyframes; no JS driver |
| Scroll-linked CSS/WAAPI | Scroll-timeline, scrub, pin, parallax |
| GSAP timeline | GSAP/ScrollTrigger sequencing |
| Lottie | Bodymovin/JSON vector |
| SVG / mask / clip-path | SMIL, CSS on SVG, animated mask/clip-path |
| Canvas | 2D canvas rAF loops |
| WebGL / Three.js | 3D, shaders, THREE/PIXI |
| Video fallback | Autoplay video/GIF as motion |
| Custom interaction / microinteraction | Hover, focus, click, toggle micro-motion |
| Do not migrate as-is; redesign | Proprietary/heavy; not viable in EDS |

Full rules: [references/motion-taxonomy.md](./references/motion-taxonomy.md)

Each effect record:
```yaml
motion_taxonomy: CSS-only
motion_behavior: once  # repeat | once | scrub | pin | sequence
taxonomy_evidence: ["computed animation-name: fadeInUp", "no gsap global"]
taxonomy_confidence: high
```

---

## Phase 3: Recommend

**Goal:** Map each classified effect to an EDS strategy.

For each effect, choose one **migration decision**:

| Decision | Meaning |
|----------|---------|
| preserve | Recreate faithfully with EDS patterns |
| simplify | Same UX, less complexity |
| rebuild natively | Replace lib with vanilla JS/CSS |
| replace with Lottie | Source motion better served by Lottie export |
| replace with static/fallback | Poster, video, or final frame |
| leave as embedded external experience | iframe/embed; stays outside EDS blocks |
| skip | No motion; content still works |

Matrix and heuristics: [references/migration-decision-matrix.md](./references/migration-decision-matrix.md), [references/migration-heuristics.md](./references/migration-heuristics.md)

Output **Recommend Report** using per-effect template:

| Field | Required |
|-------|----------|
| Page or section | yes |
| Observed animation behavior | yes |
| Trigger | yes |
| Motion behavior | yes (repeat / once / scrub / pin / sequence) |
| What moves | yes |
| Implementation pattern | yes (taxonomy + evidence) |
| Migration difficulty | low / medium / high / extreme |
| Recommended EDS approach | Pattern A–G or explicit alternative |
| Migration decision | one of seven choices |
| Risks / dependencies | yes |
| Fallback strategy | yes |
| Open questions / missing data | yes (when applicable) |

Template: [references/output-schema.md](./references/output-schema.md)

---

## Phase 4: Implement

Implement only after Extract + Recommend (or explicit user override).

**EDS constraints:** No build step; no GSAP/AOS (except `lottie-web` via delayed.js); respect `loadEager` / `loadLazy` / `loadDelayed`; animate only `transform` and `opacity`; `prefers-reduced-motion` fallbacks.

**Patterns A–G** and code snippets: [eds-animation-patterns.md](./eds-animation-patterns.md)

**File placement:**

| Type | Location | Phase |
|------|----------|-------|
| Scroll-reveal | `scripts.js` + `lazy-styles.css` | Lazy |
| Lottie | `delayed.js` + block JS | Delayed |
| Block animations | `blocks/{name}/{name}.js` | Lazy |
| Hover CSS | block CSS | With block |

Reuse existing project utilities (`initScrollReveal`, counter helpers) before adding new systems.

---

## Phase 5: Verify

See [animation-verification.md](./animation-verification.md) for criterion IDs, automated checks, and EDS-readable output format.

Test at `http://localhost:3000`; scroll incrementally; compare with source screenshots; verify reduced-motion.

---

## Detection Script

```javascript
// Run detect-animations.js via browser_evaluate on source page
// Returns inventory + suggested taxonomy per finding
```

Script: [detect-animations.js](./detect-animations.js)

---

## Examples

**Quick classification hints:**

- "sticky scroll story with layered text and imagery" → scroll-linked motion, likely GSAP or custom JS → **simplify**
- "animated logo and hover states" → CSS-only or custom interaction / microinteraction → **preserve**
- "3D product reveal" → WebGL / Three.js → **replace with static/fallback** or **leave as embedded external experience**
- "illustration intro loop" → Lottie candidate → **preserve** or **replace with Lottie**

Detailed before/after for six patterns: [examples.md](./examples.md)

| Pattern | Taxonomy | Typical Decision |
|---------|----------|------------------|
| Parallax hero | Scroll-linked CSS/WAAPI | simplify → Pattern G |
| Sticky scroll story | GSAP timeline | simplify → IO sections |
| Multi-step timeline | GSAP timeline | rebuild natively → Pattern B |
| Floating SVG | CSS-only | preserve |
| Lottie illustration | Lottie | preserve → Pattern F |
| 3D/canvas hero | WebGL / Three.js | replace with static/fallback |

---

## Reference Files

| File | Purpose |
|------|---------|
| [references/motion-taxonomy.md](./references/motion-taxonomy.md) | Classification rules |
| [references/source-discovery-checklist.md](./references/source-discovery-checklist.md) | Inspection checklist |
| [references/migration-decision-matrix.md](./references/migration-decision-matrix.md) | preserve / simplify / rebuild / fallback / skip |
| [references/output-schema.md](./references/output-schema.md) | Extract + Recommend templates |
| [references/migration-heuristics.md](./references/migration-heuristics.md) | EDS mapping, difficulty, file placement |
| [references/red-flags-and-guardrails.md](./references/red-flags-and-guardrails.md) | Overclaim prevention, red flags |
| [examples.md](./examples.md) | Before/after cases |
| [eds-animation-patterns.md](./eds-animation-patterns.md) | Implementation code |
| [animation-verification.md](./animation-verification.md) | Verification criteria |

---

## Troubleshooting

**Lottie not rendering:** Check `delayed.js` import, JSON path, DA link-text pattern (match text not href).

**Scroll-reveal not triggering:** Verify `loadLazy()` calls init; adjust IO threshold; scroll incrementally when testing.

**DA mangles paths:** Use link **text content** for `.json` paths, not href.

**Over-prescription:** If you skipped Extract, stop and complete Phase 1–2 before writing code.
