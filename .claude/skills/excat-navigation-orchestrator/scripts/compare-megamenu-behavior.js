#!/usr/bin/env node

/*
 * compare-megamenu-behavior.js
 *
 * Compares source megamenu-mapping.json vs migrated-megamenu-mapping.json.
 * Produces megamenu-behavior-register.json with per-sub-item hover/click/styling match.
 *
 * Usage:
 *   node .claude/skills/excat-navigation-orchestrator/scripts/compare-megamenu-behavior.js <source-mapping> <migrated-mapping> [--output=<register-path>]
 *
 * Example:
 *   node .claude/skills/excat-navigation-orchestrator/scripts/compare-megamenu-behavior.js \
 *     blocks/header/navigation-validation/megamenu-mapping.json \
 *     blocks/header/navigation-validation/migrated-megamenu-mapping.json \
 *     --output=blocks/header/navigation-validation/megamenu-behavior-register.json
 *
 * Exit codes:
 *   0 = all items match (hover + click + styling)
 *   1 = one or more mismatches found
 *   2 = usage error
 */

import fs from 'fs';
import path from 'path';

function debugLog(level, msg) {
  const ts = new Date().toISOString();
  const prefix = { ERROR: '❌', PASS: '✅', BLOCK: '🚫', START: '🔵', END: '🏁' }[level] || 'ℹ️';
  const entry = `[${ts}] ${prefix} [SCRIPT:compare-megamenu-behavior] [${level}] ${msg}\n`;
  try {
    const logDir = path.resolve('blocks/header/navigation-validation');
    if (fs.existsSync(logDir)) fs.appendFileSync(path.join(logDir, 'debug.log'), entry);
  } catch (_) { /* ignore */ }
}

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.error(`Failed to load ${filePath}: ${e.message}`);
    return null;
  }
}

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url, 'https://placeholder.com');
    return u.pathname.replace(/\/$/, '');
  } catch {
    return url.replace(/\/$/, '').toLowerCase();
  }
}

function compareBehavior(sourceDesc, migratedDesc) {
  if (!sourceDesc && !migratedDesc) return true;
  if (!sourceDesc || !migratedDesc) return false;
  const s = sourceDesc.toLowerCase().trim();
  const m = migratedDesc.toLowerCase().trim();
  if (s === m) return true;
  const sWords = new Set(s.split(/\s+/));
  const mWords = new Set(m.split(/\s+/));
  const intersection = [...sWords].filter(w => mWords.has(w));
  const union = new Set([...sWords, ...mWords]);
  return intersection.length / union.size >= 0.6;
}

function findMigratedTrigger(migratedTriggers, sourceTrigger) {
  const byLabel = migratedTriggers.find(t =>
    t.label?.toLowerCase().trim() === sourceTrigger.label?.toLowerCase().trim()
  );
  if (byLabel) return byLabel;

  const byIndex = migratedTriggers.find(t => t.index === sourceTrigger.index);
  return byIndex || null;
}

function findMigratedItem(migratedItems, sourceItem) {
  if (!migratedItems) return null;
  return migratedItems.find(mi =>
    mi.label?.toLowerCase().trim() === sourceItem.label?.toLowerCase().trim()
  ) || null;
}

function compareHover(sourceHover, migratedHover) {
  if (!sourceHover?.hasEffect && !migratedHover?.hasEffect) return { matches: true, sourceDescription: 'no effect', migratedDescription: 'no effect' };
  if (!sourceHover?.hasEffect && !sourceHover?.opensPanel) return { matches: !migratedHover?.hasEffect, sourceDescription: 'no effect', migratedDescription: migratedHover?.description || 'no effect' };

  const srcDesc = sourceHover?.description || (sourceHover?.opensPanel ? 'opens panel' : 'no effect');
  const migDesc = migratedHover?.description || (migratedHover?.opensPanel ? 'opens panel' : 'no effect');

  const sourceHasEffect = sourceHover?.hasEffect || sourceHover?.opensPanel;
  const migratedHasEffect = migratedHover?.hasEffect || migratedHover?.opensPanel;

  if (sourceHasEffect && !migratedHasEffect) {
    return { matches: false, sourceDescription: srcDesc, migratedDescription: 'no effect', delta: `Source has hover effect ("${srcDesc}") but migrated has none` };
  }
  if (!sourceHasEffect && migratedHasEffect) {
    return { matches: false, sourceDescription: 'no effect', migratedDescription: migDesc, delta: `Migrated has hover effect but source does not` };
  }

  const affectsSrc = sourceHover?.affectsOtherElements;
  const affectsMig = migratedHover?.affectsOtherElements;
  if (affectsSrc && !affectsMig) {
    return { matches: false, sourceDescription: srcDesc, migratedDescription: migDesc, delta: `Source hover affects other elements ("${sourceHover.affectedElementDescription || '?'}") but migrated does not` };
  }

  const descMatch = compareBehavior(srcDesc, migDesc);
  return {
    matches: descMatch,
    sourceDescription: srcDesc,
    migratedDescription: migDesc,
    ...(descMatch ? {} : { delta: `Behavior differs: source="${srcDesc}", migrated="${migDesc}"` })
  };
}

function compareClick(sourceClick, migratedClick) {
  const srcNav = sourceClick?.navigates ?? false;
  const migNav = migratedClick?.navigates ?? false;
  const srcDesc = sourceClick?.description || (srcNav ? 'navigates' : 'no action');
  const migDesc = migratedClick?.description || (migNav ? 'navigates' : 'no action');
  const srcUrl = sourceClick?.url || '';
  const migUrl = migratedClick?.url || '';

  if (!srcNav && !migNav) return { matches: true, sourceDescription: srcDesc, migratedDescription: migDesc };

  const urlMatch = !srcUrl || !migUrl || normalizeUrl(srcUrl) === normalizeUrl(migUrl);
  const descMatch = compareBehavior(srcDesc, migDesc);
  const matches = urlMatch && (srcNav === migNav) && descMatch;

  return {
    matches,
    sourceDescription: srcDesc,
    migratedDescription: migDesc,
    sourceUrl: srcUrl,
    migratedUrl: migUrl,
    ...(matches ? {} : { delta: `Click differs: source="${srcDesc}" (${srcUrl}), migrated="${migDesc}" (${migUrl})` })
  };
}

function compareStyling(sourceItem, migratedItem) {
  if (!migratedItem) {
    return {
      matches: false,
      delta: `Item "${sourceItem.label}" exists in source but is MISSING in migrated`,
      hasImage: { source: !!sourceItem.hasImage, migrated: false }
    };
  }

  const srcHasImage = !!sourceItem.hasImage;
  const migHasImage = !!migratedItem.hasImage;
  const srcType = sourceItem.type || 'unknown';
  const migType = migratedItem.type || 'unknown';

  const issues = [];
  if (srcHasImage && !migHasImage) issues.push(`Source has image but migrated does not`);
  if (srcType !== migType && srcType !== 'unknown' && migType !== 'unknown') issues.push(`Type mismatch: source="${srcType}", migrated="${migType}"`);

  return {
    matches: issues.length === 0,
    ...(issues.length > 0 ? { delta: issues.join('; ') } : {}),
    hasImage: { source: srcHasImage, migrated: migHasImage }
  };
}

function processItems(sourceItems, migratedItems, triggerIndex, items, parentPrefix) {
  if (!sourceItems) return;

  for (let j = 0; j < sourceItems.length; j++) {
    const srcItem = sourceItems[j];
    const migItem = findMigratedItem(migratedItems, srcItem);
    const itemId = `${parentPrefix}-item-${j}`;

    const hoverMatch = compareHover(srcItem.hoverBehavior, migItem?.hoverBehavior);
    const clickMatch = compareClick(srcItem.clickBehavior, migItem?.clickBehavior);
    const stylingMatch = compareStyling(srcItem, migItem);

    const allMatch = hoverMatch.matches && clickMatch.matches && stylingMatch.matches;

    const entry = {
      id: itemId,
      label: srcItem.label || `Item ${j}`,
      type: 'panel-item',
      hoverMatch,
      clickMatch,
      stylingMatch,
      status: allMatch ? 'validated' : 'failed'
    };

    if (!allMatch) {
      const fixes = [];
      if (!hoverMatch.matches) fixes.push(`fix hover in header.js: ${hoverMatch.delta || 'match source hover behavior'}`);
      if (!clickMatch.matches) fixes.push(`fix click in header.js: ${clickMatch.delta || 'match source click behavior'}`);
      if (!stylingMatch.matches) fixes.push(`fix styling in header.css: ${stylingMatch.delta || 'match source appearance'}`);
      entry.remediation = fixes.join('; ');
    }

    items.push(entry);

    if (srcItem.subItems) {
      processItems(srcItem.subItems, migItem?.subItems, triggerIndex, items, itemId);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  let outputPath = null;

  const positional = [];
  for (const arg of args) {
    if (arg.startsWith('--output=')) {
      outputPath = arg.split('=')[1];
    } else {
      positional.push(arg);
    }
  }

  if (positional.length < 2) {
    console.error('Usage: node compare-megamenu-behavior.js <source-mapping> <migrated-mapping> [--output=<path>]');
    process.exit(2);
  }

  const sourcePath = positional[0];
  const migratedPath = positional[1];

  if (!fs.existsSync(sourcePath)) { console.error(`Source mapping not found: ${sourcePath}`); process.exit(2); }
  if (!fs.existsSync(migratedPath)) { console.error(`Migrated mapping not found: ${migratedPath}`); process.exit(2); }

  const source = loadJson(sourcePath);
  const migrated = loadJson(migratedPath);
  if (!source || !migrated) process.exit(2);

  debugLog('START', `compare-megamenu-behavior.js invoked — source=${sourcePath}, migrated=${migratedPath}, output=${outputPath || 'stdout'}`);

  const sourceTriggers = source.navTriggers || [];
  const migratedTriggers = migrated.navTriggers || [];

  const items = [];

  for (let i = 0; i < sourceTriggers.length; i++) {
    const srcTrigger = sourceTriggers[i];
    const migTrigger = findMigratedTrigger(migratedTriggers, srcTrigger);
    const triggerId = `trigger-${i}`;

    const hoverMatch = compareHover(srcTrigger.hoverBehavior, migTrigger?.hoverBehavior);
    const clickMatch = compareClick(srcTrigger.clickBehavior, migTrigger?.clickBehavior);
    const triggerStyling = migTrigger
      ? { matches: true }
      : { matches: false, delta: `Nav trigger "${srcTrigger.label}" exists in source but missing in migrated` };

    const allMatch = hoverMatch.matches && clickMatch.matches && triggerStyling.matches;

    items.push({
      id: triggerId,
      label: srcTrigger.label || `Trigger ${i}`,
      type: 'nav-trigger',
      hoverMatch,
      clickMatch,
      stylingMatch: triggerStyling,
      status: allMatch ? 'validated' : 'failed',
      ...(!allMatch ? { remediation: `Fix nav trigger "${srcTrigger.label}" in header.js/header.css to match source behavior` } : {})
    });

    processItems(srcTrigger.panelItems, migTrigger?.panelItems, i, items, triggerId);

    if (srcTrigger.categoryTabs) {
      for (let t = 0; t < srcTrigger.categoryTabs.length; t++) {
        const srcTab = srcTrigger.categoryTabs[t];
        const migTab = migTrigger?.categoryTabs?.[t] || migTrigger?.categoryTabs?.find(mt => mt.label?.toLowerCase() === srcTab.label?.toLowerCase());
        const tabId = `trigger-${i}-tab-${t}`;

        const tabHover = compareHover(srcTab.hoverBehavior, migTab?.hoverBehavior);
        const tabClick = {
          matches: !!(migTab?.clickBehavior?.filtersContent === srcTab.clickBehavior?.filtersContent),
          sourceDescription: srcTab.clickBehavior?.description || 'no action',
          migratedDescription: migTab?.clickBehavior?.description || 'no action',
          ...(!migTab ? { delta: `Category tab "${srcTab.label}" missing in migrated` } : {})
        };

        const tabAllMatch = tabHover.matches && tabClick.matches;

        items.push({
          id: tabId,
          label: srcTab.label || `Tab ${t}`,
          type: 'category-tab',
          hoverMatch: tabHover,
          clickMatch: tabClick,
          stylingMatch: { matches: !!migTab },
          status: tabAllMatch && !!migTab ? 'validated' : 'failed',
          ...(!tabAllMatch || !migTab ? { remediation: `Add/fix category tab "${srcTab.label}" in header.js — must filter content like source` } : {})
        });
      }
    }

    if (srcTrigger.featuredArea?.exists) {
      const migFeatured = migTrigger?.featuredArea;
      const featId = `trigger-${i}-featured`;
      const featMatch = !!migFeatured?.exists;
      const hoverUpdateMatch = !srcTrigger.featuredArea.updatesOnHover || !!migFeatured?.updatesOnHover;

      items.push({
        id: featId,
        label: `Featured area (${srcTrigger.featuredArea.type || 'unknown'})`,
        type: 'featured-area',
        hoverMatch: {
          matches: hoverUpdateMatch,
          sourceDescription: srcTrigger.featuredArea.updatesOnHover ? 'updates on item hover' : 'static',
          migratedDescription: migFeatured?.updatesOnHover ? 'updates on item hover' : 'static or missing',
          ...(!hoverUpdateMatch ? { delta: 'Source featured area updates on hover but migrated does not' } : {})
        },
        clickMatch: { matches: true, sourceDescription: 'N/A', migratedDescription: 'N/A' },
        stylingMatch: {
          matches: featMatch,
          ...(featMatch ? {} : { delta: `Source has featured area (${srcTrigger.featuredArea.type}) but migrated does not` })
        },
        status: featMatch && hoverUpdateMatch ? 'validated' : 'failed',
        ...(!featMatch || !hoverUpdateMatch ? { remediation: `Add featured area to megamenu in header.js — type: ${srcTrigger.featuredArea.type}, updatesOnHover: ${srcTrigger.featuredArea.updatesOnHover}` } : {})
      });
    }

    if (srcTrigger.specDetails?.exists) {
      const migSpec = migTrigger?.specDetails;
      const specId = `trigger-${i}-specs`;
      const specMatch = !!migSpec?.exists;
      const fieldsMatch = specMatch && JSON.stringify(srcTrigger.specDetails.fields?.sort()) === JSON.stringify(migSpec?.fields?.sort());

      items.push({
        id: specId,
        label: `Spec details (${(srcTrigger.specDetails.fields || []).join(', ')})`,
        type: 'spec-details',
        hoverMatch: {
          matches: !srcTrigger.specDetails.updatesOnHover || !!migSpec?.updatesOnHover,
          sourceDescription: srcTrigger.specDetails.updatesOnHover ? 'updates on hover' : 'static',
          migratedDescription: migSpec?.updatesOnHover ? 'updates on hover' : 'static or missing'
        },
        clickMatch: { matches: true, sourceDescription: 'N/A', migratedDescription: 'N/A' },
        stylingMatch: {
          matches: fieldsMatch,
          ...(fieldsMatch ? {} : { delta: `Spec fields differ: source=${JSON.stringify(srcTrigger.specDetails.fields)}, migrated=${JSON.stringify(migSpec?.fields || [])}` })
        },
        status: specMatch && fieldsMatch ? 'validated' : 'failed',
        ...(!specMatch || !fieldsMatch ? { remediation: `Add spec details section to megamenu — fields: ${(srcTrigger.specDetails.fields || []).join(', ')}` } : {})
      });
    }
  }

  const totalValidated = items.filter(i => i.status === 'validated').length;
  const totalFailed = items.filter(i => i.status === 'failed').length;
  const hoverMatches = items.filter(i => i.hoverMatch.matches).length;
  const clickMatches = items.filter(i => i.clickMatch.matches).length;
  const stylingMatches = items.filter(i => i.stylingMatch.matches).length;

  const register = {
    items,
    summary: {
      totalItems: items.length,
      hoverMatches,
      clickMatches,
      stylingMatches,
      totalValidated,
      totalFailed
    },
    allValidated: totalFailed === 0 && items.length > 0
  };

  // Output
  console.log('=== Megamenu Behavior Comparison ===');
  console.log(`Source triggers: ${sourceTriggers.length}, Migrated triggers: ${migratedTriggers.length}`);
  console.log(`Total items compared: ${items.length}`);
  console.log(`  Hover matches:   ${hoverMatches}/${items.length}`);
  console.log(`  Click matches:   ${clickMatches}/${items.length}`);
  console.log(`  Styling matches: ${stylingMatches}/${items.length}`);
  console.log(`  Validated: ${totalValidated}/${items.length}, Failed: ${totalFailed}/${items.length}`);

  if (totalFailed > 0) {
    console.log('\n=== FAILURES ===');
    for (const item of items.filter(i => i.status === 'failed')) {
      console.log(`\n  [${item.id}] "${item.label}" (${item.type}):`);
      if (!item.hoverMatch.matches) console.log(`    HOVER: ${item.hoverMatch.delta || 'mismatch'}`);
      if (!item.clickMatch.matches) console.log(`    CLICK: ${item.clickMatch.delta || 'mismatch'}`);
      if (!item.stylingMatch.matches) console.log(`    STYLING: ${item.stylingMatch.delta || 'mismatch'}`);
      if (item.remediation) console.log(`    FIX: ${item.remediation}`);
    }
  }

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(register, null, 2));
    console.log(`\nRegister written to: ${outputPath}`);
  } else {
    console.log('\n' + JSON.stringify(register, null, 2));
  }

  console.log(`\n=== ${register.allValidated ? 'ALL VALIDATED' : 'VALIDATION FAILED'} ===`);
  if (register.allValidated) {
    debugLog('PASS', `PASSED — ${items.length} items, all validated. Hover=${hoverMatches}/${items.length}, Click=${clickMatches}/${items.length}, Styling=${stylingMatches}/${items.length}`);
  } else {
    const failedNames = items.filter(i => i.status === 'failed').map(i => i.id).join(', ');
    debugLog('BLOCK', `FAILED — ${totalFailed}/${items.length} failed: ${failedNames}`);
  }
  process.exit(register.allValidated ? 0 : 1);
}

main();
