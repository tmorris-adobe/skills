#!/usr/bin/env node
/**
 * Readiness Tracker Generator
 * ===========================
 * Builds readiness-tracker.json and readiness-tracker.md from:
 *   - url-catalog.json   (all URLs + templates)
 *   - regression-report.md (similarity scores)
 *   - content/ directory  (which files actually exist)
 *
 * Path resolution order: CLI args → readiness-config.json → env vars → auto-discovery
 *
 * Usage:
 *   node .claude/skills/excat-readiness-tracker/generate-tracker.js
 *   node .claude/skills/excat-readiness-tracker/generate-tracker.js --url-catalog path/to/catalog.json
 *   node .claude/skills/excat-readiness-tracker/generate-tracker.js --config readiness-config.json
 *
 * Output:
 *   - readiness-tracker.json  (machine-readable, full per-page data)
 *   - readiness-tracker.md    (human-readable dashboard)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI argument parsing ──────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--') && i + 1 < argv.length) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      args[key] = argv[++i];
    }
  }
  return args;
}

// ── Configuration resolution ──────────────────────────────────────
function resolveConfig(cliArgs) {
  // Determine workspace root: walk up from script location to find package.json
  let root = resolve(__dirname, '../../..');
  for (let dir = __dirname; dir !== dirname(dir); dir = dirname(dir)) {
    if (existsSync(resolve(dir, 'package.json'))) {
      root = dir;
      break;
    }
  }

  // Tier 1: CLI arguments
  const cli = {
    urlCatalog: cliArgs.urlCatalog,
    regressionReport: cliArgs.regressionReport,
    contentDir: cliArgs.contentDir,
    outputDir: cliArgs.outputDir,
  };

  // Tier 2: Config file
  let fileConfig = {};
  const configPath = cliArgs.config
    ? resolve(root, cliArgs.config)
    : resolve(root, 'readiness-config.json');
  if (existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(readFileSync(configPath, 'utf8'));
      // Optional: override workspace root (e.g. monorepo sub-package). Relative to config file.
      if (fileConfig.root) {
        root = resolve(dirname(configPath), fileConfig.root);
      }
    } catch (e) {
      console.warn(`Warning: Could not parse ${configPath}: ${e.message}`);
    }
  }

  // Tier 3: Environment variables
  const env = {
    urlCatalog: process.env.READINESS_URL_CATALOG,
    regressionReport: process.env.READINESS_REGRESSION_REPORT,
    contentDir: process.env.READINESS_CONTENT_DIR,
    outputDir: process.env.READINESS_OUTPUT_DIR,
  };

  // Tier 4: Auto-discovery
  const autodiscover = (paths) => paths.find((p) => existsSync(resolve(root, p)));

  const urlCatalogPath = cli.urlCatalog
    || fileConfig.urlCatalog
    || env.urlCatalog
    || autodiscover(['tools/importer/url-catalog.json', 'url-catalog.json', 'tools/url-catalog.json']);

  const regressionReportPath = cli.regressionReport
    || fileConfig.regressionReport
    || env.regressionReport
    || autodiscover(['tests/style-regression/regression-report.md', 'regression-report.md', 'tests/regression-report.md']);

  const contentDirPath = cli.contentDir
    || fileConfig.contentDir
    || env.contentDir
    || autodiscover(['content', 'docs', 'pages']);

  const outputDirPath = cli.outputDir
    || fileConfig.outputDir
    || env.outputDir
    || '.';

  const thresholds = {
    customerReady: fileConfig.thresholds?.customerReady ?? 80,
    nearReady: fileConfig.thresholds?.nearReady ?? 60,
  };

  return {
    root,
    urlCatalog: urlCatalogPath ? resolve(root, urlCatalogPath) : null,
    regressionReport: regressionReportPath ? resolve(root, regressionReportPath) : null,
    contentDir: contentDirPath ? resolve(root, contentDirPath) : null,
    outputDir: resolve(root, outputDirPath),
    thresholds,
    // Track what was actually found (verify file/dir exists, not just configured)
    sources: {
      urlCatalog: { found: !!urlCatalogPath && existsSync(resolve(root, urlCatalogPath)), path: urlCatalogPath || 'not found' },
      regressionReport: { found: !!regressionReportPath && existsSync(resolve(root, regressionReportPath)), path: regressionReportPath || 'not found' },
      contentDir: { found: !!contentDirPath && existsSync(resolve(root, contentDirPath)), path: contentDirPath || 'not found' },
    },
  };
}

// ── Parse regression report ───────────────────────────────────────
function parseRegressionReport(reportPath) {
  const scores = {};
  if (!reportPath || !existsSync(reportPath)) return scores;

  const report = readFileSync(reportPath, 'utf8');

  function parseTable(heading) {
    const re = new RegExp(`## ${heading}[^\\n]*\\n\\n\\|[^\\n]+\\n\\|[^\\n]+\\n([\\s\\S]*?)(?=\\n##|\\n---|$)`);
    const match = report.match(re);
    if (!match) return;
    for (const line of match[1].trim().split('\n')) {
      const cols = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 4) {
        const [template, page, similarity, status] = cols;
        const pct = parseFloat(similarity);
        if (!Number.isNaN(pct)) {
          if (!scores[template]) scores[template] = {};
          scores[template][heading.toLowerCase()] = { page, similarity: pct, status };
        }
      }
    }
  }

  parseTable('Desktop');
  parseTable('Mobile');
  return scores;
}

// ── Get list of existing content files ────────────────────────────
function getExistingFiles(contentDir, root) {
  if (!contentDir || !existsSync(contentDir)) return new Set();
  try {
    const relDir = contentDir.replace(root + '/', '');
    return new Set(
      execSync(`find ${relDir} -name "*.html" -type f`, { cwd: root, encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((f) => f.replace(new RegExp(`^${relDir}/`), '/').replace(/\.html$/, ''))
    );
  } catch {
    return new Set();
  }
}

// ── URL to EDS path ───────────────────────────────────────────────
function urlToEdsPath(url) {
  const u = new URL(url);
  let p = u.pathname.replace(/\/$/, '') || '/index';
  if (p === '') p = '/index';
  return p;
}

// ── Load previous tracker for delta comparison ────────────────────
function loadPreviousTracker(outputDir) {
  const prevPath = resolve(outputDir, 'readiness-tracker.json');
  if (!existsSync(prevPath)) return null;
  try {
    return JSON.parse(readFileSync(prevPath, 'utf8'));
  } catch {
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────
const cliArgs = parseArgs(process.argv);
const config = resolveConfig(cliArgs);

// Validate: URL catalog is required
if (!config.urlCatalog || !existsSync(config.urlCatalog)) {
  console.error('Error: URL catalog not found.');
  console.error('Tried: tools/importer/url-catalog.json, url-catalog.json, tools/url-catalog.json');
  console.error('Use --url-catalog path/to/file.json or create readiness-config.json');
  process.exit(1);
}

// Load previous tracker for delta
const previousTracker = loadPreviousTracker(config.outputDir);

// ── Load data sources ─────────────────────────────────────────────
const catalog = JSON.parse(readFileSync(config.urlCatalog, 'utf8'));
const regressionScores = parseRegressionReport(config.regressionReport);
const existingFiles = getExistingFiles(config.contentDir, config.root);

// Source label from catalog
const sourceLabel = catalog.source || 'Unknown source';

// ── Determine readiness status ────────────────────────────────────
function getReadiness(template) {
  const scores = regressionScores[template];
  if (scores) {
    const dSim = scores.desktop?.similarity ?? 0;
    const mSim = scores.mobile?.similarity ?? 0;
    const avg = (dSim + mSim) / 2;
    if (avg >= config.thresholds.customerReady) return 'customer-ready';
    if (avg >= config.thresholds.nearReady) return 'near-ready';
    return 'needs-work';
  }
  return 'untested';
}

// ── Build tracker data ────────────────────────────────────────────
const now = new Date().toISOString();
const manualPages = new Set((catalog.alreadyMigrated || []).map(urlToEdsPath));

const templates = {};
const pages = [];

for (const [batchName, batch] of Object.entries(catalog.batches)) {
  const template = batch.template;
  if (!templates[template]) {
    templates[template] = {
      name: template,
      totalPages: 0,
      imported: 0,
      manualMigration: 0,
      bulkImport: 0,
      regressionTested: false,
      desktop: null,
      mobile: null,
      templateReadiness: 'untested',
    };
  }

  for (const url of batch.urls) {
    const edsPath = urlToEdsPath(url);
    const isManual = manualPages.has(edsPath);
    const hasFile = existingFiles.has(edsPath);
    const readiness = hasFile ? getReadiness(template) : 'not-imported';

    templates[template].totalPages += 1;
    if (hasFile) templates[template].imported += 1;
    if (isManual) templates[template].manualMigration += 1;
    else if (hasFile) templates[template].bulkImport += 1;

    pages.push({
      url,
      edsPath,
      template,
      batch: batchName,
      imported: hasFile,
      migrationMethod: isManual ? 'manual' : hasFile ? 'bulk' : 'none',
      readiness,
    });
  }
}

// ── Enrich template summaries with regression data ────────────────
for (const [tName, tData] of Object.entries(templates)) {
  const scores = regressionScores[tName];
  if (scores) {
    tData.regressionTested = true;
    tData.desktop = scores.desktop || null;
    tData.mobile = scores.mobile || null;
    const dSim = scores.desktop?.similarity ?? 0;
    const mSim = scores.mobile?.similarity ?? 0;
    const avg = (dSim + mSim) / 2;
    if (avg >= config.thresholds.customerReady) tData.templateReadiness = 'customer-ready';
    else if (avg >= config.thresholds.nearReady) tData.templateReadiness = 'near-ready';
    else tData.templateReadiness = 'needs-work';
  }
}

// ── Aggregate stats ───────────────────────────────────────────────
const stats = {
  totalUrls: pages.length,
  imported: pages.filter((p) => p.imported).length,
  notImported: pages.filter((p) => !p.imported).length,
  manualMigration: pages.filter((p) => p.migrationMethod === 'manual').length,
  bulkImport: pages.filter((p) => p.migrationMethod === 'bulk').length,
  byReadiness: {
    'customer-ready': pages.filter((p) => p.readiness === 'customer-ready').length,
    'near-ready': pages.filter((p) => p.readiness === 'near-ready').length,
    'needs-work': pages.filter((p) => p.readiness === 'needs-work').length,
    untested: pages.filter((p) => p.readiness === 'untested').length,
    'not-imported': pages.filter((p) => p.readiness === 'not-imported').length,
  },
  templateCount: Object.keys(templates).length,
  templatesReady: Object.values(templates).filter((t) => t.templateReadiness === 'customer-ready').length,
  templatesNearReady: Object.values(templates).filter((t) => t.templateReadiness === 'near-ready').length,
  templatesNeedWork: Object.values(templates).filter((t) => t.templateReadiness === 'needs-work').length,
  templatesUntested: Object.values(templates).filter((t) => t.templateReadiness === 'untested').length,
};

// ── Build JSON output ─────────────────────────────────────────────
const readyThreshold = config.thresholds.customerReady;
const nearThreshold = config.thresholds.nearReady;

const tracker = {
  $schema: 'readiness-tracker-schema',
  generated: now,
  source: sourceLabel,
  thresholds: {
    'customer-ready': `>=${readyThreshold}% similarity (desktop + mobile average)`,
    'near-ready': `${nearThreshold}-${readyThreshold - 1}% similarity`,
    'needs-work': `<${nearThreshold}% similarity`,
    untested: 'imported but no regression test',
    'not-imported': 'URL cataloged but no content file',
  },
  dataSources: config.sources,
  stats,
  templates: Object.values(templates).sort((a, b) => {
    const order = { 'customer-ready': 0, 'near-ready': 1, 'needs-work': 2, untested: 3 };
    return (order[a.templateReadiness] ?? 4) - (order[b.templateReadiness] ?? 4);
  }),
  pages,
};

writeFileSync(resolve(config.outputDir, 'readiness-tracker.json'), JSON.stringify(tracker, null, 2) + '\n');

// ── Build Markdown output ─────────────────────────────────────────
const lines = [];
const bar = (pct) => {
  const filled = Math.round(pct / 5);
  return `${'█'.repeat(filled)}${'░'.repeat(20 - filled)}`;
};
const statusLabel = {
  'customer-ready': 'READY',
  'near-ready': 'NEAR',
  'needs-work': 'WORK',
  untested: '—',
  'not-imported': 'N/A',
};

lines.push(`# Page Readiness Tracker — EDS Migration`);
lines.push('');
lines.push(`**Generated:** ${now.split('T')[0]}`);
lines.push(`**Source:** ${sourceLabel} → AEM Edge Delivery Services`);
lines.push(`**Total URLs:** ${stats.totalUrls} | **Imported:** ${stats.imported} | **Not imported:** ${stats.notImported}`);
lines.push('');

// Data source notes
if (!config.sources.regressionReport.found) {
  lines.push('> **Note:** No regression report found. All pages marked as "untested".');
  lines.push('');
}
if (!config.sources.contentDir.found) {
  lines.push('> **Note:** No content directory found. All pages marked as "not-imported".');
  lines.push('');
}

lines.push('## Readiness Thresholds');
lines.push('');
lines.push('| Status | Criteria |');
lines.push('|--------|----------|');
lines.push(`| READY | >=${readyThreshold}% visual similarity (desktop + mobile avg) |`);
lines.push(`| NEAR | ${nearThreshold}-${readyThreshold - 1}% visual similarity |`);
lines.push(`| WORK | <${nearThreshold}% visual similarity |`);
lines.push('| UNTESTED | Imported but no regression test run |');
lines.push('| N/A | URL cataloged but content not yet imported |');
if (readyThreshold < 95) {
  lines.push('');
  lines.push('> **Tip:** For pixel-for-pixel / customer QA bar, set `thresholds.customerReady` to **95** in `readiness-config.json` and regenerate.');
}
lines.push('');

// ── Overall Summary ───────────────────────────────────────────────
lines.push('## Overall Summary');
lines.push('');
lines.push('```');
lines.push(`  Customer Ready:  ${String(stats.byReadiness['customer-ready']).padStart(3)} pages`);
lines.push(`  Near Ready:      ${String(stats.byReadiness['near-ready']).padStart(3)} pages`);
lines.push(`  Needs Work:      ${String(stats.byReadiness['needs-work']).padStart(3)} pages`);
lines.push(`  Untested:        ${String(stats.byReadiness.untested).padStart(3)} pages`);
lines.push(`  Not Imported:    ${String(stats.byReadiness['not-imported']).padStart(3)} pages`);
lines.push('  ─────────────────────────');
lines.push(`  Total:           ${String(stats.totalUrls).padStart(3)} pages`);
lines.push('```');
lines.push('');

// ── Delta from previous run ───────────────────────────────────────
if (previousTracker?.stats) {
  const prev = previousTracker.stats;
  const deltas = [];
  for (const key of ['customer-ready', 'near-ready', 'needs-work', 'untested', 'not-imported']) {
    const diff = (stats.byReadiness[key] || 0) - (prev.byReadiness?.[key] || 0);
    if (diff !== 0) {
      deltas.push(`${key}: ${diff > 0 ? '+' : ''}${diff}`);
    }
  }
  if (deltas.length > 0) {
    lines.push(`**Changes since last run** (${previousTracker.generated?.split('T')[0] || 'unknown'}):`);
    lines.push(`${deltas.join(', ')}`);
    lines.push('');
  }
}

// ── Template Dashboard ────────────────────────────────────────────
lines.push('## Template Dashboard');
lines.push('');
lines.push('| Template | Pages | Imported | Desktop | Mobile | Avg | Status |');
lines.push('|----------|------:|--------:|---------:|-------:|----:|--------|');

for (const t of tracker.templates) {
  const dSim = t.desktop?.similarity ?? '—';
  const mSim = t.mobile?.similarity ?? '—';
  const avg = (t.desktop && t.mobile) ? ((t.desktop.similarity + t.mobile.similarity) / 2).toFixed(1) + '%' : '—';
  const dStr = typeof dSim === 'number' ? dSim.toFixed(1) + '%' : dSim;
  const mStr = typeof mSim === 'number' ? mSim.toFixed(1) + '%' : mSim;
  lines.push(`| ${t.name} | ${t.totalPages} | ${t.imported} | ${dStr} | ${mStr} | ${avg} | ${statusLabel[t.templateReadiness]} |`);
}

lines.push('');

// ── Template Details ──────────────────────────────────────────────
lines.push('## Template Details');
lines.push('');

for (const t of tracker.templates) {
  lines.push(`### ${t.name}`);
  lines.push('');
  lines.push(`- **Pages:** ${t.totalPages} total, ${t.imported} imported (${t.manualMigration} manual, ${t.bulkImport} bulk)`);

  if (t.regressionTested) {
    const dSim = t.desktop?.similarity ?? 0;
    const mSim = t.mobile?.similarity ?? 0;
    const avg = ((dSim + mSim) / 2).toFixed(1);
    lines.push(`- **Desktop:** ${dSim.toFixed(1)}% ${bar(dSim)}`);
    lines.push(`- **Mobile:** ${mSim.toFixed(1)}% ${bar(mSim)}`);
    lines.push(`- **Average:** ${avg}%`);
    lines.push(`- **Tested page:** ${t.desktop?.page || t.mobile?.page || 'unknown'}`);
  } else {
    lines.push('- **Regression:** Not tested');
  }
  lines.push(`- **Status:** ${t.templateReadiness}`);
  lines.push('');
}

// ── Pages by readiness ────────────────────────────────────────────
lines.push('## Pages by Readiness');
lines.push('');

const readinessOrder = ['customer-ready', 'near-ready', 'needs-work', 'untested', 'not-imported'];
for (const status of readinessOrder) {
  const group = pages.filter((p) => p.readiness === status);
  if (group.length === 0) continue;

  lines.push(`### ${statusLabel[status]} — ${status} (${group.length} pages)`);
  lines.push('');

  if (group.length > 20) {
    const byTemplate = {};
    for (const p of group) {
      if (!byTemplate[p.template]) byTemplate[p.template] = [];
      byTemplate[p.template].push(p);
    }
    lines.push('| Template | Count | Sample EDS Path |');
    lines.push('|----------|------:|-----------------|');
    for (const [tmpl, pgs] of Object.entries(byTemplate).sort((a, b) => b[1].length - a[1].length)) {
      lines.push(`| ${tmpl} | ${pgs.length} | ${pgs[0].edsPath} |`);
    }
  } else {
    lines.push('| EDS Path | Template | Migration |');
    lines.push('|----------|----------|-----------|');
    for (const p of group) {
      lines.push(`| ${p.edsPath} | ${p.template} | ${p.migrationMethod} |`);
    }
  }
  lines.push('');
}

// ── Methodology note ──────────────────────────────────────────────
lines.push('## Methodology');
lines.push('');
lines.push('Readiness is determined at the **template level**. One representative page per template');
lines.push('is tested via Playwright screenshot diff (pixelmatch). All pages sharing that template');
lines.push('inherit its readiness status, since style fixes apply template-wide.');
lines.push('');
lines.push('**Caveat:** Individual pages may have content-specific issues not captured by template-level');
lines.push('testing. Full per-page regression testing is recommended before launch.');
lines.push('');

// ── Next Steps ────────────────────────────────────────────────────
const recs = tracker.templates
  .filter((t) => t.regressionTested && t.templateReadiness !== 'customer-ready')
  .map((t) => {
    const avg = ((t.desktop?.similarity ?? 0) + (t.mobile?.similarity ?? 0)) / 2;
    const gap = readyThreshold - avg;
    return { name: t.name, pages: t.imported, avg, gap };
  })
  .sort((a, b) => {
    if (a.gap !== b.gap) return a.gap - b.gap;
    return b.pages - a.pages;
  });

lines.push('## Recommended Next Steps');
lines.push('');
lines.push('Prioritized by proximity to READY threshold and page count:');
lines.push('');
recs.forEach((r, i) => {
  lines.push(`${i + 1}. **\`${r.name}\`** — ${r.pages} pages at ${r.avg.toFixed(1)}% avg (need +${r.gap.toFixed(1)}pp to reach READY)`);
});
const notImported = stats.byReadiness['not-imported'];
if (notImported > 0) {
  lines.push(`${recs.length + 1}. **Import remaining** ${notImported} URLs not yet in content/`);
}
const untestedCount = stats.byReadiness.untested;
if (untestedCount > 0) {
  lines.push(`${recs.length + (notImported > 0 ? 2 : 1)}. **Run regression tests** — ${untestedCount} imported pages have no template-level scores`);
}
lines.push(`${recs.length + (notImported > 0 ? 1 : 0) + (untestedCount > 0 ? 1 : 0) + 1}. **Run per-page regression tests** to catch content-specific issues beyond template-level`);
lines.push('');
lines.push('---');
lines.push('*Generated by `generate-tracker.js` from url-catalog.json + regression-report.md*');
lines.push('');

writeFileSync(resolve(config.outputDir, 'readiness-tracker.md'), lines.join('\n'));

// ── Console report ────────────────────────────────────────────────
console.log('Readiness tracker generated:');
console.log(`  readiness-tracker.json — ${pages.length} pages, ${Object.keys(templates).length} templates`);
console.log(`  readiness-tracker.md   — Human-readable dashboard`);
console.log('');
console.log('Data sources:');
for (const [name, info] of Object.entries(config.sources)) {
  console.log(`  ${name}: ${info.found ? info.path : 'NOT FOUND'}`);
}
console.log('');
console.log('Summary:');
console.log(`  Customer Ready:  ${stats.byReadiness['customer-ready']}`);
console.log(`  Near Ready:      ${stats.byReadiness['near-ready']}`);
console.log(`  Needs Work:      ${stats.byReadiness['needs-work']}`);
console.log(`  Untested:        ${stats.byReadiness.untested}`);
console.log(`  Not Imported:    ${stats.byReadiness['not-imported']}`);

// Delta report
if (previousTracker?.stats) {
  const prev = previousTracker.stats;
  const changes = [];
  for (const key of ['customer-ready', 'near-ready', 'needs-work', 'untested', 'not-imported']) {
    const diff = (stats.byReadiness[key] || 0) - (prev.byReadiness?.[key] || 0);
    if (diff !== 0) changes.push(`  ${key}: ${diff > 0 ? '+' : ''}${diff}`);
  }
  if (changes.length > 0) {
    console.log('');
    console.log(`Delta (vs ${previousTracker.generated?.split('T')[0] || 'previous'}):`);
    changes.forEach((c) => console.log(c));
  }
}
