/**
 * Animation Detection Script
 * Run via Playwright browser_evaluate on any source page.
 * Returns a structured inventory of all animations found.
 *
 * Usage: paste this entire function into browser_evaluate
 */
(() => {
  const inventory = {
    cssKeyframes: [],
    cssAnimations: [],
    cssTransitions: [],
    lottie: [],
    scrollTriggered: [],
    counterCandidates: [],
    jsLibraries: [],
    videoBackgrounds: [],
    svgAnimations: [],
    customElements: [],
  };

  // 1. CSS @keyframes from stylesheets
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSKeyframesRule) {
          inventory.cssKeyframes.push({
            name: rule.name,
            keyframeCount: rule.cssRules.length,
            source: sheet.href || 'inline',
          });
        }
      }
    } catch (e) { /* cross-origin */ }
  }

  // 2. Elements with active CSS animations
  document.querySelectorAll('*').forEach((el) => {
    const style = getComputedStyle(el);
    if (style.animationName && style.animationName !== 'none') {
      inventory.cssAnimations.push({
        element: `${el.tagName.toLowerCase()}.${el.className}`,
        xpath: getXPath(el),
        animation: style.animationName,
        duration: style.animationDuration,
        iterationCount: style.animationIterationCount,
      });
    }
    if (style.transitionProperty !== 'all'
        && style.transitionProperty !== 'none'
        && style.transitionDuration !== '0s') {
      inventory.cssTransitions.push({
        element: `${el.tagName.toLowerCase()}.${el.className}`,
        property: style.transitionProperty,
        duration: style.transitionDuration,
        timing: style.transitionTimingFunction,
      });
    }
  });

  // 3. Lottie / Bodymovin
  document.querySelectorAll('lottie-player').forEach((el) => {
    inventory.lottie.push({
      type: 'lottie-player',
      src: el.getAttribute('src'),
      loop: el.hasAttribute('loop'),
      autoplay: el.hasAttribute('autoplay'),
      speed: el.getAttribute('speed'),
      xpath: getXPath(el),
    });
  });
  document.querySelectorAll('[data-animation-path], [data-bm-renderer], [data-lottie-path]').forEach((el) => {
    inventory.lottie.push({
      type: 'bodymovin-container',
      path: el.dataset.animationPath || el.dataset.lottiePath,
      xpath: getXPath(el),
    });
  });

  // 4. Scroll-triggered candidates
  document.querySelectorAll('[data-aos], [data-scroll], [data-animate], .wow, .aos-init').forEach((el) => {
    inventory.scrollTriggered.push({
      type: el.dataset.aos ? 'AOS' : el.classList.contains('wow') ? 'WOW.js' : 'custom',
      effect: el.dataset.aos || el.dataset.animate || 'unknown',
      delay: el.dataset.aosDelay || el.dataset.delay || null,
      xpath: getXPath(el),
    });
  });
  // Hidden elements (opacity:0 or translated off) likely waiting for scroll trigger
  document.querySelectorAll('section, [class*="animate"], [class*="reveal"], [class*="fade"], [class*="slide"]').forEach((el) => {
    const style = getComputedStyle(el);
    if (style.opacity === '0' || (style.transform !== 'none' && style.transform !== 'matrix(1, 0, 0, 1, 0, 0)')) {
      inventory.scrollTriggered.push({
        type: 'hidden-awaiting-trigger',
        element: `${el.tagName.toLowerCase()}.${el.className}`,
        opacity: style.opacity,
        transform: style.transform,
        xpath: getXPath(el),
      });
    }
  });

  // 5. Counter candidates
  document.querySelectorAll('strong, b, .counter, .stat, [class*="count"], [class*="number"], [class*="metric"]').forEach((el) => {
    const text = el.textContent.trim();
    if (/^\d/.test(text) && text.length < 20) {
      inventory.counterCandidates.push({
        element: `${el.tagName.toLowerCase()}.${el.className}`,
        value: text,
        parsed: text.match(/^(\d+(?:[.,]\d+)?)(.*)/)?.[0] || text,
        xpath: getXPath(el),
      });
    }
  });

  // 6. JS animation libraries
  const libChecks = [
    ['GSAP', () => window.gsap || window.TweenMax || window.TweenLite],
    ['anime.js', () => window.anime],
    ['ScrollMagic', () => window.ScrollMagic],
    ['Waypoints', () => window.Waypoint],
    ['AOS', () => window.AOS],
    ['Swiper', () => window.Swiper],
    ['Lottie/Bodymovin', () => window.lottie || window.bodymovin],
    ['Rellax', () => window.Rellax],
    ['Typed.js', () => window.Typed],
    ['CounterUp', () => window.counterUp],
    ['Flickity', () => window.Flickity],
    ['Velocity.js', () => window.Velocity],
    ['Mo.js', () => window.mojs],
    ['Three.js', () => window.THREE],
    ['PixiJS', () => window.PIXI],
    ['ScrollReveal', () => window.ScrollReveal],
    ['Barba.js', () => window.barba],
  ];
  libChecks.forEach(([name, check]) => {
    try { if (check()) inventory.jsLibraries.push(name); } catch (e) { /* */ }
  });

  // 7. Video backgrounds
  document.querySelectorAll('video[autoplay], video[data-autoplay]').forEach((el) => {
    inventory.videoBackgrounds.push({
      src: el.src || el.querySelector('source')?.src,
      loop: el.loop,
      muted: el.muted,
      xpath: getXPath(el),
    });
  });

  // 8. SVG animations (SMIL)
  document.querySelectorAll('svg animate, svg animateTransform, svg animateMotion').forEach((el) => {
    inventory.svgAnimations.push({
      type: el.tagName,
      attributeName: el.getAttribute('attributeName'),
      dur: el.getAttribute('dur'),
      parentSvg: getXPath(el.closest('svg')),
    });
  });

  // 9. Custom web components that might be animated
  document.querySelectorAll('*').forEach((el) => {
    if (el.tagName.includes('-') && !el.tagName.startsWith('LOTTIE')) {
      const tag = el.tagName.toLowerCase();
      if (/anim|motion|scroll|reveal|parallax|counter|typed|morph|slide|fade|carousel/i.test(tag)) {
        inventory.customElements.push({ tag, xpath: getXPath(el) });
      }
    }
  });

  // Summary
  const total = Object.values(inventory).reduce((sum, arr) => sum + arr.length, 0);
  inventory._summary = {
    totalAnimationsFound: total,
    categories: Object.fromEntries(
      Object.entries(inventory)
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, v]) => [k, v.length])
        .filter(([, v]) => v > 0),
    ),
  };

  return inventory;

  // Helper: generate XPath for an element
  function getXPath(el) {
    if (!el) return '';
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1) {
      let idx = 1;
      let sibling = node.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === node.tagName) idx += 1;
        sibling = sibling.previousElementSibling;
      }
      parts.unshift(`${node.tagName.toLowerCase()}[${idx}]`);
      node = node.parentElement;
    }
    return `/${parts.join('/')}`;
  }
})();
