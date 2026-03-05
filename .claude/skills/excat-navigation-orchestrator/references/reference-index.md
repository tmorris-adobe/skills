# Reference Index — Navigation Orchestrator

| Category | Files |
|----------|-------|
| **Validation artifacts** | Phase JSON files under `blocks/header/navigation-validation/` — see `.claude/skills/excat-navigation-orchestrator/references/validation-artifacts.md` |
| **Output schema** | `.claude/skills/excat-navigation-orchestrator/references/output-contract.json` |
| **Sub-agent schemas** | `.claude/skills/excat-navigation-orchestrator/references/desktop-navigation-agent-schema.json`, `.claude/skills/excat-navigation-orchestrator/references/mobile-navigation-agent-schema.json`, `.claude/skills/excat-navigation-orchestrator/references/megamenu-schema.json`, `.claude/skills/excat-navigation-orchestrator/references/validation-agent-schema.json` |
| **Structural comparison** | `.claude/skills/excat-navigation-orchestrator/references/structural-summary-schema.json`; `.claude/skills/excat-navigation-orchestrator/scripts/compare-structural-schema.js` (threshold **95%**, `--output-register` flag) |
| **Style register** | `.claude/skills/excat-navigation-orchestrator/references/style-register-schema.json`; runtime: `blocks/header/navigation-validation/style-register.json` |
| **Schema register** | `.claude/skills/excat-navigation-orchestrator/references/schema-register-schema.json`; written by compare script |
| **Megamenu mapping** | `.claude/skills/excat-navigation-orchestrator/references/megamenu-mapping-schema.json`; runtime: `megamenu-mapping.json` (source) + `migrated-megamenu-mapping.json` |
| **Megamenu behavior register** | `.claude/skills/excat-navigation-orchestrator/references/megamenu-behavior-register-schema.json`; runtime: `megamenu-behavior-register.json`; written by `.claude/skills/excat-navigation-orchestrator/scripts/compare-megamenu-behavior.js` |
| **Per-component critique** | `nav-component-critique/SKILL.md` — steps A–G; replaces external critique skills for header |
| **Visual style comparison** | `nav-component-critique/SKILL.md` Step E — PRIMARY method for style scoring; visual screenshot comparison with structured scoring rubric |
| **Mobile validation** | `mobile/` subdirectory — `mobile-schema-register.json`, `mobile-style-register.json`, `mobile-heading-coverage.json`, `mobile-behavior-register.json`, `mobile/critique/` |
| **Enforcement** | `.claude/skills/hooks/nav-validation-gate.js` — 14 PostToolUse gates + 15 Stop checks (desktop + mobile); logs tagged [DESKTOP]/[MOBILE]/[CRITIQUE] |
| **Nav content validation** | `.claude/skills/excat-navigation-orchestrator/scripts/validate-nav-content.js` — MANDATORY after every nav.md write; exit 0 = pass |
| **Debug log** | `blocks/header/navigation-validation/debug.log` |

**Critique proof (hook-enforced):** Every validated component in `style-register.json` must have `critiqueReportPath`, `screenshotSourcePath`, `screenshotMigratedPath` (all existing on disk), and `critiqueIterations >= 1`. Self-assessed scores are rejected.
