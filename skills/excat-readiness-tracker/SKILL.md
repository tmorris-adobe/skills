---
name: excat-readiness-tracker
description: Generate and query migration readiness status for an AEM EDS project. Reads from url-catalog.json, regression-report.md, and content directory to produce a dual-format readiness dashboard (JSON + Markdown). Re-runnable after each regression test cycle. Invoke when user says "readiness tracker", "readiness status", "migration readiness", "how many pages are ready", "generate readiness report", "refresh readiness", "page status", "template status", "what needs work", "which templates are ready", "readiness dashboard", "update tracker", "customer QA", "ready for QA", "ready for customer", "pixel perfect", "pixel-for-pixel", "handoff to customer", or asks about migration progress.
---

# EXECUTION MINDSET

**You are a STATUS ANALYST. Your job is to generate accurate, data-driven readiness assessments from migration data sources and present them in scannable format.**

- DO: Read all three data sources (URL catalog, regression scores, content directory)
- DO: Handle missing data sources gracefully (note what's missing, proceed with what exists)
- DO: Generate both JSON and Markdown outputs every time
- DO: Provide concrete next-step recommendations sorted by impact
- DO: Treat "customer-ready" as **visually as close to pixel-for-pixel as possible** — the similarity score is the measurable proxy for that
- DON'T: Fabricate scores or page counts — only report what the data shows
- DON'T: Hardcode project-specific values (site name, URLs) — read from config or data
- DON'T: Modify source data files (url-catalog.json, regression-report.md, content/)

**Your output should let someone answer "how ready is this migration?" in under 10 seconds.**

---

# Readiness Tracker Skill

## Definition of Ready

**A page is "ready for customer QA" when it appears to the human eye as close to pixel-for-pixel to the source as possible.** This skill does not perform the visual comparison itself; it consumes a **regression report** whose similarity scores are produced by screenshot diff (e.g. Playwright + pixelmatch). Those scores are the measurable proxy for visual fidelity.

- **customer-ready** — The template’s tested page(s) meet the configured similarity threshold (default 80%). For **pixel-for-pixel / customer handoff**, set `thresholds.customerReady` to **95** (or higher) in `readiness-config.json`; many EDS projects use 95% as the bar for "ready to send to customer."
- **near-ready** / **needs-work** — Below that bar; useful for prioritization and progress tracking.
- **untested** / **not-imported** — No regression data or no content yet; not ready for customer QA.

When advising users, emphasize that raising the threshold (e.g. to 95%) aligns the tracker with a strict "pixel-for-pixel" bar for customer QA.

## Scope

This skill generates and queries a page-level readiness assessment for AEM EDS migration projects. It produces:

- **readiness-tracker.json** — Machine-readable (LLM-friendly) structured data
- **readiness-tracker.md** — Human-readable dashboard with progress bars and tables

## Purpose

Track migration readiness across all pages in an EDS project. Useful for:

- **Progress reporting** — "How many pages are customer-ready?"
- **Prioritization** — "Which template fix has the highest ROI?"
- **Launch planning** — "What's blocking us from going live?"
- **Cross-skill integration** — Status checkup includes readiness summary

## Rules

1. **Data sources are read-only.** Never modify url-catalog.json, regression-report.md, or content files. Only write to readiness-tracker.json and readiness-tracker.md.

2. **Overwrite, don't append.** Output files are regenerated each run. They are derived reports, not independent records.

3. **Handle missing sources gracefully.** If the regression report doesn't exist, mark all pages as "untested" and note it. If the content directory is empty, mark all as "not-imported". Only the URL catalog is required.

4. **Template-level readiness.** Readiness is determined per-template (one representative page tested via regression). All pages sharing a template inherit its score. Note this methodology in the output.

5. **No fabrication.** Only report scores and counts from actual data sources. Do not estimate or interpolate.

6. **Configurable paths.** Never hardcode project-specific paths. Use the resolution order: CLI args → config file → env vars → auto-discovery.

## Data Sources

| Source | Purpose | Required? |
|--------|---------|-----------|
| URL catalog | All URLs, templates, batches | Yes |
| Regression report | Desktop/mobile similarity scores per template | No (pages marked "untested") |
| Content directory | Which pages have been imported | No (pages marked "not-imported") |

## Configuration

### Path Resolution Order

The generator resolves data source paths in this order (first match wins):

1. **CLI arguments** — `--url-catalog path`, `--regression-report path`, `--content-dir path`, `--output-dir path`
2. **Config file** — `readiness-config.json` at workspace root
3. **Environment variables** — `READINESS_URL_CATALOG`, `READINESS_REGRESSION_REPORT`, `READINESS_CONTENT_DIR`, `READINESS_OUTPUT_DIR`
4. **Auto-discovery** — Tries common paths (see below)

### Config File (`readiness-config.json`)

Optional. Place at workspace root:

```json
{
  "urlCatalog": "tools/importer/url-catalog.json",
  "regressionReport": "tests/style-regression/regression-report.md",
  "contentDir": "content",
  "outputDir": ".",
  "thresholds": {
    "customerReady": 95,
    "nearReady": 60
  }
}
```

- **customerReady: 95** — Recommended for "ready for customer QA" / pixel-for-pixel bar; use 80 for a looser minimum.
- **root** — Optional. If set, overrides workspace-root detection (path relative to config file). Useful when the script lives outside the main repo or in a monorepo.

All fields are optional. Missing fields fall through to env vars or auto-discovery.

### Auto-Discovery Paths

When no config is provided, the generator tries these locations:

| Source | Paths tried (in order) |
|--------|------------------------|
| URL catalog | `tools/importer/url-catalog.json`, `url-catalog.json`, `tools/url-catalog.json` |
| Regression report | `tests/style-regression/regression-report.md`, `regression-report.md`, `tests/regression-report.md` |
| Content directory | `content/`, `docs/`, `pages/` |

### Default Thresholds

| Status | Default Threshold |
|--------|-------------------|
| customer-ready | >=80% avg similarity (desktop + mobile) |
| near-ready | 60–79% |
| needs-work | <60% |
| untested | Imported but no regression data |
| not-imported | URL cataloged but no content file |

**Pixel-for-pixel / customer QA:** The default 80% is a conservative minimum. For "ready to send to customer" (visually as close to pixel-for-pixel as possible), set `thresholds.customerReady` to **95** in `readiness-config.json`. The regression similarity score is the proxy for visual fidelity; 95% aligns with typical EDS customer-handoff bars.

## Workflow

### Phase 1: Configure

Resolve all data source paths using the resolution order above. Validate:

- URL catalog must exist (exit with error if not found)
- Report which sources were found and which are missing
- Load thresholds from config or use defaults

### Phase 2: Generate

Run the generator script to produce both output files:

```bash
node .claude/skills/excat-readiness-tracker/generate-tracker.js
```

Or with overrides:

```bash
node .claude/skills/excat-readiness-tracker/generate-tracker.js \
  --url-catalog tools/importer/url-catalog.json \
  --regression-report tests/style-regression/regression-report.md \
  --content-dir content
```

**When to run Phase 2:**
- First-time setup ("generate readiness tracker")
- After regression tests are updated ("refresh readiness")
- After importing new pages ("update tracker")
- After CSS fixes ("what changed?")

### Phase 3: Query

Read existing `readiness-tracker.json` and answer questions without regenerating:

- "How many pages are ready?" → Read `stats.byReadiness`
- "Which templates need work?" → Filter `templates` by `templateReadiness`
- "What's the highest-impact fix?" → Sort `templates` by gap-to-ready × page count
- "Show me the blog-article status" → Filter `pages` by template

**When to use Phase 3:**
- Quick status questions
- Cross-skill integration (status-checkup reads JSON)

### Phase 4: Refresh with Delta

When refreshing after CSS fixes or new regression runs:

1. Read existing `readiness-tracker.json` (the "before" snapshot)
2. Run the generator (produces new files)
3. Compare before/after stats
4. Report the delta:
   - Templates that changed status (e.g., "blog-article: near-ready → customer-ready")
   - Pages moved between readiness categories
   - Overall progress change

## Portability

This skill is **project-agnostic**. No project-specific URLs, site names, or paths are hardcoded; all are read from the URL catalog, config, or auto-discovery.

To use this skill in a new project:

1. **Copy** the entire `excat-readiness-tracker` skill directory (e.g. into `.claude/skills/` or the new project’s equivalent).
2. **Ensure** a URL catalog exists in the expected format (see URL Catalog Format below). Common locations: `tools/importer/url-catalog.json`, `url-catalog.json`, or set via config.
3. **Optionally** create `readiness-config.json` at **workspace root** with project-specific paths and thresholds. All config fields are optional; missing values fall back to env vars or auto-discovery.
4. **Run** the generator from the project root (or set `outputDir` in config):  
   `node .claude/skills/excat-readiness-tracker/generate-tracker.js`
5. **Outputs** are written to the configured `outputDir` (default: workspace root): `readiness-tracker.json` and `readiness-tracker.md`.

**Workspace root** is resolved by the generator as: the first directory (walking up from the script) that contains `package.json`. To override, set `root` in `readiness-config.json` (relative to config file location) or run the script from the desired project root so that auto-discovery paths are correct.

**Dependencies:** None. The generator uses only Node.js built-ins (`fs`, `path`, `child_process`, `url`).

### URL Catalog Format

The skill expects a URL catalog JSON with this structure:

```json
{
  "source": "https://www.example.com/",
  "batches": {
    "batch-name": {
      "template": "template-name",
      "urls": ["https://www.example.com/page1/", "..."]
    }
  },
  "alreadyMigrated": ["https://www.example.com/page1/"]
}
```

### Regression Report Format

The skill parses Markdown tables under `## Desktop` and `## Mobile` headings:

```markdown
## Desktop (1440px)

| Template | Page | Similarity | Status |
|----------|------|------------|--------|
| blog-article | blog_page-slug | 70.54% | WARN |
```

## Integration with Status Checkup

The `excat-daily-status-checkup` skill can include readiness data in its briefing by reading `readiness-tracker.json`. When the file exists, the briefing includes:

```markdown
## Migration readiness
- [X]/[Y] pages customer-ready ([Z]% of catalog)
- Templates: [N] ready, [M] near-ready, [K] need work
- Top priority: [template] at [X]% avg ([N] pages, need +[Y]pp)
```

When the file does not exist, the section is skipped.

## Output Files

See [readiness-tracker-format.md](readiness-tracker-format.md) for the complete schema reference.

### Quick Reference

**readiness-tracker.json** fields:
- `$schema`, `generated`, `source` — Metadata
- `thresholds` — Status definitions
- `stats` — Aggregate counts (total, imported, by readiness, by template status)
- `templates[]` — Per-template summary with regression scores
- `pages[]` — Per-page entry (url, edsPath, template, batch, imported, migrationMethod, readiness)

**readiness-tracker.md** sections:
- Readiness Thresholds table
- Overall Summary (ASCII block)
- Template Dashboard (sortable table)
- Template Details (with progress bars)
- Pages by Readiness (grouped tables)
- Methodology note
- Recommended Next Steps (data-driven priority)

## Troubleshooting

**URL catalog not found:**
- Check paths in `readiness-config.json` or create one
- Run with `--url-catalog path/to/file.json` to override
- Auto-discovery tries: `tools/importer/url-catalog.json`, `url-catalog.json`, `tools/url-catalog.json`

**All pages show "untested":**
- The regression report was not found. Run regression tests first, then refresh the tracker.

**All pages show "not-imported":**
- The content directory was not found or is empty. Import content first, then refresh.

**Scores seem wrong:**
- Scores come from the regression report, not this skill. Re-run regression tests to update scores.

**Want pixel-for-pixel / customer QA bar:**
- Set `thresholds.customerReady` to **95** (or higher) in `readiness-config.json`, then regenerate. The tracker will mark only templates at ≥95% avg similarity as customer-ready.

**Script won't run (ES module error):**
- The script uses ES module syntax. Run with `node --input-type=module` or ensure `package.json` has `"type": "module"`, or rename to `.mjs`.

---

*Readiness Tracker Skill v1.0*
