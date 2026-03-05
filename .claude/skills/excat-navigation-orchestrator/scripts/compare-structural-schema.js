#!/usr/bin/env node
/**
 * Compare source header structure (from phase-1, phase-2, phase-3) to migrated
 * header structure (extracted from migrated page, same shape). Outputs structural
 * similarity and exits 0 if >= threshold (default 95), else 1.
 * Optional: --output-register=<path> writes schema-register.json with per-component status.
 *
 * Usage:
 *   node .claude/skills/excat-navigation-orchestrator/scripts/compare-structural-schema.js <phase-1.json> <phase-2.json> <phase-3.json> <migrated-structural-summary.json> [--threshold=95] [--output-register=schema-register.json]
 */

import fs from 'fs';
import path from 'path';

function debugLog(level, msg) {
  const ts = new Date().toISOString();
  const prefix = { ERROR: '❌', PASS: '✅', BLOCK: '🚫', START: '🔵', END: '🏁' }[level] || 'ℹ️';
  const entry = `[${ts}] ${prefix} [SCRIPT:compare-structural-schema] [${level}] ${msg}\n`;
  try {
    const logDir = path.resolve('blocks/header/navigation-validation');
    if (fs.existsSync(logDir)) fs.appendFileSync(path.join(logDir, 'debug.log'), entry);
  } catch (_) { /* ignore */ }
}

function loadJson(p) {
  const raw = fs.readFileSync(path.resolve(p), 'utf8');
  return JSON.parse(raw);
}

function buildSourceSummary(p1, p2, p3) {
  const rowCount = p1.rowCount != null ? p1.rowCount : 0;
  const rows = (p2.rows || []).map((r, i) => ({
    index: r.index != null ? r.index : i,
    hasImages: Boolean(r.hasImages),
  }));
  const mm = p3 || {};
  const columnCount = mm.columnCount != null ? mm.columnCount : 0;
  const columns = (mm.columns || []).map((c, i) => ({
    columnIndex: c.columnIndex != null ? c.columnIndex : i,
    hasImages: Boolean(c.hasImages),
  }));
  return {
    rowCount,
    rows,
    megamenu: {
      columnCount,
      hasImages: Boolean(mm.hasImages),
      columns,
    },
  };
}

function compare(source, migrated) {
  const mismatches = [];
  let total = 0;
  let match = 0;

  // rowCount
  total += 1;
  if (source.rowCount === migrated.rowCount) match += 1;
  else mismatches.push(`rowCount: source=${source.rowCount} migrated=${migrated.rowCount}`);

  // rows (length and hasImages per row)
  const srcRows = source.rows || [];
  const migRows = migrated.rows || [];
  const maxRows = Math.max(srcRows.length, migRows.length);
  for (let i = 0; i < maxRows; i++) {
    total += 1;
    const s = srcRows[i];
    const m = migRows[i];
    if (!s || !m) {
      mismatches.push(`rows[${i}]: missing in ${s ? 'migrated' : 'source'}`);
      continue;
    }
    if (s.hasImages === m.hasImages) match += 1;
    else mismatches.push(`rows[${i}].hasImages: source=${s.hasImages} migrated=${m.hasImages}`);
  }

  // megamenu.columnCount
  total += 1;
  const srcMm = source.megamenu || {};
  const migMm = migrated.megamenu || {};
  if (srcMm.columnCount === migMm.columnCount) match += 1;
  else mismatches.push(`megamenu.columnCount: source=${srcMm.columnCount} migrated=${migMm.columnCount}`);

  // megamenu.hasImages
  total += 1;
  if (srcMm.hasImages === migMm.hasImages) match += 1;
  else mismatches.push(`megamenu.hasImages: source=${srcMm.hasImages} migrated=${migMm.hasImages}`);

  // columns[].hasImages
  const srcCols = srcMm.columns || [];
  const migCols = migMm.columns || [];
  const maxCols = Math.max(srcCols.length, migCols.length);
  for (let i = 0; i < maxCols; i++) {
    total += 1;
    const s = srcCols[i];
    const m = migCols[i];
    if (!s || !m) {
      mismatches.push(`megamenu.columns[${i}]: missing in ${s ? 'migrated' : 'source'}`);
      continue;
    }
    if (s.hasImages === m.hasImages) match += 1;
    else mismatches.push(`megamenu.columns[${i}].hasImages: source=${s.hasImages} migrated=${m.hasImages}`);
  }

  const similarity = total === 0 ? 100 : Math.round((match / total) * 100);
  return { similarity, mismatches, match, total };
}

/** Build per-item match for schema register: row-0, row-1, ..., megamenu, megamenu-column-0, ... */
function buildRegisterItems(source, migrated, compareResult) {
  const items = [];
  const srcRows = source.rows || [];
  const migRows = migrated.rows || [];
  for (let i = 0; i < Math.max(srcRows.length, migRows.length); i++) {
    const s = srcRows[i];
    const m = migRows[i];
    const validated = s && m && s.hasImages === m.hasImages;
    items.push({ id: `row-${i}`, label: `Row ${i}`, status: validated ? 'validated' : 'pending', sourceMatch: validated });
  }
  const srcMm = source.megamenu || {};
  const migMm = migrated.megamenu || {};
  if (srcMm.columnCount !== undefined && srcMm.columnCount > 0) {
    items.push({
      id: 'megamenu',
      label: 'Megamenu',
      status: srcMm.columnCount === migMm.columnCount && srcMm.hasImages === migMm.hasImages ? 'validated' : 'pending',
      sourceMatch: srcMm.columnCount === migMm.columnCount && srcMm.hasImages === migMm.hasImages,
    });
    const srcCols = srcMm.columns || [];
    const migCols = migMm.columns || [];
    for (let i = 0; i < Math.max(srcCols.length, migCols.length); i++) {
      const s = srcCols[i];
      const m = migCols[i];
      const validated = s && m && s.hasImages === m.hasImages;
      items.push({ id: `megamenu-column-${i}`, label: `Megamenu column ${i}`, status: validated ? 'validated' : 'pending', sourceMatch: validated });
    }
  }
  const allValidated = items.every((it) => it.status === 'validated');
  return { items, allValidated };
}

function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--threshold') && !a.startsWith('--output-register'));
  const thresholdArg = process.argv.slice(2).find((a) => a.startsWith('--threshold'));
  const registerArg = process.argv.slice(2).find((a) => a.startsWith('--output-register'));
  const threshold = thresholdArg ? parseInt(thresholdArg.split('=')[1], 10) : 95;
  const outputRegisterPath = registerArg ? registerArg.split('=')[1] : null;

  if (args.length < 4) {
    console.error('Usage: node compare-structural-schema.js <phase-1.json> <phase-2.json> <phase-3.json> <migrated-structural-summary.json> [--threshold=95] [--output-register=schema-register.json]');
    process.exit(1);
  }

  const [p1Path, p2Path, p3Path, migPath] = args;
  for (const p of [p1Path, p2Path, p3Path, migPath]) {
    if (!fs.existsSync(path.resolve(p))) {
      console.error('Error: file not found:', p);
      process.exit(1);
    }
  }

  let p1, p2, p3, migrated;
  try {
    p1 = loadJson(p1Path);
    p2 = loadJson(p2Path);
    p3 = loadJson(p3Path);
    migrated = loadJson(migPath);
  } catch (e) {
    console.error('Error: invalid JSON:', e.message);
    process.exit(1);
  }

  debugLog('START', `compare-structural-schema.js invoked — threshold=${threshold}, outputRegister=${outputRegisterPath || 'none'}`);

  const source = buildSourceSummary(p1, p2, p3);
  const compareResult = compare(source, migrated);
  const { similarity, mismatches } = compareResult;

  if (outputRegisterPath) {
    const register = buildRegisterItems(source, migrated, compareResult);
    try {
      fs.writeFileSync(path.resolve(outputRegisterPath), JSON.stringify(register, null, 2), 'utf8');
    } catch (e) {
      console.error('Error writing schema register:', e.message);
    }
  }

  console.log(`Structural similarity: ${similarity}% (threshold ${threshold}%)`);
  if (mismatches.length > 0) {
    console.error('Mismatches:');
    mismatches.forEach((m) => console.error('  ', m));
  }

  if (similarity >= threshold) {
    debugLog('PASS', `PASSED — similarity=${similarity}% (>= ${threshold}%), mismatches=${mismatches.length}${outputRegisterPath ? ', register written to ' + outputRegisterPath : ''}`);
    process.exit(0);
  }
  debugLog('BLOCK', `FAILED — similarity=${similarity}% (< ${threshold}%), mismatches: ${mismatches.join('; ')}`);
  process.exit(1);
}

main();
