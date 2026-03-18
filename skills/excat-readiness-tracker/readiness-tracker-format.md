# Readiness Tracker — Output Format Reference

> Portable schema reference for the readiness tracker output files.
> See `SKILL.md` for full workflow and configuration.

---

## JSON Schema (`readiness-tracker.json`)

### Top-level fields

| Field | Type | Description |
|-------|------|-------------|
| `$schema` | string | Always `"readiness-tracker-schema"` |
| `generated` | string | ISO 8601 timestamp |
| `source` | string | Source site URL (from url-catalog `source` field) |
| `thresholds` | object | Status definitions with human-readable criteria |
| `dataSources` | object | Which data sources were found and their paths |
| `stats` | object | Aggregate counts |
| `templates` | array | Per-template summaries (sorted by readiness) |
| `pages` | array | Per-page entries |

### `stats` object

| Field | Type | Description |
|-------|------|-------------|
| `totalUrls` | number | Total URLs in catalog |
| `imported` | number | Pages with content files |
| `notImported` | number | URLs without content files |
| `manualMigration` | number | Pages in `alreadyMigrated` array |
| `bulkImport` | number | Imported pages not in `alreadyMigrated` |
| `byReadiness` | object | Counts per readiness status |
| `templateCount` | number | Number of distinct templates |
| `templatesReady` | number | Templates at customer-ready |
| `templatesNearReady` | number | Templates at near-ready |
| `templatesNeedWork` | number | Templates at needs-work |
| `templatesUntested` | number | Templates with no regression data |

### `templates[]` entry

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Template name (from url-catalog batch) |
| `totalPages` | number | Total URLs using this template |
| `imported` | number | Pages with content files |
| `manualMigration` | number | Manually migrated pages |
| `bulkImport` | number | Bulk-imported pages |
| `regressionTested` | boolean | Whether regression scores exist |
| `desktop` | object/null | `{ page, similarity, status }` |
| `mobile` | object/null | `{ page, similarity, status }` |
| `templateReadiness` | string | Readiness status for this template |

### `pages[]` entry

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Source URL |
| `edsPath` | string | EDS content path (e.g., `/blog/page-slug`) |
| `template` | string | Template name |
| `batch` | string | Batch name from url-catalog |
| `imported` | boolean | Whether content file exists |
| `migrationMethod` | string | `"manual"`, `"bulk"`, or `"none"` |
| `readiness` | string | Readiness status |

### Readiness status values

Readiness is a **proxy for visual fidelity**: "customer-ready" means the page is considered ready for customer QA — i.e. it should appear to the human eye as close to **pixel-for-pixel** to the source as possible. The similarity score comes from screenshot diff (e.g. Playwright + pixelmatch) and is the measurable input; the threshold is configurable.

| Value | Meaning |
|-------|---------|
| `customer-ready` | Template avg similarity >= customerReady threshold (default 80%; use 95 for pixel-for-pixel / customer QA bar) |
| `near-ready` | Template avg similarity >= nearReady threshold (default 60%) |
| `needs-work` | Template avg similarity < nearReady threshold |
| `untested` | Imported but template has no regression data |
| `not-imported` | URL cataloged but no content file exists |

---

## Markdown Format (`readiness-tracker.md`)

### Sections (in order)

1. **Header** — Title, generated date, source site, total/imported/not-imported counts
2. **Readiness Thresholds** — Table defining status criteria
3. **Overall Summary** — ASCII block with counts per readiness status
4. **Template Dashboard** — Table with pages, imported, desktop%, mobile%, avg%, status
5. **Template Details** — Per-template block with progress bars (`█░`), tested page, migration breakdown
6. **Pages by Readiness** — Grouped tables (>20 pages: template summary; <=20: individual list)
7. **Methodology** — Note about template-level testing approach and caveats
8. **Recommended Next Steps** — Data-driven priority list sorted by gap-to-ready

### Progress bar format

```
70.5% ██████████████░░░░░░   (14 filled, 6 empty — each █ = 5%)
```

---

## Example JSON (minimal)

```json
{
  "$schema": "readiness-tracker-schema",
  "generated": "2026-03-09T15:24:27.300Z",
  "source": "https://www.example.com/",
  "thresholds": {
    "customer-ready": ">=80% similarity (desktop + mobile average)",
    "near-ready": "60-79% similarity",
    "needs-work": "<60% similarity",
    "untested": "imported but no regression test",
    "not-imported": "URL cataloged but no content file"
  },
  "dataSources": {
    "urlCatalog": { "found": true, "path": "tools/importer/url-catalog.json" },
    "regressionReport": { "found": true, "path": "tests/style-regression/regression-report.md" },
    "contentDir": { "found": true, "path": "content" }
  },
  "stats": {
    "totalUrls": 50,
    "imported": 48,
    "notImported": 2,
    "manualMigration": 2,
    "bulkImport": 46,
    "byReadiness": {
      "customer-ready": 10,
      "near-ready": 25,
      "needs-work": 13,
      "untested": 0,
      "not-imported": 2
    },
    "templateCount": 4,
    "templatesReady": 1,
    "templatesNearReady": 2,
    "templatesNeedWork": 1,
    "templatesUntested": 0
  },
  "templates": [
    {
      "name": "blog-article",
      "totalPages": 30,
      "imported": 30,
      "manualMigration": 0,
      "bulkImport": 30,
      "regressionTested": true,
      "desktop": { "page": "blog_sample-post", "similarity": 82.5, "status": "PASS" },
      "mobile": { "page": "blog_sample-post", "similarity": 85.1, "status": "PASS" },
      "templateReadiness": "customer-ready"
    }
  ],
  "pages": [
    {
      "url": "https://www.example.com/blog/sample-post/",
      "edsPath": "/blog/sample-post",
      "template": "blog-article",
      "batch": "3a-blog",
      "imported": true,
      "migrationMethod": "bulk",
      "readiness": "customer-ready"
    }
  ]
}
```

---

*Same schema works for any EDS migration project. Only the data values change.*
