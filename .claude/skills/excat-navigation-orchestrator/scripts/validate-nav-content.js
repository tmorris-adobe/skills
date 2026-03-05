#!/usr/bin/env node

/*
 * validate-nav-content.js
 *
 * Deterministic validation of nav.md content against phase-2/phase-3 requirements.
 * This script is MANDATORY — the orchestrator MUST run it after writing nav.md
 * and MUST NOT proceed if it exits non-zero.
 *
 * Usage:
 *   node .claude/skills/excat-navigation-orchestrator/scripts/validate-nav-content.js <nav-file> <validation-dir>
 *
 * Example:
 *   node .claude/skills/excat-navigation-orchestrator/scripts/validate-nav-content.js content/nav.md blocks/header/navigation-validation
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = validation failures (images missing, wrong location, etc.)
 *   2 = usage error (missing arguments, files not found)
 */

import fs from 'fs';
import path from 'path';

function debugLog(validationDir, level, msg) {
  const ts = new Date().toISOString();
  const prefix = { ERROR: '❌', PASS: '✅', BLOCK: '🚫', START: '🔵', END: '🏁' }[level] || 'ℹ️';
  const entry = `[${ts}] ${prefix} [SCRIPT:validate-nav-content] [${level}] ${msg}\n`;
  try {
    const logPath = path.join(validationDir, 'debug.log');
    if (fs.existsSync(validationDir)) fs.appendFileSync(logPath, entry);
  } catch (_) { /* ignore */ }
}

const IMAGE_PATTERN = /!\[.*?\]\(.*?\)/g;
const IMG_TAG_PATTERN = /<img\s[^>]*src=["']([^"']+)["']/gi;
const MEDIA_REF_PATTERN = /media_[a-f0-9]+/gi;
const IMG_EXT_PATTERN = /\.(png|jpg|jpeg|svg|webp|gif)/gi;

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function countImageReferences(content) {
  const mdImages = (content.match(IMAGE_PATTERN) || []).length;
  const htmlImages = (content.match(IMG_TAG_PATTERN) || []).length;
  const mediaRefs = (content.match(MEDIA_REF_PATTERN) || []).length;
  const extRefs = new Set((content.match(IMG_EXT_PATTERN) || []).map(e => e.toLowerCase()));
  return { mdImages, htmlImages, mediaRefs, uniqueExtensions: extRefs.size, total: mdImages + htmlImages + mediaRefs };
}

function extractImagePaths(content) {
  const paths = [];
  let m;

  const mdPattern = /!\[.*?\]\(([^)]+)\)/g;
  while ((m = mdPattern.exec(content)) !== null) {
    paths.push(m[1].trim());
  }

  const htmlPattern = /<img\s[^>]*src=["']([^"']+)["']/gi;
  while ((m = htmlPattern.exec(content)) !== null) {
    paths.push(m[1].trim());
  }

  return paths;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node validate-nav-content.js <nav-file> <validation-dir>');
    console.error('Example: node validate-nav-content.js content/nav.md blocks/header/navigation-validation');
    process.exit(2);
  }

  const navFile = args[0];
  const validationDir = args[1];

  debugLog(validationDir, 'START', `validate-nav-content.js invoked — navFile=${navFile}, validationDir=${validationDir}`);

  // --- Check nav file exists ---
  if (!fs.existsSync(navFile)) {
    console.error(`FAIL: nav file not found: ${navFile}`);
    console.error('nav.md must exist at content/nav.md before validation.');
    process.exit(1);
  }

  // --- Check location ---
  const parentDir = path.basename(path.dirname(path.resolve(navFile)));
  if (parentDir !== 'content') {
    console.error(`FAIL: nav file is in "${parentDir}/" — must be in "content/"`);
    console.error(`Move ${navFile} to content/nav.md`);
    process.exit(1);
  }

  // --- Load phase files ---
  const p2Path = path.join(validationDir, 'phase-2-row-mapping.json');
  const p3Path = path.join(validationDir, 'phase-3-megamenu.json');

  if (!fs.existsSync(p2Path)) {
    console.error(`FAIL: phase-2-row-mapping.json not found at ${p2Path}`);
    console.error('Phase 2 must complete before validating nav content.');
    process.exit(2);
  }

  const p2 = loadJson(p2Path);
  const p3 = loadJson(p3Path);

  // --- Collect hasImages requirements ---
  const imageRequirements = [];

  if (p2 && p2.rows) {
    for (const row of p2.rows) {
      if (row.hasImages) {
        imageRequirements.push({
          source: 'phase-2',
          element: `Row ${row.index ?? '?'}`,
          description: 'Logo, icons, or thumbnails in this row'
        });
      }
    }
  }

  if (p3) {
    if (p3.hasImages) {
      imageRequirements.push({
        source: 'phase-3',
        element: 'Megamenu (overall)',
        description: 'Vehicle thumbnails, promotional banners, image cards in megamenu'
      });
    }
    if (p3.columns) {
      for (const col of p3.columns) {
        if (col.hasImages) {
          imageRequirements.push({
            source: 'phase-3',
            element: `Megamenu column ${col.columnIndex ?? '?'}`,
            description: `Images in megamenu column ${col.columnIndex ?? '?'}`
          });
        }
      }
    }
  }

  // --- Read nav content ---
  const navContent = fs.readFileSync(navFile, 'utf-8');
  const imgCounts = countImageReferences(navContent);
  const imgPaths = extractImagePaths(navContent);

  // --- Report ---
  console.log('=== Nav Content Validation ===');
  console.log(`File: ${navFile}`);
  console.log(`Content length: ${navContent.length} chars, ${navContent.split('\n').length} lines`);
  console.log(`Image requirements from phases: ${imageRequirements.length} element(s) with hasImages=true`);
  console.log(`Image references found in nav: ${imgCounts.total} (md: ${imgCounts.mdImages}, html: ${imgCounts.htmlImages}, media: ${imgCounts.mediaRefs})`);

  if (imageRequirements.length > 0) {
    console.log('\nRequired images:');
    for (const req of imageRequirements) {
      console.log(`  - [${req.source}] ${req.element}: ${req.description}`);
    }
  }

  if (imgPaths.length > 0) {
    console.log('\nImage paths found in nav:');
    for (const p of imgPaths) {
      console.log(`  - ${p}`);
    }
  }

  // --- Validation ---
  const failures = [];

  if (imageRequirements.length > 0 && imgCounts.total === 0) {
    failures.push(
      `CRITICAL: ${imageRequirements.length} element(s) require images but nav content has ZERO image references.\n` +
      '  This is NOT an "EDS simplification" — it is a validation failure.\n' +
      '  You MUST:\n' +
      '    1. Visit the source URL for each hasImages element\n' +
      '    2. Download every image (logo, icons, thumbnails, banners) to content/images/\n' +
      '    3. Reference them in nav.md using ![alt text](content/images/filename.ext)\n' +
      '    4. Rewrite nav.md with ALL images included\n' +
      '    5. Re-run this script to verify'
    );
  }

  if (imageRequirements.length > 0 && imgCounts.total > 0 && imgCounts.total < imageRequirements.length) {
    failures.push(
      `WARNING: Found ${imgCounts.total} image reference(s) but ${imageRequirements.length} element(s) require images.\n` +
      '  Some images may be missing. Verify each hasImages element has its image in nav.md.'
    );
  }

  // Check image files actually exist on disk
  for (const imgPath of imgPaths) {
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://') || imgPath.startsWith('//')) {
      continue;
    }
    const resolved = path.resolve(path.dirname(navFile), imgPath);
    if (!fs.existsSync(resolved)) {
      const fromRoot = path.resolve(imgPath);
      if (!fs.existsSync(fromRoot)) {
        failures.push(`Image file not found on disk: ${imgPath} (checked ${resolved} and ${fromRoot})`);
      }
    }
  }

  // --- Output result ---
  if (failures.length > 0) {
    console.log('\n=== VALIDATION FAILED ===');
    for (const f of failures) {
      console.error(`\nFAIL: ${f}`);
    }
    console.log(`\n${failures.length} failure(s). Fix ALL before proceeding.`);
    debugLog(validationDir, 'BLOCK', `FAILED — ${failures.length} failure(s): ${failures.map(f => f.split('\n')[0]).join('; ')}`);
    process.exit(1);
  }

  console.log('\n=== VALIDATION PASSED ===');
  console.log(`All ${imageRequirements.length} image requirement(s) satisfied. ${imgCounts.total} image reference(s) found.`);
  debugLog(validationDir, 'PASS', `PASSED — ${imageRequirements.length} image requirement(s) satisfied, ${imgCounts.total} image reference(s) found`);

  // Write marker file so hook can detect this script was run
  try {
    fs.writeFileSync(path.join(validationDir, '.nav-content-validated'), JSON.stringify({ timestamp: new Date().toISOString(), imageCount: imgCounts.total, requirementCount: imageRequirements.length }));
  } catch (_) { /* ignore */ }

  process.exit(0);
}

main();
