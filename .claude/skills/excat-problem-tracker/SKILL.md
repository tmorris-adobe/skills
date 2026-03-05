---
name: excat-problem-tracker
description: Review the project journal for problems, issues, roadblocks, and failed attempts. Extracts recurring patterns, tracks how issues were resolved, and documents how to avoid them in the future. Builds a referential problems reference for quick lookup. Invoke when user says "update problem tracker", "review problems", "analyze problems", "what problems have we seen", "how did we fix X", "check knowledge base", "extract lessons learned", or when closing a session that had problems.
---

# EXECUTION MINDSET

**You are an ANALYST. Your job is to extract patterns from raw problem data and produce a scannable, actionable reference that prevents the team from repeating mistakes.**

- DO: Read every problem table in journal.md — do not skip sessions
- DO: Identify causes, not just symptoms
- DO: Write avoidance advice that is specific and actionable ("use `a.textContent`" not "be careful with links")
- DO: Preserve existing problem IDs and category groupings when updating
- DON'T: Summarize successes, actions, or time — this skill tracks **problems only**
- DON'T: Invent problems that are not in the journal — only track what actually happened
- DON'T: Write vague avoidance advice — if you cannot name the specific technique, the advice is not useful
- DON'T: Duplicate the journal — the reference is analysis and synthesis, not a copy

**Your output should be a single file that a developer can search in 10 seconds to find "have we seen this before? how did we fix it? how do we avoid it?"**

---

# Problem Tracker Skill

## Scope: Problems Only

This skill **does not** summarize actions, outcomes, or time. It focuses **only** on:

- **Problems Encountered** tables in the journal
- Failed attempts (actions with result = `fail`, or attempts > 1) only insofar as they relate to a recorded problem
- Recurring themes (same or similar problem across multiple sessions)
- Resolution and **avoidance** guidance

Ignore all other journal sections except to resolve session numbers or dates when citing a problem.

## Purpose

Review the journal produced by the journaling skill and maintain a **referential problems reference** so you can look up past issues, what caused them, how they were resolved, and how to avoid them in the future. This establishes a learning loop from encountered problems.

The reference answers three questions:

1. **"Have we seen this problem before?"** — Search by category or keyword
2. **"How did we fix it last time?"** — Read the Resolution column
3. **"How do we avoid this in the future?"** — Scan the Prevention Checklists or the "How to avoid" column

## When to Use

- **After sessions with problems** — Update the reference with new findings
- **On request** — User asks to "review problems", "update problem tracker", "what issues have we seen", "how did we fix X"
- **Before similar work** — Consult the reference when starting work that might repeat past failure modes (e.g., before DA-related changes, before Lottie work, before git operations in containers)

## Rules

1. **Source of truth is journal.md.** The reference is derived. If they conflict, journal.md wins. Never modify journal.md from this skill.

2. **Stable IDs.** Once a problem gets an ID (e.g., `DA-001`), it keeps that ID forever. Read the existing reference before updating to preserve IDs.

3. **Append and merge.** Add new problems; merge into existing categories when it's the same or similar issue. Do not delete history. If you rename a category, keep the old session refs.

4. **Avoidance must be actionable.** Every "How to avoid" entry and every checklist item must contain a specific technique, value, or command — not generic advice.

5. **Do not fabricate.** Only track problems that appear in journal.md problem tables or `project-context.md` active blockers. Do not speculate about potential problems.

6. **Portable.** The reference lives in the same directory as the journal so it travels with the project.

## Locations

- **Journal source:** Same as journaling skill. Default: `journal/journal.md` at workspace root. If the project uses `JOURNAL_DIR` or `journal-config.yaml`, use that path.
- **Reference output:** Same directory as the journal. Default: `journal/problems-reference.md`.
- **Schema template:** `skills/excat-problem-tracker/problems-reference-format.md`

## Problem Entry Schema

Each problem captured in the reference has these fields:

| Field | Required | Description |
|-------|----------|-------------|
| **Problem** | yes | Short, normalized description (use consistent wording for recurring issues) |
| **ID** | yes | Stable identifier: `{PREFIX}-{NNN}` (e.g., `DA-001`) |
| **Cause** | yes | What led to it — root cause or context |
| **Resolution** | yes (if resolved) | How it was fixed (from journal or concise paraphrase) |
| **How to avoid** | yes | Concrete, actionable guidance: checklists, patterns, "always X / never Y" |
| **Sessions** | yes | Session numbers where this appeared (e.g., "001, 003") |
| **Severity** | yes | `blocker` / `major` / `minor` (from journal) |
| **Resolved?** | yes | `yes` / `no` / `workaround` |

### Category Prefixes

| Category | Prefix |
|----------|--------|
| DA / URL and path mangling | `DA` |
| Git / environment | `GIT` |
| Performance / loading | `PERF` |
| File sync / auto-generation | `SYNC` |
| Build / deployment | `BUILD` |
| Content authoring | `AUTH` |
| Block rendering | `BLOCK` |
| (new categories) | Short uppercase prefix assigned on first encounter |

IDs are stable — once assigned, a problem keeps its ID even if the category is renamed.

## Workflow

### Step 1: Read the journal

- Open `journal/journal.md` (or configured path)
- Locate every `### Problems Encountered` section and parse the markdown table:
  ```
  | Problem | Severity | Resolved? | Resolution | Related Action # |
  ```
- Note session headers (`## Session NNN — date — title`) so you can cite which session each problem came from
- Also check `project-context.md` for `## Active Blockers` — any blockers not yet in the reference become new unresolved problems

### Step 2: Extract and normalize

For each problem row, capture all schema fields. Group problems that are **the same or clearly similar** into one category (e.g., "DA mangles hrefs" and "DA converts dots to hyphens" → same category). Recurring problems (2+ sessions) are highest value for the reference.

### Step 3: Add cause and avoidance

For each distinct problem or category:
- **Cause** — What led to the problem (from resolution text, session context, or inference)
- **How to avoid** — Concrete, actionable guidance. If the journal implies avoidance in the resolution, extract or paraphrase it. Use "always X / never Y" format when possible.

### Step 4: Update the reference

Write or update `journal/problems-reference.md` using the schema in [problems-reference-format.md](problems-reference-format.md):

1. **Prevention Checklists** at the top — one subsection per category, checkbox format for pre-work scanning
2. **Problems by category** — each category gets a table with all fields, plus Recurring flag and Notes
3. **Unresolved / workaround-only** section — only if any exist

Append new findings; merge new problems into existing categories when they match. Do not remove past entries.

### Step 5: Quick lookup (on-demand)

When the user asks "how did we fix X?" or "have we seen this before?":

1. Read `journal/problems-reference.md`
2. Match the user's issue to a category or entry
3. Respond with: what the problem was, how it was resolved, and how to avoid it
4. Cite the session(s) (e.g., "See Session 001, 002 in journal")

## When to Run

| Trigger | Action |
|---------|--------|
| User requests ("update problem tracker", "review problems", etc.) | Full run (steps 1–4) |
| Session close that had problems | Full run (steps 1–4) |
| Session close with no problems | Skip — no new data to process |
| Encountering a problem mid-session | Read-only: consult existing reference (step 5) |
| User asks "have we seen this?" / "how did we fix X?" | Read-only: search reference (step 5) |

## Integration with Journaling Skill

**Reads from:**
- `journal.md` — `### Problems Encountered` tables
- `project-context.md` — `## Active Blockers` section

**Writes to:**
- `problems-reference.md` only

**No circular dependency.** This skill reads from journal files but does not write to them. The journaling skill does not need to know this skill exists. They share a data directory and operate independently.

**Invocation sequence at session close:**
1. Journaling skill finalizes session entry in `journal.md`
2. Journaling skill updates `metrics.md` and `project-context.md`
3. (If session had problems) Problem tracker runs, reads updated journal, updates `problems-reference.md`

## Output File Structure

```markdown
# Problems Reference — [Project Name]

> Referential index of problems encountered (from the project journal), their
> resolutions, and how to avoid them. Updated by the problem tracker skill.

**Source:** `journal/journal.md`
**Last review:** [YYYY-MM-DD] (after Session [NNN])

## Quick Reference — Prevention Checklists

### [Category Name]
- [ ] [Verb] [specific technique/value] — [brief context] ([ID])
- [ ] ...

## [Category Name]

| Problem | ID | Cause | Resolution | How to avoid | Sessions | Severity | Resolved? |
|---------|----|-------|------------|--------------|----------|----------|-----------|
| [Short desc] | [DA-001] | [What caused it] | [How fixed] | [Concrete guidance] | [001, 003] | [blocker] | [yes] |

**Recurring:** Yes/No
**Notes:** [Optional: link to code, doc, or skill that encodes the fix]

## Unresolved or Workaround-Only

| Problem | ID | Sessions | Current state |
|---------|----|----------|---------------|
| [Desc] | [ID] | [001, 003] | Workaround: [brief]. Still open: [what's left]. |
```

## Troubleshooting

**Reference seems out of date:**
- Re-run the skill. It reads journal.md and merges new problems.
- If journal.md has been updated but the reference has not, the skill simply hasn't been invoked.

**Problem IDs changed unexpectedly:**
- The skill should read the existing reference before updating. Verify step 1 is reading `problems-reference.md`.

**Category names differ from metrics.md:**
- The reference may use more descriptive category names (e.g., "DA / URL and path mangling" vs. "DA compatibility"). This is fine — they serve different purposes.

**No problems to track:**
- If journal.md has no problems, the reference will be minimal. This means the project is running smoothly.

## Additional Resources

- Reference file schema and example: [problems-reference-format.md](problems-reference-format.md)
- Journal schema (for parsing Problems tables): `skills/excat-journaling/journal-format.md`

---

*Problem Tracker Skill v2.0 — Merged from excat-problem-tracker v1.0 + journal-problems-review best practices*
