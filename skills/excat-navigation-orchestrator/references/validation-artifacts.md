# Validation Artifacts — Required Location

All phase outputs MUST be written under the header block so you can confirm each validation step was followed.

**Base path:** `blocks/header/navigation-validation/`

| File | Written after | Contents |
|------|----------------|----------|
| `session.json` | Start of run | `sourceUrl`, `migratedPath`, `startedAt` (ISO timestamp), optional `runId` |
| `phase-1-row-detection.json` | Phase 1 | Row detection JSON (rowCount, confidence, uncertainty, notes) |
| `phase-2-row-mapping.json` | Phase 2 | Row mapping JSON (rows, confidence, uncertainty, notes) |
| `phase-3-megamenu.json` | Phase 3 | Megamenu analysis JSON (includes hasImages; used for desktop implementation) |
| `phase-5-aggregate.json` | After Phase 3 (desktop) | Desktop aggregate: headerStructure, desktopMapping, megamenuMapping, validationReport, status; mobileMapping: "pending" |
| `phase-4-mobile.json` | Phase 4 (only after customer confirmation) | Mobile behavior JSON |
| `phase-5-aggregate.json` (updated) | After Phase 4 | Full contract with real mobileMapping |
| `migrated-structural-summary.json` | After desktop implementation | Structural summary **extracted from migrated page** (same shape as source; used for comparison) |
| `style-register.json` | Before style validation | Per-component list (rows, buttons, megamenu, sub-menus); each marked pending/validated; **all must be validated (95%)** before proceeding. Persisted like hooks to keep iteration intact. |
| `schema-register.json` | From compare script | Per-component schema match (source vs migrated); written by `compare-structural-schema.js --output-register`; **all items must be validated** before proceeding. |
| `megamenu-mapping.json` | Phase 3 deep analysis | Source megamenu per-item behavior: every trigger, panel item, sub-item with hover + click behavior. Conforms to `.claude/skills/excat-navigation-orchestrator/references/megamenu-mapping-schema.json`. |
| `migrated-megamenu-mapping.json` | After implementation | Same schema as `megamenu-mapping.json` but filled from the **migrated** site. Every item hovered and clicked to record actual migrated behavior. |
| `megamenu-behavior-register.json` | From compare script | Per-sub-item comparison: source vs migrated hover/click/styling. Written by `compare-megamenu-behavior.js`. **All items must be validated** before proceeding. Hook-enforced. |
| `critique/{componentId}/` | During step 12 (combined critique) | Per-component critique artifacts: `source.png`, `migrated.png`, `critique-report.json`. One subdirectory per style-register component. Screenshots + report prove visual critique actually ran. |
| `mobile/migrated-mobile-structural-summary.json` | After mobile implementation | Mobile structural summary extracted from migrated page at mobile viewport |
| `mobile/mobile-schema-register.json` | Mobile structural validation | Per-component mobile structure match (source vs migrated) |
| `mobile/mobile-style-register.json` | Mobile style validation | Per-component mobile style register (same schema as desktop `style-register.json`) |
| `mobile/mobile-heading-coverage.json` | Mobile heading validation | Coverage report: every heading tested with allCovered flag |
| `mobile/mobile-behavior-register.json` | Mobile behavior validation | Per-component tap/click/animation match (same role as desktop megamenu-behavior-register) |
| `mobile/critique/{componentId}/` | During step 12 (combined critique) | Mobile per-component critique artifacts: `source.png`, `migrated.png`, `critique-report.json` |

## Rules

- Create the directory if it does not exist.
- Write each file **immediately after** producing that phase's JSON; do not proceed to the next phase until the file is written.
- Paths are relative to workspace root (e.g. `blocks/header/navigation-validation/phase-1-row-detection.json`). Do not use `/workspace/` prefix.
- If a phase is skipped (e.g. no megamenu), still write the file with the valid schema-shaped JSON (e.g. zero/empty values and notes).

## File Existence Checklist

| After | Files that must exist |
|-------|------------------------|
| Run start | `blocks/header/navigation-validation/session.json` |
| Phase 1 | + `phase-1-row-detection.json` |
| Phase 2 | + `phase-2-row-mapping.json` |
| Phase 3 | + `phase-3-megamenu.json` |
| Desktop aggregate | + `phase-5-aggregate.json` (mobileMapping may be `"pending"`) |
| Desktop implementation | + `header.js`, `header.css` (styled; megamenu images if present in source) |
| **Megamenu behavior validation (step 4 — FIRST)** | Create `migrated-megamenu-mapping.json`; run `compare-megamenu-behavior.js`; require `megamenu-behavior-register.json` → `allValidated: true` |
| **Structural schema validation (step 5 — SECOND)** | Extract from migrated page → `migrated-structural-summary.json`; run `compare-structural-schema.js` with **--output-register**; require **95%** and **schema-register.json** all validated |
| **Customer confirmation (step 7)** | **STOP. Request: "Desktop structural + behavior validated. Confirm to proceed to mobile."** |
| Phase 4 (mobile analysis) | + `phase-4-mobile.json` (includes `hamburgerAnimation`, `mobileMenuLayout`, `accordionBehavior` or `slideInPanelBehavior`) |
| Full aggregate update | Update `phase-5-aggregate.json` with mobileMapping |
| Mobile implementation | Update header CSS/JS for breakpoints, hamburger → cross animation, drawer/accordion/slide-in-panel |
| **Mobile structural validation** | `mobile/migrated-mobile-structural-summary.json` + `mobile/mobile-schema-register.json` → allValidated |
| **Combined style critique (ONCE for desktop + mobile)** | Build BOTH `style-register.json` (desktop) AND `mobile/mobile-style-register.json` (mobile). Run `nav-component-critique` for ALL components in a single pass — desktop at 1920×1080, mobile at 375×812. All must reach ≥ 95% with critique proof. |
| **Final pre-confirmation gate** | All registers validated (desktop + mobile), hamburger animation confirmed, no unwanted overlays |
