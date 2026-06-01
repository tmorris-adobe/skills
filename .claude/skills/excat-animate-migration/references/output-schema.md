# Animation Migration Output Schema

Use this template for **every animation or motion group** discovered on a page. Phases 1–2 produce Extract; Phase 3 produces Recommend.

---

## Per-Effect Template

```markdown
### [Effect ID] — [Short name]

| Field | Value |
|-------|-------|
| **Page or section** | Homepage hero / Stats band / etc. |
| **Observed animation behavior** | What the user sees (plain language; no implementation assumptions) |
| **Trigger** | page-load \| scroll-into-view \| scroll-progress \| hover \| click \| timer |
| **Motion behavior** | repeat \| once \| scrub \| pin \| sequence |
| **What moves** | Elements/properties that change (e.g., headline opacity, bg translateY) |
| **Implementation pattern** | Motion taxonomy category + key technologies observed |
| **Migration difficulty** | low \| medium \| high \| extreme |
| **Recommended EDS approach** | Pattern letter (A–G) or explicit alternative; file placement |
| **Migration decision** | preserve \| simplify \| rebuild natively \| replace with Lottie \| replace with static/fallback \| leave as embedded external experience \| skip |
| **Risks / dependencies** | Assets, libs, LCP impact, a11y gaps, cross-browser |
| **Fallback strategy** | Behavior when reduced-motion, JS off, or delayed load |
| **Confidence** | high \| medium \| low |
| **Manual QA required** | yes \| no — [what to verify in browser] |
```

---

## Phase Outputs

### Phase 1–2: Extract Report (what the site does now)

```markdown
# Animation Extract — [source URL]

## Summary
- Total effects identified: N
- Taxonomy breakdown: CSS-only (n), Lottie (n), …
- Sections with motion: [list]

## Source Discovery
[Completed checklist — see source-discovery-checklist.md]

## Effects Inventory

### [Effect ID] — [name]
[Per-effect template — Extract columns only:]

- **Page or section:**
- **Observed animation behavior:**
- **Trigger:**
- **Motion behavior:** (repeat | once | scrub | pin | sequence)
- **What moves:**
- **Implementation pattern:** (taxonomy + evidence)
- **Dependencies / assets:**
- **Responsiveness / mobile:** (observed or not tested)
- **Evidence:**
  - [screenshot ref, DOM selector, script/global detected]
- **Uncertainty:** (if any)

## Open Questions / Missing Data
- [Questions that block a confident recommendation]
- [Tests not yet run — mobile, reduced-motion, resize]
```

### Phase 3: Recommend Report (what EDS should do)

```markdown
# Animation Recommendations — [source URL → EDS target]

## Executive Summary
[2–3 sentences: overall approach, major skips/simplifications]

## Recommendations by Effect

### [Effect ID] — [name]
[Full per-effect template including migration decision and EDS approach]

## Implementation Priority
1. [Effect IDs in build order]
2. …

## Deferred / Out of Scope
- [Effects marked skip or redesign with rationale]
```

---

## Full Page Summary Block

After all effects are documented:

```yaml
page: /homepage
source_url: https://example.com/
extract_date: 2026-06-01
effects_count: 7
taxonomy_summary:
  CSS-only: 3
  Lottie: 1
  GSAP timeline: 1
  WebGL / Three.js: 1
  Do not migrate as-is; redesign: 1
decisions_summary:
  preserve: 3
  simplify: 2
  replace with Lottie: 0
  replace with static/fallback: 1
  leave as embedded external experience: 0
  skip: 1
open_questions:
  - "Mobile scroll-scrub behavior not verified at 375px"
manual_qa_required: true
manual_qa_notes: "Verify sticky scroll story at 768px and with reduced-motion."
```

---

## EDS Pattern Letters (Recommend phase only)

| Pattern | Name | Use When |
|---------|------|----------|
| A | Scroll Reveal | Simple fade/slide on viewport entry |
| B | Scripted Scroll Animation | rAF multi-step on IO trigger |
| C | Counter | Numeric count-up |
| D | Hover/Focus | CSS interaction |
| E | Page-Load Entry | CSS @keyframes after loadLazy |
| F | Lottie | Vector JSON via delayed.js |
| G | Parallax | Scroll-linked transform |

See [eds-animation-patterns.md](../eds-animation-patterns.md) for implementation snippets.
