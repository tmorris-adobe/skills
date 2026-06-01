# Animation Migration Examples

Concrete before/after cases. Each example shows **Extract** (observed) then **Recommend** (EDS approach).

---

## 1. Parallax Hero

### Extract
| Field | Value |
|-------|-------|
| Page or section | Homepage hero |
| Observed behavior | Background image drifts upward slower than scroll; headline fades in on load |
| Implementation pattern | Scroll-linked CSS/WAAPI — `transform: translateY` on `.hero-bg` tied to scroll; CSS `@keyframes fadeInUp` on title |
| Taxonomy evidence | Scroll listener behavior observed; no GSAP global; computed transition on bg wrapper |
| Confidence | medium |

### Recommend
| Field | Value |
|-------|-------|
| Migration decision | simplify |
| Migration difficulty | medium |
| EDS approach | Pattern G (parallax) for bg at reduced speed (0.3); Pattern E for title fade — no scroll-scrub on headline |
| Risks | Scroll listener on hero — minimize with IO gate; do not animate first-section LCP image |
| Fallback | Static hero image; title visible immediately with `prefers-reduced-motion` |

---

## 2. Sticky Scroll Story

### Extract
| Field | Value |
|-------|-------|
| Page or section | Product story (3 pinned panels) |
| Observed behavior | Section pins for ~200vh; copy swaps while illustration cross-fades; progress bar fills |
| Motion behavior | pin + sequence + scrub |
| Implementation pattern | GSAP timeline + ScrollTrigger — `window.gsap` and `ScrollTrigger` detected; pin spacing in DOM |
| Taxonomy | GSAP timeline |
| Confidence | high |

### Recommend
| Field | Value |
|-------|-------|
| Migration decision | simplify |
| Migration difficulty | high |
| EDS approach | Replace pin-scrub with 3 stacked sections; Pattern A scroll-reveal each beat; static illustrations per beat |
| Risks | Cannot replicate 1:1 scrub without heavy JS; mobile pin often broken on source |
| Fallback | Single long-scroll section with all copy visible; no pin |
| Manual QA | yes — compare narrative clarity at mobile width |

---

## 3. Multi-Step Timeline (GSAP)

### Extract
| Field | Value |
|-------|-------|
| Page or section | "How it works" |
| Observed behavior | On scroll into view: line draws, 4 icons scale in sequence (~0.2s stagger), labels fade |
| Implementation pattern | GSAP timeline — sequential `.to()` calls; triggered once on enter |
| Taxonomy | GSAP timeline |
| Confidence | high |

### Recommend
| Field | Value |
|-------|-------|
| Migration decision | rebuild natively |
| Migration difficulty | medium |
| EDS approach | Pattern B — IO triggers rAF sequence; CSS `--stagger-index` for icon delays; SVG line via CSS `stroke-dashoffset` |
| Risks | Stagger timing approximate unless CSS durations copied from computed styles |
| Fallback | All steps visible immediately when reduced-motion |

---

## 4. Floating SVG / Mask Animation

### Extract
| Field | Value |
|-------|-------|
| Page or section | Feature band |
| Observed behavior | SVG shape morphs subtly; soft float loop on icon group |
| Implementation pattern | SVG / mask / clip-path — `@keyframes float` on `g.icon`; SMIL not present |
| Taxonomy | SVG / mask / clip-path |
| Confidence | high |

### Recommend
| Field | Value |
|-------|-------|
| Migration decision | preserve |
| Migration difficulty | low |
| EDS approach | Inline SVG in block; `@keyframes float` in block CSS; `transform` + `opacity` only |
| Risks | Large SVG weight — optimize paths |
| Fallback | `@media (prefers-reduced-motion: reduce)` — animation none, final pose |

---

## 5. Lottie-Based Illustration

### Extract
| Field | Value |
|-------|-------|
| Page or section | Hero right column |
| Observed behavior | Vector character loops continuously |
| Motion behavior | repeat |
| Implementation pattern | Lottie — `<lottie-player src="/anim/hero.json">`; ~180KB JSON |
| Taxonomy | Lottie |
| Confidence | high |

### Recommend
| Field | Value |
|-------|-------|
| Migration decision | preserve |
| Migration difficulty | medium |
| EDS approach | Pattern F — `delayed.js` loads lottie-web; block JS converts DA link text to `data-lottie-path` |
| Risks | LCP if loaded eager — container in hero but init in delayed phase; first frame via CSS min-height |
| Fallback | `goToAndStop(0)` when reduced-motion; optional static PNG poster |

---

## 6. 3D / Canvas Scene

### Extract
| Field | Value |
|-------|-------|
| Page or section | Homepage hero |
| Observed behavior | Rotating product model; reactive to mouse |
| Implementation pattern | WebGL / Three.js — `THREE` global; full-viewport canvas |
| Taxonomy | WebGL / Three.js |
| Confidence | high |

### Recommend
| Field | Value |
|-------|-------|
| Migration decision | replace with static/fallback |
| Migration difficulty | extreme |
| EDS approach | Looping product video (extract from source or client asset) OR high-res poster image; no Three.js in EDS |
| Risks | Interactive mouse parallax lost — stakeholder sign-off required |
| Fallback | Static PNG hero |
| Manual QA | yes — confirm video loop quality and file size budget |

---

## Reference Implementation: Zelis.com Homepage

| Effect | Taxonomy | Decision | EDS Pattern |
|--------|----------|----------|-------------|
| Hero Lottie | Lottie | preserve | F |
| Section fade-in | CSS-only + IO | preserve | A |
| Stats counters | GSAP-like (custom) | rebuild natively | C |

Files: `blocks/hero/hero.js`, `scripts/delayed.js`, `scripts/scripts.js`, `blocks/cards/cards.js`
