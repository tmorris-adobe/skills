#!/usr/bin/env node

/*
 * Navigation Validation Gate Hook
 *
 * Enforces navigation orchestrator requirements via hard programmatic gates.
 * Registered on PostToolUse (Write|Edit) and Stop events in plugin.json.
 *
 * LOGGING: Writes to BOTH /tmp (always) and workspace debug.log (when session exists).
 * Check: blocks/header/navigation-validation/debug.log for full execution trace.
 *
 * PostToolUse — fires on EVERY file write (17 gates):
 *   Gate 1:  BLOCKS if nav.md/nav.html written to wrong location
 *   Gate 2:  BLOCKS if nav.md/nav.html written WITHOUT image references
 *   Gate 3:  BLOCKS if style-register.json has validated components without critique proof
 *   Gate 4:  BLOCKS if style-register.json written but prerequisite registers missing
 *   Gate 5:  BLOCKS if phase-5-aggregate.json updated with all-pending style components
 *   Gate 6:  BLOCKS if mandatory scripts not run (6a-6h: desktop + mobile)
 *     6a: nav.md exists but validate-nav-content.js not run
 *     6b: migrated-megamenu-mapping exists but compare-megamenu-behavior.js not run
 *     6c: migrated-structural-summary exists but compare-structural-schema.js not run
 *     6d: style-register all at 0% — critique hasn't run, blocks CSS/JS edits
 *     6e: phase-4-mobile.json missing hamburgerAnimation
 *     6f: [MOBILE] mobile structural summary exists but mobile-schema-register missing
 *     6g: [MOBILE] mobile-style-register all at 0% — critique hasn't run
 *     6h: [MOBILE] heading coverage missing after mobile schema validated
 *   Gate 7:  [MOBILE] BLOCKS mobile-style-register with validated components without critique proof
 *   Gate 8:  [MOBILE] BLOCKS mobile-style-register if mobile-schema-register missing
 *   Gate 9:  WARNS if header.js has hardcoded megamenu content or site-specific function names
 *   Gate 10: BLOCKS phase-4-mobile.json if desktop incomplete:
 *     10a: migrated-megamenu-mapping.json missing (when megamenu present)
 *     10b: megamenu-behavior-register not allValidated
 *     10c: schema-register not allValidated
 *     10d: style-register has 0 validated
 *   Gate 11: BLOCKS phase-2-row-mapping.json if hasHamburgerIcon, hasSearchForm, or hasLocaleSelector field missing
 *     11b: BLOCKS/WARNS if hasSearchForm=true but searchFormDetails incomplete
 *     11c: BLOCKS/WARNS if hasLocaleSelector=true but localeSelectorDetails incomplete
 *   Gate 12: [MOBILE] BLOCKS mobile-style-register if heading coverage missing/incomplete
 *   Gate 13: [MOBILE] WARNS if header.css pattern doesn't match declared openBehavior + animation speed
 *   Gate 14: BLOCKS phase-4-mobile.json if hasSearchForm field missing
 *     14b: BLOCKS phase-4-mobile.json if hasLocaleSelector field missing
 *   Gate 15: WARNS if header.js has no viewport resize / matchMedia handling (after mobile phase)
 *
 * Stop — fires at session end (checks 1-11):
 *   [DESKTOP] 1: nav.md location, 2: nav.md images, 3: style-register, 4: schema-register
 *   [DESKTOP] 5: megamenu-behavior-register, 6: aggregate scores, 7: megamenu-mapping (source)
 *   [DESKTOP] 7b: migrated-megamenu-mapping (migrated), 9: style completeness
 *   [MOBILE]  8: hamburger animation, registers, critique proof
 *   [MOBILE]  8b: pattern consistency (slide-in vs accordion), 8c: heading coverage
 *   [MOBILE]  8d: menuItems vs heading count, 8e: mobile-behavior-register (tap/click/animation)
 *   [MOBILE]  8f: animation speed/transition timing matches source
 *   [VIEWPORT] 10: header.js viewport resize/matchMedia handling
 *   [SEARCH]   11: search form desktop/mobile parity
 *   [LOCALE]   12: locale selector desktop/mobile parity + flag download verification
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const VALIDATION_DIR = 'blocks/header/navigation-validation';
const STYLE_REGISTER = path.join(VALIDATION_DIR, 'style-register.json');
const SCHEMA_REGISTER = path.join(VALIDATION_DIR, 'schema-register.json');
const MEGAMENU_BEHAVIOR_REGISTER = path.join(VALIDATION_DIR, 'megamenu-behavior-register.json');
const AGGREGATE = path.join(VALIDATION_DIR, 'phase-5-aggregate.json');
const DEBUG_LOG = path.join(VALIDATION_DIR, 'debug.log');
const MOBILE_DIR = path.join(VALIDATION_DIR, 'mobile');
const MOBILE_STYLE_REGISTER = path.join(MOBILE_DIR, 'mobile-style-register.json');
const MOBILE_SCHEMA_REGISTER = path.join(MOBILE_DIR, 'mobile-schema-register.json');
const MOBILE_BEHAVIOR_REGISTER = path.join(MOBILE_DIR, 'mobile-behavior-register.json');
const MOBILE_HEADING_COVERAGE = path.join(MOBILE_DIR, 'mobile-heading-coverage.json');

const SIMILARITY_THRESHOLD = 95;
const IMAGE_PATTERN = /!\[.*?\]\(.*?\)|<img\s|media_|\.png|\.jpg|\.jpeg|\.svg|\.webp|\.gif/i;

let sessionId = 'default';
let TMP_LOG = path.join(os.tmpdir(), 'excat-nav-gate-debug-default.log');
let workspaceDebugLog = null;
const hookStartTime = Date.now();

function initSession(hookInput) {
  sessionId = hookInput?.session_id || 'default';
  TMP_LOG = path.join(os.tmpdir(), `excat-nav-gate-debug-${sessionId}.log`);
}

function log(level, msg, data = null) {
  const ts = new Date().toISOString();
  const elapsed = Date.now() - hookStartTime;
  const prefix = { ERROR: '❌', BLOCK: '🚫', WARN: '⚠️', PASS: '✅', START: '🔵', END: '🏁' }[level] || 'ℹ️';
  const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
  const entry = `[${ts}] (+${elapsed}ms) ${prefix} [${level}] ${msg}${dataStr}\n`;

  try { fs.appendFileSync(TMP_LOG, entry); } catch (_) { /* ignore */ }
  if (workspaceDebugLog) {
    try { fs.appendFileSync(workspaceDebugLog, entry); } catch (_) { /* ignore */ }
  }
}

function initWorkspaceLog(workspaceRoot) {
  const logDir = path.join(workspaceRoot, VALIDATION_DIR);
  if (fs.existsSync(logDir)) {
    workspaceDebugLog = path.join(workspaceRoot, DEBUG_LOG);
  }
}

async function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8'))); }
      catch (e) { reject(new Error(`Failed to parse stdin: ${e.message}`)); }
    });
    process.stdin.on('error', reject);
  });
}

function findWorkspaceRoot(startPath) {
  let cur = path.resolve(startPath);
  const root = path.parse(cur).root;
  const cwd = process.cwd();

  let check = cur;
  while (check !== root) {
    if (fs.existsSync(path.join(check, '.git'))) return check;
    const parent = path.dirname(check);
    if (parent === check) break;
    check = parent;
  }

  check = cur;
  while (check !== root) {
    if (fs.existsSync(path.join(check, 'blocks'))) return check;
    const parent = path.dirname(check);
    if (parent === check) break;
    check = parent;
  }

  return cwd;
}

function isNavContentFile(filePath) {
  if (!filePath) return false;
  const base = path.basename(filePath);
  return base === 'nav.md' || base === 'nav.html' || base === 'nav.plain.html';
}

function isHeaderFile(filePath) {
  if (!filePath) return false;
  return path.normalize(filePath).includes(path.join('blocks', 'header'));
}

function isNavValidationFile(filePath) {
  if (!filePath) return false;
  return path.normalize(filePath).includes(path.join('blocks', 'header', 'navigation-validation'));
}

function isStyleRegisterFile(filePath) {
  if (!filePath) return false;
  return path.basename(filePath) === 'style-register.json' && isNavValidationFile(filePath);
}

function isMobileStyleRegisterFile(filePath) {
  if (!filePath) return false;
  return path.basename(filePath) === 'mobile-style-register.json' && filePath.includes('mobile');
}

function isMobileSchemaRegisterFile(filePath) {
  if (!filePath) return false;
  return path.basename(filePath) === 'mobile-schema-register.json' && filePath.includes('mobile');
}

function isMobileFile(filePath) {
  if (!filePath) return false;
  return path.normalize(filePath).includes(path.join('navigation-validation', 'mobile'));
}

function detectPhase(workspaceRoot) {
  const hasP4 = fs.existsSync(path.join(workspaceRoot, VALIDATION_DIR, 'phase-4-mobile.json'));
  const hasDesktopConfirm = fs.existsSync(path.join(workspaceRoot, STYLE_REGISTER));
  const styleReg = loadJson(path.join(workspaceRoot, STYLE_REGISTER));
  const desktopDone = styleReg?.allValidated === true;
  if (hasP4) return 'MOBILE';
  if (desktopDone) return 'DESKTOP-CONFIRMED';
  return 'DESKTOP';
}

function loadJson(p) {
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (_) { /* ignore */ }
  return null;
}

function hasMegamenu(workspaceRoot) {
  const mmExists = fs.existsSync(path.join(workspaceRoot, VALIDATION_DIR, 'megamenu-mapping.json'));
  if (mmExists) return true;
  const behaviorRegExists = fs.existsSync(path.join(workspaceRoot, MEGAMENU_BEHAVIOR_REGISTER));
  if (behaviorRegExists) return true;
  const p3 = loadJson(path.join(workspaceRoot, VALIDATION_DIR, 'phase-3-megamenu.json'));
  if (p3 && p3.columnCount && p3.columnCount > 0) return true;
  if (p3 && p3.triggerType && p3.triggerType !== '') return true;
  if (p3 && p3.nestedLevels && p3.nestedLevels > 0) return true;
  return false;
}

function isAggregateFile(filePath) {
  if (!filePath) return false;
  return path.basename(filePath) === 'phase-5-aggregate.json' && isNavValidationFile(filePath);
}

// --- Nav location check ---

function checkNavLocation(filePath, workspaceRoot) {
  if (!isNavContentFile(filePath)) return null;
  const rel = path.relative(workspaceRoot, filePath).split(path.sep).join('/');
  const parentDir = path.basename(path.dirname(filePath));
  if (parentDir !== 'content') {
    return `nav file written to "${rel}" — parent must be "content". Rewrite to content/nav.md.`;
  }
  return null;
}

// --- Nav image check ---

function collectHasImagesElements(workspaceRoot) {
  const elements = [];
  const p2 = loadJson(path.join(workspaceRoot, VALIDATION_DIR, 'phase-2-row-mapping.json'));
  const p3 = loadJson(path.join(workspaceRoot, VALIDATION_DIR, 'phase-3-megamenu.json'));

  if (p2?.rows) {
    for (const row of p2.rows) {
      if (row.hasImages) elements.push(`Row ${row.index ?? '?'} (phase-2: hasImages=true)`);
    }
  }
  if (p3?.hasImages) elements.push('Megamenu overall (phase-3: hasImages=true)');
  if (p3?.columns) {
    for (const col of p3.columns) {
      if (col.hasImages) elements.push(`Megamenu column ${col.columnIndex ?? '?'} (phase-3: hasImages=true)`);
    }
  }
  return elements;
}

function checkNavContentForImages(filePath, workspaceRoot) {
  if (!isNavContentFile(filePath)) return null;
  const hasImagesElements = collectHasImagesElements(workspaceRoot);
  if (hasImagesElements.length === 0) return null;

  let content = '';
  try { if (fs.existsSync(filePath)) content = fs.readFileSync(filePath, 'utf-8'); } catch (_) { return null; }
  if (!content) return null;
  if (IMAGE_PATTERN.test(content)) return null;

  return `nav content has NO image references, but phases require images for ${hasImagesElements.length} element(s):\n` +
    hasImagesElements.map((e, i) => `  ${i + 1}. ${e}`).join('\n') +
    '\n\nDownload images to content/images/, reference in nav.md, rewrite.';
}

// --- Critique proof check (the key enforcement) ---

function checkCritiqueProof(workspaceRoot) {
  const errors = [];
  const regPath = path.join(workspaceRoot, STYLE_REGISTER);
  const reg = loadJson(regPath);
  if (!reg) return errors;

  const components = reg.components || [];
  log('INFO', `Critique proof check: scanning ${components.length} component(s)`);

  for (const c of components) {
    if (c.status === 'validated') {
      log('INFO', `  Checking critique proof for "${c.id}" (lastSimilarity=${c.lastSimilarity}%, iterations=${c.critiqueIterations ?? 0})`);

      // Check critique report exists
      if (!c.critiqueReportPath || c.critiqueReportPath === '') {
        log('WARN', `  "${c.id}": critiqueReportPath is EMPTY — no critique report exists`);
        errors.push(`Style register: "${c.id}" marked validated but critiqueReportPath is EMPTY. Run nav-component-critique (steps A-G) to produce a report.`);
      } else {
        const reportPath = path.isAbsolute(c.critiqueReportPath)
          ? c.critiqueReportPath
          : path.join(workspaceRoot, c.critiqueReportPath);
        if (fs.existsSync(reportPath)) {
          log('PASS', `  "${c.id}": critique report found at ${c.critiqueReportPath}`);
        } else {
          log('WARN', `  "${c.id}": critique report NOT found — checked: ${reportPath}`);
          errors.push(`Style register: "${c.id}" critiqueReportPath="${c.critiqueReportPath}" does NOT exist on disk. Critique did not run. Execute nav-component-critique steps C-E for this component.`);
        }
      }
      // Check source screenshot exists
      if (!c.screenshotSourcePath || c.screenshotSourcePath === '') {
        log('WARN', `  "${c.id}": screenshotSourcePath is EMPTY — no source screenshot`);
        errors.push(`Style register: "${c.id}" marked validated but screenshotSourcePath is EMPTY. Capture source component screenshot (critique Step C).`);
      } else {
        const srcPath = path.isAbsolute(c.screenshotSourcePath)
          ? c.screenshotSourcePath
          : path.join(workspaceRoot, c.screenshotSourcePath);
        if (fs.existsSync(srcPath)) {
          log('PASS', `  "${c.id}": source screenshot found at ${c.screenshotSourcePath}`);
        } else {
          log('WARN', `  "${c.id}": source screenshot NOT found — checked: ${srcPath}`);
          errors.push(`Style register: "${c.id}" screenshotSourcePath="${c.screenshotSourcePath}" does NOT exist on disk. Capture source screenshot (critique Step C).`);
        }
      }
      // Check migrated screenshot exists
      if (!c.screenshotMigratedPath || c.screenshotMigratedPath === '') {
        log('WARN', `  "${c.id}": screenshotMigratedPath is EMPTY — no migrated screenshot`);
        errors.push(`Style register: "${c.id}" marked validated but screenshotMigratedPath is EMPTY. Capture migrated component screenshot (critique Step D).`);
      } else {
        const migPath = path.isAbsolute(c.screenshotMigratedPath)
          ? c.screenshotMigratedPath
          : path.join(workspaceRoot, c.screenshotMigratedPath);
        if (fs.existsSync(migPath)) {
          log('PASS', `  "${c.id}": migrated screenshot found at ${c.screenshotMigratedPath}`);
        } else {
          log('WARN', `  "${c.id}": migrated screenshot NOT found — checked: ${migPath}`);
          errors.push(`Style register: "${c.id}" screenshotMigratedPath="${c.screenshotMigratedPath}" does NOT exist on disk. Capture migrated screenshot (critique Step D).`);
        }
      }
      // Check iterations
      if (!c.critiqueIterations || c.critiqueIterations < 1) {
        log('WARN', `  "${c.id}": critiqueIterations=${c.critiqueIterations ?? 0} — must be >= 1`);
        errors.push(`Style register: "${c.id}" critiqueIterations=${c.critiqueIterations ?? 0}. Must be >= 1 proving inline critique ran at least once.`);
      } else {
        log('PASS', `  "${c.id}": critiqueIterations=${c.critiqueIterations} — OK`);
      }
    } else {
      log('INFO', `  "${c.id}": status="${c.status}", lastSimilarity=${c.lastSimilarity ?? 'N/A'}% — not yet validated, skipping proof check`);
    }
  }

  log('INFO', `Critique proof check done: ${errors.length} error(s)`);
  return errors;
}

// --- Style register check with critique proof ---

function checkStyleRegister(workspaceRoot) {
  log('INFO', 'Checking style-register.json...');
  const errors = [];
  const remediation = [];
  const regPath = path.join(workspaceRoot, STYLE_REGISTER);
  const reg = loadJson(regPath);
  if (!reg) {
    log('WARN', 'style-register.json does not exist');
    errors.push('style-register.json does not exist. Build from phase-1/2/3.');
    return { errors, remediation };
  }

  log('INFO', `style-register.json loaded: ${(reg.components || []).length} component(s), allValidated=${reg.allValidated}`);

  if (!reg.allValidated) {
    errors.push('style-register.json allValidated=false. All components must reach 95%.');
  }
  const components = reg.components || [];
  for (const c of components) {
    if (c.status !== 'validated') {
      errors.push(`Style: "${c.id}" status="${c.status}" — must be "validated".`);
    }
    if (typeof c.lastSimilarity === 'number' && c.lastSimilarity < SIMILARITY_THRESHOLD) {
      errors.push(`Style: "${c.id}" lastSimilarity=${c.lastSimilarity}% — must be >= ${SIMILARITY_THRESHOLD}%.`);
      remediation.push(
        `[${c.id}] at ${c.lastSimilarity}%: Open blocks/header/header.css and blocks/header/header.js. ` +
        `Compare "${c.id}" visually against the source site screenshot. ` +
        `Fix CSS properties (colors, sizing, border-radius, padding, fonts) and JS behavior (hover, click, transitions) ` +
        `to match the source. Then re-run nav-component-critique (steps A–G) for "${c.id}". Repeat until >= 95%.`
      );
    }
  }
  if (components.length === 0) {
    errors.push('style-register.json has 0 components.');
  }

  errors.push(...checkCritiqueProof(workspaceRoot));
  log('INFO', `Style register result: ${errors.length} error(s), ${remediation.length} remediation(s)`);
  return { errors, remediation };
}

// --- Schema register check ---

function checkSchemaRegister(workspaceRoot) {
  log('INFO', 'Checking schema-register.json...');
  const errors = [];
  const remediation = [];
  const regPath = path.join(workspaceRoot, SCHEMA_REGISTER);
  const reg = loadJson(regPath);
  if (!reg) {
    log('WARN', 'schema-register.json does not exist');
    errors.push('schema-register.json does not exist.');
    return { errors, remediation };
  }

  log('INFO', `schema-register.json loaded: ${(reg.items || []).length} item(s), allValidated=${reg.allValidated}`);

  if (!reg.allValidated) {
    errors.push('schema-register.json allValidated=false.');
  }
  const items = reg.items || [];
  for (const it of items) {
    if (it.status !== 'validated') {
      log('INFO', `  Schema item "${it.id}": status="${it.status}" — NOT validated`);
      errors.push(`Schema: "${it.id}" status="${it.status}".`);
    }
    if (it.sourceMatch === false) {
      log('INFO', `  Schema item "${it.id}": sourceMatch=false — structural mismatch`);
      errors.push(`Schema: "${it.id}" sourceMatch=false.`);
      remediation.push(
        `[${it.id}] structural mismatch: The migrated header is missing or has different structure for "${it.id}" compared to the source. ` +
        `Open blocks/header/header.js and blocks/header/header.css. ` +
        `Add the missing HTML structure, rows, megamenu columns, or image elements to match the source. ` +
        `If the source has images/thumbnails/icons for this component, download them and include in content/nav.md. ` +
        `Then re-extract migrated-structural-summary.json and re-run compare-structural-schema.js --output-register.`
      );
    } else if (it.status === 'validated') {
      log('PASS', `  Schema item "${it.id}": validated, sourceMatch=true`);
    }
  }
  if (items.length === 0) errors.push('schema-register.json has 0 items.');

  log('INFO', `Schema register result: ${errors.length} error(s), ${remediation.length} remediation(s)`);
  return { errors, remediation };
}

// --- Megamenu behavior register check ---

function checkMegamenuBehaviorRegister(workspaceRoot) {
  log('INFO', 'Checking megamenu-behavior-register.json...');
  const errors = [];
  const remediation = [];

  const p3 = loadJson(path.join(workspaceRoot, VALIDATION_DIR, 'phase-3-megamenu.json'));
  if (!p3 || !p3.columnCount || p3.columnCount === 0) {
    log('INFO', 'No megamenu detected in phase-3 — skipping behavior register check');
    return { errors, remediation };
  }

  const regPath = path.join(workspaceRoot, MEGAMENU_BEHAVIOR_REGISTER);
  const reg = loadJson(regPath);
  if (!reg) {
    log('WARN', 'megamenu-behavior-register.json does not exist but megamenu has columns');
    errors.push('megamenu-behavior-register.json does not exist. Run compare-megamenu-behavior.js after creating migrated-megamenu-mapping.json.');
    return { errors, remediation };
  }

  log('INFO', `megamenu-behavior-register.json loaded: ${(reg.items || []).length} item(s), allValidated=${reg.allValidated}`);

  if (!reg.allValidated) {
    errors.push('megamenu-behavior-register.json allValidated=false. Megamenu sub-items have hover/click/styling mismatches.');
  }

  const items = reg.items || [];
  let hoverFails = 0, clickFails = 0, stylingFails = 0;

  for (const item of items) {
    if (item.status === 'failed') {
      const issues = [];
      if (!item.hoverMatch?.matches) { issues.push('hover'); hoverFails++; }
      if (!item.clickMatch?.matches) { issues.push('click'); clickFails++; }
      if (!item.stylingMatch?.matches) { issues.push('styling'); stylingFails++; }

      log('INFO', `  "${item.id}" (${item.type}): FAILED — ${issues.join(', ')}`);
      errors.push(`Megamenu behavior: "${item.id}" (${item.label}) failed: ${issues.join(', ')}.`);

      if (item.remediation) {
        remediation.push(`[${item.id}] ${item.label}: ${item.remediation}`);
      } else {
        const fixes = [];
        if (!item.hoverMatch?.matches) fixes.push(`hover: ${item.hoverMatch?.delta || 'match source hover'}`);
        if (!item.clickMatch?.matches) fixes.push(`click: ${item.clickMatch?.delta || 'match source click'}`);
        if (!item.stylingMatch?.matches) fixes.push(`styling: ${item.stylingMatch?.delta || 'match source appearance'}`);
        remediation.push(`[${item.id}] ${item.label}: Fix in header.js/header.css — ${fixes.join('; ')}`);
      }
    } else {
      log('PASS', `  "${item.id}" (${item.type}): validated`);
    }
  }

  if (items.length === 0) {
    errors.push('megamenu-behavior-register.json has 0 items.');
  }

  const summary = reg.summary || {};
  log('INFO', `Megamenu behavior result: ${errors.length} error(s), hover fails=${hoverFails}, click fails=${clickFails}, styling fails=${stylingFails}`, summary);
  return { errors, remediation };
}

// --- Mobile critique proof check ---

function checkMobileCritiqueProof(workspaceRoot) {
  const errors = [];
  const regPath = path.join(workspaceRoot, MOBILE_STYLE_REGISTER);
  const reg = loadJson(regPath);
  if (!reg) return errors;

  const components = reg.components || [];
  log('INFO', `[MOBILE] Critique proof check: scanning ${components.length} mobile component(s)`);

  for (const c of components) {
    if (c.status === 'validated') {
      if (!c.critiqueReportPath || c.critiqueReportPath === '') {
        errors.push(`[MOBILE] "${c.id}" marked validated but critiqueReportPath is EMPTY.`);
      } else {
        const reportPath = path.isAbsolute(c.critiqueReportPath) ? c.critiqueReportPath : path.join(workspaceRoot, c.critiqueReportPath);
        if (!fs.existsSync(reportPath)) {
          errors.push(`[MOBILE] "${c.id}" critiqueReportPath="${c.critiqueReportPath}" does NOT exist on disk.`);
        }
      }
      if (!c.screenshotSourcePath || !fs.existsSync(path.isAbsolute(c.screenshotSourcePath) ? c.screenshotSourcePath : path.join(workspaceRoot, c.screenshotSourcePath || ''))) {
        errors.push(`[MOBILE] "${c.id}" screenshotSourcePath missing or not on disk.`);
      }
      if (!c.screenshotMigratedPath || !fs.existsSync(path.isAbsolute(c.screenshotMigratedPath) ? c.screenshotMigratedPath : path.join(workspaceRoot, c.screenshotMigratedPath || ''))) {
        errors.push(`[MOBILE] "${c.id}" screenshotMigratedPath missing or not on disk.`);
      }
      if (!c.critiqueIterations || c.critiqueIterations < 1) {
        errors.push(`[MOBILE] "${c.id}" critiqueIterations=${c.critiqueIterations ?? 0}. Must be >= 1.`);
      }
    }
  }
  return errors;
}

// --- Mobile validation checks ---

function checkMobileRegisters(workspaceRoot) {
  const errors = [];
  const remediation = [];

  const phase4Path = path.join(workspaceRoot, VALIDATION_DIR, 'phase-4-mobile.json');
  if (!fs.existsSync(phase4Path)) {
    log('INFO', 'phase-4-mobile.json not found — mobile phase not started yet');
    return { errors, remediation };
  }

  log('INFO', 'Checking mobile validation registers...');

  const phase4 = loadJson(phase4Path);
  if (phase4 && !phase4.hamburgerAnimation) {
    errors.push('phase-4-mobile.json missing hamburgerAnimation — re-analyze mobile header with hamburger icon click test.');
  }
  if (phase4 && !phase4.accordionBehavior) {
    errors.push('phase-4-mobile.json missing accordionBehavior — re-analyze mobile menu accordion/drawer behavior.');
  }
  if (phase4 && !phase4.overlayBehavior) {
    errors.push('phase-4-mobile.json missing overlayBehavior — check if source mobile menu has backdrop overlay.');
  }

  const mobileSchemaReg = loadJson(path.join(workspaceRoot, MOBILE_SCHEMA_REGISTER));
  if (mobileSchemaReg) {
    if (!mobileSchemaReg.allValidated) {
      errors.push('mobile-schema-register.json allValidated=false. Fix mobile structural mismatches.');
    }
    const items = mobileSchemaReg.items || [];
    for (const it of items) {
      if (it.status !== 'validated') {
        errors.push(`Mobile schema: "${it.id}" status="${it.status}".`);
      }
    }
    log('INFO', `Mobile schema register: ${items.length} items, allValidated=${mobileSchemaReg.allValidated}`);
  }

  const mobileStyleReg = loadJson(path.join(workspaceRoot, MOBILE_STYLE_REGISTER));
  if (mobileStyleReg) {
    if (!mobileStyleReg.allValidated) {
      errors.push('mobile-style-register.json allValidated=false. All mobile components must reach 95%.');
    }
    const components = mobileStyleReg.components || [];
    for (const c of components) {
      if (c.status !== 'validated') {
        errors.push(`Mobile style: "${c.id}" status="${c.status}" — must be "validated".`);
      }
      if (typeof c.lastSimilarity === 'number' && c.lastSimilarity < SIMILARITY_THRESHOLD) {
        errors.push(`Mobile style: "${c.id}" lastSimilarity=${c.lastSimilarity}% — must be >= ${SIMILARITY_THRESHOLD}%.`);
        remediation.push(
          `[MOBILE ${c.id}] at ${c.lastSimilarity}%: Fix mobile CSS in header.css (within @media query). ` +
          `Run nav-component-critique visual comparison for this mobile component at 375x812. Repeat until >= 95%.`
        );
      }
    }
    log('INFO', `Mobile style register: ${components.length} components, allValidated=${mobileStyleReg.allValidated}`);
  }

  return { errors, remediation };
}

// --- Mobile behavior register check (mirror of desktop megamenu-behavior-register) ---

function checkMobileBehaviorRegister(workspaceRoot) {
  log('INFO', '[MOBILE] Checking mobile-behavior-register.json...');
  const errors = [];
  const remediation = [];

  const phase4Path = path.join(workspaceRoot, VALIDATION_DIR, 'phase-4-mobile.json');
  if (!fs.existsSync(phase4Path)) {
    return { errors, remediation };
  }

  const regPath = path.join(workspaceRoot, MOBILE_BEHAVIOR_REGISTER);
  const reg = loadJson(regPath);
  if (!reg) {
    log('WARN', '[MOBILE] mobile-behavior-register.json does not exist');
    errors.push('[MOBILE] mobile-behavior-register.json does not exist. After mobile implementation, tap/click every mobile nav item and record behavior, then run compare-mobile-behavior.js.');
    return { errors, remediation };
  }

  log('INFO', `[MOBILE] mobile-behavior-register.json loaded: ${(reg.items || []).length} item(s), allValidated=${reg.allValidated}`);

  if (!reg.allValidated) {
    errors.push('[MOBILE] mobile-behavior-register.json allValidated=false. Mobile nav items have tap/click/behavior mismatches.');
  }

  const items = reg.items || [];
  let tapFails = 0, behaviorFails = 0, animationFails = 0;

  for (const item of items) {
    if (item.status === 'failed') {
      const issues = [];
      if (!item.tapMatch?.matches) { issues.push('tap/click'); tapFails++; }
      if (!item.behaviorMatch?.matches) { issues.push('behavior (accordion/slide-in)'); behaviorFails++; }
      if (!item.animationMatch?.matches) { issues.push('animation speed/timing'); animationFails++; }

      log('INFO', `  [MOBILE] "${item.id}": FAILED — ${issues.join(', ')}`);
      errors.push(`[MOBILE] Behavior: "${item.id}" (${item.label || ''}) failed: ${issues.join(', ')}.`);

      if (item.remediation) {
        remediation.push(`[MOBILE ${item.id}] ${item.label || ''}: ${item.remediation}`);
      } else {
        const fixes = [];
        if (!item.tapMatch?.matches) fixes.push(`tap: ${item.tapMatch?.delta || 'match source tap behavior'}`);
        if (!item.behaviorMatch?.matches) fixes.push(`behavior: ${item.behaviorMatch?.delta || 'match source open/expand behavior'}`);
        if (!item.animationMatch?.matches) fixes.push(`animation: ${item.animationMatch?.delta || 'match source transition speed/easing'}`);
        remediation.push(`[MOBILE ${item.id}] ${item.label || ''}: Fix in header.js/header.css @media — ${fixes.join('; ')}`);
      }
    } else {
      log('PASS', `  [MOBILE] "${item.id}": validated`);
    }
  }

  if (items.length === 0) {
    errors.push('[MOBILE] mobile-behavior-register.json has 0 items.');
  }

  log('INFO', `[MOBILE] Behavior register result: ${errors.length} error(s), tap fails=${tapFails}, behavior fails=${behaviorFails}, animation fails=${animationFails}`);
  return { errors, remediation };
}

// --- Mobile animation speed validation ---

function checkMobileAnimationSpeed(workspaceRoot) {
  const errors = [];
  const phase4Path = path.join(workspaceRoot, VALIDATION_DIR, 'phase-4-mobile.json');
  const p4 = loadJson(phase4Path);
  if (!p4) return errors;

  const cssPath = path.join(workspaceRoot, 'blocks', 'header', 'header.css');
  if (!fs.existsSync(cssPath)) return errors;

  let css;
  try { css = fs.readFileSync(cssPath, 'utf8'); } catch (_) { return errors; }

  // Check hamburger animation timing exists in CSS
  const hamburgerAnim = p4.hamburgerAnimation;
  if (hamburgerAnim && hamburgerAnim.transition) {
    const durationMatch = hamburgerAnim.transition.match(/([\d.]+)s/);
    if (durationMatch) {
      const sourceDuration = durationMatch[1];
      if (!css.includes(sourceDuration + 's') && !css.includes((parseFloat(sourceDuration) * 1000) + 'ms')) {
        errors.push(`[MOBILE] Hamburger animation: source transition is "${hamburgerAnim.transition}" but header.css does not contain "${sourceDuration}s" or "${parseFloat(sourceDuration) * 1000}ms". Match the source animation speed exactly.`);
      }
    }
  }

  // Check slide-in panel transition timing exists in CSS
  const slideIn = p4.slideInPanelBehavior;
  if (slideIn && slideIn.transitionDuration) {
    const durationMatch = slideIn.transitionDuration.match(/([\d.]+)s/);
    if (durationMatch) {
      const sourceDuration = durationMatch[1];
      if (!css.includes(sourceDuration + 's') && !css.includes((parseFloat(sourceDuration) * 1000) + 'ms')) {
        errors.push(`[MOBILE] Slide-in panel: source transitionDuration is "${slideIn.transitionDuration}" but header.css does not contain "${sourceDuration}s". Match the source slide-in animation speed.`);
      }
    }
  }

  // Check accordion animation timing exists in CSS
  const accordion = p4.accordionBehavior;
  if (accordion && accordion.animationDuration) {
    const durationMatch = accordion.animationDuration.match(/([\d.]+)s/);
    if (durationMatch) {
      const sourceDuration = durationMatch[1];
      if (!css.includes(sourceDuration + 's') && !css.includes((parseFloat(sourceDuration) * 1000) + 'ms')) {
        errors.push(`[MOBILE] Accordion: source animationDuration is "${accordion.animationDuration}" but header.css does not contain "${sourceDuration}s". Match the source accordion animation speed.`);
      }
    }
  }

  if (errors.length > 0) {
    log('WARN', `[MOBILE] Animation speed check: ${errors.length} timing mismatch(es)`, errors);
  } else {
    log('PASS', '[MOBILE] Animation speed check: all transition timings found in CSS');
  }

  return errors;
}

function checkHamburgerAnimation(workspaceRoot) {
  const errors = [];
  const phase4 = loadJson(path.join(workspaceRoot, VALIDATION_DIR, 'phase-4-mobile.json'));
  if (!phase4) return errors;

  const anim = phase4.hamburgerAnimation;
  if (!anim) {
    errors.push('phase-4-mobile.json: hamburgerAnimation field MISSING. Click the hamburger icon and document the animation.');
    return errors;
  }

  if (!anim.type || anim.type === 'none') {
    log('INFO', 'Hamburger animation type is "none" — no animation to validate');
    return errors;
  }

  if (!anim.method) {
    errors.push('hamburgerAnimation.method missing — record the CSS/JS implementation method (css-transform, svg-morph, class-swap, etc).');
  }

  const headerCss = path.join(workspaceRoot, 'blocks', 'header', 'header.css');
  const headerJs = path.join(workspaceRoot, 'blocks', 'header', 'header.js');

  if (anim.type === 'morph-to-cross' && anim.method === 'css-transform') {
    if (fs.existsSync(headerCss)) {
      try {
        const css = fs.readFileSync(headerCss, 'utf-8');
        if (!css.includes('rotate') && !css.includes('transform')) {
          errors.push('hamburgerAnimation is css-transform morph-to-cross but header.css has NO rotate/transform rules. Add CSS transform for hamburger → cross animation.');
        }
      } catch (_) { /* ignore */ }
    }
  }

  log('INFO', `Hamburger animation check: type=${anim.type}, method=${anim.method}, errors=${errors.length}`);
  return errors;
}

// --- Workflow progress tracker ---

function logWorkflowProgress(workspaceRoot) {
  const vdir = path.join(workspaceRoot, VALIDATION_DIR);
  if (!fs.existsSync(vdir)) return;

  const check = (rel) => fs.existsSync(path.join(workspaceRoot, rel));
  const loadAndSummarize = (rel) => {
    const data = loadJson(path.join(workspaceRoot, rel));
    if (!data) return null;
    return data;
  };

  const phase = detectPhase(workspaceRoot);

  const desktopMilestones = {
    'session.json': check(path.join(VALIDATION_DIR, 'session.json')),
    'phase-1-row-detection.json': check(path.join(VALIDATION_DIR, 'phase-1-row-detection.json')),
    'phase-2-row-mapping.json': check(path.join(VALIDATION_DIR, 'phase-2-row-mapping.json')),
    'phase-3-megamenu.json': check(path.join(VALIDATION_DIR, 'phase-3-megamenu.json')),
    'megamenu-mapping.json': check(path.join(VALIDATION_DIR, 'megamenu-mapping.json')),
    'phase-5-aggregate.json': check(AGGREGATE),
    'content/nav.md': check('content/nav.md'),
    'header.css': check('blocks/header/header.css'),
    'header.js': check('blocks/header/header.js'),
    'migrated-megamenu-mapping.json': check(path.join(VALIDATION_DIR, 'migrated-megamenu-mapping.json')),
    'migrated-structural-summary.json': check(path.join(VALIDATION_DIR, 'migrated-structural-summary.json')),
  };

  const mobileMilestones = {
    'phase-4-mobile.json': check(path.join(VALIDATION_DIR, 'phase-4-mobile.json')),
    'mobile/migrated-mobile-structural-summary.json': check(path.join(MOBILE_DIR, 'migrated-mobile-structural-summary.json')),
    'mobile/mobile-schema-register.json': check(MOBILE_SCHEMA_REGISTER),
    'mobile/mobile-heading-coverage.json': check(path.join(MOBILE_DIR, 'mobile-heading-coverage.json')),
    'mobile/mobile-behavior-register.json': check(MOBILE_BEHAVIOR_REGISTER),
    'mobile/mobile-style-register.json': check(MOBILE_STYLE_REGISTER),
  };

  const scriptEvidence = {
    'validate-nav-content.js RAN': false,
    'compare-megamenu-behavior.js RAN': check(MEGAMENU_BEHAVIOR_REGISTER),
    'compare-structural-schema.js RAN': check(SCHEMA_REGISTER),
  };
  const navValidationMarker = path.join(workspaceRoot, VALIDATION_DIR, '.nav-content-validated');
  scriptEvidence['validate-nav-content.js RAN'] = check(path.join(VALIDATION_DIR, '.nav-content-validated'));

  const registers = {};
  const styleReg = loadAndSummarize(STYLE_REGISTER);
  if (styleReg) {
    const comps = styleReg.components || [];
    const validated = comps.filter(c => c.status === 'validated').length;
    const pending = comps.filter(c => c.status === 'pending').length;
    const avgSim = comps.length > 0
      ? Math.round(comps.reduce((s, c) => s + (c.lastSimilarity || 0), 0) / comps.length)
      : 0;
    registers['style-register'] = `${validated}/${comps.length} validated, ${pending} pending, avg similarity=${avgSim}%`;
  } else {
    registers['style-register'] = 'NOT CREATED';
  }

  const schemaReg = loadAndSummarize(SCHEMA_REGISTER);
  if (schemaReg) {
    const items = schemaReg.items || [];
    const validated = items.filter(i => i.status === 'validated').length;
    registers['schema-register'] = `${validated}/${items.length} validated, allValidated=${schemaReg.allValidated}`;
  } else {
    registers['schema-register'] = 'NOT CREATED';
  }

  const behaviorReg = loadAndSummarize(MEGAMENU_BEHAVIOR_REGISTER);
  if (behaviorReg) {
    const items = behaviorReg.items || [];
    const passed = items.filter(i => i.status === 'validated' || i.status === 'passed').length;
    registers['megamenu-behavior-register'] = `${passed}/${items.length} passed, allValidated=${behaviorReg.allValidated}`;
  } else {
    registers['megamenu-behavior-register'] = hasMegamenu(workspaceRoot) ? 'NOT CREATED (megamenu exists!)' : 'N/A (no megamenu)';
  }

  const mobileSchemaReg = loadAndSummarize(MOBILE_SCHEMA_REGISTER);
  if (mobileSchemaReg) {
    const items = mobileSchemaReg.items || [];
    const validated = items.filter(i => i.status === 'validated').length;
    registers['mobile-schema-register'] = `${validated}/${items.length} validated, allValidated=${mobileSchemaReg.allValidated}`;
  } else {
    registers['mobile-schema-register'] = check(path.join(VALIDATION_DIR, 'phase-4-mobile.json')) ? 'NOT CREATED (phase-4 exists!)' : 'N/A (mobile not started)';
  }

  const mobileBehaviorReg = loadAndSummarize(MOBILE_BEHAVIOR_REGISTER);
  if (mobileBehaviorReg) {
    const items = mobileBehaviorReg.items || [];
    const passed = items.filter(i => i.status === 'validated' || i.status === 'passed').length;
    registers['mobile-behavior-register'] = `${passed}/${items.length} passed, allValidated=${mobileBehaviorReg.allValidated}`;
  } else {
    registers['mobile-behavior-register'] = check(path.join(VALIDATION_DIR, 'phase-4-mobile.json')) ? 'NOT CREATED (phase-4 exists!)' : 'N/A (mobile not started)';
  }

  const mobileStyleReg = loadAndSummarize(MOBILE_STYLE_REGISTER);
  if (mobileStyleReg) {
    const comps = mobileStyleReg.components || [];
    const validated = comps.filter(c => c.status === 'validated').length;
    const avgSim = comps.length > 0
      ? Math.round(comps.reduce((s, c) => s + (c.lastSimilarity || 0), 0) / comps.length)
      : 0;
    registers['mobile-style-register'] = `${validated}/${comps.length} validated, avg similarity=${avgSim}%`;
  } else {
    registers['mobile-style-register'] = check(path.join(VALIDATION_DIR, 'phase-4-mobile.json')) ? 'NOT CREATED (phase-4 exists!)' : 'N/A (mobile not started)';
  }

  const countCritiqueReports = (dir) => {
    let count = 0;
    if (fs.existsSync(dir)) {
      try {
        const subdirs = fs.readdirSync(dir, { withFileTypes: true });
        for (const d of subdirs) {
          if (d.isDirectory()) {
            if (fs.existsSync(path.join(dir, d.name, 'critique-report.json'))) count++;
          }
        }
      } catch (_) { /* ignore */ }
    }
    return count;
  };

  const desktopCritiqueCount = countCritiqueReports(path.join(vdir, 'critique'));
  const mobileCritiqueCount = countCritiqueReports(path.join(vdir, 'mobile', 'critique'));

  const progressLines = [
    `┌─── WORKFLOW PROGRESS DASHBOARD ─── [Phase: ${phase}] ───┐`,
    '│',
    '│ ═══ DESKTOP ═══',
    '│ Milestones:',
    ...Object.entries(desktopMilestones).map(([k, v]) => `│   ${v ? '✅' : '❌'} ${k}`),
    '│ Scripts executed (evidence):',
    ...Object.entries(scriptEvidence).map(([k, v]) => `│   ${v ? '✅' : '❌'} ${k}`),
    '│ Desktop Registers:',
    ...Object.entries(registers).filter(([k]) => !k.startsWith('mobile')).map(([k, v]) => `│   📊 ${k}: ${v}`),
    `│ Desktop critique reports: ${desktopCritiqueCount}`,
    '│',
    '│ ═══ MOBILE ═══',
    '│ Milestones:',
    ...Object.entries(mobileMilestones).map(([k, v]) => `│   ${v ? '✅' : '❌'} ${k}`),
    '│ Mobile Registers:',
    ...Object.entries(registers).filter(([k]) => k.startsWith('mobile')).map(([k, v]) => `│   📊 ${k}: ${v}`),
    `│ Mobile critique reports: ${mobileCritiqueCount}`,
    '│',
    '└──────────────────────────────────────────────────────────┘'
  ];

  log('INFO', 'WORKFLOW PROGRESS:\n' + progressLines.join('\n'));
}

// --- PostToolUse handler ---

function handlePostToolUse(hookInput) {
  const filePath = hookInput?.tool_input?.file_path;
  const toolName = hookInput?.tool_name || 'unknown';
  if (!filePath) {
    log('INFO', `PostToolUse: no file_path in input (tool=${toolName}) — skipping`);
    console.log(JSON.stringify({ reason: 'No file path in tool input.' }));
    return;
  }

  const workspaceRoot = findWorkspaceRoot(path.dirname(filePath));
  initWorkspaceLog(workspaceRoot);
  const relPath = path.relative(workspaceRoot, filePath);
  log('START', `PostToolUse triggered — tool=${toolName}, file=${relPath}`, {
    absolutePath: filePath,
    workspaceRoot,
    isNavContent: isNavContentFile(filePath),
    isHeader: isHeaderFile(filePath),
    isStyleRegister: isStyleRegisterFile(filePath)
  });

  // Log workflow progress on every write to a nav-related file
  if (isHeaderFile(filePath) || isNavContentFile(filePath) || isNavValidationFile(filePath)) {
    logWorkflowProgress(workspaceRoot);
  }

  // Gate 1: nav file location
  log('INFO', 'Gate 1: checking nav file location...');
  const locError = checkNavLocation(filePath, workspaceRoot);
  if (locError) {
    log('BLOCK', `Gate 1 FAILED — wrong nav location: ${relPath}`, { locError });
    logDecision('block', `Nav location: ${locError}`);
    console.log(JSON.stringify({ decision: 'block', reason: `🚫 [Nav Gate] ${locError}` }));
    return;
  }
  log('PASS', 'Gate 1: nav location OK (or not a nav file)');

  // Gate 2: nav file without images
  log('INFO', 'Gate 2: checking nav content for images...');
  const imgError = checkNavContentForImages(filePath, workspaceRoot);
  if (imgError) {
    log('BLOCK', `Gate 2 FAILED — nav written without images: ${relPath}`);
    logDecision('block', 'Nav missing images');
    console.log(JSON.stringify({ decision: 'block', reason: `🚫 [Nav Gate] ${imgError}` }));
    return;
  }
  log('PASS', 'Gate 2: nav images OK (or not a nav file, or no image requirements)');

  // Gate 3: style-register critique proof
  if (isStyleRegisterFile(filePath)) {
    log('INFO', 'Gate 3: style-register.json detected — checking critique proof...');
    const critiqueErrors = checkCritiqueProof(workspaceRoot);
    if (critiqueErrors.length > 0) {
      log('BLOCK', `Gate 3 FAILED — ${critiqueErrors.length} critique proof failure(s)`, critiqueErrors);
      const msg = `🚫 [Nav Gate] style-register.json has components marked "validated" WITHOUT critique proof:\n\n` +
        critiqueErrors.map((e, i) => `  ${i + 1}. ${e}`).join('\n') +
        '\n\nThe nav-component-critique sub-skill must ACTUALLY RUN and produce screenshots + report.\n' +
        'Self-assessed similarity scores are NOT accepted. Screenshot PNGs and critique-report.json must exist on disk.';
      logDecision('block', 'Critique proof missing');
      console.log(JSON.stringify({ decision: 'block', reason: msg }));
      return;
    }
    log('PASS', 'Gate 3: style-register critique proof — all validated components have reports on disk');

    // Gate 4: Workflow ordering — prerequisite registers must exist before style-register
    log('INFO', 'Gate 4: checking workflow ordering prerequisites...');
    const prereqErrors = [];

    if (hasMegamenu(workspaceRoot)) {
      const behaviorRegPath = path.join(workspaceRoot, MEGAMENU_BEHAVIOR_REGISTER);
      if (!fs.existsSync(behaviorRegPath)) {
        prereqErrors.push(
          'megamenu-behavior-register.json does NOT exist. ' +
          'Per SKILL step 4, run `node scripts/compare-megamenu-behavior.js` BEFORE writing style-register. ' +
          'Workflow order: Megamenu behavior (1st) → Structural (2nd) → Style (3rd).'
        );
      }
    }

    const schemaRegPath = path.join(workspaceRoot, SCHEMA_REGISTER);
    if (!fs.existsSync(schemaRegPath)) {
      prereqErrors.push(
        'schema-register.json does NOT exist. ' +
        'Per SKILL step 5, run `node scripts/compare-structural-schema.js --output-register` BEFORE writing style-register. ' +
        'Workflow order: Megamenu behavior (1st) → Structural (2nd) → Style (3rd).'
      );
    }

    if (prereqErrors.length > 0) {
      log('BLOCK', `Gate 4 FAILED — ${prereqErrors.length} prerequisite(s) missing`, prereqErrors);
      const msg = `🚫 [Nav Gate] style-register.json written but prerequisite validation steps were SKIPPED:\n\n` +
        prereqErrors.map((e, i) => `  ${i + 1}. ${e}`).join('\n') +
        '\n\nYou MUST complete these validation steps in order before building the style register. ' +
        'Do NOT skip scripts. Run them now.';
      logDecision('block', 'Prerequisite registers missing');
      console.log(JSON.stringify({ decision: 'block', reason: msg }));
      return;
    }
    log('PASS', 'Gate 4: all prerequisite registers exist');
  } else {
    log('INFO', 'Gate 3: skipped (not a style-register.json write)');
  }

  // Gate 5: Aggregate update with incomplete style-register
  if (isAggregateFile(filePath)) {
    log('INFO', 'Gate 5: phase-5-aggregate.json detected — checking if style register is complete...');
    const styleReg = loadJson(path.join(workspaceRoot, STYLE_REGISTER));
    if (styleReg && !styleReg.allValidated) {
      const components = styleReg.components || [];
      const pendingCount = components.filter(c => c.status !== 'validated').length;
      const zeroCount = components.filter(c => (c.lastSimilarity || 0) === 0).length;

      if (zeroCount === components.length && components.length > 0) {
        log('BLOCK', `Gate 5 FAILED — aggregate updated but ALL ${components.length} style-register components are at 0%`);
        const msg = `🚫 [Nav Gate] phase-5-aggregate.json updated, but style-register.json has ALL ${components.length} components at 0% similarity.\n\n` +
          'Per-component critique (nav-component-critique sub-skill) has NOT been run.\n' +
          'You MUST invoke nav-component-critique for EACH pending component BEFORE updating the aggregate.\n' +
          'Do NOT update aggregate scores without real critique data.\n\n' +
          'Required: For each component, run Steps A–G of nav-component-critique/SKILL.md:\n' +
          '  A. Determine selectors\n  B. Prepare interaction state\n  C. Capture source screenshot\n' +
          '  D. Capture migrated screenshot\n  E. Compare and score\n  F. Update style register\n' +
          '  G. Remediate until >= 95%';
        logDecision('block', `All ${components.length} style components at 0%`);
        console.log(JSON.stringify({ decision: 'block', reason: msg }));
        return;
      } else if (pendingCount > 0) {
        log('WARN', `Gate 5: aggregate updated with ${pendingCount}/${components.length} style components still pending — allowed but flagged`);
      }
    }
    log('PASS', 'Gate 5: aggregate update OK (or style register not yet created)');
  } else {
    log('INFO', 'Gate 5: skipped (not a phase-5-aggregate.json write)');
  }

  // Gate 6: Mandatory script enforcement — blocks ANY header/nav write when a
  // prerequisite file exists but the script that should follow it hasn't run.
  // This catches the LLM skipping scripts despite having produced the input files.
  if (isHeaderFile(filePath) || isNavContentFile(filePath) || isNavValidationFile(filePath)) {
    log('INFO', 'Gate 6: checking mandatory script enforcement...');
    const sessionFile = path.join(workspaceRoot, VALIDATION_DIR, 'session.json');
    if (fs.existsSync(sessionFile)) {
      const blocks = [];

      // 6a: nav.md exists but validate-nav-content.js hasn't run
      const navExists = fs.existsSync(path.join(workspaceRoot, 'content', 'nav.md'));
      const navValidated = fs.existsSync(path.join(workspaceRoot, VALIDATION_DIR, '.nav-content-validated'));
      if (navExists && !navValidated && !isNavContentFile(filePath)) {
        blocks.push(
          'content/nav.md exists but validate-nav-content.js has NOT been run.\n' +
          '  → Run NOW: node scripts/validate-nav-content.js content/nav.md blocks/header/navigation-validation\n' +
          '  The script writes a marker file (.nav-content-validated) on success. Until that marker exists, further edits are blocked.'
        );
      }

      // 6b: migrated-megamenu-mapping.json exists but compare-megamenu-behavior.js hasn't run
      const migratedMmExists = fs.existsSync(path.join(workspaceRoot, VALIDATION_DIR, 'migrated-megamenu-mapping.json'));
      const behaviorRegExists = fs.existsSync(path.join(workspaceRoot, MEGAMENU_BEHAVIOR_REGISTER));
      if (migratedMmExists && !behaviorRegExists && hasMegamenu(workspaceRoot)) {
        const isWritingMigratedMm = path.basename(filePath) === 'migrated-megamenu-mapping.json';
        if (!isWritingMigratedMm) {
          blocks.push(
            'migrated-megamenu-mapping.json exists but compare-megamenu-behavior.js has NOT been run.\n' +
            '  → Run NOW: node scripts/compare-megamenu-behavior.js \\\n' +
            '      blocks/header/navigation-validation/megamenu-mapping.json \\\n' +
            '      blocks/header/navigation-validation/migrated-megamenu-mapping.json \\\n' +
            '      --output=blocks/header/navigation-validation/megamenu-behavior-register.json'
          );
        }
      }

      // 6c: migrated-structural-summary.json exists but compare-structural-schema.js hasn't run
      const migratedStructExists = fs.existsSync(path.join(workspaceRoot, VALIDATION_DIR, 'migrated-structural-summary.json'));
      const schemaRegExists = fs.existsSync(path.join(workspaceRoot, SCHEMA_REGISTER));
      if (migratedStructExists && !schemaRegExists) {
        const isWritingMigratedStruct = path.basename(filePath) === 'migrated-structural-summary.json';
        if (!isWritingMigratedStruct) {
          blocks.push(
            'migrated-structural-summary.json exists but compare-structural-schema.js has NOT been run.\n' +
            '  → Run NOW: node scripts/compare-structural-schema.js \\\n' +
            '      blocks/header/navigation-validation/phase-1-row-detection.json \\\n' +
            '      blocks/header/navigation-validation/phase-2-row-mapping.json \\\n' +
            '      blocks/header/navigation-validation/phase-3-megamenu.json \\\n' +
            '      blocks/header/navigation-validation/migrated-structural-summary.json \\\n' +
            '      --threshold=95 --output-register=blocks/header/navigation-validation/schema-register.json'
          );
        }
      }

      // 6d: style-register.json exists with all 0% — critique hasn't run, block CSS/JS edits
      const isHeaderImpl = path.basename(filePath) === 'header.css' || path.basename(filePath) === 'header.js';
      if (isHeaderImpl) {
        const styleReg = loadJson(path.join(workspaceRoot, STYLE_REGISTER));
        if (styleReg) {
          const comps = styleReg.components || [];
          const zeroCount = comps.filter(c => (c.lastSimilarity || 0) === 0).length;
          if (comps.length > 0 && zeroCount === comps.length) {
            blocks.push(
              `style-register.json exists with ALL ${comps.length} components at 0% — critique has NOT run.\n` +
              '  → You MUST invoke nav-component-critique for each pending component BEFORE making more CSS/JS edits.\n' +
              '  Editing CSS/JS without critique data means you are guessing, not validating.\n' +
              '  Run critique first, get real similarity scores, THEN fix CSS/JS based on critique report diffs.'
            );
          }
        }
      }

      // 6e: phase-4-mobile.json has hamburgerAnimation missing
      const phase4File = path.join(workspaceRoot, VALIDATION_DIR, 'phase-4-mobile.json');
      if (fs.existsSync(phase4File) && isHeaderImpl) {
        const p4 = loadJson(phase4File);
        if (p4 && !p4.hamburgerAnimation) {
          blocks.push(
            'phase-4-mobile.json exists but hamburgerAnimation field is MISSING.\n' +
            '  → Re-run mobile analysis: click the hamburger icon, document the animation type/method/transition.\n' +
            '  Update phase-4-mobile.json with hamburgerAnimation before editing header CSS/JS for mobile.'
          );
        }
      }

      // 6f: [MOBILE] mobile structural summary exists but mobile schema register hasn't been created
      const mobileMigratedStructExists = fs.existsSync(path.join(workspaceRoot, MOBILE_DIR, 'migrated-mobile-structural-summary.json'));
      const mobileSchemaRegExists = fs.existsSync(path.join(workspaceRoot, MOBILE_SCHEMA_REGISTER));
      if (mobileMigratedStructExists && !mobileSchemaRegExists) {
        const isWritingMobileStruct = path.basename(filePath) === 'migrated-mobile-structural-summary.json';
        if (!isWritingMobileStruct) {
          blocks.push(
            '[MOBILE] migrated-mobile-structural-summary.json exists but mobile-schema-register.json does NOT.\n' +
            '  → Run compare-structural-schema.js for mobile viewport data to produce mobile-schema-register.json\n' +
            '  before making further mobile edits.'
          );
        }
      }

      // 6g: [MOBILE] mobile-style-register.json exists with all 0% — critique hasn't run, block CSS/JS edits
      if (isHeaderImpl && fs.existsSync(path.join(workspaceRoot, VALIDATION_DIR, 'phase-4-mobile.json'))) {
        const mobileStyleReg = loadJson(path.join(workspaceRoot, MOBILE_STYLE_REGISTER));
        if (mobileStyleReg) {
          const comps = mobileStyleReg.components || [];
          const zeroCount = comps.filter(c => (c.lastSimilarity || 0) === 0).length;
          if (comps.length > 0 && zeroCount === comps.length) {
            blocks.push(
              `[MOBILE] mobile-style-register.json exists with ALL ${comps.length} components at 0% — critique has NOT run.\n` +
              '  → Invoke nav-component-critique at mobile viewport (375×812) for each pending component\n' +
              '  BEFORE making more CSS/JS edits for mobile fixes.'
            );
          }
        }
      }

      // 6h: [MOBILE] heading coverage must exist before mobile-behavior-register
      const phase4Exists = fs.existsSync(path.join(workspaceRoot, VALIDATION_DIR, 'phase-4-mobile.json'));
      const headingCovExists = fs.existsSync(path.join(workspaceRoot, MOBILE_HEADING_COVERAGE));
      const mobileBehaviorRegExists = fs.existsSync(path.join(workspaceRoot, MOBILE_BEHAVIOR_REGISTER));
      if (phase4Exists && !headingCovExists && !isMobileFile(filePath)) {
        const mobileSchemaExists = fs.existsSync(path.join(workspaceRoot, MOBILE_SCHEMA_REGISTER));
        if (mobileSchemaExists) {
          blocks.push(
            '[MOBILE] Mobile schema register exists but mobile-heading-coverage.json does NOT.\n' +
            '  → Open mobile menu at 375×812 and click EVERY top-level heading.\n' +
            '  Record results in mobile/mobile-heading-coverage.json with allCovered: true.'
          );
        }
      }

      if (blocks.length > 0) {
        log('BLOCK', `Gate 6 FAILED — ${blocks.length} mandatory script(s) not run`, blocks);
        const msg = `🚫 [Nav Gate] BLOCKED — ${blocks.length} mandatory step(s) were skipped:\n\n` +
          blocks.map((b, i) => `${i + 1}. ${b}`).join('\n\n') +
          '\n\nRun the required script(s) BEFORE continuing with other edits.';
        logDecision('block', `${blocks.length} mandatory script(s) not run`);
        console.log(JSON.stringify({ decision: 'block', reason: msg }));
        return;
      }
      log('PASS', 'Gate 6: all mandatory scripts have been run (or not yet needed)');
    } else {
      log('INFO', 'Gate 6: skipped (no session.json — not a nav orchestrator run)');
    }
  } else {
    log('INFO', 'Gate 6: skipped (not a header/nav/validation file)');
  }

  // Gate 10: Block phase-4-mobile.json if desktop validation incomplete
  if (path.basename(filePath) === 'phase-4-mobile.json') {
    log('INFO', 'Gate 10: phase-4-mobile.json detected — checking desktop validation completeness...');

    // 10a: migrated-megamenu-mapping.json must exist (when megamenu present)
    if (hasMegamenu(workspaceRoot)) {
      const migratedMmPath = path.join(workspaceRoot, VALIDATION_DIR, 'migrated-megamenu-mapping.json');
      if (!fs.existsSync(migratedMmPath)) {
        log('BLOCK', 'Gate 10a FAILED — migrated-megamenu-mapping.json missing, cannot start mobile');
        const msg = '🚫 [Nav Gate] BLOCKED — Cannot start mobile phase while migrated-megamenu-mapping.json is MISSING.\n\n' +
          'Desktop megamenu behavior validation requires:\n' +
          '1. Create migrated-megamenu-mapping.json by hovering+clicking every migrated megamenu item\n' +
          '2. Run: node scripts/compare-megamenu-behavior.js \\\n' +
          '     blocks/header/navigation-validation/megamenu-mapping.json \\\n' +
          '     blocks/header/navigation-validation/migrated-megamenu-mapping.json \\\n' +
          '     --output=blocks/header/navigation-validation/megamenu-behavior-register.json\n' +
          '3. Require megamenu-behavior-register.json → allValidated: true\n\n' +
          'Complete ALL desktop megamenu behavior validation BEFORE starting Phase 4 mobile.';
        logDecision('block', 'migrated-megamenu-mapping.json missing — desktop megamenu behavior not validated');
        console.log(JSON.stringify({ decision: 'block', reason: msg }));
        return;
      }
      log('PASS', 'Gate 10a: migrated-megamenu-mapping.json exists');

      // 10b: megamenu-behavior-register must be allValidated
      const behaviorReg = loadJson(path.join(workspaceRoot, MEGAMENU_BEHAVIOR_REGISTER));
      if (!behaviorReg || !behaviorReg.allValidated) {
        const validated = behaviorReg ? (behaviorReg.items || []).filter(i => i.status === 'validated').length : 0;
        const total = behaviorReg ? (behaviorReg.items || []).length : 0;
        log('BLOCK', `Gate 10b FAILED — megamenu-behavior-register not fully validated (${validated}/${total})`);
        const msg = `🚫 [Nav Gate] BLOCKED — Cannot start mobile phase while megamenu-behavior-register is INCOMPLETE.\n\n` +
          `Megamenu behavior register: ${validated}/${total} validated (allValidated=${behaviorReg ? behaviorReg.allValidated : 'N/A'}).\n` +
          'Fix failed items, re-test, re-run compare-megamenu-behavior.js until allValidated: true.';
        logDecision('block', `megamenu-behavior-register incomplete: ${validated}/${total}`);
        console.log(JSON.stringify({ decision: 'block', reason: msg }));
        return;
      }
      log('PASS', 'Gate 10b: megamenu-behavior-register allValidated');
    }

    // 10c: schema-register must be allValidated
    const schemaReg = loadJson(path.join(workspaceRoot, SCHEMA_REGISTER));
    if (schemaReg && !schemaReg.allValidated) {
      const validated = (schemaReg.components || []).filter(c => c.status === 'validated').length;
      const total = (schemaReg.components || []).length;
      log('BLOCK', `Gate 10c FAILED — schema-register not fully validated (${validated}/${total})`);
      const msg = `🚫 [Nav Gate] BLOCKED — Cannot start mobile phase while desktop schema-register is INCOMPLETE.\n\n` +
        `Schema register: ${validated}/${total} validated.\n` +
        'Fix structural mismatches, re-extract migrated-structural-summary.json, re-run compare-structural-schema.js --output-register until allValidated: true.';
      logDecision('block', `schema-register incomplete: ${validated}/${total}`);
      console.log(JSON.stringify({ decision: 'block', reason: msg }));
      return;
    }
    log('PASS', 'Gate 10c: schema-register OK (allValidated or not yet created)');

    // 10d: style-register (existing check — block only if 0 validated out of >0 total)
    const styleReg = loadJson(path.join(workspaceRoot, STYLE_REGISTER));
    if (styleReg) {
      const components = styleReg.components || [];
      const validatedCount = components.filter(c => c.status === 'validated').length;
      const totalCount = components.length;

      if (validatedCount === 0 && totalCount > 0) {
        log('BLOCK', `Gate 10d FAILED — desktop style-register has 0/${totalCount} validated, cannot start mobile`);
        const msg = `🚫 [Nav Gate] BLOCKED — Cannot start mobile phase (phase-4-mobile.json) while desktop style validation is INCOMPLETE.\n\n` +
          `Desktop style-register: ${validatedCount}/${totalCount} validated (0%).\n` +
          'You MUST complete ALL desktop per-component critique (nav-component-critique sub-skill) BEFORE starting Phase 4 mobile.\n' +
          'Run critique for each of the ' + totalCount + ' pending components, fix CSS until >= 95%, then proceed to mobile.';
        logDecision('block', `Desktop style validation incomplete: ${validatedCount}/${totalCount}`);
        console.log(JSON.stringify({ decision: 'block', reason: msg }));
        return;
      } else if (validatedCount < totalCount) {
        log('WARN', `Gate 10d: desktop style-register has ${validatedCount}/${totalCount} validated — allowing phase-4 with warning`);
      } else {
        log('PASS', `Gate 10d: desktop style-register fully validated (${validatedCount}/${totalCount})`);
      }
    } else {
      log('WARN', 'Gate 10d: desktop style-register does not exist — allowing phase-4 but desktop critique was likely skipped');
    }
  }

  // Gate 11: Block phase-2-row-mapping.json if hamburger fields not populated
  if (path.basename(filePath) === 'phase-2-row-mapping.json') {
    log('INFO', 'Gate 11: phase-2-row-mapping.json detected — checking hamburger icon fields...');
    const p2 = loadJson(filePath);
    if (p2 && p2.rows) {
      const rowsMissingHamburger = p2.rows.filter(r => r.hasHamburgerIcon === undefined);
      if (rowsMissingHamburger.length > 0) {
        log('BLOCK', `Gate 11 FAILED — ${rowsMissingHamburger.length} row(s) missing hasHamburgerIcon field`);
        const msg = `🚫 [Nav Gate] BLOCKED — phase-2-row-mapping.json has ${rowsMissingHamburger.length} row(s) missing the hasHamburgerIcon field.\n\n` +
          'Every row MUST include hasHamburgerIcon (true/false). If true, also include hamburgerClickBehavior and hamburgerAnimation.\n' +
          'Click the hamburger/breadcrumb icon in the header to test its behavior before writing phase-2.';
        logDecision('block', 'Hamburger fields missing in phase-2');
        console.log(JSON.stringify({ decision: 'block', reason: msg }));
        return;
      }
      const rowsWithHamburger = p2.rows.filter(r => r.hasHamburgerIcon === true);
      const incompleteRows = [];
      for (const row of rowsWithHamburger) {
        const missing = [];
        if (!row.hamburgerClickBehavior) missing.push('hamburgerClickBehavior');
        if (!row.hamburgerAnimation) missing.push('hamburgerAnimation');
        if (!row.hamburgerHoverEffect && row.hamburgerHoverEffect !== null) missing.push('hamburgerHoverEffect (set to null if no hover effect)');
        if (missing.length > 0) {
          incompleteRows.push({ index: row.index, missing });
          log('BLOCK', `Gate 11: row ${row.index} has hasHamburgerIcon=true but missing: ${missing.join(', ')}`);
        }
      }
      if (incompleteRows.length > 0) {
        const details = incompleteRows.map(r => `  Row ${r.index}: missing ${r.missing.join(', ')}`).join('\n');
        const msg = `🚫 [Nav Gate] BLOCKED — hasHamburgerIcon=true but click/hover/animation not fully documented:\n\n${details}\n\n` +
          'You MUST click AND hover the hamburger icon and record:\n' +
          '  - hamburgerClickBehavior: what happens on click (e.g. "opens mobile drawer", "toggles nav sections")\n' +
          '  - hamburgerAnimation: animation type/method/transition (e.g. "morphs to × cross with CSS transform")\n' +
          '  - hamburgerHoverEffect: hover effect or null if none (e.g. "background highlight", null)';
        logDecision('block', `Hamburger click/hover/animation incomplete in ${incompleteRows.length} row(s)`);
        console.log(JSON.stringify({ decision: 'block', reason: msg }));
        return;
      }
      log('PASS', 'Gate 11: hamburger icon fields complete (click + hover + animation) in all rows');

      // Gate 11b: Search form detection — every row must have hasSearchForm field
      log('INFO', 'Gate 11b: checking hasSearchForm field in phase-2-row-mapping.json...');
      const rowsMissingSearch = p2.rows.filter(r => r.hasSearchForm === undefined);
      if (rowsMissingSearch.length > 0) {
        log('BLOCK', `Gate 11b FAILED — ${rowsMissingSearch.length} row(s) missing hasSearchForm field`);
        const msg = `🚫 [Nav Gate] BLOCKED — phase-2-row-mapping.json has ${rowsMissingSearch.length} row(s) missing the hasSearchForm field.\n\n` +
          'Every row MUST include hasSearchForm (true/false). Check for <input type="search">, <form> elements, or search icon+input combos in the header.\n' +
          'If hasSearchForm is true, also include searchFormDetails with formType, inputPlaceholder, and position.\n' +
          'Search bars are common in headers — look carefully before setting false.';
        logDecision('block', 'Search form field missing in phase-2');
        console.log(JSON.stringify({ decision: 'block', reason: msg }));
        return;
      }
      const rowsWithSearch = p2.rows.filter(r => r.hasSearchForm === true);
      if (rowsWithSearch.length > 0) {
        const incompleteSearchRows = rowsWithSearch.filter(r => !r.searchFormDetails || !r.searchFormDetails.formType);
        if (incompleteSearchRows.length > 0) {
          log('WARN', `Gate 11b: ${incompleteSearchRows.length} row(s) have hasSearchForm=true but missing searchFormDetails.formType`);
          const msg = `⚠️ [Nav Gate] WARNING — hasSearchForm=true but searchFormDetails incomplete:\n\n` +
            incompleteSearchRows.map(r => `  Row ${r.index}: missing searchFormDetails.formType`).join('\n') +
            '\n\nPopulate searchFormDetails: formType (inline-input|expandable-icon|modal-overlay|dropdown-panel), inputPlaceholder, position.';
          logDecision('warn', `Search form details incomplete in ${incompleteSearchRows.length} row(s)`);
          console.log(JSON.stringify({ decision: 'warn', reason: msg }));
          return;
        }
        log('PASS', `Gate 11b: ${rowsWithSearch.length} row(s) with search form — details populated`);
      } else {
        log('PASS', 'Gate 11b: no search forms detected in any row (hasSearchForm=false in all rows)');
      }

      // Gate 11c: Locale/language selector detection — every row must have hasLocaleSelector field
      log('INFO', 'Gate 11c: checking hasLocaleSelector field in phase-2-row-mapping.json...');
      const rowsMissingLocale = p2.rows.filter(r => r.hasLocaleSelector === undefined);
      if (rowsMissingLocale.length > 0) {
        log('BLOCK', `Gate 11c FAILED — ${rowsMissingLocale.length} row(s) missing hasLocaleSelector field`);
        const msg = `🚫 [Nav Gate] BLOCKED — phase-2-row-mapping.json has ${rowsMissingLocale.length} row(s) missing the hasLocaleSelector field.\n\n` +
          'Every row MUST include hasLocaleSelector (true/false). Look for:\n' +
          '  - Globe icon (🌐) that opens a language dropdown\n' +
          '  - Country flag icon (e.g. 🇺🇸 🇩🇪) with a dropdown/selector\n' +
          '  - Language name text (e.g. "English", "EN/DE") with click behavior\n' +
          '  - Region/country grid overlay with flags\n' +
          '  - Language toggle switch (e.g. German | English)\n' +
          'If hasLocaleSelector is true, also include localeSelectorDetails with selectorType, triggerElement, hasFlags, and dropdownLayout.\n' +
          'If flags are present, they MUST be downloaded to content/images/ and referenced in nav.md.';
        logDecision('block', 'Locale selector field missing in phase-2');
        console.log(JSON.stringify({ decision: 'block', reason: msg }));
        return;
      }
      const rowsWithLocale = p2.rows.filter(r => r.hasLocaleSelector === true);
      if (rowsWithLocale.length > 0) {
        const incompleteLocaleRows = rowsWithLocale.filter(r => !r.localeSelectorDetails || !r.localeSelectorDetails.selectorType);
        if (incompleteLocaleRows.length > 0) {
          log('WARN', `Gate 11c: ${incompleteLocaleRows.length} row(s) have hasLocaleSelector=true but missing localeSelectorDetails.selectorType`);
          const msg = `⚠️ [Nav Gate] WARNING — hasLocaleSelector=true but localeSelectorDetails incomplete:\n\n` +
            incompleteLocaleRows.map(r => `  Row ${r.index}: missing localeSelectorDetails.selectorType`).join('\n') +
            '\n\nPopulate localeSelectorDetails: selectorType, triggerElement, triggerBehavior, hasFlags, dropdownLayout, entryCount, position.\n' +
            'If hasFlags is true, download ALL flag images to content/images/ and reference them in nav.md.';
          logDecision('warn', `Locale selector details incomplete in ${incompleteLocaleRows.length} row(s)`);
          console.log(JSON.stringify({ decision: 'warn', reason: msg }));
          return;
        }
        // Additional check: if hasFlags=true, warn to ensure flags are downloaded
        const rowsWithFlags = rowsWithLocale.filter(r => r.localeSelectorDetails && r.localeSelectorDetails.hasFlags === true);
        if (rowsWithFlags.length > 0) {
          const flagCount = rowsWithFlags.reduce((sum, r) => sum + (r.localeSelectorDetails.flagCount || 0), 0);
          log('INFO', `Gate 11c: ${rowsWithFlags.length} row(s) with locale flags detected (${flagCount} total flags). Flags MUST be downloaded to content/images/ and referenced in nav.md.`);
        }
        log('PASS', `Gate 11c: ${rowsWithLocale.length} row(s) with locale selector — details populated`);
      } else {
        log('PASS', 'Gate 11c: no locale selectors detected in any row (hasLocaleSelector=false in all rows)');
      }
    }
  }

  // Gate 14: Mobile search form detection — phase-4-mobile.json must have hasSearchForm field
  if (path.basename(filePath) === 'phase-4-mobile.json') {
    log('INFO', 'Gate 14: phase-4-mobile.json detected — checking hasSearchForm field...');
    const p4Search = loadJson(filePath);
    if (p4Search && p4Search.hasSearchForm === undefined) {
      log('BLOCK', 'Gate 14 FAILED — phase-4-mobile.json missing hasSearchForm field');
      const msg = `🚫 [Nav Gate] BLOCKED — phase-4-mobile.json is missing the hasSearchForm field.\n\n` +
        'You MUST check whether the mobile header or mobile menu contains a search bar/input/form.\n' +
        'Set hasSearchForm: true or false. On mobile, search may be:\n' +
        '  - Hidden behind a search icon\n' +
        '  - Inside the hamburger menu drawer\n' +
        '  - Collapsed into an expandable input\n' +
        '  - Completely absent on mobile (but present on desktop)\n' +
        'If true, populate searchFormDetails with formType, visibleInClosedState, and position.';
      logDecision('block', 'Mobile search form field missing');
      console.log(JSON.stringify({ decision: 'block', reason: msg }));
      return;
    }
    if (p4Search && p4Search.hasSearchForm === true && (!p4Search.searchFormDetails || !p4Search.searchFormDetails.formType)) {
      log('WARN', 'Gate 14: hasSearchForm=true but searchFormDetails.formType missing');
      const msg = `⚠️ [Nav Gate] WARNING — phase-4-mobile.json has hasSearchForm=true but searchFormDetails is incomplete.\n\n` +
        'Populate searchFormDetails: formType (inline-input|expandable-icon|inside-menu|modal-overlay|hidden), visibleInClosedState, position.';
      logDecision('warn', 'Mobile search form details incomplete');
      console.log(JSON.stringify({ decision: 'warn', reason: msg }));
      return;
    }
    if (p4Search) {
      log('PASS', `Gate 14: mobile search form field OK (hasSearchForm=${p4Search.hasSearchForm})`);
    }

    // Gate 14b: Mobile locale/language selector detection
    log('INFO', 'Gate 14b: phase-4-mobile.json detected — checking hasLocaleSelector field...');
    const p4Locale = loadJson(filePath);
    if (p4Locale && p4Locale.hasLocaleSelector === undefined) {
      log('BLOCK', 'Gate 14b FAILED — phase-4-mobile.json missing hasLocaleSelector field');
      const msg = `🚫 [Nav Gate] BLOCKED — phase-4-mobile.json is missing the hasLocaleSelector field.\n\n` +
        'You MUST check whether the mobile header or mobile menu contains a locale/language selector.\n' +
        'Set hasLocaleSelector: true or false. On mobile, locale selectors may be:\n' +
        '  - A globe icon in the header bar\n' +
        '  - A flag icon next to the hamburger\n' +
        '  - Inside the hamburger menu drawer (bottom or top)\n' +
        '  - A language toggle (e.g. German | English)\n' +
        '  - Completely absent on mobile (but present on desktop)\n' +
        'If true, populate localeSelectorDetails with selectorType, triggerElement, visibleInClosedState, hasFlags, and position.\n' +
        'If hasFlags is true, ensure all flag images are in content/images/ and referenced in nav.md.';
      logDecision('block', 'Mobile locale selector field missing');
      console.log(JSON.stringify({ decision: 'block', reason: msg }));
      return;
    }
    if (p4Locale && p4Locale.hasLocaleSelector === true && (!p4Locale.localeSelectorDetails || !p4Locale.localeSelectorDetails.selectorType)) {
      log('WARN', 'Gate 14b: hasLocaleSelector=true but localeSelectorDetails.selectorType missing');
      const msg = `⚠️ [Nav Gate] WARNING — phase-4-mobile.json has hasLocaleSelector=true but localeSelectorDetails is incomplete.\n\n` +
        'Populate localeSelectorDetails: selectorType, triggerElement, visibleInClosedState, hasFlags, position, dropdownLayout.\n' +
        'If hasFlags is true, download all flag images and reference them in nav.md.';
      logDecision('warn', 'Mobile locale selector details incomplete');
      console.log(JSON.stringify({ decision: 'warn', reason: msg }));
      return;
    }
    if (p4Locale) {
      log('PASS', `Gate 14b: mobile locale selector field OK (hasLocaleSelector=${p4Locale.hasLocaleSelector})`);
    }
  }

  // Gate 7: Mobile style-register critique proof
  if (isMobileStyleRegisterFile(filePath)) {
    log('INFO', '[MOBILE] Gate 7: mobile-style-register.json detected — checking mobile critique proof...');
    const mobileCritiqueErrors = checkMobileCritiqueProof(workspaceRoot);
    if (mobileCritiqueErrors.length > 0) {
      log('BLOCK', `[MOBILE] Gate 7 FAILED — ${mobileCritiqueErrors.length} mobile critique proof failure(s)`, mobileCritiqueErrors);
      const msg = `🚫 [Nav Gate] [MOBILE] mobile-style-register.json has validated components WITHOUT critique proof:\n\n` +
        mobileCritiqueErrors.map((e, i) => `  ${i + 1}. ${e}`).join('\n') +
        '\n\nRun nav-component-critique at MOBILE viewport (375×812) for each component. Screenshots + report must exist.';
      logDecision('block', '[MOBILE] Critique proof missing');
      console.log(JSON.stringify({ decision: 'block', reason: msg }));
      return;
    }
    log('PASS', '[MOBILE] Gate 7: mobile critique proof OK');

    // Gate 8: Mobile workflow ordering — mobile-schema-register must exist before mobile-style-register
    log('INFO', '[MOBILE] Gate 8: checking mobile workflow ordering...');
    const mobileSchemaRegPath = path.join(workspaceRoot, MOBILE_SCHEMA_REGISTER);
    if (!fs.existsSync(mobileSchemaRegPath)) {
      log('BLOCK', '[MOBILE] Gate 8 FAILED — mobile-schema-register.json does not exist');
      const msg = `🚫 [Nav Gate] [MOBILE] mobile-style-register.json written but mobile-schema-register.json does NOT exist.\n\n` +
        'Mobile workflow order: Structural validation FIRST → Style validation SECOND.\n' +
        'Run mobile structural comparison and write mobile-schema-register.json BEFORE building mobile style register.';
      logDecision('block', '[MOBILE] Schema register missing before style register');
      console.log(JSON.stringify({ decision: 'block', reason: msg }));
      return;
    }
    log('PASS', '[MOBILE] Gate 8: mobile workflow ordering OK');

    // Gate 12: Mobile heading coverage must exist before mobile-style-register
    log('INFO', '[MOBILE] Gate 12: checking mobile heading coverage...');
    const headingCoveragePath = path.join(workspaceRoot, MOBILE_DIR, 'mobile-heading-coverage.json');
    if (!fs.existsSync(headingCoveragePath)) {
      log('BLOCK', '[MOBILE] Gate 12 FAILED — mobile-heading-coverage.json does not exist');
      const msg = `🚫 [Nav Gate] [MOBILE] mobile-style-register.json written but mobile-heading-coverage.json does NOT exist.\n\n` +
        'Before building the mobile style register, you MUST click EVERY mobile nav heading and write the heading coverage file.\n' +
        'Expected: blocks/header/navigation-validation/mobile/mobile-heading-coverage.json with allCovered: true.';
      logDecision('block', '[MOBILE] Heading coverage missing before style register');
      console.log(JSON.stringify({ decision: 'block', reason: msg }));
      return;
    }
    const headingCov = loadJson(headingCoveragePath);
    if (headingCov && !headingCov.allCovered) {
      log('BLOCK', '[MOBILE] Gate 12 FAILED — mobile-heading-coverage.json has allCovered=false');
      const msg = `🚫 [Nav Gate] [MOBILE] mobile-heading-coverage.json has allCovered=false.\n\n` +
        'Not all mobile nav headings were tested. Go back and click EVERY heading before proceeding to style register.';
      logDecision('block', '[MOBILE] Heading coverage incomplete');
      console.log(JSON.stringify({ decision: 'block', reason: msg }));
      return;
    }
    log('PASS', '[MOBILE] Gate 12: mobile heading coverage OK');
  }

  // Gate 9: Content-in-JS warning — header.js must not hardcode megamenu text/links
  if (path.basename(filePath) === 'header.js') {
    log('INFO', 'Gate 9: checking header.js for hardcoded megamenu content...');
    try {
      const jsContent = fs.readFileSync(filePath, 'utf8');
      const warnings = [];
      const innerHTMLMatches = (jsContent.match(/\.innerHTML\s*=\s*`[^`]{80,}/g) || []);
      if (innerHTMLMatches.length > 0) {
        warnings.push(`Found ${innerHTMLMatches.length} large innerHTML template literal(s) — megamenu content should come from nav.md DOM, not JS template strings.`);
      }
      const createElWithText = (jsContent.match(/createElement\([^)]+\)[\s\S]{0,30}\.textContent\s*=\s*['"][^'"]{20,}['"]/g) || []);
      if (createElWithText.length > 2) {
        warnings.push(`Found ${createElWithText.length} createElement + long textContent assignments — content text should live in nav.md, not be generated in JS.`);
      }
      const hardcodedLinks = (jsContent.match(/href\s*[:=]\s*['"][^'"]*https?:\/\/[^'"]+['"]/g) || []);
      if (hardcodedLinks.length > 3) {
        warnings.push(`Found ${hardcodedLinks.length} hardcoded href URLs — link destinations should be in nav.md content, not in header.js.`);
      }
      // Detect site-specific function names (e.g. buildVeiculosMegamenu, buildProductsPanel)
      const siteSpecificFns = (jsContent.match(/function\s+(build|create|render|setup|init)[A-Z][a-zA-Z]*(Megamenu|Panel|Menu|Nav|Accordion|Drawer|Dropdown|SubPanel)\b/g) || []);
      if (siteSpecificFns.length > 0) {
        warnings.push(`Found ${siteSpecificFns.length} site-specific function name(s): ${siteSpecificFns.join(', ')}. Functions must be GENERIC and reusable — do not name them after source site categories. Use data-driven patterns that read from nav.md DOM.`);
      }
      if (warnings.length > 0) {
        log('WARN', `Gate 9: header.js may contain hardcoded content (${warnings.length} warning(s))`, warnings);
        const msg = `⚠️ [Nav Gate] WARNING — header.js may contain hardcoded megamenu content:\n\n` +
          warnings.map((w, i) => `${i + 1}. ${w}`).join('\n') +
          '\n\nContent-first rule: ALL text, links, category names, and sub-menu items belong in content/nav.md. ' +
          'header.js should only READ the nav.md DOM and build visual presentation — never generate content.\n' +
          'Move hardcoded content to nav.md and update header.js to read from the DOM instead.';
        logDecision('warn', `Gate 9: ${warnings.length} hardcoded content warning(s) in header.js`);
        console.log(JSON.stringify({ decision: 'warn', reason: msg }));
        return;
      }
      log('PASS', 'Gate 9: header.js appears content-free (no large hardcoded text/links detected)');

      // Gate 15: Viewport resize handling — header.js must handle window resize / matchMedia
      // so that desktop↔mobile transitions work without requiring a page refresh.
      // Fires after mobile phase exists (phase-4-mobile.json), as resize handling only matters
      // once both viewports are implemented.
      const phase4ForResize = path.join(workspaceRoot, VALIDATION_DIR, 'phase-4-mobile.json');
      if (fs.existsSync(phase4ForResize)) {
        log('INFO', 'Gate 15: checking header.js for viewport resize / matchMedia handling...');
        const hasResizeListener = /addEventListener\s*\(\s*['"]resize['"]/i.test(jsContent);
        const hasMatchMedia = /matchMedia\s*\(/i.test(jsContent);
        const hasResizeObserver = /ResizeObserver/i.test(jsContent);
        const hasOnResize = /window\.onresize/i.test(jsContent);
        const hasViewportHandling = hasResizeListener || hasMatchMedia || hasResizeObserver || hasOnResize;

        if (!hasViewportHandling) {
          log('WARN', 'Gate 15 FAILED — header.js has NO viewport resize handling');
          const resizeMsg = `⚠️ [Nav Gate] WARNING — header.js has NO viewport resize / matchMedia handling.\n\n` +
            'When the browser is resized between desktop and mobile breakpoints, the header layout may break.\n' +
            'Common issues:\n' +
            '  - Mobile menu stays open when resizing to desktop width\n' +
            '  - Desktop megamenu dropdowns stay visible in mobile view\n' +
            '  - Hamburger icon state doesn\'t reset on viewport change\n' +
            '  - Layout elements overlap or misalign during transitions\n\n' +
            'Add ONE of these approaches to header.js:\n' +
            '  1. window.matchMedia(breakpoint).addEventListener("change", handler) — PREFERRED\n' +
            '     Reacts to breakpoint crossings: close mobile menu on desktop, reset hamburger state, etc.\n' +
            '  2. window.addEventListener("resize", debounceHandler)\n' +
            '     Debounced resize listener that checks current width and adjusts layout.\n\n' +
            'The handler should: close any open mobile menus, reset hamburger to ☰ state,\n' +
            'remove mobile-only classes, and re-initialize desktop hover behaviors when crossing to desktop.\n' +
            'Conversely, crossing to mobile should disable desktop hover and enable tap.';
          logDecision('warn', 'Gate 15: no viewport resize handling in header.js');
          console.log(JSON.stringify({ decision: 'warn', reason: resizeMsg }));
          return;
        }
        const methods = [];
        if (hasResizeListener) methods.push('addEventListener("resize")');
        if (hasMatchMedia) methods.push('matchMedia()');
        if (hasResizeObserver) methods.push('ResizeObserver');
        if (hasOnResize) methods.push('window.onresize');
        log('PASS', `Gate 15: viewport resize handling found: ${methods.join(', ')}`);
      }
    } catch (e) {
      log('WARN', `Gate 9: could not read header.js for content check: ${e.message}`);
    }
  }

  // Gate 13: [MOBILE] Pattern consistency — when header.css is written during mobile phase,
  // verify it matches the declared openBehavior in phase-4-mobile.json
  if (path.basename(filePath) === 'header.css') {
    const phase4File = path.join(workspaceRoot, VALIDATION_DIR, 'phase-4-mobile.json');
    const p4 = loadJson(phase4File);
    if (p4 && p4.openBehavior) {
      log('INFO', '[MOBILE] Gate 13: checking mobile pattern consistency in header.css...');
      try {
        const cssContent = fs.readFileSync(filePath, 'utf8');

        if (p4.openBehavior === 'slide-in-panel') {
          const hasTranslateX = /translateX/i.test(cssContent);
          if (!hasTranslateX) {
            log('WARN', '[MOBILE] Gate 13: slide-in-panel declared but no translateX in CSS');
            const msg = `⚠️ [Nav Gate] [MOBILE] WARNING — phase-4-mobile.json declares openBehavior="slide-in-panel" ` +
              `but header.css has NO translateX() rules.\n\n` +
              'Slide-in panels require CSS transform: translateX() for the sliding transition.\n' +
              'Do NOT use accordion expand-in-place when source uses slide-in-panel.\n' +
              'Add translateX(-100%) for main menu exit and translateX(0) for sub-panel entrance.';
            logDecision('warn', '[MOBILE] Gate 13: slide-in pattern missing translateX');
            console.log(JSON.stringify({ decision: 'warn', reason: msg }));
            return;
          }
        }

        if (p4.openBehavior === 'accordion') {
          const hasAccordionPatterns = /max-height|collapse|expand|accordion/i.test(cssContent);
          if (!hasAccordionPatterns) {
            log('WARN', '[MOBILE] Gate 13: accordion declared but no accordion CSS patterns found');
          }
        }

        // Check animation speed matches
        const animErrors = checkMobileAnimationSpeed(workspaceRoot);
        if (animErrors.length > 0) {
          const msg = `⚠️ [Nav Gate] [MOBILE] WARNING — Animation speed mismatches:\n\n` +
            animErrors.map((e, i) => `${i + 1}. ${e}`).join('\n') +
            '\n\nMatch the source animation speeds exactly.';
          logDecision('warn', `[MOBILE] Gate 13: ${animErrors.length} animation speed mismatch(es)`);
          console.log(JSON.stringify({ decision: 'warn', reason: msg }));
          return;
        }

        log('PASS', '[MOBILE] Gate 13: mobile pattern consistency OK');
      } catch (e) {
        log('WARN', `[MOBILE] Gate 13: could not read header.css: ${e.message}`);
      }
    }
  }

  const phase = detectPhase(workspaceRoot);
  log('PASS', `[${phase}] All gates passed for: ${relPath}`);
  logDecision('allow', `[${phase}] ${path.basename(filePath)} passed all gates`);
  console.log(JSON.stringify({
    success: true,
    action: 'checked',
    file: filePath,
    message: `Nav gate [${phase}]: ${path.basename(filePath)} passed.`
  }));
}

// --- Stop handler ---

function handleStop(hookInput) {
  const workspaceRoot = hookInput?.tool_input?.file_path
    ? findWorkspaceRoot(path.dirname(hookInput.tool_input.file_path))
    : process.cwd();

  initWorkspaceLog(workspaceRoot);
  log('START', '=== STOP EVENT — Final validation gate ===', { workspaceRoot });

  // Log final workflow progress dashboard
  logWorkflowProgress(workspaceRoot);

  const sessionFile = path.join(workspaceRoot, VALIDATION_DIR, 'session.json');
  if (!fs.existsSync(sessionFile)) {
    log('INFO', 'No session.json found — not a nav orchestrator run, skipping gate');
    logDecision('allow', 'No nav session — gate not applicable');
    console.log(JSON.stringify({ reason: 'No nav orchestrator session. Gate skipped.' }));
    return;
  }
  log('INFO', 'session.json found — running full validation gate');

  const allErrors = [];

  // Check 1: nav.md location
  log('INFO', '[DESKTOP] Stop Check 1: nav.md location...');
  const navCorrect = path.join(workspaceRoot, 'content', 'nav.md');
  const navWrong = path.join(workspaceRoot, 'nav.md');
  if (!fs.existsSync(navCorrect)) {
    if (fs.existsSync(navWrong)) {
      log('WARN', 'nav.md found at root "/" instead of "content/"');
      allErrors.push('nav.md at root — must be content/nav.md.');
    } else {
      log('WARN', 'content/nav.md does not exist at all');
      allErrors.push('content/nav.md does not exist.');
    }
  } else {
    log('PASS', 'Stop Check 1: content/nav.md exists');
  }

  // Check 2: nav.md images
  log('INFO', '[DESKTOP] Stop Check 2: nav.md image references...');
  if (fs.existsSync(navCorrect)) {
    const imgError = checkNavContentForImages(navCorrect, workspaceRoot);
    if (imgError) {
      log('WARN', 'nav.md missing image references');
      allErrors.push(imgError);
    } else {
      log('PASS', 'Stop Check 2: nav.md has image references (or no image requirements)');
    }
  } else {
    log('INFO', 'Stop Check 2: skipped (nav.md not found)');
  }

  // Check 3: style register
  log('INFO', '[DESKTOP] Stop Check 3: style register...');
  const styleResult = checkStyleRegister(workspaceRoot);
  allErrors.push(...styleResult.errors);

  // Check 4: schema register
  log('INFO', '[DESKTOP] Stop Check 4: schema register...');
  const schemaResult = checkSchemaRegister(workspaceRoot);
  allErrors.push(...schemaResult.errors);

  // Check 5: megamenu behavior register
  log('INFO', '[DESKTOP] Stop Check 5: megamenu behavior register...');
  const megamenuResult = checkMegamenuBehaviorRegister(workspaceRoot);
  allErrors.push(...megamenuResult.errors);
  const allRemediation = [
    ...(styleResult.remediation || []),
    ...(schemaResult.remediation || []),
    ...(megamenuResult.remediation || [])
  ];

  // Check 6: aggregate scores
  log('INFO', '[DESKTOP] Stop Check 6: aggregate scores...');
  const agg = loadJson(path.join(workspaceRoot, AGGREGATE));
  if (agg) {
    const vr = agg.validationReport || {};
    log('INFO', `Aggregate loaded: styleSimilarity=${vr.styleSimilarity}%, structuralSimilarity=${vr.structuralSimilarity}%`);
    if (typeof vr.styleSimilarity === 'number' && vr.styleSimilarity < SIMILARITY_THRESHOLD) {
      allErrors.push(`Aggregate styleSimilarity=${vr.styleSimilarity}% — must be >= ${SIMILARITY_THRESHOLD}%.`);
    }
    if (typeof vr.structuralSimilarity === 'number' && vr.structuralSimilarity < SIMILARITY_THRESHOLD) {
      allErrors.push(`Aggregate structuralSimilarity=${vr.structuralSimilarity}% — must be >= ${SIMILARITY_THRESHOLD}%.`);
    }
    if ((vr.styleSimilarity ?? 0) >= SIMILARITY_THRESHOLD && (vr.structuralSimilarity ?? 0) >= SIMILARITY_THRESHOLD) {
      log('PASS', 'Stop Check 5: aggregate scores both >= 95%');
    }
  } else {
    log('WARN', 'phase-5-aggregate.json not found');
  }

  // Check 7: megamenu mapping (source analysis exists)
  log('INFO', '[DESKTOP] Stop Check 7: megamenu-mapping.json...');
  const mmPath = path.join(workspaceRoot, VALIDATION_DIR, 'megamenu-mapping.json');
  if (!fs.existsSync(mmPath)) {
    const p3 = loadJson(path.join(workspaceRoot, VALIDATION_DIR, 'phase-3-megamenu.json'));
    if (p3 && p3.columnCount > 0) {
      log('WARN', `megamenu-mapping.json missing but phase-3 has columnCount=${p3.columnCount}`);
      allErrors.push('megamenu-mapping.json does not exist but megamenu has columns. Run deep megamenu analysis.');
    } else {
      log('PASS', 'Stop Check 7: no megamenu or megamenu-mapping.json not required');
    }
  } else {
    log('PASS', 'Stop Check 7: megamenu-mapping.json exists');
  }

  // Check 7b: migrated-megamenu-mapping.json must exist when megamenu present
  log('INFO', '[DESKTOP] Stop Check 7b: migrated-megamenu-mapping.json...');
  const migratedMmStopPath = path.join(workspaceRoot, VALIDATION_DIR, 'migrated-megamenu-mapping.json');
  if (hasMegamenu(workspaceRoot) && !fs.existsSync(migratedMmStopPath)) {
    log('WARN', 'migrated-megamenu-mapping.json missing — desktop megamenu behavior not validated on migrated site');
    allErrors.push('migrated-megamenu-mapping.json does not exist. You must hover+click every migrated megamenu item to create it, then run compare-megamenu-behavior.js.');
  } else if (fs.existsSync(migratedMmStopPath)) {
    log('PASS', 'Stop Check 7b: migrated-megamenu-mapping.json exists');
  } else {
    log('PASS', 'Stop Check 7b: no megamenu — migrated mapping not required');
  }

  // Check 8: mobile validation (if phase-4 exists, mobile must be fully validated)
  log('INFO', '[MOBILE] Stop Check 8: mobile validation...');
  const phase4Path = path.join(workspaceRoot, VALIDATION_DIR, 'phase-4-mobile.json');
  if (fs.existsSync(phase4Path)) {
    const hamburgerErrors = checkHamburgerAnimation(workspaceRoot);
    allErrors.push(...hamburgerErrors);

    const mobileResult = checkMobileRegisters(workspaceRoot);
    allErrors.push(...mobileResult.errors);
    allRemediation.push(...(mobileResult.remediation || []));

    const mobileCritiqueErrors = checkMobileCritiqueProof(workspaceRoot);
    allErrors.push(...mobileCritiqueErrors);

    // Check 8b: mobile menu pattern consistency
    const p4 = loadJson(phase4Path);
    if (p4 && p4.openBehavior === 'slide-in-panel') {
      log('INFO', '[MOBILE] Stop Check 8b: slide-in-panel pattern detected — verifying implementation...');
      const cssPath = path.join(workspaceRoot, 'blocks', 'header', 'header.css');
      if (fs.existsSync(cssPath)) {
        const css = fs.readFileSync(cssPath, 'utf8');
        const hasTranslateX = /translateX/i.test(css);
        if (!hasTranslateX) {
          allErrors.push('[MOBILE] phase-4 specifies openBehavior="slide-in-panel" but header.css has NO translateX — slide-in panels require CSS transform: translateX() for the sliding transition. Do NOT use accordion expand-in-place.');
          log('BLOCK', '[MOBILE] Stop Check 8b FAILED — slide-in-panel requires translateX in CSS');
        } else {
          log('PASS', '[MOBILE] Stop Check 8b: translateX found in CSS (slide-in-panel implementation present)');
        }
      }
      if (!p4.slideInPanelBehavior) {
        allErrors.push('[MOBILE] phase-4 specifies openBehavior="slide-in-panel" but slideInPanelBehavior object is MISSING. Must include direction, hasBackButton, backButtonLabel, transitionType.');
        log('BLOCK', '[MOBILE] Stop Check 8b FAILED — slideInPanelBehavior missing from phase-4');
      }
    }

    // Check 8c: mobile heading coverage — ALL headings must be tested
    log('INFO', '[MOBILE] Stop Check 8c: mobile heading coverage...');
    const headingCoveragePath = path.join(workspaceRoot, MOBILE_DIR, 'mobile-heading-coverage.json');
    const headingCoverage = loadJson(headingCoveragePath);
    if (headingCoverage) {
      if (!headingCoverage.allCovered) {
        allErrors.push(`[MOBILE] mobile-heading-coverage.json: allCovered=false. Not all mobile nav headings were tested. Go back and click EVERY heading.`);
        log('BLOCK', '[MOBILE] Stop Check 8c FAILED — not all headings covered');
      } else {
        log('PASS', `[MOBILE] Stop Check 8c: all ${headingCoverage.headings?.length || 0} headings covered`);
      }
    } else if (fs.existsSync(phase4Path)) {
      allErrors.push('[MOBILE] mobile-heading-coverage.json does NOT exist. Must click EVERY mobile nav heading and record coverage.');
      log('BLOCK', '[MOBILE] Stop Check 8c FAILED — heading coverage file missing');
    }

    // Check 8d: mobileMenuItems count matches heading count in phase-4
    if (p4 && p4.mobileMenuItems && headingCoverage && headingCoverage.headings) {
      const menuItemCount = p4.mobileMenuItems.length;
      const headingCount = headingCoverage.headings.length;
      if (menuItemCount < headingCount) {
        allErrors.push(`[MOBILE] phase-4 mobileMenuItems has ${menuItemCount} entries but ${headingCount} headings were found. Some headings were not analyzed.`);
        log('WARN', `[MOBILE] Stop Check 8d: mobileMenuItems (${menuItemCount}) < headings (${headingCount})`);
      } else {
        log('PASS', `[MOBILE] Stop Check 8d: mobileMenuItems (${menuItemCount}) covers headings (${headingCount})`);
      }
    }

    // Check 8e: [MOBILE] mobile behavior register — tap/click/animation for every mobile component
    log('INFO', '[MOBILE] Stop Check 8e: mobile behavior register...');
    const mobileBehaviorResult = checkMobileBehaviorRegister(workspaceRoot);
    allErrors.push(...mobileBehaviorResult.errors);
    allRemediation.push(...(mobileBehaviorResult.remediation || []));

    // Check 8f: [MOBILE] animation speed/transition timing matches source
    log('INFO', '[MOBILE] Stop Check 8f: mobile animation speed...');
    const animSpeedErrors = checkMobileAnimationSpeed(workspaceRoot);
    allErrors.push(...animSpeedErrors);

    const totalMobileErrors = hamburgerErrors.length + mobileResult.errors.length + mobileCritiqueErrors.length + mobileBehaviorResult.errors.length + animSpeedErrors.length;
    log('INFO', `[MOBILE] Stop Check 8: ${totalMobileErrors} error(s) (hamburger=${hamburgerErrors.length}, registers=${mobileResult.errors.length}, critique=${mobileCritiqueErrors.length}, behavior=${mobileBehaviorResult.errors.length}, animation=${animSpeedErrors.length})`);
  } else {
    log('INFO', 'Stop Check 8: phase-4-mobile.json not found — mobile not started (OK if desktop confirmation pending)');
  }

  // Check 9: desktop style register must be complete before session ends
  log('INFO', '[DESKTOP] Stop Check 9: desktop style register completeness...');
  const finalStyleReg = loadJson(path.join(workspaceRoot, STYLE_REGISTER));
  if (finalStyleReg) {
    const components = finalStyleReg.components || [];
    const validatedCount = components.filter(c => c.status === 'validated').length;
    if (validatedCount < components.length) {
      allErrors.push(`[DESKTOP] style-register has ${validatedCount}/${components.length} validated. ALL components must be validated (95%+) before session ends.`);
      log('BLOCK', `[DESKTOP] Stop Check 9 FAILED — ${validatedCount}/${components.length} validated`);
    } else {
      log('PASS', `[DESKTOP] Stop Check 9: style-register fully validated (${validatedCount}/${components.length})`);
    }
  }

  // Check 10: Viewport resize handling — header.js must handle window resize / matchMedia
  log('INFO', 'Stop Check 10: viewport resize handling in header.js...');
  const phase4StopPath = path.join(workspaceRoot, VALIDATION_DIR, 'phase-4-mobile.json');
  if (fs.existsSync(phase4StopPath)) {
    const headerJsStopPath = path.join(workspaceRoot, 'blocks', 'header', 'header.js');
    if (fs.existsSync(headerJsStopPath)) {
      try {
        const jsStopContent = fs.readFileSync(headerJsStopPath, 'utf8');
        const hasResize = /addEventListener\s*\(\s*['"]resize['"]/i.test(jsStopContent);
        const hasMM = /matchMedia\s*\(/i.test(jsStopContent);
        const hasRO = /ResizeObserver/i.test(jsStopContent);
        const hasOR = /window\.onresize/i.test(jsStopContent);
        if (!hasResize && !hasMM && !hasRO && !hasOR) {
          allErrors.push('[VIEWPORT] header.js has NO viewport resize / matchMedia handling. ' +
            'Layout will break when resizing between desktop and mobile without a page refresh. ' +
            'Add matchMedia("(max-width: <breakpoint>px)").addEventListener("change", handler) or window.addEventListener("resize", debounceHandler) ' +
            'to close mobile menus on desktop resize, reset hamburger state, and re-initialize desktop hover behaviors.');
          log('BLOCK', 'Stop Check 10 FAILED — no viewport resize handling');
        } else {
          const methods = [];
          if (hasResize) methods.push('resize listener');
          if (hasMM) methods.push('matchMedia');
          if (hasRO) methods.push('ResizeObserver');
          if (hasOR) methods.push('window.onresize');
          log('PASS', `Stop Check 10: viewport resize handling found (${methods.join(', ')})`);
        }
      } catch (e) {
        log('WARN', `Stop Check 10: could not read header.js: ${e.message}`);
      }
    } else {
      log('INFO', 'Stop Check 10: header.js not found (skipped)');
    }
  } else {
    log('INFO', 'Stop Check 10: phase-4-mobile.json not found — mobile not started, resize check skipped');
  }

  // Check 11: Search form parity — if desktop has search, mobile should acknowledge it (and vice versa)
  log('INFO', 'Stop Check 11: search form desktop/mobile parity...');
  const p2Stop = loadJson(path.join(workspaceRoot, VALIDATION_DIR, 'phase-2-row-mapping.json'));
  const p4Stop = loadJson(path.join(workspaceRoot, VALIDATION_DIR, 'phase-4-mobile.json'));
  if (p2Stop && p2Stop.rows && p4Stop) {
    const desktopHasSearch = (p2Stop.rows || []).some(r => r.hasSearchForm === true);
    const mobileHasSearch = p4Stop.hasSearchForm === true;

    if (desktopHasSearch && !mobileHasSearch && p4Stop.hasSearchForm !== false) {
      allErrors.push('[SEARCH] Desktop header has search form but phase-4-mobile.json is missing hasSearchForm field. ' +
        'Check if the search bar appears on mobile (may be hidden behind an icon or inside the hamburger menu).');
      log('WARN', 'Stop Check 11: desktop has search but mobile hasSearchForm not set');
    } else if (desktopHasSearch && !mobileHasSearch) {
      log('INFO', 'Stop Check 11: desktop has search, mobile explicitly set hasSearchForm=false (OK — mobile may hide search)');
    } else {
      log('PASS', `Stop Check 11: search form parity OK (desktop=${desktopHasSearch}, mobile=${mobileHasSearch})`);
    }
  } else {
    log('INFO', 'Stop Check 11: phase-2 or phase-4 not found — parity check skipped');
  }

  // Check 12: Locale/language selector parity + flag download verification
  log('INFO', 'Stop Check 12: locale selector desktop/mobile parity...');
  if (p2Stop && p2Stop.rows && p4Stop) {
    const desktopHasLocale = (p2Stop.rows || []).some(r => r.hasLocaleSelector === true);
    const mobileHasLocale = p4Stop.hasLocaleSelector === true;

    if (desktopHasLocale && p4Stop.hasLocaleSelector === undefined) {
      allErrors.push('[LOCALE] Desktop header has locale selector but phase-4-mobile.json is missing hasLocaleSelector field. ' +
        'Check if the language/region selector appears on mobile (may be a globe icon, inside the menu, or hidden).');
      log('WARN', 'Stop Check 12: desktop has locale selector but mobile hasLocaleSelector not set');
    } else if (desktopHasLocale && !mobileHasLocale) {
      log('INFO', 'Stop Check 12: desktop has locale, mobile explicitly set hasLocaleSelector=false (OK — mobile may hide it)');
    } else {
      log('PASS', `Stop Check 12: locale selector parity OK (desktop=${desktopHasLocale}, mobile=${mobileHasLocale})`);
    }

    // Flag download verification — if locale has flags, check nav.md for flag image references
    const localeRows = (p2Stop.rows || []).filter(r => r.hasLocaleSelector === true && r.localeSelectorDetails && r.localeSelectorDetails.hasFlags === true);
    const mobileLocaleHasFlags = mobileHasLocale && p4Stop.localeSelectorDetails && p4Stop.localeSelectorDetails.hasFlags === true;
    if (localeRows.length > 0 || mobileLocaleHasFlags) {
      log('INFO', 'Stop Check 12b: locale selector has flags — verifying flag images in nav.md...');
      const navMdPath = path.join(workspaceRoot, 'content', 'nav.md');
      if (fs.existsSync(navMdPath)) {
        try {
          const navContent = fs.readFileSync(navMdPath, 'utf8');
          const flagImagePattern = /flag|country|locale|lang.*\.(png|jpg|jpeg|svg|webp|gif)/i;
          const hasAnyFlagRef = flagImagePattern.test(navContent);
          if (!hasAnyFlagRef) {
            allErrors.push('[LOCALE] Locale selector has flags (hasFlags=true) but nav.md contains NO flag image references. ' +
              'Download flag images (e.g. flag-us.svg, flag-de.svg) to content/images/ and reference them in nav.md. ' +
              'The JS code should read these flag images from nav.md DOM and render them in the locale selector — never hardcode flag URLs in header.js.');
            log('WARN', 'Stop Check 12b: locale has flags but nav.md has no flag image references');
          } else {
            log('PASS', 'Stop Check 12b: flag image references found in nav.md');
          }
        } catch (e) {
          log('WARN', `Stop Check 12b: could not read nav.md: ${e.message}`);
        }
      } else {
        log('INFO', 'Stop Check 12b: nav.md not found — flag verification skipped');
      }
    }
  } else {
    log('INFO', 'Stop Check 12: phase-2 or phase-4 not found — locale parity check skipped');
  }

  // Final decision
  if (allErrors.length > 0) {
    log('BLOCK', `STOP BLOCKED — ${allErrors.length} issue(s) found`, allErrors);
    if (allRemediation.length > 0) {
      log('INFO', `Remediation steps provided: ${allRemediation.length}`, allRemediation);
    }
    let msg = `🚫 [Nav Gate] Cannot stop — ${allErrors.length} issue(s):\n\n` +
      allErrors.map((e, i) => `  ${i + 1}. ${e}`).join('\n');

    if (allRemediation.length > 0) {
      msg += '\n\n=== REQUIRED REMEDIATION — DO THIS NOW ===\n\n' +
        allRemediation.map((r, i) => `  ${i + 1}. ${r}`).join('\n\n') +
        '\n\nYou MUST edit blocks/header/header.css and/or blocks/header/header.js to match the source site.\n' +
        'Compare each failing component against the source screenshot.\n' +
        'Fix CSS (colors, sizes, border-radius, padding, fonts, backgrounds) and JS (hover effects, click behavior, transitions, animations).\n' +
        'After each fix, re-run nav-component-critique (steps A–G) for that component.\n' +
        'Repeat the fix-critique cycle until every component reaches >= 95% similarity.\n' +
        'Do NOT mark anything validated without a real critique report. Do NOT self-assess.';
    } else {
      msg += '\n\nFix ALL issues. Do NOT skip. Do NOT self-assess similarity.';
    }

    logDecision('block', `${allErrors.length} issue(s)`);
    console.log(JSON.stringify({ decision: 'block', reason: msg }));
    return;
  }

  log('PASS', '=== ALL STOP CHECKS PASSED ===');
  logDecision('allow', 'All checks passed');
  console.log(JSON.stringify({ reason: 'Nav gate: all checks passed.' }));
}

// --- Decision logger (always logged, easy to grep) ---

function logDecision(decision, summary) {
  const elapsed = Date.now() - hookStartTime;
  log('END', `Hook decision: ${decision.toUpperCase()} — ${summary} (elapsed: ${elapsed}ms)`);
}

// --- Main ---

async function main() {
  try {
    const hookInput = await readStdin();
    initSession(hookInput);

    const event = hookInput?.hook_event_name || hookInput?.hook_event || 'PostToolUse';
    const toolName = hookInput?.tool_name || 'N/A';
    const filePath = hookInput?.tool_input?.file_path || 'N/A';

    log('START', `========== NAV VALIDATION GATE HOOK ==========`);
    log('INFO', `Event: ${event} | Tool: ${toolName} | Session: ${sessionId}`);
    log('INFO', `File: ${filePath}`);
    log('INFO', `Tmp log: ${TMP_LOG}`);

    if (event === 'Stop') {
      handleStop(hookInput);
    } else {
      handlePostToolUse(hookInput);
    }
  } catch (error) {
    log('ERROR', `Hook crashed: ${error.message}`, { stack: error.stack });
    logDecision('allow', `Error fallback: ${error.message}`);
    console.log(JSON.stringify({ reason: `Nav gate error: ${error.message}` }));
    process.exit(0);
  }
}

main();
