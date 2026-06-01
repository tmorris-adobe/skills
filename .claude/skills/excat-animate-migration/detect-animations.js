/**
 * Animation Detection Script
 * Run via browser evaluate on any source page.
 * Returns structured inventory with suggested motion taxonomy per finding.
 *
 * Usage: paste this entire IIFE into browser_evaluate
 */
(() => {
  const TAXONOMY = {
    CSS_ONLY: 'CSS-only',
    SCROLL_LINKED: 'Scroll-linked CSS/WAAPI',
    GSAP: 'GSAP timeline',
    LOTTIE: 'Lottie',
    SVG_MASK: 'SVG / mask / clip-path',
    CANVAS: 'Canvas',
    WEBGL: 'WebGL / Three.js',
    VIDEO: 'Video fallback',
    MICRO: 'Custom interaction / microinteraction',
    REDESIGN: 'Do not migrate as-is; redesign',
  };

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
    svgMaskClip: [],
    microinteractions: [],
    canvasElements: [],
    webglContexts: [],
    customElements: [],
    effects: [],
  };

  const libChecks = [
    ['GSAP', () => window.gsap || window.TweenMax || window.TweenLite],
    ['ScrollTrigger', () => window.ScrollTrigger],
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
    try {
      if (check()) inventory.jsLibraries.push(name);
    } catch (e) { /* */ }
  });

  const hasGsap = inventory.jsLibraries.includes('GSAP')
    || inventory.jsLibraries.includes('ScrollTrigger');
  const hasThree = inventory.jsLibraries.includes('Three.js');
  const hasPixi = inventory.jsLibraries.includes('PixiJS');

  // 1. CSS @keyframes from stylesheets
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSKeyframesRule) {
          inventory.cssKeyframes.push({
            name: rule.name,
            keyframeCount: rule.cssRules.length,
            source: sheet.href || 'inline',
            suggestedTaxonomy: TAXONOMY.CSS_ONLY,
            taxonomyEvidence: [`@keyframes ${rule.name} in ${sheet.href || 'inline'}`],
          });
        }
      }
    } catch (e) { /* cross-origin */ }
  }

  // 2. Elements with active CSS animations
  document.querySelectorAll('*').forEach((el) => {
    const style = getComputedStyle(el);
    const xpath = getXPath(el);
    const selector = `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 120);

    if (style.animationName && style.animationName !== 'none') {
      inventory.cssAnimations.push({
        element: selector,
        xpath,
        animation: style.animationName,
        duration: style.animationDuration,
        iterationCount: style.animationIterationCount,
        suggestedTaxonomy: TAXONOMY.CSS_ONLY,
        taxonomyEvidence: [`computed animation-name: ${style.animationName}`],
      });
    }
    if (style.transitionProperty !== 'all'
        && style.transitionProperty !== 'none'
        && style.transitionDuration !== '0s') {
      const isInteractive = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|LABEL)$/i.test(el.tagName)
        || el.closest('nav, header, footer, [role="button"], .btn, .button, .hamburger, .menu');
      const entry = {
        element: selector,
        property: style.transitionProperty,
        duration: style.transitionDuration,
        timing: style.transitionTimingFunction,
        suggestedTaxonomy: isInteractive ? TAXONOMY.MICRO : TAXONOMY.CSS_ONLY,
        suggestedMotionBehavior: 'once',
        taxonomyEvidence: [
          `transition on ${style.transitionProperty}, duration ${style.transitionDuration}`,
          ...(isInteractive ? ['interactive element — likely hover/focus microinteraction'] : []),
        ],
      };
      if (isInteractive) inventory.microinteractions.push(entry);
      else inventory.cssTransitions.push(entry);
    }

    const animatesMask = style.clipPath && style.clipPath !== 'none'
      || style.mask && style.mask !== 'none'
      || style.webkitMaskImage && style.webkitMaskImage !== 'none';
    if (animatesMask) {
      inventory.svgMaskClip.push({
        element: selector,
        xpath,
        clipPath: style.clipPath,
        mask: style.mask || style.webkitMaskImage,
        suggestedTaxonomy: TAXONOMY.SVG_MASK,
        taxonomyEvidence: ['animated or non-none clip-path/mask on element'],
      });
    }

    // Scroll-driven CSS (experimental)
    if (style.animationTimeline && style.animationTimeline !== 'auto') {
      inventory.scrollTriggered.push({
        type: 'scroll-driven-css',
        element: selector,
        animationTimeline: style.animationTimeline,
        xpath,
        suggestedTaxonomy: TAXONOMY.SCROLL_LINKED,
        taxonomyEvidence: [`animation-timeline: ${style.animationTimeline}`],
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
      suggestedTaxonomy: TAXONOMY.LOTTIE,
      taxonomyEvidence: ['<lottie-player> element', `src: ${el.getAttribute('src')}`],
    });
  });
  document.querySelectorAll('[data-animation-path], [data-bm-renderer], [data-lottie-path]').forEach((el) => {
    inventory.lottie.push({
      type: 'bodymovin-container',
      path: el.dataset.animationPath || el.dataset.lottiePath,
      xpath: getXPath(el),
      suggestedTaxonomy: TAXONOMY.LOTTIE,
      taxonomyEvidence: ['bodymovin/lottie data attribute on container'],
    });
  });

  // 4. Scroll-triggered candidates
  document.querySelectorAll('[data-aos], [data-scroll], [data-animate], .wow, .aos-init').forEach((el) => {
    const libType = el.dataset.aos ? 'AOS' : el.classList.contains('wow') ? 'WOW.js' : 'custom';
    inventory.scrollTriggered.push({
      type: libType,
      effect: el.dataset.aos || el.dataset.animate || 'unknown',
      delay: el.dataset.aosDelay || el.dataset.delay || null,
      xpath: getXPath(el),
      suggestedTaxonomy: libType === 'AOS' ? TAXONOMY.SCROLL_LINKED : TAXONOMY.CSS_ONLY,
      taxonomyEvidence: [`data attribute trigger (${libType})`],
    });
  });

  document.querySelectorAll('section, [class*="animate"], [class*="reveal"], [class*="fade"], [class*="slide"]').forEach((el) => {
    const style = getComputedStyle(el);
    if (style.opacity === '0' || (style.transform !== 'none' && style.transform !== 'matrix(1, 0, 0, 1, 0, 0)')) {
      inventory.scrollTriggered.push({
        type: 'hidden-awaiting-trigger',
        element: `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 120),
        opacity: style.opacity,
        transform: style.transform,
        xpath: getXPath(el),
        suggestedTaxonomy: TAXONOMY.SCROLL_LINKED,
        taxonomyEvidence: ['element hidden (opacity/transform) — likely scroll or load trigger', 'confirm with scroll test'],
        taxonomyConfidence: 'low',
      });
    }
  });

  // Sticky/pinned sections (scroll narrative signal)
  document.querySelectorAll('[style*="position: sticky"], .pin-spacer, [data-pin]').forEach((el) => {
    inventory.scrollTriggered.push({
      type: 'sticky-pin-candidate',
      element: `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 120),
      xpath: getXPath(el),
      suggestedTaxonomy: hasGsap ? TAXONOMY.GSAP : TAXONOMY.SCROLL_LINKED,
      taxonomyEvidence: ['sticky/pin-spacer pattern detected', hasGsap ? 'GSAP/ScrollTrigger present' : 'no GSAP confirmed'],
      taxonomyConfidence: hasGsap ? 'high' : 'medium',
    });
  });

  // 5. Counter candidates
  document.querySelectorAll('strong, b, .counter, .stat, [class*="count"], [class*="number"], [class*="metric"]').forEach((el) => {
    const text = el.textContent.trim();
    if (/^\d/.test(text) && text.length < 20) {
      inventory.counterCandidates.push({
        element: `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 120),
        value: text,
        parsed: text.match(/^(\d+(?:[.,]\d+)?)(.*)/)?.[0] || text,
        xpath: getXPath(el),
        suggestedTaxonomy: hasGsap ? TAXONOMY.GSAP : TAXONOMY.SCROLL_LINKED,
        taxonomyEvidence: ['numeric stat element — often scroll-triggered count-up'],
        taxonomyConfidence: 'low',
      });
    }
  });

  // 6. Video backgrounds
  document.querySelectorAll('video[autoplay], video[data-autoplay]').forEach((el) => {
    inventory.videoBackgrounds.push({
      src: el.src || el.querySelector('source')?.src,
      loop: el.loop,
      muted: el.muted,
      xpath: getXPath(el),
      suggestedTaxonomy: TAXONOMY.VIDEO,
      taxonomyEvidence: ['autoplay video element'],
    });
  });

  // 7. SVG animations (SMIL) and animated SVG via CSS
  document.querySelectorAll('svg animate, svg animateTransform, svg animateMotion').forEach((el) => {
    inventory.svgAnimations.push({
      type: el.tagName,
      attributeName: el.getAttribute('attributeName'),
      dur: el.getAttribute('dur'),
      parentSvg: getXPath(el.closest('svg')),
      suggestedTaxonomy: TAXONOMY.SVG_MASK,
      suggestedMotionBehavior: el.getAttribute('repeatCount') === 'indefinite' ? 'repeat' : 'once',
      taxonomyEvidence: ['SVG SMIL animation'],
    });
  });
  document.querySelectorAll('svg').forEach((svg) => {
    const style = getComputedStyle(svg);
    if (style.animationName && style.animationName !== 'none') {
      inventory.svgMaskClip.push({
        type: 'svg-css-animation',
        parentSvg: getXPath(svg),
        animation: style.animationName,
        suggestedTaxonomy: TAXONOMY.SVG_MASK,
        taxonomyEvidence: [`CSS animation on svg: ${style.animationName}`],
      });
    }
  });

  // 8. Canvas
  document.querySelectorAll('canvas').forEach((el) => {
    let contextType = 'unknown';
    try {
      if (el.getContext('webgl2') || el.getContext('webgl')) contextType = 'webgl';
      else if (el.getContext('2d')) contextType = '2d';
    } catch (e) { /* */ }

    const entry = {
      xpath: getXPath(el),
      contextType,
      dimensions: { width: el.width, height: el.height },
      suggestedTaxonomy: contextType === 'webgl' || hasThree || hasPixi
        ? TAXONOMY.WEBGL
        : TAXONOMY.CANVAS,
      taxonomyEvidence: [
        `<canvas> with ${contextType} context`,
        ...(hasThree ? ['THREE global detected'] : []),
        ...(hasPixi ? ['PIXI global detected'] : []),
      ],
    };

    if (contextType === 'webgl') inventory.webglContexts.push(entry);
    else inventory.canvasElements.push(entry);
  });

  // 9. Custom animated web components
  document.querySelectorAll('*').forEach((el) => {
    if (el.tagName.includes('-') && !el.tagName.startsWith('LOTTIE')) {
      const tag = el.tagName.toLowerCase();
      if (/anim|motion|scroll|reveal|parallax|counter|typed|morph|slide|fade|carousel/i.test(tag)) {
        inventory.customElements.push({
          tag,
          xpath: getXPath(el),
          suggestedTaxonomy: TAXONOMY.REDESIGN,
          taxonomyEvidence: [`custom element <${tag}> — verify implementation`],
          taxonomyConfidence: 'low',
        });
      }
    }
  });

  // 10. GSAP-specific DOM (if library detected)
  if (hasGsap) {
    inventory.effects.push({
      id: 'gsap-global',
      suggestedTaxonomy: TAXONOMY.GSAP,
      taxonomyEvidence: inventory.jsLibraries.filter((l) => l === 'GSAP' || l === 'ScrollTrigger'),
      taxonomyConfidence: 'high',
      note: 'GSAP timelines may not be enumerable from DOM — manual QA required',
    });
  }

  // Build unified effects list for output schema
  const effectSources = [
    ...inventory.lottie.map((x, i) => ({ id: `lottie-${i}`, ...x })),
    ...inventory.videoBackgrounds.map((x, i) => ({ id: `video-${i}`, ...x })),
    ...inventory.webglContexts.map((x, i) => ({ id: `webgl-${i}`, ...x })),
    ...inventory.canvasElements.map((x, i) => ({ id: `canvas-${i}`, ...x })),
    ...inventory.svgMaskClip.slice(0, 15).map((x, i) => ({ id: `svg-${i}`, ...x })),
    ...inventory.microinteractions.slice(0, 15).map((x, i) => ({ id: `micro-${i}`, ...x })),
    ...inventory.cssAnimations.slice(0, 20).map((x, i) => ({ id: `css-anim-${i}`, ...x })),
    ...inventory.scrollTriggered.slice(0, 20).map((x, i) => ({ id: `scroll-${i}`, ...x })),
  ];

  inventory.effects.push(...effectSources);

  // Taxonomy summary
  const taxonomyCounts = {};
  inventory.effects.forEach((e) => {
    const t = e.suggestedTaxonomy;
    if (t) taxonomyCounts[t] = (taxonomyCounts[t] || 0) + 1;
  });

  const total = Object.entries(inventory)
    .filter(([k]) => !k.startsWith('_') && k !== 'effects')
    .reduce((sum, [, arr]) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

  inventory._summary = {
    totalSignalsFound: total,
    effectsForReview: inventory.effects.length,
    categories: Object.fromEntries(
      Object.entries(inventory)
        .filter(([k]) => !k.startsWith('_') && k !== 'effects')
        .map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
        .filter(([, v]) => v > 0),
    ),
    suggestedTaxonomyCounts: taxonomyCounts,
    jsLibraries: inventory.jsLibraries,
    manualQaRecommended: hasGsap
      || inventory.webglContexts.length > 0
      || inventory.scrollTriggered.some((s) => s.type === 'sticky-pin-candidate'),
    guardrails: [
      'Do not claim exact timing unless duration captured from computed CSS',
      'Do not assume GSAP timelines without ScrollTrigger scroll test',
      'Confirm hidden elements with scroll pass before classifying as scroll-linked',
    ],
  };

  return inventory;

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
