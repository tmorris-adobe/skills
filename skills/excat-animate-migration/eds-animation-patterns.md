# EDS Animation Patterns Quick Reference

## IntersectionObserver + Class Toggle (Primary Pattern)

The core EDS animation pattern. Use for any scroll-triggered effect.

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
```

**Always pair with:**
```css
@media (prefers-reduced-motion: reduce) {
  .animated-element { transition: none; opacity: 1; transform: none; }
}
```

## requestAnimationFrame (For JS-driven values)

Use when you need to animate a computed value (counters, progress bars, custom drawings).

```javascript
function animate(el, target, duration = 2000) {
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - progress) ** 3; // ease-out cubic
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
```

## Lottie via delayed.js (For complex vector animations)

Only external library allowed in EDS. Load in delayed phase.

```javascript
// delayed.js
await loadScript('https://cdn.jsdelivr.net/npm/lottie-web@5/build/player/lottie_light.min.js');
window.lottie.loadAnimation({ container, renderer: 'svg', loop: true, autoplay: true, path: '/animations/file.json' });
```

**DA authoring:** Link text = file path (e.g., `/animations/hero.json`). Block JS converts to `data-lottie-path` container.

## File Placement

| What | Where | When |
|------|-------|------|
| Scroll-reveal init | `scripts.js` → `loadLazy()` | After first section |
| Animation CSS | `lazy-styles.css` | Post-LCP |
| Lottie loader | `delayed.js` | 1.5s after load |
| Block animations | `blocks/{name}/{name}.js` | With block |
| Hover/transition CSS | `blocks/{name}/{name}.css` | With block |

## Easing Functions (CSS and JS)

```css
/* CSS */
transition-timing-function: cubic-bezier(0.33, 1, 0.68, 1); /* ease-out */
transition-timing-function: cubic-bezier(0.65, 0, 0.35, 1); /* ease-in-out */
```

```javascript
/* JS equivalents */
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeOutQuart = (t) => 1 - (1 - t) ** 4;
const easeInOutCubic = (t) => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
```

## Accessibility Checkpoint

Every animation MUST include:

```javascript
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
```

```css
@media (prefers-reduced-motion: reduce) {
  .animated { animation: none; transition: none; opacity: 1; transform: none; }
}
```
