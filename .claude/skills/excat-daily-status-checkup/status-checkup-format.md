# Status Checkup — Format

> Portable template for the daily status checkup briefing. See `SKILL.md` for full rules and workflow.

The briefing is output directly in the reply by default. Optionally written to `journal/status-checkup.md` or `journal/session-context.md` (overwritten each run).

**Constraint:** Keep the briefing to **one screen** of scannable bullets. Cut the least urgent parts if it grows too long.

---

## Template

```markdown
# Status Checkup — [YYYY-MM-DD] [optional: time]

**Project:** [name from project-context]
**Branch:** `[branch-name]`
**Last journal update:** [date/session from project-context]

---

## Where we stand
- [1-2 sentence summary of overall status from project-context]
- What's done: [2-4 bullets of major milestones]
- In progress: [current work, or "nothing active — between sessions"]

## What needs to be done
- [Bullets from project-context "What's Pending" and/or last Carry-Forward priorities]
- [Any explicit next priorities from Resume Point]

## Problems to keep in mind

> Skip this section entirely if there are no blockers, unresolved problems,
> or relevant prevention items.

- **[category]:** [summary] (e.g. "DA: match links by text, not href")
- **[PROBLEM-ID]** [title] — [severity], unresolved since Session [NNN]
- [No unresolved problems in reference] (if all resolved)

## Where to begin
> [Resume Point from project-context, or Carry-Forward from last session — verbatim or lightly edited]

## Recent time (optional)
- Project total: [from time-tracking header]
- Recent days: [e.g. "Yesterday 2h 30m; today not yet logged"]
```

---

## Section Rules

- **Where we stand:** Overall status from project-context.md. Keep "What's done" to major milestones only (2-4 bullets), not an exhaustive list. Note anything actively in progress.
- **What needs to be done:** Dedicated section for pending items. Pull from project-context "What's Pending" AND the last Carry-Forward's explicit next priorities. Keep to 3-5 items maximum — pick highest priority if there are more.
- **Problems to keep in mind:** Combines Quick Reference / Prevention Checklist categories AND unresolved problems into one section. Summarize by category (e.g. "DA: match links by text, not href") rather than listing every individual problem ID. Only shown when there are unresolved problems, active blockers, or prevention items relevant to pending work. Otherwise skip entirely.
- **Where to begin:** Copy the carry-forward verbatim, or lightly edit for clarity. This is the canonical starting point (Rule 1 in SKILL.md). The Resume Point from project-context reinforces it.
- **Recent time:** Optional. One or two lines. Pull from `time-tracking.md` header and `metrics.md`. Keep minimal — this is context, not a report. Include recent daily totals if spanning multiple days.

---

## Example

```markdown
# Status Checkup — 2026-02-27

**Project:** Zelis.com EDS Migration
**Branch:** `issue-1-styles-bulk`
**Last journal update:** 2026-02-26 (Session 010)

---

## Where we stand
- Early migration: homepage blocks functional, animation skill and verification framework in place, journaling and supporting skills operational.
- What's done: Repo and blocks set up; hero Lottie with DA workaround; animation migration skill (Pattern A-G) and verification criteria; journaling, problem tracker, time tracking, status checkup skills.
- In progress: Nothing active (between sessions).

## What needs to be done
- Design token extraction from zelis.com (colors, fonts, spacing → styles/styles.css)
- Navigation setup (nav.md/nav.html from zelis.com structure)
- Block styling refinement to match source site
- Footer implementation
- Bulk import workflow for remaining ~789 pages

## Problems to keep in mind
- **DA:** Match links by `a.textContent`, never `a.href`; grep for references after renames.
- **Git:** Use `HOME=/home/node` in container; commit/push when user needs to review files.
- **Performance:** delayed.js at 1.5s for Lottie.
- **Sync:** Don't manually write .html/.plain.html that have .md source.
- **TEST-001** Sync scroll doesn't trigger IntersectionObservers — minor, unresolved since Session 009.
- **TEST-002** F-DELAYED check false positive — minor, unresolved since Session 009.

## Where to begin
> Daily status checkup skill v1.2 complete. All five supporting skills now refined. Next priorities: design token extraction, navigation setup, or begin bulk page migration.

## Recent time
- Project total: ~10h 35m agent / ~11h 35m with margin
- 2026-02-26: ~8h across Sessions 001-010.
```

---

Same structure works for any project; only the content of each section changes. Keep the checkup to one screen so it's quick to scan at session start.
