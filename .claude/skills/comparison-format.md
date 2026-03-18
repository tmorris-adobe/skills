# Page Visual Compare — Report Format and Viewports

Reference for the **excat-page-visual-compare** skill: report schema, default viewports, and recommended-changes structure.

---

## Default Viewports

| Id | Label | Width | Height | Class |
|----|--------|-------|--------|--------|
| desktop-lg | Desktop (large) | 1440 | 900 | desktop |
| desktop-md | Desktop (medium) | 1280 | 800 | desktop |
| desktop-sm | Desktop (small) | 1024 | 768 | desktop |
| tablet | Tablet | 768 | 1024 | tablet |
| mobile-lg | Mobile (large) | 428 | 926 | mobile |
| mobile | Mobile | 390 | 844 | mobile |
| mobile-sm | Mobile (small) | 375 | 812 | mobile |

To override: pass a `viewports` array of `{ id, label, width, height }` (and optionally `class`: `desktop` | `tablet` | `mobile`). The skill uses these for screenshot filenames and report keys.

---

## comparison-report.json Schema

```json
{
  "runId": "2026-03-09-blog-post",
  "originalUrl": "https://example.com/blog/post",
  "newUrl": "http://localhost:3000/blog/post.html",
  "identical": false,
  "summary": "New page matches original at desktop and mobile except at tablet (768px) where card gap is 16px instead of 24px.",
  "capturedAt": "2026-03-09T12:00:00Z",
  "viewports": {
    "desktop-lg": {
      "similarity": 100,
      "identical": true,
      "differences": []
    },
    "desktop-md": {
      "similarity": 100,
      "identical": true,
      "differences": []
    },
    "desktop-sm": {
      "similarity": 100,
      "identical": true,
      "differences": []
    },
    "tablet": {
      "similarity": 92,
      "identical": false,
      "differences": [
        {
          "area": "Cards grid",
          "property": "gap",
          "original": "24px",
          "new": "16px",
          "severity": "medium"
        }
      ]
    },
    "mobile-lg": {
      "similarity": 100,
      "identical": true,
      "differences": []
    },
    "mobile": {
      "similarity": 100,
      "identical": true,
      "differences": []
    },
    "mobile-sm": {
      "similarity": 100,
      "identical": true,
      "differences": []
    }
  },
  "recommendedChanges": [
    {
      "title": "Card grid gap at tablet",
      "targetFile": "blocks/cards/cards.css",
      "mediaQuery": "@media (min-width: 768px) and (max-width: 1023px)",
      "css": ".cards-grid { gap: 24px; }",
      "viewportScope": "tablet",
      "reason": "Match original 24px gap at tablet breakpoint."
    }
  ]
}
```

### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `runId` | string | Unique run identifier; matches directory name. |
| `originalUrl` | string | Resolved URL of the original page. |
| `newUrl` | string | Resolved URL of the new/migrated page. |
| `identical` | boolean | `true` only when every viewport has no differences (100% similarity). |
| `summary` | string | Short human-readable summary. |
| `capturedAt` | string | ISO 8601 timestamp of the run. |
| `viewports` | object | Keys = viewport ids; values = viewport result. |
| `viewports[id].similarity` | number | 0–100. |
| `viewports[id].identical` | boolean | `true` when similarity is 100 and differences length is 0. |
| `viewports[id].differences` | array | List of difference objects. |
| `recommendedChanges` | array | List of recommended change objects. |

### Difference Object

| Field | Type | Description |
|-------|------|-------------|
| `area` | string | Section or component (e.g. "Hero", "Cards grid", "Header"). |
| `property` | string | Visual property (e.g. "gap", "font-size", "background-color"). |
| `original` | string | Value or description on original. |
| `new` | string | Value or description on new. |
| `severity` | string | `low` \| `medium` \| `high`. |

### Recommended Change Object

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Short label. |
| `targetFile` | string | Path to CSS (or layout) file, e.g. `blocks/cards/cards.css` or `styles/styles.css`. |
| `mediaQuery` | string | Optional. Full media query if viewport-specific (e.g. `@media (max-width: 767px)`). |
| `css` | string | One or more rules (selector + braces). |
| `viewportScope` | string | Optional. Viewport id or "all". |
| `reason` | string | Optional. Why this change is needed. |

---

## Severity Guidelines

| Severity | Examples |
|----------|----------|
| low | Slight spacing (< 4px), minor shade difference. |
| medium | Clear spacing/mismatch, font-size off by a few px, border-radius. |
| high | Wrong color, missing element, layout break, wrong breakpoint behavior. |

---

## Screenshot Naming

- Original: `original_{viewportId}.png` (e.g. `original_desktop-lg.png`).
- New: `new_{viewportId}.png` (e.g. `new_tablet.png`).

All files live under `comparison-work/page-visual-compare/{runId}/`.
