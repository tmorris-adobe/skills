---
name: excat-page-visual-compare
description: Compares an original page (URL or path) with a new/migrated version at multiple viewports. Determines if the new version is visually identical; if not, lists differences and recommends CSS/layout changes so the new version matches the original at all desktop and mobile resolutions. Use when the user says "compare original and new page", "check if page is identical", "page comparison", "visual diff", "what's different between original and migrated", "make new page match original", or "validate page at all resolutions".
---

# Page Visual Compare (Original vs New)

Compare an **original** page with a **new** (e.g. migrated) page at multiple viewports. Answer: (1) Is the new version visually identical? (2) If not, what are the differences? (3) What recommended changes will make the new version match the original in styling and alignment at all resolutions?

## When to Use

- User wants to verify a migrated/new page matches the original.
- User asks what differs between two versions of a page.
- User wants recommendations to make the new page visually identical at desktop and mobile.
- Validation after migration or redesign.

**Do NOT use for:** Single-component or header-only comparison (use nav-component-critique or navigation orchestrator). This skill is full-page comparison.

---

## Inputs

| Field | Required | Description |
|-------|----------|-------------|
| `originalUrl` or `originalPath` | Yes (one of) | Original page: full URL (e.g. `https://example.com/page`) or local path (e.g. `content/page.md` → preview at `http://localhost:3000/page.html`). |
| `newUrl` or `newPath` | Yes (one of) | New/migrated page: full URL or local path. If path, resolve to preview URL (e.g. `http://localhost:3000/page.html`). |
| `viewports` | No | Override default viewports; see [comparison-format.md](comparison-format.md). |

**Rule:** Original and new must be comparable in meaning — same page type or same URL path. Do not compare unrelated pages.

---

## Viewports (Default)

Compare at **multiple resolutions** so styling and alignment are validated for desktop and mobile.

| Label | Width × Height | Use |
|-------|----------------|-----|
| desktop-lg | 1440 × 900 | Primary desktop |
| desktop-md | 1280 × 800 | Medium desktop |
| desktop-sm | 1024 × 768 | Small desktop / large tablet |
| tablet | 768 × 1024 | Tablet |
| mobile-lg | 428 × 926 | Large mobile |
| mobile | 390 × 844 | Standard mobile |
| mobile-sm | 375 × 812 | Small mobile |

If the project has breakpoints in `migration-work/breakpoints.json`, prefer viewport widths that align with those breakpoints. See [comparison-format.md](comparison-format.md) for the full viewport list and optional overrides.

---

## Workflow

### Step 1: Resolve URLs

- If `originalPath` or `newPath` is given (e.g. `content/blog/article.md`), the preview URL is `http://localhost:3000/{path}.html` (path without `.md`/`.html`).
- Ensure the dev server is running for local paths.
- Dismiss overlays (cookie banners, modals) on both pages before capture so layout is comparable.

### Step 2: Capture Screenshots (Per Viewport)

For **each** viewport in the list:

1. Set viewport to the defined width × height.
2. Navigate to the **original** page; wait for load and any critical layout; capture full-page screenshot (or above-the-fold + key sections if full-page is too large).
3. Navigate to the **new** page; same wait; capture same scope.
4. Save as:
   - `comparison-work/page-visual-compare/{runId}/original_{viewport}.png`
   - `comparison-work/page-visual-compare/{runId}/new_{viewport}.png`

Use a consistent `runId` (e.g. timestamp or slug). Create `comparison-work/page-visual-compare/` if it doesn’t exist.

**Tools:** Browser MCP (cursor-ide-browser) or Playwright for viewport + screenshot. Prefer short waits and snapshots to detect when the page is ready.

### Step 3: Compare and Document Differences

For each viewport, compare `original_{viewport}.png` and `new_{viewport}.png`:

- **Identical:** No visible difference in layout, typography, colors, spacing, alignment, or assets.
- **Not identical:** List every visible difference in a structured way.

**Compare:**

| Category | What to check |
|----------|----------------|
| Layout | Columns, stacking, flex/grid alignment, order of sections |
| Typography | Font family, size, weight, line-height, letter-spacing |
| Colors | Background, text, borders, links, buttons |
| Spacing | Padding, margin, gap between sections and elements |
| Sizing | Widths, heights, max-widths, aspect ratios |
| Assets | Images, icons, SVGs — presence, size, position |
| Borders & shadows | Border width/radius/color; box-shadow |
| Responsive behavior | Breakpoints: does the new page switch layout at the same widths as the original? |

Score **similarity per viewport** (0–100%): 100% = visually identical; lower = more differences. Use the same severity idea as nav-component-critique (e.g. color off = higher impact than 2px spacing).

### Step 4: Write Comparison Report

Write `comparison-work/page-visual-compare/{runId}/comparison-report.json` using the schema in [comparison-format.md](comparison-format.md). Include:

- `identical`: `true` only if every viewport is 100% similar and there are no differences.
- `summary`: Short human-readable summary (one or two sentences).
- `viewports`: For each viewport: `similarity` (0–100), `identical` (boolean), `differences[]` (list of { area, property, original, new, severity }).
- `recommendedChanges`: Global and viewport-specific CSS/layout changes so the new page matches the original at all resolutions.

### Step 5: Recommended Changes (When Not Identical)

Recommendations must be **actionable** and **viewport-aware**:

1. **Global fixes** — CSS that applies at all sizes (e.g. font family, base colors, base spacing).
2. **Desktop-only / Mobile-only** — Use `@media (min-width: …px)` or `@media (max-width: …px)` so fixes apply at the right breakpoints. Align breakpoints with the original site (or project `breakpoints.json` if available).
3. **Per-viewport notes** — If a difference appears only at e.g. 768px, say “At tablet (768px): …” and give the media query and rule.
4. **Selectors** — Prefer selectors that exist in the new/migrated page (inspect DOM or block CSS). Suggest block-level CSS (e.g. `blocks/{block}/{block}.css`) or `styles/styles.css` as appropriate.
5. **Layout** — If the difference is flex/grid or stacking, recommend specific `display`, `flex-direction`, `gap`, `grid-template-*`, or container queries.

Output format for recommendations: short title, CSS snippet (or exact property/value), target file, and optional media query. See [comparison-format.md](comparison-format.md) for the exact structure.

---

## Output Artifacts

| Artifact | Location | Description |
|----------|----------|-------------|
| Screenshots (original) | `comparison-work/page-visual-compare/{runId}/original_{viewport}.png` | Original page at each viewport |
| Screenshots (new) | `comparison-work/page-visual-compare/{runId}/new_{viewport}.png` | New page at each viewport |
| Report (JSON) | `comparison-work/page-visual-compare/{runId}/comparison-report.json` | Full report: identical, viewports, differences, recommendedChanges |
| Summary (optional) | `comparison-work/page-visual-compare/{runId}/comparison-summary.md` | Human-readable summary and checklist |

---

## Identical vs Not Identical

- **Identical:** `identical: true` in the report; all viewports 100% similarity; `differences` empty for every viewport; `recommendedChanges` can be empty or minimal (e.g. “No changes needed”).
- **Not identical:** `identical: false`; at least one viewport has similarity < 100% or non-empty `differences`; `recommendedChanges` must list concrete CSS/layout changes so that after applying them, the new version can be re-run and ideally reach identical.

---

## Rules

- **Evidence required.** Do not report “identical” or “no differences” without having captured and compared real screenshots at each viewport.
- **All default viewports.** Unless the user specifies fewer viewports, run desktop-lg, desktop-md, desktop-sm, tablet, mobile-lg, mobile, mobile-sm (or the project’s viewport set from comparison-format.md).
- **Recommendations are actionable.** Every item in `recommendedChanges` should be implementable (selector, property, value, and media query if needed).
- **Consistent runId.** All screenshots and the report for one run use the same `runId` directory.

---

## Example

**User says:** “Compare the original blog page https://example.com/blog/post with the new one at content/blog/post.md and tell me if they’re identical; if not, what to fix.”

**Actions:** (1) Resolve new path to `http://localhost:3000/blog/post.html`. (2) For each viewport (desktop-lg, desktop-md, desktop-sm, tablet, mobile-lg, mobile, mobile-sm), capture original and new screenshots into `comparison-work/page-visual-compare/2026-03-09-blog-post/`. (3) Compare each pair; at 768px the new page uses a different gap between cards. (4) Write `comparison-report.json` with `identical: false`, viewport 768px having one difference (gap: 16px vs 24px), and a recommended change: “In `blocks/cards/cards.css`, at `@media (min-width: 768px)` set `.cards-grid { gap: 24px; }`.” (5) Optionally write `comparison-summary.md` with a short summary and a “Apply these changes then re-run compare” checklist.

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| Local new page not loading | Confirm dev server is running and path resolves to `http://localhost:3000/…/page.html`. |
| Original URL unreachable | Use a snapshot or archived URL if available; otherwise report “Original not accessible” and skip. |
| Full-page screenshot too large | Capture above-the-fold plus 1–2 scrolls, or key sections; document scope in the report. |
| Differences only at one breakpoint | Still list them; recommendations must include the matching media query for that breakpoint. |

---

## See Also

- [comparison-format.md](comparison-format.md) — Report JSON schema, viewport list, and recommended-changes format.
- Nav-component critique (per-component, header-only); Navigation Orchestrator (full header migration and validation).
