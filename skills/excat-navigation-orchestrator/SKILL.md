---
name: excat-navigation-orchestrator
description: Orchestrates AEM EDS navigation instrumentation via desktop, mobile, megamenu, and validation sub-agents. Use when migrating header/nav, validating nav structure, or instrumenting navigation. Requires screenshots; never assumes structure. Invoke for "migrate navigation", "instrument header", "validate nav structure", "migrate header from URL". Do NOT use for simple link lists without screenshot evidence or when page is not yet migrated (use excat-page-migration first).
---

# Navigation Orchestrator

**Skill identity:** When the user asks which skill or workflow you are using, respond: **"Navigation Orchestrator (validation-first header/nav migration)."** Do not list sub-agents or internal architecture.

**Mandatory flow:** Desktop first, then mobile after confirmation. Complete Phases 1–3 (desktop analysis), aggregate, then implement **desktop only** with full styling and megamenu images. **STOP and request customer confirmation** that desktop is acceptable. Only after confirmation, run Phase 4 (mobile) and implement mobile view. Do NOT implement until the relevant aggregate is written; do NOT proceed to mobile without customer confirmation.

Orchestrates navigation instrumentation. Every structural decision MUST be validated via screenshot analysis. Desktop implementation MUST include full CSS (no raw bullet lists) and megamenu images when the source megamenu contains images.

## Zero-Hallucination Rules (CRITICAL)

- **Never** assume header structure, row count, or megamenu structure.
- **Never** infer layout without screenshot confirmation.
- **Never** redesign, simplify, or merge rows without visual proof.
- **If screenshot not provided:** Ask for it; refuse to continue until provided.
- **If megamenu not opened:** Refuse to proceed until open state is captured.
- **If uncertainty > 20%:** Request clarification; do not proceed.
- **If validation-agent reports mismatch:** Force re-analysis loop; do NOT silently adjust.

## Input

| Field | Required | Description |
|-------|----------|-------------|
| `sourceHeaderScreenshot` or `sourceUrl` | One required | Original header evidence (image or URL to capture). |
| `migratedPath` | Yes | Path to migrated page (e.g. `/` or `/page`) for localhost:3000. |
| `viewportDesktop` | No | Default 1920x1080. |
| `viewportMobile` | No | Default 375x812. |

## Prerequisites

- Migrated site available at `http://localhost:3000{migratedPath}.html` (or create migratedPath as needed).
- Browser/Playwright (or equivalent) for screenshots when `sourceUrl` is given.
- For validation phase: Playwright MCP available for per-component screenshot capture and visual comparison (inline critique — see step 6).

## Validation artifacts (required location)

**Base path:** `blocks/header/navigation-validation/` — create if it doesn't exist.

Full artifact table, file existence checklist, and rules: **`.claude/skills/excat-navigation-orchestrator/references/validation-artifacts.md`**

**Key rules:** Write each file immediately after producing that phase's JSON. Do not proceed to the next phase until written. Paths are relative to workspace root. If a phase is skipped, still write schema-shaped JSON with zero/empty values.

## Execution Flow: Desktop First, Then Mobile After Confirmation

**Step gating:** Do not move to the next phase until the current phase JSON is produced and written. Do not implement until the desktop aggregate is written. Do not run Phase 4 or mobile implementation until the customer has confirmed desktop is acceptable.

**User communication (MANDATORY — announce EVERY step):** The user must ALWAYS know which step you are currently executing. At the START of each step, output a clear status banner to the user in this exact format:

```
━━━ [DESKTOP] Step 1/14: Header Row Detection ━━━
```
```
━━━ [MOBILE] Step 9/14: Implement Mobile — hamburger animation + accordion ━━━
```
```
━━━ [CRITIQUE] Step 13/14: Combined Visual Critique — component 3/42 (megamenu-trigger-0-featured, desktop) ━━━
```

Use `[DESKTOP]` for steps 1–7, `[MOBILE]` for steps 8–12, and `[CRITIQUE]` for steps 13–14. Include the step number out of 14, the step name, and any relevant detail. When a step COMPLETES, output the result:

```
✅ [DESKTOP] Step 5 COMPLETE: Megamenu behavior register — allValidated: true (12/12 items passed)
```
```
🚫 [DESKTOP] Step 6 BLOCKED: Structural similarity 87% (< 95%) — 2 mismatches. Fixing...
```

**Step numbering reference:**
| # | Phase | Step Name |
|---|-------|-----------|
| 1 | DESKTOP | Header Row Detection |
| 2 | DESKTOP | Row Element Mapping (+ hamburger icon) |
| 3 | DESKTOP | Megamenu Analysis (+ overlay + deep mapping) |
| 4 | DESKTOP | Aggregate + Implementation (nav.md, CSS, JS, images) |
| 5 | DESKTOP | Megamenu Behavior Validation (FIRST) |
| 6 | DESKTOP | Structural Schema Validation (SECOND) |
| 7 | DESKTOP | Pre-Confirmation Gate → Customer Confirmation |
| 8 | MOBILE | Mobile Behavior Analysis (hamburger animation, accordion/slide-in-panel, overlay, ALL heading options) |
| 9 | MOBILE | Mobile Implementation (CSS/JS breakpoints, hamburger → cross, accordion or slide-in-panel) |
| 10 | MOBILE | Mobile Structural Validation |
| 11 | MOBILE | Mobile Heading Coverage Validation (ALL nav headings tested — click + expand each one) |
| 12 | MOBILE | Mobile Behavior Register (tap/click/animation per component — same as desktop megamenu-behavior-register) |
| 13 | CRITIQUE | Combined Visual Critique — desktop (1920×1080) + mobile (375×812) components in single pass |
| 14 | CRITIQUE | Final Pre-Confirmation Gate + Report to Customer |

When fixing remediation (e.g. critique loop, structural fix cycle), output:
```
🔄 [CRITIQUE] Step 12: Remediation cycle 2 for row-0-cta (desktop) — applying CSS fixes from critique report...
```

**Debug logging (MANDATORY at every step):** The debug log at `blocks/header/navigation-validation/debug.log` is the ONLY way to verify what happened during a run. The hook auto-logs file writes and a workflow progress dashboard (with separate DESKTOP/MOBILE sections). The validation scripts auto-log their invocations. But the LLM must ALSO verify the log by checking it at key milestones. After each of these steps, read the last 20 lines of `debug.log` to confirm the step was logged:
- After writing each phase JSON (1, 2, 3, aggregate)
- After running `validate-nav-content.js` — confirm `[SCRIPT:validate-nav-content]` entry appears
- After running `compare-megamenu-behavior.js` — confirm `[SCRIPT:compare-megamenu-behavior]` entry appears
- After running `compare-structural-schema.js` — confirm `[SCRIPT:compare-structural-schema]` entry appears
- After invoking `nav-component-critique` for each component — confirm critique folder and report exist
- Before requesting customer confirmation — review the full WORKFLOW PROGRESS DASHBOARD in the log

If a script log entry is MISSING, the script was not actually executed. Go back and run it.

### Phase 1: Header Row Detection (Checkpoint 1)

1. Obtain a **desktop** header screenshot. If user gave only a URL (e.g. https://www.example.com), navigate to it, dismiss overlays (e.g. cookie banner) if needed, then capture the header region at desktop viewport (e.g. 1920×1080).
2. **You must produce** the following JSON from the screenshot (row detection only — do not map content yet):
   - `rowCount` (integer): number of distinct horizontal rows in the header.
   - `confidence` (0–1), `uncertainty` (boolean), `notes` (array of strings).
3. **Gate:** Output MUST conform to `.claude/skills/excat-navigation-orchestrator/references/desktop-navigation-agent-schema.json` (rowDetection shape). If you cannot determine row count from the screenshot, set `uncertainty: true` and STOP; ask for clarification. If `confidence < 0.8`, do not proceed without user confirmation.
4. If `rowCount > 3`: Switch to **Modular Navigation Mode** (each row as a separate module; validate per module later via page-critique).
5. **Write** the Phase 1 JSON to `blocks/header/navigation-validation/phase-1-row-detection.json`. Create `blocks/header/navigation-validation/` if needed. At run start, write `blocks/header/navigation-validation/session.json` with `sourceUrl`, `migratedPath`, `startedAt` (ISO timestamp). Do not proceed to Phase 2 until this file exists.

### Phase 2: Row Element Mapping (Checkpoint 2)

1. Using the **same** desktop header screenshot, **you must produce** row mapping JSON:
   - For each row: `index`, `alignmentGroups`, `spacing`, `backgroundDifference`, `elements`, **`hasImages`** (boolean: true if that row contains any images — logo, icons, megamenu thumbnails), **`hasHoverBehavior`** (boolean: true if any element in that row shows behavior on hover, e.g. dropdown or highlight), **`hasClickBehavior`** (boolean: true if any element has click behavior, e.g. navigate or toggle).
   - **Hamburger/breadcrumb icon detection (REQUIRED — click AND hover):** Inspect the header for any hamburger icon (☰), breadcrumb icon, or toggle button. Record ALL of these fields:
     - `hasHamburgerIcon` (boolean): is the icon present?
     - `hamburgerIconSelector` (CSS/xpath): selector to target it
     - `hamburgerClickBehavior` (string): what happens on click — e.g. "opens mobile drawer", "toggles nav sections"
     - `hamburgerHoverEffect` (string | null): hover the icon — does it change color, show background highlight, scale up? Record the effect or `null` if no hover effect
     - `hamburgerAnimation` (object/string): e.g. "morphs to × cross with CSS transform", "no animation, icon swap", "rotates 90°". If the icon changes shape on click (hamburger → cross), document: animation type (`transform-based`, `svg-swap`, `class-toggle`), CSS transition properties, duration, easing
     - Test the icon in **desktop viewport too** — some headers show it at all breakpoints. The hook **BLOCKS** if `hasHamburgerIcon: true` but click/hover/animation fields are missing (Gate 11).
   - **Search bar / form detection (REQUIRED):** For each row, check for any search bar, search input, or `<form>` element used for site search. Record `hasSearchForm` (boolean: true/false). Look for `<input type="search">`, `<form>` with search action, a visible magnifying-glass icon paired with an input, or an expandable search icon that reveals an input on click. If `hasSearchForm: true`, also record `searchFormDetails`: `formType` (inline-input | expandable-icon | modal-overlay | dropdown-panel), `inputPlaceholder`, `hasSubmitButton`, `hasAutocomplete`, `position`. Search bars are common in headers — look carefully before setting false. The hook **BLOCKS** if `hasSearchForm` field is missing (Gate 11b).
   - **Locale / language selector detection (REQUIRED):** For each row, check for any locale, language, or region selector. Record `hasLocaleSelector` (boolean: true/false). Look for: globe icons (🌐), country flag icons (🇺🇸 🇩🇪), language name text ("English", "EN/DE"), region dropdowns, country grid overlays, or language toggle switches. Click the element to observe what opens (dropdown list, full overlay grid, tooltip bubble, etc.). If `hasLocaleSelector: true`, record `localeSelectorDetails`: `selectorType` (language-dropdown | country-grid | region-dropdown | language-toggle | flag-dropdown | globe-icon-dropdown | inline-links), `triggerElement`, `triggerBehavior` (click | hover | both), `hasFlags` (boolean: true if country flags are shown — these MUST be downloaded to `content/images/` and referenced in `nav.md`), `flagCount`, `dropdownLayout` (vertical-list | multi-column-grid | full-width-overlay | tooltip-bubble | inline-toggle), `entryCount`, `currentLocaleIndicator`, `position`, `closeBehavior`. The hook **BLOCKS** if `hasLocaleSelector` field is missing (Gate 11c).
   - **Hover and click check (required):** Test **hover** and **click** separately for every nav item. Do **not** assume that items that redirect (links) have no hover effect — many headers open a dropdown on hover even when the item is a link. Hover over each item to verify; then test click. Record both in the schema.
   - Top-level: `rows` (array), `confidence`, `uncertainty`, `notes`.
2. **Gate:** Output MUST conform to `.claude/skills/excat-navigation-orchestrator/references/desktop-navigation-agent-schema.json` (rowMapping shape). Every row must have `hasImages`, `hasHoverBehavior`, and `hasClickBehavior` set from evidence. Only derive from the screenshot and interaction tests; do not assume alignment or grouping. If ambiguous, set `uncertainty: true` and list issues in `notes`; STOP if uncertainty > 20%.
3. **Write** the Phase 2 JSON to `blocks/header/navigation-validation/phase-2-row-mapping.json`. Do not proceed to Phase 3 until this file exists.

### Phase 3: Megamenu Analysis (Checkpoints 3 and 4)

1. Obtain evidence of the **open** megamenu (screenshot or explicit interaction test). If the source has dropdowns/megamenus, you must open one and capture it; do not guess structure from closed state.
2. **You must produce** megamenu JSON: `triggerType`, `columnCount`, `hasImages`, **`hasHoverBehavior`** (true if megamenu or nav item shows any behavior on hover), **`hasClickBehavior`** (true if megamenu or nav item has click behavior), `hasBlockStructure`, `nestedLevels`, `animationType`, `hoverOutBehavior`, `clickOutBehavior`, `promotionalBlocks`, `gridStructure`, `confidence`, `uncertainty`, `notes`. When `columnCount > 0`, include **`columns`** array: each item `{ columnIndex, hasImages, optional label }`. **Hover and click check (required):** Test hover and click separately on every nav item that can open the megamenu; do not assume links have no hover — hover over each to verify dropdown/open behavior; then test click. Use `triggerType: "both"` if both hover and click open or affect the megamenu.
3. **Search form inside megamenu:** Check if the megamenu panel contains a search bar or search input (some megamenus include in-panel search for filtering items). Record `hasSearchForm` in the megamenu JSON. If true, note `searchFormDetails` with position and scope.
4. **Locale selector inside megamenu:** Check if the megamenu panel contains a locale/language/region picker (some megamenus embed a full country grid with flags or a region tab selector). Record `hasLocaleSelector`. If true, note `localeSelectorDetails` with selectorType, hasFlags, entryCount. If flags are present, download them.
5. **Overlay behavior (CRITICAL — must match source exactly):** When the megamenu opens, check: Does the source site show a background overlay/backdrop behind the panel? Record `overlayBehavior`: `{ "hasOverlay": true/false, "overlayType": "semi-transparent-black|blur|none", "overlayOpacity": "0.5", "overlayDismisses": true/false }`. The migrated site MUST replicate this exactly — if the source has NO overlay, the migrated must NOT add one. If the source has a semi-transparent backdrop, the migrated must match its opacity and color. Mismatched overlays are a common failure.
6. **Gate:** Output MUST conform to `.claude/skills/excat-navigation-orchestrator/references/megamenu-schema.json`. If megamenu exists and has columns, `columns` with per-column `hasImages` is required. If no megamenu exists, emit valid JSON with zero/empty values and `notes` explaining. No implementation until this JSON is produced and validated.
7. If `columnCount > 4` or `nestedLevels > 2`: Apply Modular Navigation Mode for later validation.
8. **Write** the Phase 3 JSON to `blocks/header/navigation-validation/phase-3-megamenu.json`. Do not proceed until this file exists.
9. **Deep megamenu mapping (REQUIRED when megamenu exists):** After writing phase-3, perform a **per-item deep analysis** of every dropdown/megamenu panel:
   - For EACH nav trigger that opens a panel: hover it, record what opens; click it, record what happens.
   - For EVERY item INSIDE each opened panel (links, image-cards, tabs, categories): hover it individually, record the effect (e.g. "hovering item thumbnail updates the featured area with a zoomed image and specs"); click it, record where it navigates.
   - If the panel has **category tabs** (e.g. TODOS, SUV, HATCHBACK): click each tab, record how it filters content.
   - If the panel has a **featured area** (e.g. large vehicle image on the left that changes on hover): document it, note what triggers updates.
   - If items have **nested interactions** (hover shows specs, click opens sub-panel): drill down until no further interaction is found.
   - **Write** `blocks/header/navigation-validation/megamenu-mapping.json` conforming to `.claude/skills/excat-navigation-orchestrator/references/megamenu-mapping-schema.json`. Every individual item must be recorded. `totalItemsAnalyzed` must reflect the actual count of items tested.
   - **Content destination: nav.md (CRITICAL):** All text content, link labels, category names, sub-menu items, promotional text, and link URLs discovered during deep megamenu mapping MUST be written into `content/nav.md` — NOT into `header.js`. The JS code reads this DOM content and presents it; it never generates it. Plan the nav.md structure to capture the full megamenu hierarchy (nested lists, section headings, link groups) so that header.js can traverse and render the panels faithfully.
   - **Gate:** If megamenu exists and `megamenu-mapping.json` is not written, do not proceed to implementation. The hook will block at Stop if this file is missing.

### Desktop aggregate and implementation (after Phase 3)

1. **Aggregate** Phase 1–3 outputs: `headerStructure`, `desktopMapping`, `megamenuMapping`, `validationReport`, `status`. Set `mobileMapping` to `"pending"` (mobile not yet analyzed).
2. **Write** to `blocks/header/navigation-validation/phase-5-aggregate.json`. Do not implement until this file exists.
3. **Implement desktop only:**
   - **nav.md location:** Write `nav.md` to the **`/content`** folder (e.g. `content/nav.md`), **NOT** to the workspace root `/`. The EDS content tree expects nav under `/content`. Create `blocks/header/header.js` and `blocks/header/header.css` as before.
   - Three-section structure (brand, sections, tools in nav.md with `---` separators), full CSS in header.css (horizontal layout, no raw bullet lists, dropdown/CTA styling).
   - **Content-first architecture (CRITICAL — do NOT hardcode text/content in JS):** ALL megamenu text content, link labels, category names, sub-menu items, promotional text, and link URLs MUST live in `content/nav.md`, NOT in `header.js`. The nav.md is the single source of truth for content. Structure the megamenu content in nav.md using nested lists, tables, or EDS block patterns so that `header.js` reads and renders it — never generates it. `header.js` should only: (1) parse the nav.md DOM structure, (2) build the visual megamenu panels/accordions/grids from that content, (3) add event handlers (hover, click, transitions). If the source megamenu has "CategoryA → SubCat → Product" with thumbnail + specs, all of that text/links/image-refs go into nav.md; header.js reads those DOM nodes and presents them as the megamenu panel. NEVER create site-specific function names (e.g. `buildCategoryAMegamenu`) — all functions must be generic and reusable across any site.
   - **Styling required:** Header must NOT render as raw bullet lists. CSS must provide: horizontal nav layout, header background and typography, dropdown panel styling, CTA button styling, removal of list bullets for nav-brand and nav-tools. Match source colors and layout.
   - **Image download (CRITICAL — images are missing every time, this is the #1 failure):** Before writing nav.md, you MUST complete these sub-steps in order:
     1. Read `phase-2-row-mapping.json` and `phase-3-megamenu.json`. List every element with `hasImages: true`.
     2. For EACH such element: visit the source URL, identify the actual image URL(s) from the DOM (logo src, icon srcs, megamenu thumbnail srcs, promotional banner srcs).
     3. Download EVERY image file to `content/images/` (e.g. `content/images/logo.svg`, `content/images/megamenu-thumb-1.jpg`).
     4. In nav.md, reference each downloaded image: `![alt text](images/filename.ext)`.
     5. After writing nav.md, **MANDATORY — run the validation script:**
        ```
        node .claude/skills/excat-navigation-orchestrator/scripts/validate-nav-content.js content/nav.md blocks/header/navigation-validation
        ```
        If exit code is non-zero, DO NOT PROCEED. The script will tell you exactly which images are missing. Go back to sub-step 2, download the missing images, rewrite nav.md, and re-run the script. Repeat until exit code 0.
     6. **Verify logging:** Read the last 10 lines of `blocks/header/navigation-validation/debug.log`. Confirm you see `[SCRIPT:validate-nav-content] [PASS]` or `[SCRIPT:validate-nav-content] [BLOCK]`. If neither entry exists, the script was NOT actually executed — go back and run it.
     - This is NOT optional. This is NOT "EDS simplification". Dropping images is a validation failure.
     - If the source megamenu has vehicle thumbnails, promotional banners, or image cards, those MUST appear in nav.md. Text-only dropdowns when the source has images = FAIL.
   - **Locale selector with flags (CRITICAL when hasFlags=true):** If `localeSelectorDetails.hasFlags` is true in phase-2:
     1. Visit the source locale dropdown/overlay. For EACH country/language entry with a flag, identify the flag image URL from the DOM.
     2. Download ALL flag images to `content/images/` (e.g. `content/images/flag-us.svg`, `content/images/flag-de.png`).
     3. In `nav.md`, create a dedicated locale section with flag image references: `![US](images/flag-us.svg) United States` for each entry.
     4. In `header.js`, read the locale entries from the nav.md DOM. Build the dropdown/grid/overlay dynamically — do NOT hardcode country names, flag URLs, or locale URLs in JS.
     5. In `header.css`, style the locale selector to match source exactly: dropdown layout (vertical-list, multi-column-grid, full-width-overlay, tooltip-bubble), flag image sizing, hover states, current-locale highlighting, close animation.
     - If the source has a country grid overlay with 50+ flags (like the STILL example), all 50+ flags must be downloaded and rendered. Do NOT skip flags or show text-only when source shows flags.
4. **Megamenu behavior validation (required when megamenu exists) — FIRST.** Behavior fixes add missing DOM elements, images, and interactions, which changes both structure and styling. Run this before structural or style validation.
   - **Create migrated megamenu mapping:** On the migrated page, hover and click every megamenu trigger, every panel item, every sub-item, every category tab, every featured area — exactly as you did for the source. Produce `blocks/header/navigation-validation/migrated-megamenu-mapping.json` conforming to the same `.claude/skills/excat-navigation-orchestrator/references/megamenu-mapping-schema.json` schema.
   - **Compare and write behavior register:** Run:
     ```
     node .claude/skills/excat-navigation-orchestrator/scripts/compare-megamenu-behavior.js \
       blocks/header/navigation-validation/megamenu-mapping.json \
       blocks/header/navigation-validation/migrated-megamenu-mapping.json \
       --output=blocks/header/navigation-validation/megamenu-behavior-register.json
     ```
     The script compares source vs migrated per sub-item and writes **megamenu-behavior-register.json** with hover match, click match, and styling match for every item. Exit 0 only if all items pass.
   - **Verify logging:** Read last 10 lines of `debug.log`. Confirm `[SCRIPT:compare-megamenu-behavior]` entry appears. If missing, the script was NOT executed — go back and run it.
   - **Gate:** If **any item has `status: "failed"`**, the register lists exactly what's wrong. Do NOT proceed to structural or style validation until `allValidated: true`.
   - **MEGAMENU BEHAVIOR REMEDIATION (when any sub-item fails):** For EACH failed item:
     1. **Hover mismatch:** Edit `blocks/header/header.js` to add/fix hover event handlers. If source shows hover-to-zoom (e.g. hovering car thumbnail updates featured image area), implement the same DOM update + transition.
     2. **Click mismatch:** Edit `blocks/header/header.js` to fix click navigation or panel behavior to match source URLs and actions.
     3. **Styling mismatch:** Edit `blocks/header/header.css` to match source appearance (image cards vs text links, grid layout, thumbnails, borders). If source has images and migrated doesn't, download images and add to nav.md. If text/link content is missing or wrong, fix it in `content/nav.md` (NOT in header.js) — JS only reads and presents DOM content, never hardcodes it.
     4. **Re-test and re-compare:** Hover and click the fixed items on migrated page. Update `migrated-megamenu-mapping.json`. Re-run `compare-megamenu-behavior.js`. Repeat until register shows `allValidated: true`.
   - **Why first:** Behavior fixes typically add missing DOM structure (featured areas, category tabs, image cards, spec sections), which directly affects what the structural schema comparison sees and what the style critique evaluates. Running structure or style first wastes iterations.
5. **Structural schema validation and schema register (required) — SECOND.** Now that behavior is locked in, validate that content/structure matches source.
   - **Extract from migrated page:** Inspect the header on the migrated page (screenshot or DOM). Produce `blocks/header/navigation-validation/migrated-structural-summary.json` conforming to `.claude/skills/excat-navigation-orchestrator/references/structural-summary-schema.json`: `rowCount`, `rows` (array of `{ index, hasImages }` per row), `megamenu` (`columnCount`, `hasImages`, `columns` with `columnIndex` and `hasImages`).
   - **Compare and write schema register:** Run `node .claude/skills/excat-navigation-orchestrator/scripts/compare-structural-schema.js blocks/header/navigation-validation/phase-1-row-detection.json blocks/header/navigation-validation/phase-2-row-mapping.json blocks/header/navigation-validation/phase-3-megamenu.json blocks/header/navigation-validation/migrated-structural-summary.json --threshold=95 --output-register=blocks/header/navigation-validation/schema-register.json`. The script compares source to migrated and writes **schema-register.json** with one entry per component (row-0, row-1, …, megamenu, megamenu-column-0, …) and status **validated** or **pending**. Exit 0 only if overall structural similarity ≥ 95%.
   - **Verify logging:** Read last 10 lines of `debug.log`. Confirm `[SCRIPT:compare-structural-schema]` entry appears. If missing, the script was NOT executed — go back and run it.
   - **Gate:** If **similarity &lt; 95%** or **schema-register.json** has any item with status **pending**, list mismatches. Do NOT proceed to style validation until `allValidated: true`. Record `validationReport.structuralSimilarity` and `validationReport.structuralMismatches`; update `phase-5-aggregate.json`.
   - **STRUCTURAL REMEDIATION (when any component mismatches):** For EACH failing schema-register item, you MUST fix the implementation:
     1. **Identify what's missing:** Compare the source phase-2/phase-3 JSON against `migrated-structural-summary.json`. What's different? Missing row? Missing megamenu column? Missing images? Missing nested sub-menu?
     2. **Fix nav.md:** If the migrated page is missing structural elements (a row, images, megamenu content, text labels, link groups, category names), edit `content/nav.md` to add them. Download images if needed. ALL text/link content belongs in nav.md — never in JS.
     3. **Fix header.js:** If behavior is missing (dropdown doesn't open, megamenu panel doesn't show, hover interaction missing), edit `blocks/header/header.js` to add event handlers, panel logic, and DOM traversal. Do NOT add text content or link URLs here — header.js reads what nav.md provides.
     4. **Fix header.css:** If layout structure differs (missing column, grid mismatch), edit `blocks/header/header.css` to fix the layout.
     5. **Re-extract and re-compare:** Take a new screenshot/DOM inspection of the migrated page. Write updated `migrated-structural-summary.json`. Re-run `compare-structural-schema.js --output-register`.
     6. **Repeat:** Until schema-register shows `allValidated: true`.
   - **Why second:** Structure must be complete and correct before visual styling is evaluated. If rows, columns, or images are missing, the critique agent would compare against an incomplete implementation and scores would be meaningless.
6. **Build desktop style register (prepare for combined critique later).** Build the register now so it's ready; critique will run as step 12 (combined).
   - **List EVERY individual item from phase-1/2/3 AND megamenu-mapping.json:** Read phase-1, phase-2, phase-3 JSON files **AND** `megamenu-mapping.json` (the deep behavior analysis). Create `blocks/header/navigation-validation/style-register.json` conforming to `.claude/skills/excat-navigation-orchestrator/references/style-register-schema.json`. List **every individual item** discovered — not just high-level groups:
     - From phase-2 `rows[i]`: **row-0**, and within row-0 every distinct element: **row-0-logo** (if hasImages), **row-0-nav-links**, **row-0-cta** (if CTA/button), **row-0-search** (if search), **row-0-icons** (if icons). Repeat for **row-1**, **row-2**, etc. Parse `elements` array in each row.
     - From phase-3 `megamenu` (high-level): **megamenu** (overall), **megamenu-column-0**, **megamenu-column-1**, etc.
     - From `megamenu-mapping.json` (deep sub-items — CRITICAL): For EACH `navTrigger`, create **megamenu-trigger-{index}** (e.g. `megamenu-trigger-0-products`). For EACH `panelItem` inside that trigger, create **megamenu-trigger-{i}-item-{j}** (e.g. `megamenu-trigger-0-item-0-widget-x`). For EACH `subItem`, create **megamenu-trigger-{i}-item-{j}-sub-{k}**. For EACH `categoryTab`, create **megamenu-trigger-{i}-tab-{j}** (e.g. `megamenu-trigger-0-tab-category-a`). For the `featuredArea`, create **megamenu-trigger-{i}-featured**.
     - **buttons**: **buttons-cta-0**, **buttons-cta-1**, etc.
     - **search form** (if `hasSearchForm: true`): **row-{i}-search-form** (the search input/icon), **row-{i}-search-dropdown** (if expandable/autocomplete).
     - **locale selector** (if `hasLocaleSelector: true`): **row-{i}-locale-selector** (the trigger icon/text), **row-{i}-locale-dropdown** (the opened dropdown/grid/overlay), **row-{i}-locale-flags** (if hasFlags — the flag grid styling).
     - Initial `status` for every item: `"pending"`, `lastSimilarity: 0`. Set `allValidated: false`.
   - **Do NOT run critique yet.** The style register is built but critique runs at step 12 (combined with mobile) to avoid running it twice.
7. **Pre-confirmation gate + Customer Confirmation (desktop structural + behavioral only):** Before asking the customer, verify:
   - [ ] Run `node .claude/skills/excat-navigation-orchestrator/scripts/validate-nav-content.js content/nav.md blocks/header/navigation-validation` — exit code MUST be 0.
   - [ ] `blocks/header/navigation-validation/megamenu-behavior-register.json` exists (when megamenu present), `allValidated: true`.
   - [ ] `blocks/header/navigation-validation/schema-register.json` exists, `allValidated: true`.
   - [ ] `blocks/header/navigation-validation/style-register.json` exists (register built, but critique not yet run — that's OK at this stage).
   - [ ] `content/nav.md` exists (not at root `/nav.md`).
   - [ ] `blocks/header/header.css` and `blocks/header/header.js` exist and pass linting.
   - [ ] **Review `debug.log`:** Read the WORKFLOW PROGRESS DASHBOARD. Confirm ALL milestones show ✅.
   - If ANY item above fails, go back and fix it. Do NOT ask the customer.
   - **STOP. Request:** "Desktop structural + behavioral validation complete: megamenu behavior (all sub-items matched), structural schema (95%+). Style critique will run after mobile is also implemented. Please confirm desktop view to proceed to mobile."

### Phase 4: Mobile Behavior (only after customer confirmation)

1. Obtain **mobile** viewport screenshot(s): menu closed (hamburger visible) and, if applicable, menu open. Use mobile viewport (e.g. 375×812).
2. **You must produce** mobile JSON: `breakpointPx`, `menuTrigger`, `openBehavior` (drawer | accordion | fullscreen | slide-in-panel), `tapVsHover`, `nestedBehavior`, `hasMegamenuOnMobile`, `hamburgerAnimation` (e.g. `{ "type": "morph-to-cross", "method": "css-transform", "transition": "transform 0.3s ease" }`), `mobileMenuLayout` (e.g. `vertical-accordion`, `horizontal-accordion`, `stacked-list`, `slide-in-subpanel`), `accordionBehavior` (if applicable), `slideInPanelBehavior` (if applicable: `{ "direction": "left-to-right", "hasBackButton": true, "backButtonLabel": "← CategoryA", "transitionType": "css-transform-translateX" }`), `confidence`, `uncertainty`, `notes`. Do not reuse desktop row count or structure; derive from mobile screenshots only.
   - **Hamburger → cross animation (REQUIRED):** Click the hamburger icon. Document: does the icon morph into a cross (×)? What animation method? (`css-transform rotate`, `svg-path morph`, `class-swap`, `opacity-crossfade`). Record transition duration and easing. The migrated site MUST replicate this animation exactly.
   - **Mobile menu structure (REQUIRED — do NOT default to accordion):** With menu open, analyze the full structure. Click EACH top-level nav item and observe: Does it expand in-place below (accordion)? Or does the **entire main menu slide away** and a new sub-panel slide in from the right with a back button (slide-in-panel)? These are DIFFERENT patterns — accordion expands in place, slide-in replaces the entire view. If the source uses slide-in-panel, the migrated site MUST use the same pattern, NOT accordion.
   - **Slide-in panel detection (CRITICAL):** If clicking a nav item (e.g. "Products") causes the main menu to slide LEFT and a new panel appears from the RIGHT with a "← Products" back button, this is a **slide-in-panel** pattern. Set `openBehavior: "slide-in-panel"`, `mobileMenuLayout: "slide-in-subpanel"`, and populate `slideInPanelBehavior` with direction, back button details, transition type, and panel depth.
   - **Mobile megamenu behavior:** If the desktop megamenu has sub-items, tabs, featured areas — how do they appear on mobile? (e.g., category tabs become accordion headers or slide-in sub-panels, featured image hidden on mobile, grid becomes vertical list). Record for comparison.
   - **Mobile search form detection (REQUIRED):** Check whether the mobile header or mobile menu contains a search bar/input/form. Set `hasSearchForm` (true/false). On mobile, search may be: hidden behind a search icon, inside the hamburger menu drawer, collapsed into an expandable input, or completely absent on mobile. If `hasSearchForm: true`, populate `searchFormDetails` with `formType` (inline-input | expandable-icon | inside-menu | modal-overlay | hidden), `visibleInClosedState`, and `position`. The hook **BLOCKS** if `hasSearchForm` field is missing (Gate 14).
   - **Mobile locale / language selector detection (REQUIRED):** Check whether the mobile header or mobile menu contains a locale/language/region selector. Set `hasLocaleSelector` (true/false). On mobile, the locale selector may appear as: a globe icon in the header bar, a flag icon next to the hamburger, inside the hamburger menu drawer (top or bottom), a language toggle (e.g. "German | English"), or absent on mobile. If `hasLocaleSelector: true`, populate `localeSelectorDetails` with `selectorType` (language-dropdown | country-grid | region-dropdown | language-toggle | flag-dropdown | globe-icon-dropdown | inside-menu | inline-links), `triggerElement`, `visibleInClosedState`, `hasFlags`, `position`, `dropdownLayout`. If `hasFlags: true`, ensure flag images are downloaded. The hook **BLOCKS** if `hasLocaleSelector` field is missing (Gate 14b).
3. **Gate:** Output MUST conform to `.claude/skills/excat-navigation-orchestrator/references/mobile-navigation-agent-schema.json`.
4. **Write** the Phase 4 JSON to `blocks/header/navigation-validation/phase-4-mobile.json`.
5. Update `phase-5-aggregate.json` with real `mobileMapping` (replace `"pending"`).
6. **Implement mobile:** Update `blocks/header/header.css` and `blocks/header/header.js` for breakpoints, hamburger menu (including hamburger → cross animation), and open behavior per Phase 4 output. Key requirements:
   - **Hamburger animation:** CSS transform/transition for the hamburger → cross morph. Match source timing and easing.
   - **Accordion (if openBehavior is accordion):** Match source behavior — single vs multi expand mode, chevron animation, expand timing.
   - **Slide-in panel (if openBehavior is slide-in-panel):** Implement `transform: translateX()` based sliding panels. Main menu slides left when category selected; sub-panel slides in from right. Back button at top of sub-panel reverses transition. Do NOT fall back to accordion expand-in-place — this is the EDS default but does NOT match slide-in sources.
   - **No unexpected overlays:** If source mobile menu has NO overlay/backdrop, migrated must not add one. If source has a backdrop, match it exactly.
   - **Megamenu on mobile:** If desktop megamenu content appears as nested accordions on mobile, implement the same nesting depth and expand/collapse behavior.
   - **Viewport resize handling (REQUIRED — prevents layout breakage on resize):** After implementing both desktop and mobile views, add viewport resize handling in `header.js`. When the browser is resized between desktop and mobile breakpoints (without a page refresh), the layout must adapt cleanly. Use `window.matchMedia(breakpoint).addEventListener("change", handler)` (preferred) or `window.addEventListener("resize", debounceHandler)`. The handler MUST: (1) close any open mobile menus when crossing to desktop width, (2) reset hamburger icon to ☰ state, (3) remove mobile-only classes/inline styles, (4) re-initialize desktop hover behaviors, (5) close desktop megamenu dropdowns when crossing to mobile width. The hook **WARNS** if no resize/matchMedia handling is found in header.js (Gate 15).

### Phase 4 validation (mobile — same rigor as desktop)

After implementing mobile, run the same structural validation as desktop but scoped to mobile. Style critique runs later in the combined pass (step 12).

7. **Mobile structural validation:** Extract mobile header structure at mobile viewport. Produce `blocks/header/navigation-validation/mobile/migrated-mobile-structural-summary.json`. Run `node .claude/skills/excat-navigation-orchestrator/scripts/compare-structural-schema.js` comparing Phase 4 mobile JSON against the migrated mobile structure. Write `blocks/header/navigation-validation/mobile/mobile-schema-register.json`. All items must be validated.
8. **Mobile heading coverage validation (ALL headings — CRITICAL):** With the mobile menu open at 375×812, click EVERY top-level nav heading and verify:
   - Does it expand/slide as expected per `phase-4-mobile.json` (accordion expand vs slide-in-panel)?
   - Does the sub-menu contain all items from the desktop megamenu mapping?
   - Does the back button (if slide-in-panel) work to return to the main list?
   - Record in `mobile/mobile-heading-coverage.json`: `{ "headings": [{ "label": "Products", "clicked": true, "subItemCount": 12, "behaviorMatches": true }, ...], "allCovered": true }`.
   - **Gate:** If ANY heading has `behaviorMatches: false` or was not clicked, fix implementation and re-test. Do NOT proceed until `allCovered: true`.
9. **Mobile behavior validation (tap/click/animation for EVERY component — same rigor as desktop megamenu-behavior-register):** After heading coverage is complete, test every mobile nav component's interactive behavior on the **migrated** site at 375×812:
   - For EACH top-level heading: tap it. Does it open the correct panel (accordion expand or slide-in)? Record `tapMatch`.
   - For EACH sub-panel or accordion panel: does it show the right items? Does the back button work? Record `behaviorMatch`.
   - For ALL animations: hamburger → cross transition, accordion expand/collapse, slide-in panel slide, back button reverse. Do they match the **source** site's speed, easing, and direction? Record `animationMatch` with specific timings.
   - **Hover/long-press:** Even on mobile, some sites have hover states via long-press. Test each component. Record any effect.
   - Write `blocks/header/navigation-validation/mobile/mobile-behavior-register.json`:
     ```json
     {
       "allValidated": true,
       "items": [
         { "id": "mobile-hamburger", "label": "Hamburger icon", "tapMatch": { "matches": true }, "behaviorMatch": { "matches": true }, "animationMatch": { "matches": true, "sourceSpeed": "0.3s", "migratedSpeed": "0.3s" }, "status": "validated" },
         { "id": "mobile-heading-products", "label": "Products", "tapMatch": { "matches": true }, "behaviorMatch": { "matches": true, "pattern": "slide-in-panel" }, "animationMatch": { "matches": true, "sourceSpeed": "0.3s", "migratedSpeed": "0.3s" }, "status": "validated" }
       ]
     }
     ```
   - **Gate (hook-enforced):** If ANY item has `status: "failed"`, fix the implementation. The hook checks `mobile-behavior-register.json` at session end (Stop Check 8e). All items must be validated before proceeding.
   - **Remediation:** For each failed item: fix CSS transitions in `@media` block for timing mismatches, fix JS event handlers for tap/click mismatches, fix translateX/max-height values for behavior mismatches. Re-test and re-write the register. Repeat until `allValidated: true`.
10. **Build mobile style register:** Build `blocks/header/navigation-validation/mobile/mobile-style-register.json` listing all mobile-specific components: `mobile-hamburger-icon`, `mobile-hamburger-cross-animation`, `mobile-menu-container`, `mobile-nav-heading-{i}` (for EACH top-level heading), `mobile-accordion-panel-{i}` or `mobile-slide-panel-{i}`, `mobile-megamenu-nested-{i}`, `mobile-cta`, `mobile-back-button` (if slide-in), etc. Initial status `"pending"`. Critique runs in step 12 (combined).

### Step 12: Combined Visual Critique (desktop + mobile — ONCE)

This is the single critique pass that validates BOTH desktop AND mobile components together. Running once is more efficient and ensures consistent scoring.

10. **Combined per-component visual critique (95% each, no exceptions):**
   - **Desktop components:** For EACH component in `style-register.json` with `status: "pending"`, invoke **`nav-component-critique`** at **desktop viewport (1920×1080)**. Steps A–G: determine selectors (A), prepare interaction state (B), capture source screenshot (C), capture migrated screenshot (D), visual comparison and scoring (E), update register (F), remediate and repeat until ≥ 95% (G). Artifacts: `blocks/header/navigation-validation/critique/{componentId}/source.png`, `migrated.png`, `critique-report.json`.
   - **Mobile components:** For EACH component in `mobile/mobile-style-register.json` with `status: "pending"`, invoke **`nav-component-critique`** at **mobile viewport (375×812)**. Same steps A–G but at mobile viewport. Artifacts: `blocks/header/navigation-validation/mobile/critique/{componentId}/source.png`, `migrated.png`, `critique-report.json`.
   - **Order:** Desktop components first, then mobile components. If a desktop fix affects mobile (e.g., shared CSS), re-check affected mobile components.
   - **CRITIQUE PROOF (hook-enforced):** Every component with `status: "validated"` MUST have: (1) `critiqueReportPath` pointing to an existing `critique-report.json` on disk; (2) `critiqueIterations >= 1`; (3) `screenshotSourcePath` and `screenshotMigratedPath` pointing to actual PNG files on disk. The hook verifies all four and **BLOCKS** if any is missing.
   - **ABSOLUTE STOP:** Do NOT report to customer while ANY component in EITHER register has `status: "pending"` or `lastSimilarity < 95` or missing critique proof.
   - Record `validationReport.styleSimilarity` (average of ALL component similarities, desktop + mobile); update `phase-5-aggregate.json`.

### Step 13: Final Pre-Confirmation Gate + Report

11. **Final gate (MUST pass before reporting to customer):** Verify:
   - [ ] `blocks/header/navigation-validation/megamenu-behavior-register.json` exists, `allValidated: true`
   - [ ] `blocks/header/navigation-validation/schema-register.json` exists, `allValidated: true`
   - [ ] `blocks/header/navigation-validation/style-register.json` exists, `allValidated: true`, every component ≥ 95% with critique proof
   - [ ] `blocks/header/navigation-validation/mobile/mobile-schema-register.json` exists, `allValidated: true`
   - [ ] `blocks/header/navigation-validation/mobile/mobile-style-register.json` exists, `allValidated: true`, every component ≥ 95% with critique proof
   - [ ] `blocks/header/navigation-validation/mobile/mobile-heading-coverage.json` exists, `allCovered: true`
   - [ ] `blocks/header/navigation-validation/mobile/mobile-behavior-register.json` exists, `allValidated: true`, every item tap/click/animation matches source
   - [ ] Hamburger → cross animation works (visually confirmed via screenshots)
   - [ ] All mobile animation speeds match source (hamburger transition, accordion/slide-in duration, back button reverse)
   - [ ] No unwanted overlays on desktop or mobile
   - [ ] CSS breakpoint correctly triggers mobile layout
   - [ ] `header.js` has viewport resize / matchMedia handling (close mobile menus on desktop resize, reset hamburger, re-init desktop hover)
   - [ ] Search form detection: `hasSearchForm` field present in phase-2 rows AND phase-4 mobile JSON. If desktop has search but mobile doesn't, confirm mobile intentionally hides it.
   - [ ] Locale selector detection: `hasLocaleSelector` field present in phase-2 rows AND phase-4 mobile JSON. If `hasFlags=true`, verify flag images are downloaded to `content/images/` and referenced in `nav.md`. Locale styling (dropdown layout, flag sizing, current-locale highlight) must match source exactly.
   - [ ] **Review `debug.log`:** Confirm ALL milestones, scripts, and critique reports are present.
12. **Report to customer:** "Desktop + Mobile implementation complete. All validation registers fully validated: megamenu behavior (all sub-items matched), structural schema (95%+), style critique (95%+ per component for BOTH desktop and mobile with critique proof). Ready for review."

## Output Contract (Strict)

Aggregate into a single JSON object only. No free-text explanation in intermediate steps; optional summary allowed only in final user-facing response.

```json
{
  "headerStructure": {},
  "desktopMapping": {},
  "mobileMapping": {},
  "megamenuMapping": {},
  "validationReport": {},
  "status": "PASS | FAIL"
}
```

- `status`: **PASS** only when all checkpoints passed and validation-agent reports no mismatch requiring re-analysis.

## Modular Navigation Mode

**Activate when:** `header rows > 3` OR `megamenu columns > 4` OR `nested levels > 2`.

- Each row is treated as a separate module.
- Each megamenu column can be an independent block.
- Validation performed **per module** via inline per-component critique (step 12, combined) — screenshot + visual diff + scoring per component.

## Schema Validation

Validate all sub-agent output with `node .claude/skills/excat-navigation-orchestrator/scripts/validate-output.js <output.json> <schema.json>`. Exit non-zero = do not proceed. Schemas: `.claude/skills/excat-navigation-orchestrator/references/desktop-navigation-agent-schema.json`, `.claude/skills/excat-navigation-orchestrator/references/mobile-navigation-agent-schema.json`, `.claude/skills/excat-navigation-orchestrator/references/megamenu-schema.json`, `.claude/skills/excat-navigation-orchestrator/references/validation-agent-schema.json`.

## Implementation (EDS)

- **Desktop (steps 1–7):** Download images for `hasImages: true` elements → write `content/nav.md` (NOT root) → run `validate-nav-content.js` (must exit 0) → implement `header.js`/`header.css` → validate megamenu behavior FIRST, structural SECOND → customer confirmation.
- **Mobile (steps 8–12):** Phase 4 analysis (hamburger animation, accordion/slide-in-panel, ALL headings) → implement mobile CSS/JS → structural validation → heading coverage → behavior register.
- **Combined critique (step 13):** Visual critique for ALL desktop (1920×1080) + mobile (375×812) components; remediate until 95%+ each; final gate + report.
- **Content-first:** ALL text/links/labels in `content/nav.md`. JS only reads and renders — never generates text.

## Example

**User says:** "Migrate header from https://example.com"

**Actions:** Steps 1–3 (phases) → step 4 (implement desktop: images + nav.md + header.css/js) → step 5 (megamenu behavior FIRST) → step 6 (structural SECOND) → step 7 (customer confirmation) → steps 8–12 (mobile: analysis + implement + validate + heading coverage + behavior) → step 13 (combined visual critique desktop + mobile) → step 14 (final gate + report).

**Result:** Desktop + mobile header matches source — all registers validated (95%+ per component). Images downloaded. `content/nav.md` written. Combined visual critique proved similarity.

## Testing

**Trigger (use this skill):** "Migrate header from https://example.com", "Instrument navigation for the header", "Validate nav structure from this screenshot", "Set up header/nav from [URL]".  
**Paraphrased:** "We need the site header migrated with desktop and mobile", "Can you replicate this site’s navigation in EDS?".  
**Do NOT use for:** Simple link lists without screenshot evidence; pages not yet migrated (use excat-page-migration first); general page layout or footer work.

**Functional:** Run full flow; confirm all phase JSONs + registers under `blocks/header/navigation-validation/`; all components 95%+; mobile only after desktop confirmation. Validate with `.claude/skills/excat-navigation-orchestrator/scripts/validate-output.js` and `.claude/skills/excat-navigation-orchestrator/scripts/compare-structural-schema.js --threshold=95 --output-register`.

## Enforcement (Two Layers — Script + Hook)

- **Layer 1 — Script:** `node .claude/skills/excat-navigation-orchestrator/scripts/validate-nav-content.js content/nav.md blocks/header/navigation-validation` — MANDATORY after every nav.md write (exit 0 = pass).
- **Layer 2 — Hook:** `.claude/skills/hooks/nav-validation-gate.js` — 17 PostToolUse gates (1–15 incl. 11b/11c/14b) + 12 Stop checks (1–12 incl. 7b/8b–8f) covering desktop + mobile. Logs tagged `[DESKTOP]`/`[MOBILE]`/`[CRITIQUE]`/`[VIEWPORT]`/`[SEARCH]`/`[LOCALE]` to `blocks/header/navigation-validation/debug.log` with WORKFLOW PROGRESS DASHBOARD.
- Full gate details in hook file comments and `.claude/skills/excat-navigation-orchestrator/references/reference-index.md`.

## References

Full reference index: **`.claude/skills/excat-navigation-orchestrator/references/reference-index.md`** — schemas, scripts, registers, critique, enforcement.

**Key schemas:** `.claude/skills/excat-navigation-orchestrator/references/desktop-navigation-agent-schema.json`, `.claude/skills/excat-navigation-orchestrator/references/mobile-navigation-agent-schema.json`, `.claude/skills/excat-navigation-orchestrator/references/megamenu-schema.json`, `.claude/skills/excat-navigation-orchestrator/references/validation-agent-schema.json`.
**Key scripts:** `.claude/skills/excat-navigation-orchestrator/scripts/validate-output.js`, `.claude/skills/excat-navigation-orchestrator/scripts/compare-structural-schema.js`, `.claude/skills/excat-navigation-orchestrator/scripts/compare-megamenu-behavior.js`, `.claude/skills/excat-navigation-orchestrator/scripts/validate-nav-content.js`.

## Troubleshooting

See **`.claude/skills/excat-navigation-orchestrator/references/troubleshooting.md`** for common issues (sub-agent rejection, gate blocks, register failures, missing images, wrong mobile patterns, overlay mismatches).

## Do NOT

- Suggest UX improvements, redesign layout, simplify megamenu, or normalize spacing without validation.
- Auto-correct structure without validation confirmation.
- Write nav.md to root `/nav.md` — must be `content/nav.md`; must include all images for `hasImages: true` elements; must run `node .claude/skills/excat-navigation-orchestrator/scripts/validate-nav-content.js content/nav.md blocks/header/navigation-validation` afterward (MANDATORY; fix and re-run if exit non-zero).
- Create nav.md or header implementation **before** the desktop aggregate is written (after Phase 3).
- Proceed to Phase 4 (mobile) **before** customer confirms desktop; request confirmation **before** passing the pre-confirmation gate (step 7).
- Skip any phase (1–3) or skip writing phase JSON to `blocks/header/navigation-validation/`.
- Deliver desktop with raw bullet lists / no CSS — full styling and megamenu images required.
- Assume nav items have no hover — test hover and click separately for every item; set `hasHoverBehavior`/`hasClickBehavior` from evidence.
- Proceed while any register component is pending or below 95%.
- Mark a component as "validated" below 95%; use "EDS constraints" excuses to bypass the threshold.
- Self-assess similarity without running critique (`lastSimilarity: 95` without screenshots = hook BLOCKS).
- Skip deep megamenu mapping — every item must be individually hovered and clicked.
- Call missing images "EDS simplification" — if source has images, nav.md MUST have them.
- Ignore the hamburger/breadcrumb icon — track click, hover, and animation (hamburger → cross) in phase-2 and phase-4.
- Add overlays the source doesn't have — megamenu overlay must match source exactly (none, semi-transparent, blur).
- Skip mobile validation — mobile MUST follow the same structural + style validation flow as desktop.
- Use accordion expand-in-place when source uses slide-in-panel — these are different patterns. Match the source.
- Hardcode megamenu text/links/labels in header.js — ALL content (text, links, category names, sub-menu items, specs, promotional copy) belongs in `content/nav.md`. JS only reads and presents it.
- Create site-specific function names (e.g. `buildProductsMegamenu`, `buildCategoryAPanel`) — ALL functions in header.js MUST be generic and reusable. Use data-driven patterns that read from nav.md DOM, not functions named after source site categories or sections.