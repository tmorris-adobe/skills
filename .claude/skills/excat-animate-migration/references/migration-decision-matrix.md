# Migration Decision Matrix

For **each classified animation**, choose exactly one migration decision before recommending EDS implementation.

## Decisions

| Decision | When to Use | EDS Typical Outcome |
|----------|-------------|---------------------|
| **preserve** | Effect is CSS-only or maps cleanly to EDS patterns A–G with low risk | Same visual behavior via IO + CSS or Lottie |
| **simplify** | Source motion is over-engineered; equivalent UX achievable with less code | Fewer steps, shorter timeline, static intermediate states |
| **rebuild natively** | Source uses GSAP/Canvas/custom lib but effect is achievable in vanilla JS/CSS | rAF + IO, CSS scroll-reveal, or lightweight canvas |
| **replace with Lottie** | Complex vector/illustration motion; Lottie is more practical than CSS/JS rebuild | Export or obtain JSON; Pattern F via delayed.js |
| **replace with static/fallback** | Motion is decorative; static image/video poster is acceptable | Final frame, poster image, or `<video>` without interaction |
| **leave as embedded external experience** | Effect cannot live in EDS blocks but can remain as iframe/embed/external URL | iframe, third-party widget, or linked experience outside page flow |
| **skip** | Motion does not support content goals, harms a11y/perf, or user explicitly deprioritizes | No animation; content remains fully usable |

## Decision Heuristics by Taxonomy

| Taxonomy | Default Decision | Override When |
|----------|------------------|---------------|
| CSS-only | preserve | Properties animate layout (`width`, `top`) → simplify to transform/opacity |
| Scroll-linked CSS/WAAPI | simplify or rebuild natively | Full scroll-scrub narrative → simplify or skip sections |
| GSAP timeline | rebuild natively or simplify | Multi-step hero timeline → simplify; one-shot reveal → rebuild natively |
| Lottie | preserve | File >500KB or autoplay hero → evaluate static fallback |
| SVG / mask / clip-path | preserve or rebuild natively | SMIL → rebuild in CSS; complex morph → replace with Lottie or static |
| Canvas | rebuild natively or replace with static/fallback | Particles/decorative → static; data viz → rebuild or skip |
| WebGL / Three.js | replace with static/fallback or skip | Almost never preserve; hero 3D → poster video or static image |
| Video fallback | preserve | Use native `<video autoplay muted loop>` |
| Custom interaction / microinteraction | preserve | CSS `:hover`/`:focus` in block CSS; keep functional focus states |
| Do not migrate as-is; redesign | skip or replace with static/fallback | Requires stakeholder sign-off on redesign |

## Required Output Fields

```yaml
migration_decision: simplify
decision_rationale: "Source uses ScrollTrigger with 12 pinned panels; EDS can deliver 3 key beats via IO + CSS."
alternatives_considered:
  - decision: preserve
    rejected_because: "Would require scroll-scrub JS conflicting with EDS load phases"
  - decision: skip
    rejected_because: "Hero narrative carries brand message; static fallback loses key story beat"
```

## Complicated Cases

### Scroll narratives (sticky/pinned stories)
- Default: **simplify** to 2–4 IO-triggered section reveals
- If narrative is core brand: flag **manual QA required** and propose static storyboard frames

### WebGL-heavy heroes
- Default: **replace with static/fallback** (poster, looped video, or hero still)
- Document asset extraction path (screenshot sequence, exported video from source)

### Multi-step GSAP timelines
- Default: **rebuild natively** if ≤3 steps and compositor props only
- Default: **simplify** if >3 steps or scrubbed to scroll position

### Complex illustration not yet Lottie
- Default: **replace with Lottie** if vector source available or exportable
- Fallback: **replace with static/fallback** if no asset pipeline

### Proprietary widget / configurator / 3D viewer
- Default: **leave as embedded external experience** if vendor provides embed URL
- Document iframe dimensions, CSP requirements, and mobile behavior
