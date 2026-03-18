---
name: excat-project-time-tracking
description: Review the project journal to compile daily time reports — actions taken, time per action, session totals, daily totals, and cumulative project time. Invoke when user says "time report", "how much time today", "daily summary", "time tracking", "what did we work on today", "project hours", "time for [date]", "break out today's actions", or when closing out a day's work.
---

# EXECUTION MINDSET

**You are a TIME ANALYST. Your job is to compile clear, accurate daily time reports from journal session data.**

- DO: Read every session entry and extract action-level time estimates
- DO: Group sessions by date and calculate accurate totals
- DO: Show both agent time and total time (with margin) for transparency
- DO: Normalize times to minutes for arithmetic, then display as `Xh Ym` when >= 60m
- DON'T: Invent time data — only report what's in the journal
- DON'T: Include problem details, key decisions, or other non-time content — the problem tracker handles that
- DON'T: Round aggressively — preserve the granularity from the journal

**Your output should let someone answer "how much time did we spend on this project today?" in under 10 seconds.**

---

# Project Time Tracking Skill

## Scope: Time Only

This skill focuses **only** on time data:

- Session dates and durations
- Action-level time estimates
- User overhead margins
- Daily and cumulative totals

It does not track problems (that's the problem tracker), context (that's project-context.md), or detailed outcomes (that's the journal itself).

## Purpose

Compile daily time reports from the project journal. Useful for:

- **Daily standup/reporting** — "What did we work on and how long?"
- **Project accounting** — Track cumulative hours invested
- **Estimation calibration** — Compare estimated vs. actual time patterns
- **Billing/invoicing** — Break down time by date with action-level detail

## When to Use

- **End of day** — Compile the day's time report
- **On request** — User asks "how much time today?", "daily summary", "time report", "project hours", "time for 2026-02-26"
- **Weekly/periodic review** — Compile multi-day summaries
- **Start of session** — Quick glance at cumulative time invested

## Rules

1. **Source of truth is journal.md.** Time data is extracted from session entries. If the report and journal conflict, journal.md wins.

2. **Overwrite, don't append.** `time-tracking.md` is regenerated each run. It's a derived report, not an independent record.

3. **Include margins when available.** If the journal has a Duration line with agent time + margin, use it. If margin isn't recorded, report agent time only and add a note: *"Margin not in journal; add 5-15% for user overhead if needed."*

4. **Action-level detail.** Break out individual actions with their time estimates — don't just show session totals.

5. **Do not fabricate.** Only report time that appears in journal.md. If a session has no time estimates, note "no time data" rather than guessing.

6. **Date scope.** When the user asks for a specific date, only include sessions on that exact date. Ignore sessions on other days.

7. **Time display.** Normalize all times to minutes for arithmetic (e.g., `1h 30m` -> 90). Display totals as `Xh Ym` when >= 60m, or `Xm` when under. Handle `~` prefixes.

## Locations

- **Journal source:** Same as journaling skill. Default: `journal/journal.md`. If the project uses `JOURNAL_DIR` or `journal-config.yaml`, use that path.
- **Report output:** Same directory as the journal. Default: `journal/time-tracking.md`.
- **Schema template:** `skills/excat-project-time-tracking/time-report-format.md`

## Workflow

### Step 1: Determine the date

- **Default:** All dates (full report).
- **Single date:** If the user asks for a specific date ("time for today", "time for 2026-02-26"), use that date only.
- **Date range:** If the user asks for a range ("this week", "last 3 days"), filter to matching dates.

### Step 2: Read the journal

- Open `journal/journal.md`
- For each session, extract:
  - Session number, date, title (from header: `## Session NNN — YYYY-MM-DD [HH:MM-HH:MM] — Title`)
  - Duration line: agent time, margin percentage, total with margin
  - Each action's time estimate from the Actions table or bullet list
- If filtering to a specific date, skip sessions that don't match.

### Step 3: Extract session-level duration

For each session, look for the Duration line:
```
**Duration:** ~Xh Ym (agent) + N% user overhead = ~Xh Ym total
```

Parse agent time and total-with-margin. Use these for session subtotals — they already reflect the journal's margin. If missing, sum action times and note "agent time only; margin not in journal."

### Step 4: Group by date and calculate totals

- Group sessions by their date (from the session header)
- Sessions spanning multiple dates (like Session 000: "2026-02-18 to 2026-02-25") go under their start date with a note

For each date:
- **Actions:** List each action with its time estimate
- **Session subtotal:** Agent time sum, plus session total with margin if available
- **Daily total:** Sum of all session totals for that date

Cumulative:
- **Project total:** Sum of all daily totals across the entire journal

### Step 5: Generate output

**Choose output mode based on context:**

**(a) Full report** (default for "time report", "compile time", end of day):
Write `journal/time-tracking.md` using the schema in [time-report-format.md](time-report-format.md):

1. **Header** with last-updated timestamp and cumulative project total
2. **Daily sections** in reverse chronological order (most recent first) — each with:
   - Date heading and daily total
   - Per-session breakdown with action-level detail
   - Per-session subtotals (agent time and total with margin)
3. **Cumulative summary** at the bottom with total sessions, total time, total actions

**(b) Quick reply** (for "how much time today?", "quick summary"):
Output the daily summary directly in the reply without writing a file. Use the same per-session format but skip the file header and cumulative summary.

## Output File Structure

```markdown
# Time Tracking — [Project Name]

> Daily time reports compiled from journal.md session data.
> Last updated: [YYYY-MM-DD] (after Session [NNN])

**Project total:** [Xh Ym] (agent) / [Xh Ym] (with margin)

---

## [YYYY-MM-DD] — [Daily total with margin]

### Session [NNN] — [Title] ([agent time] agent + [N]% = [total])

| # | Action | Time |
|---|--------|------|
| 1 | [Action description] | [Xm] |
| 2 | [Action description] | [Xm] |
| **Total** | | **[Xm]** |

**Session subtotal (agent):** [Xh Ym]
**Session total (with margin):** [Xh Ym]

---

*(Repeat for each session on this day.)*

**Daily total:** [Xh Ym] (agent) / [Xh Ym] (with margin)

---

## Cumulative Summary

| Date | Sessions | Agent Time | With Margin | Actions |
|------|----------|------------|-------------|---------|
| [YYYY-MM-DD] | [N] | [Xh Ym] | [Xh Ym] | [N] |
| ...  | ...      | ...        | ...         | ...     |
| **Total** | **[N]** | **[Xh Ym]** | **[Xh Ym]** | **[N]** |
```

## When to Run

| Trigger | Action |
|---------|--------|
| User asks "time report" / "daily summary" / "compile time" | Full run — write `time-tracking.md` (steps 1-5a) |
| End of day / closing out work | Full run — write `time-tracking.md` (steps 1-5a) |
| User asks "how much time today?" / "quick summary" | Quick reply — output in chat (steps 1-5b) |
| User asks "how much total time?" | Read-only: check header of existing report or metrics.md |
| Session close | Optional — run if user wants up-to-date time tracking |

## Integration

**Reads from:**
- `journal.md` — Session headers (date, duration) and action time estimates

**Writes to:**
- `time-tracking.md` only (full report mode)

**Relationship to metrics.md:** The journaling skill maintains `metrics.md` with cumulative time stats. This skill provides the **daily breakdown** that metrics.md summarizes. They complement each other — metrics.md gives the totals, time-tracking.md shows the detail.

## Parsing Notes

### Session header formats

```
## Session NNN — YYYY-MM-DD — Title
## Session NNN — YYYY-MM-DD HH:MM-HH:MM — Title
```

Match the date token after the first `—`. Ignore time range if present.

### Duration line formats

```
**Duration:** ~Xm (agent) + N% user overhead = ~Xm total
**Duration:** ~Xh Ym (agent) + N% user overhead = ~Xh Ym total
```

Extract: agent time, margin percentage, total with margin.

### Action time formats

**Table format:**
```
| # | Action | Pattern | Attempts | Result | Time (est.) |
| 1 | [Action description] | new | 1 | pass | Xm |
```
The last column is the time estimate.

**Bullet format:**
```
- [x] Action description (~Xm) — pass
```
Time is in parentheses with `~` prefix.

### Normalizing times

- Convert all times to minutes for summing: `1h 30m` -> 90, `20m` -> 20, `~45m` -> 45
- Handle `~` prefix (strip for arithmetic)
- Handle optional `h`/`m` suffixes
- Display: use `Xm` when < 60, `Xh Ym` when >= 60

### Backfill sessions

Session 000 may span multiple dates. List it under its start date and note the date range in the output.

## Troubleshooting

**Report seems out of date:**
- Re-run the skill. It regenerates from journal.md each time.

**Times don't match metrics.md:**
- Both are derived from journal.md. If they disagree, recheck the journal. Small rounding differences are expected.

**Session has no time estimates:**
- Note "no time data" for that session. Do not estimate or fabricate.

**Backfill session spans multiple dates:**
- List under the start date with a note about the date range. Do not split across dates.

**Duration line missing margin:**
- Report agent time only for that session. Add note: "Margin not in journal; add 5-15% for user overhead if needed."

## Additional Resources

- Report file schema: [time-report-format.md](time-report-format.md)
- Journal schema (for parsing): `skills/excat-journaling/journal-format.md`
- Time estimation guide: `skills/excat-journaling/SKILL.md` (Time Tracking section)

---

*Project Time Tracking Skill v1.1*
