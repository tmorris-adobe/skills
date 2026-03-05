/**
 * Animation Migration Verification Script
 * ========================================
 * Run via Playwright browser_evaluate on an EDS page AFTER:
 *   1. Waiting 2+ seconds (so delayed.js has loaded Lottie)
 *   2. Scrolling the full page (so IntersectionObservers have fired)
 *
 * Returns a structured JSON report using pattern-aligned criterion IDs
 * (A-DOM, F-RENDER, C-VALUE, GLOB-NO-LIB, etc.) compatible with
 * EDS metadata blocks, table blocks, and JSON-in-metadata output.
 *
 * Usage (Playwright):
 *   await page.goto('http://localhost:3000/content/index');
 *   await page.waitForTimeout(2500);
 *   await page.evaluate(() => {
 *     const h = document.body.scrollHeight;
 *     for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); }
 *   });
 *   await page.waitForTimeout(1000);
 *   const report = await page.evaluate(verifyAnimationsScript);
 *
 * Usage (browser_evaluate MCP tool):
 *   Paste this entire IIFE into the function field.
 */
(() => {
  const report = {
    url: window.location.href,
    timestamp: new Date().toISOString(),
    checks: [],
  };

  function add(id, name, status, details) {
    report.checks.push({ id, name, status, ...(details && { details }) });
  }

  // ── A-DOM + A-FINAL: Scroll-reveal classes and visible state ──
  const reveals = document.querySelectorAll('.scroll-reveal');
  const visibleReveals = [...reveals].filter((el) => el.classList.contains('is-visible'));
  add('A-DOM', 'Scroll Reveal Classes',
    reveals.length === 0 ? 'PASS' : visibleReveals.length === reveals.length ? 'PASS' : 'WARN',
    { total: reveals.length, triggered: visibleReveals.length });

  // ── A-LCP: First section must NOT have scroll-reveal ──────────
  const firstSection = document.querySelector('main > .section');
  const firstHasReveal = firstSection && firstSection.classList.contains('scroll-reveal');
  add('A-LCP', 'First Section No Reveal',
    firstSection ? (firstHasReveal ? 'FAIL' : 'PASS') : 'WARN',
    { firstSectionClasses: firstSection ? [...firstSection.classList] : [] });

  // ── A-REDUCED: Reduced-motion CSS for .scroll-reveal ──────────
  let scrollRevealReducedMotion = false;
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSMediaRule && rule.conditionText?.includes('prefers-reduced-motion')) {
          if ([...rule.cssRules].some((r) => r.selectorText?.includes('scroll-reveal'))) {
            scrollRevealReducedMotion = true;
          }
        }
      }
    } catch (e) { /* cross-origin */ }
  }
  add('A-REDUCED', 'Scroll Reveal Reduced Motion',
    scrollRevealReducedMotion ? 'PASS' : 'FAIL',
    { hasCSSOverride: scrollRevealReducedMotion });

  // ── B-PROPS: Only compositor-friendly properties animated ─────
  const layoutProps = ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding', 'border-width', 'font-size'];
  const layoutViolations = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.style?.transitionProperty) {
          const props = rule.style.transitionProperty.split(',').map((p) => p.trim());
          const bad = props.filter((p) => layoutProps.some((lp) => p.includes(lp)));
          if (bad.length) layoutViolations.push({ selector: rule.selectorText, properties: bad });
        }
      }
    } catch (e) { /* cross-origin */ }
  }
  add('B-PROPS', 'Compositor-Only Properties',
    layoutViolations.length === 0 ? 'PASS' : 'WARN',
    { violations: layoutViolations });

  // ── C-VALUE + C-PARSE: Counter final values and suffix ────────
  const counters = document.querySelectorAll('.counter-animate');
  const counterResults = [...counters].map((el) => {
    const text = el.textContent.trim();
    const isNumeric = /^\d/.test(text);
    const isZero = text.startsWith('0');
    const hasSuffix = /\d[+%KMBkmb]/.test(text);
    return { value: text, isNumeric, isZero, hasSuffix };
  });
  const countersOk = counterResults.every((r) => r.isNumeric && !r.isZero);
  add('C-VALUE', 'Counter Final Values',
    counters.length === 0 ? 'PASS' : countersOk ? 'PASS' : 'FAIL',
    { total: counters.length, values: counterResults });

  // ── F-RENDER + F-CONTAINER: Lottie SVG rendered ───────────────
  const lotties = document.querySelectorAll('[data-lottie-path]');
  const lottieResults = [...lotties].map((c) => {
    const svg = c.querySelector('svg');
    const rect = c.getBoundingClientRect();
    return {
      path: c.dataset.lottiePath,
      loop: c.dataset.lottieLoop,
      hasSvg: !!svg,
      svgChildCount: svg ? svg.children.length : 0,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      ok: !!(svg && svg.children.length > 0 && rect.width > 0 && rect.height > 0),
    };
  });
  const allLottieOk = lottieResults.every((d) => d.ok);
  add('F-RENDER', 'Lottie SVG Rendered',
    lotties.length === 0 ? 'PASS' : allLottieOk ? 'PASS' : 'FAIL',
    { containers: lottieResults });

  // ── F-DELAYED: Lottie loaded via delayed.js (not in <head>) ───
  const allScripts = [...document.querySelectorAll('script[src]')];
  const lottieScript = allScripts.find((s) => s.src.includes('lottie'));
  const lottieInHead = lottieScript && lottieScript.closest('head');
  add('F-DELAYED', 'Lottie Load Phase',
    !lottieScript ? 'PASS' : lottieInHead ? 'FAIL' : 'PASS',
    { loaded: !!lottieScript, inHead: !!lottieInHead, src: lottieScript?.src || 'none' });

  // ── F-LIGHT: Lottie light build ───────────────────────────────
  const isLight = !lottieScript || lottieScript.src.includes('lottie_light');
  add('F-LIGHT', 'Lottie Light Build',
    isLight ? 'PASS' : 'WARN',
    { src: lottieScript?.src || 'none' });

  // ── GLOB-NO-LIB: No banned animation libraries ───────────────
  const banned = ['gsap', 'greensock', 'anime.min', 'aos.js', 'scrollmagic', 'waypoints', 'scrollreveal'];
  const scriptSrcs = allScripts.map((s) => s.src.toLowerCase());
  const bannedFound = banned.filter((lib) => scriptSrcs.some((src) => src.includes(lib)));
  add('GLOB-NO-LIB', 'No Banned Libraries',
    bannedFound.length === 0 ? 'PASS' : 'FAIL',
    { bannedFound });

  // ── GLOB-PROGRESSIVE: No permanently hidden content ───────────
  const permanentlyHidden = [];
  reveals.forEach((el) => {
    const style = getComputedStyle(el);
    if (style.opacity === '0' && style.transitionDuration === '0s') {
      permanentlyHidden.push(`${el.tagName}.${[...el.classList].join('.')}`);
    }
  });
  add('GLOB-PROGRESSIVE', 'Progressive Enhancement',
    permanentlyHidden.length === 0 ? 'PASS' : 'FAIL',
    { permanentlyHidden });

  // ── GLOB-DA: DA authoring integrity (Lottie links + counters) ─
  const daResults = [];
  document.querySelectorAll('.hero').forEach((hero) => {
    const imageCol = hero.querySelector(':scope > div > div:nth-child(2)');
    if (!imageCol) return;
    const lottieContainer = imageCol.querySelector('[data-lottie-path]');
    if (lottieContainer) {
      daResults.push({ check: 'Lottie link', status: 'PASS', path: lottieContainer.dataset.lottiePath });
    } else {
      const links = imageCol.querySelectorAll('a');
      const jsonLink = [...links].find((a) => a.textContent.trim().endsWith('.json'));
      daResults.push({
        check: 'Lottie link',
        status: jsonLink ? 'WARN' : 'FAIL',
        note: jsonLink ? 'Link exists but not converted' : 'No .json link found',
      });
    }
  });
  document.querySelectorAll('.cards.block').forEach((block) => {
    const strongs = block.querySelectorAll('strong');
    const numericStrongs = [...strongs].filter((el) => /^\d/.test(el.textContent.trim()));
    daResults.push({ check: 'Counter strong tags', status: numericStrongs.length > 0 ? 'PASS' : 'WARN', found: numericStrongs.length });
  });
  if (daResults.length > 0) {
    add('GLOB-DA', 'DA Authoring Integrity',
      daResults.every((r) => r.status === 'PASS') ? 'PASS' : daResults.some((r) => r.status === 'FAIL') ? 'FAIL' : 'WARN',
      { checks: daResults });
  }

  // ── Summary ───────────────────────────────────────────────────
  const passed = report.checks.filter((c) => c.status === 'PASS').length;
  const failed = report.checks.filter((c) => c.status === 'FAIL').length;
  const warned = report.checks.filter((c) => c.status === 'WARN').length;

  report.summary = {
    total: report.checks.length,
    passed,
    failed,
    warned,
    overallStatus: failed > 0 ? 'FAIL' : warned > 0 ? 'WARN' : 'PASS',
    criterionsPassed: report.checks.filter((c) => c.status === 'PASS').map((c) => c.id),
    criterionsFailed: report.checks.filter((c) => c.status === 'FAIL').map((c) => c.id),
  };

  // ── EDS metadata output (ready for metadata block or JSON-in-metadata) ──
  report.edsMetadata = {
    'animation-verification': report.summary.overallStatus.toLowerCase(),
    'animation-verification-date': new Date().toISOString().split('T')[0],
    'animation-criteria-passed': report.summary.criterionsPassed.join(','),
    'animation-criteria-failed': report.summary.criterionsFailed.join(','),
  };

  return report;
})();
