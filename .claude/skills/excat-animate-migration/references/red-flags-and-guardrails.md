# Red Flags and Guardrails

## Do Not Overclaim

The agent **must** follow these rules when extracting and recommending:

1. **Do not claim exact animation timing unless observed**
   - OK: "Transition duration computed as 0.6s on `.card`"
   - OK: "Observed fade-in over approximately 0.5–1s during scroll test"
   - NOT OK: "Animation is 800ms ease-in-out" (without CSS or measurement evidence)

2. **Do not infer libraries unless there is evidence**
   - Evidence: global on `window`, script `src` in DOM, library-specific data attributes, bundle filename
   - If behavior resembles GSAP but no global/scripts found: say "GSAP-like sequencing; library not confirmed"

3. **Call out uncertainty explicitly**
   - Use `confidence: low` and list what would resolve it (mobile test, DevTools Performance tab, source map inspection)

4. **Note when manual QA in browser is required**
   - Scroll-scrubbed narratives, hover-only motion, resize-dependent behavior, reduced-motion on source site
   - Mark `manual_qa_required: yes` with specific verification steps

## Red Flags (Escalate or Default to Skip/Simplify)

| Red Flag | Risk | Default Action |
|----------|------|--------------|
| Infinite parallax chains | Scroll jank, a11y, mobile breakage | simplify or skip |
| Scroll progress driving many layered elements | High JS cost, fragile across viewports | simplify to 2–4 beats or skip |
| Canvas or WebGL with custom shaders | Unmaintainable in EDS; bundle/LCP hit | replace with static/fallback or embedded external |
| Large motion tied to viewport size | Breaks at breakpoints; resize bugs | simplify; flag manual QA at multiple widths |
| Asset-heavy hero sections | LCP, bandwidth | replace with static/fallback or delayed Lottie |
| Timelines dependent on precise pixel positions | Fragile across devices; hard to rebuild | simplify or replace with static/fallback |
| Full-viewport WebGL hero | LCP, bundle size, maintenance | replace with static/fallback |
| Scroll-jacking / hijacked scroll | a11y, mobile breakage | simplify or skip |
| Animation on LCP element (hero H1, hero image) | Core Web Vitals | skip animation on first section |
| `width`/`height`/`top`/`left` animated | Layout thrash | rebuild with transform |
| Autoplay Lottie above fold | LCP delay | move to delayed.js or static first frame |
| Motion without reduced-motion fallback on source | a11y debt | add EDS fallback; note gap |
| Cross-route page transitions (Barba, etc.) | EDS MPA model | skip or simplify to CSS page load |
| Canvas particle fields | CPU drain | static image or CSS-only alternative |
| Tied to unavailable API (WebXR, DeviceOrientation) | Cannot replicate | skip or redesign |
| >5 pinned scroll sections | High implementation cost | simplify to 2–3 IO reveals |

## Evidence Standards

| Claim Type | Minimum Evidence |
|------------|------------------|
| Library present | `window` global OR script tag src OR detect-animations.js hit |
| CSS animation | Computed style or `@keyframes` rule name |
| Scroll-triggered | Behavior change on scroll test OR IO/scroll listener evidence |
| Motion behavior (scrub/pin/sequence) | Scroll test showing progress-linked change OR pin-spacer/GSAP ScrollTrigger |
| Duration/easing | Computed CSS value OR frame timing from observation (approximate) |
| Mobile difference | Screenshot or test at ≤768px width |

## Language Templates

**Uncertainty:**
> "Scroll-linked transform on `.hero-bg` — likely parallax (medium confidence). Confirm by comparing transform values at scroll Y=0 vs Y=500."

**Library unconfirmed:**
> "Staggered fade-in resembles AOS; no `data-aos` attributes or AOS global detected. Treat as custom JS until source scripts reviewed."

**Manual QA:**
> "Manual QA required: test sticky panel release at 1024px and 375px; programmatic scroll may not match user scroll velocity."
