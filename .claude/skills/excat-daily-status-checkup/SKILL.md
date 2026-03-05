---
name: excat-daily-status-checkup
description: Review the project journal, time tracking, and problem reference to build context for a new session or day. Produces a concise status briefing covering where the project stands, what was done recently, what's pending, active problems, and time invested. Invoke when user says "status checkup", "where did we leave off", "catch me up", "what's the status", "daily checkup", "start of day", "resume", "session context", "what's the state of the project", "what needs to be done", or at the start of any new session.
---

# EXECUTION MINDSET

**You are a PROJECT BRIEFER. Your job is to quickly synthesize all project tracking data into a clear, actionable status briefing.**

- DO: Read every data source listed in the Sources table
- DO: Surface the most recent carry-forward and resume point prominently — **these are the authoritative starting point**
- DO: Highlight unresolved problems and active blockers first
- DO: Keep the briefing to **one screen** of scannable bullets
- DO: End with a clear "where to begin" derived from the carry-forward and pending items
- DON'T: Repeat the full journal — summarize, don't transcribe
- DON'T: Include resolved problems unless they're relevant to pending work
- DON'T: Fabricate status — only report what's in the data sources

**Your output should let someone go from "I haven't looked at this project in days" to "I know exactly where we are and what to do next" in one read.**

---

# Daily Status Checkup Skill

## Scope: Context Building (Primarily Read-Only)

This skill focuses on reading and synthesizing existing project data. Its primary output is a briefing in the reply. Optionally, it can write a `journal/status-checkup.md` or `journal/session-context.md` snapshot (overwritten each run, never appended).

## Purpose

Build a status briefing that re-establishes context for a new session or workday. Useful for:

- **Start of day** — "Where did we leave off? What should I work on?"
- **Session resumption** — Context was lost (new conversation, restart, timeout)
- **Stakeholder update** — Quick summary of project status for someone not involved daily
- **Pre-work scanning** — Review known problems before starting a task

## When to Use

- **Automatically** — At the start of every new conversation or session (if journal files exist)
- **On request** — User asks "status", "where are we", "catch me up", "daily checkup", "what did we do last", "session context", "what's the state of the project"
- **After a gap** — Any time there's been a break between sessions (hours, days, weeks)

## Rules

1. **Resume Point and Carry-Forward are authoritative.** The carry-forward from the most recent journal session is the canonical starting point. `project-context.md` Resume Point reinforces it. If they conflict, the journal entry is newer and wins. These are maintained by the journaling skill — trust them.

2. **Read-only by default.** This skill reads data sources and outputs in the reply. It only writes a file when explicitly requested or when the optional file-write step is enabled. Do not update journal.md, project-context.md, time-tracking.md, or problems-reference.md from this skill.

3. **Blockers first.** Unresolved problems and active blockers go at the top of the briefing, before anything else.

4. **One screen.** The briefing should fit on one screen of scannable bullets. Use bullets, not paragraphs. One line per item. If it's too long, cut the least urgent parts. Detail lives in the source files; the checkup is the index.

5. **Suggest where to begin.** End with a concrete "where to begin" action derived from the carry-forward, pending items, and project context.

6. **No fabrication.** Only report what's in the data sources. If a file is missing, say so and skip that section. Do not create the file from this skill.

## Sources

All paths use the same journal directory as excat-journaling. Default: `journal/` at workspace root. If the project uses `JOURNAL_DIR` or `journal-config.yaml`, use that path.

| Source | File | What to Extract |
|--------|------|-----------------|
| State snapshot | `journal/project-context.md` | Last updated, branch, overall status, What's Done, What's In Progress, What's Pending, Active Blockers, Key Files, **Resume Point** |
| Session history | `journal/journal.md` | Last 1-2 sessions: **Carry-Forward** of the most recent session, outcomes, key decisions |
| Session index | `journal/journal-index.md` | Recent session numbers and one-line summaries; session count and dates |
| Problem reference | `journal/problems-reference.md` | Quick Reference / Prevention Checklists; unresolved or workaround-only items; categories and counts |
| Time report | `journal/time-tracking.md` | Project total (agent and with margin); recent daily totals (last 1-3 days) |
| Metrics | `journal/metrics.md` | Session count, success rates, problem stats |
| Git (optional) | `git status` / `git branch` | Branch, uncommitted changes, recent commits if helpful |

## Workflow

### Step 1: Read the state snapshot

- Open `journal/project-context.md`
- Extract: Last updated, branch, overall status, What's Done, What's In Progress, What's Pending, Active Blockers, Key Files, **Resume Point**
- The Resume Point is the primary "where to begin" statement

### Step 2: Read recent journal activity

- Open `journal/journal-index.md` for the session list
- Open `journal/journal.md` and find the **most recent session** (last `## Session NNN — ...` block)
- Read its **Carry-Forward** section — this is the session-level "where to start"
- Optionally read the previous session's Carry-Forward if the most recent is sparse
- Do not read full session bodies unless the user asks for detail — just the tail

### Step 3: Check time and metrics

- Open `journal/metrics.md` for cumulative stats (sessions, actions, success rate)
- Open `journal/time-tracking.md` header for project total time (agent and with margin)
- Note **recent daily totals** (e.g. yesterday and today, or last 2-3 days) so you know recent time investment
- Note most recent session date to gauge how long since last activity
- Session-level or daily-level totals are enough — no need to list every action

### Step 4: Check for open problems

- Open `journal/problems-reference.md`
- **Quick Reference / Prevention Checklists** — summarize or list the categories and that they exist (e.g. "DA: match links by text, not href")
- Look for any rows where `Resolved?` is `no` or `workaround` — call out unresolved items
- Optionally note the number of problems and categories (e.g. "8 problems in 5 categories, 6 resolved") for a one-line health check
- Note total problems and resolution rate

### Step 5: Check git status (optional)

- Run `git status` and `git branch` to note:
  - Current branch name
  - Whether there are uncommitted changes
  - Whether the branch is ahead/behind remote
- If project-context.md lists Key Files, note them; only verify existence if the user has asked about project state in detail
- Skip this step if git is not available or not relevant

### Step 6: Build the briefing

Assemble the status checkup using the format in [status-checkup-format.md](status-checkup-format.md). Output directly in the reply.

Sections in order (builds context before action):

1. **Where we stand** — Overall status, what's done, in progress
2. **What needs to be done** — Pending items from project-context and carry-forward priorities
3. **Problems to keep in mind** — Category-level prevention items + unresolved problems. Skip if none.
4. **Where to begin** — The carry-forward from the most recent session. Single most important line.
5. **Recent time** — Total sessions, total time, success rate. Keep minimal (optional).

### Step 7: Write snapshot file (optional)

If requested by the user, or if the session will involve complex multi-step work:

- Write the briefing to `journal/status-checkup.md` or `journal/session-context.md` (overwrite, never append)
- This file serves as a context anchor if the conversation is lost mid-session

## When to Run

| Trigger | Action |
|---------|--------|
| Start of new conversation/session | Auto-run if journal files exist |
| User asks "status" / "where are we" / "catch me up" / "session context" | Full briefing |
| User asks "what's next" / "what should we work on" | Abbreviated: where to begin + what needs to be done only |
| After context loss (restart, timeout) | Full briefing |

## Integration

**Reads from:**
- `journal/project-context.md`
- `journal/journal.md` (tail only — last 1-2 sessions)
- `journal/journal-index.md`
- `journal/problems-reference.md`
- `journal/time-tracking.md` (header + recent daily totals)
- `journal/metrics.md`

**Writes to (optional):**
- `journal/status-checkup.md` or `journal/session-context.md` — Overwritten each run, never appended. Only when explicitly requested or when Step 7 is enabled.

**Relationship to other skills:**
- Consumes output from: journaling skill (journal.md, index, context, metrics), problem tracker (problems-reference.md), time tracking (time-tracking.md)
- Does not compete with or duplicate any other skill
- Designed to run *before* any other skill in a session — it builds the context that other skills operate within

## Troubleshooting

**Journal files don't exist yet:**
- This is a new project. Skip the briefing and note that journaling should be initialized first.

**project-context.md is stale:**
- Check journal.md for more recent sessions. The carry-forward in the last journal entry is authoritative. Note the discrepancy.

**No carry-forward in the last session:**
- Use the last session's outcomes and pending items from project-context.md to suggest next steps.

**Multiple days since last session:**
- Note the gap. Summarize what was happening when work stopped and what the resume point was.

**Source file missing:**
- Say so and skip that section. Do not create the file from this skill.

## Additional Resources

- Briefing format: [status-checkup-format.md](status-checkup-format.md)
- Journal schema: `skills/excat-journaling/journal-format.md`
- Problems schema: `skills/excat-problem-tracker/problems-reference-format.md`
- Time report schema: `skills/excat-project-time-tracking/time-report-format.md`

---

*Daily Status Checkup Skill v1.2*
