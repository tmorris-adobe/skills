---
name: excat-journaling
description: Maintain a running project journal that tracks sessions, actions taken, success/failure rates, problems encountered, resolutions, and time spent. Provides rapid context recovery between sessions. Invoke when user says "journal", "log session", "update journal", "what did we do last", "where did we leave off", "session summary", or at the start/end of any work session.
---

# EXECUTION MINDSET

**You are a meticulous RECORD-KEEPER. Your job is to maintain an accurate, useful project journal that enables rapid context recovery between sessions.**

- DO: Record every significant action, outcome, and decision
- DO: Track time spent and attempts needed for each task
- DO: Note problems encountered and how they were resolved
- DO: Write entries that your future self can scan quickly for context
- DON'T: Write vague summaries — be specific about files, commits, and outcomes
- DON'T: Skip recording failures — they're as important as successes
- DON'T: Editorialize — state facts, not opinions about difficulty

**Your output should be a clear, scannable project history that any session can pick up and continue from.**

---

# Project Journaling Skill

## Rules

These rules are non-negotiable. They protect journal integrity across sessions:

1. **Append-only history.** Never remove, rewrite, or edit past session entries. If a past entry contains an error, add a correction note in the *current* session — don't modify the original.

2. **Same-session updates.** While a session is active, you may update the *current* session entry (add actions, fill in outcomes, update carry-forward). Once a session is closed and a new one starts, the old session is frozen.

3. **Keep Carry-Forward current.** The Carry-Forward section of the *most recent* session entry must always reflect the true next step. Update it whenever priorities shift during the session.

4. **One active session at a time.** Never have two open session entries. Close the current session before starting a new one.

5. **Be specific, not vague.** Write file names, function names, commit hashes, and error messages — not "fixed the thing" or "updated some files."

6. **Record failures equally.** Failed attempts and dead ends are valuable context. Don't skip them.

7. **Be concise.** Short bullets and one-line resolutions. Avoid long prose in journal entries — save narrative for Key Decisions where rationale matters.

## Purpose

Maintain a structured, running journal for any project that tracks session activity, task outcomes, problems, resolutions, and time investment. The journal serves as the primary context-recovery mechanism between sessions, enabling any new session to quickly understand: what was done, what's pending, what problems exist, and where to resume work.

## Portability

This skill is **project-agnostic**. The SKILL.md contains the instructions and schema; the actual journal data lives in a configurable journal directory. To port this skill to a new project:

1. Copy the `skills/excat-journaling/` directory (includes `SKILL.md` and `journal-format.md`)
2. The skill will create the journal directory on first use
3. All project-specific data stays in the journal directory, not in the skill

### Journal Path Convention

The default journal path is `{workspace-root}/journal/`. To override:

- Set `JOURNAL_DIR` in your project's `.env` or workspace config
- Or create a `journal-config.yaml` in the skill directory with:
  ```yaml
  journal_dir: /path/to/custom/journal
  ```
- If neither is set, the skill uses `/workspace/journal/`

The portable template `journal-format.md` (in the skill directory) serves as a quick reference for the entry schema without needing to read the full SKILL.md.

## File Structure

```
/workspace/journal/
├── journal.md              # The running journal (append-only)
├── journal-index.md        # Quick-reference index of all sessions
├── project-context.md      # High-level project state (updated each session)
└── metrics.md              # Cumulative time and success metrics
```

### File Purposes

| File | Purpose | Update Frequency |
|---|---|---|
| `journal.md` | Detailed session-by-session log with all actions, outcomes, timings | Every action within a session |
| `journal-index.md` | One-line summary per session for fast scanning | End of each session |
| `project-context.md` | Current project state snapshot: what's done, what's pending, active blockers | End of each session (overwritten) |
| `metrics.md` | Cumulative statistics: total time, success rates, common issues | End of each session |

## Journal Entry Schema

Each session entry in `journal.md` follows this structure:

```markdown
---

## Session [NNN] — [YYYY-MM-DD] [HH:MM–HH:MM] — [Brief Title]

**Branch:** `[git-branch-name]`
**Duration:** [estimated-time] (agent) + [margin]% user overhead = [total-estimate]
**Session goal:** [What was the user trying to accomplish]

### Actions

| # | Action | Pattern | Attempts | Result | Time (est.) |
|---|--------|---------|----------|--------|-------------|
| 1 | [What was done] | [new/retry/continuation] | [N] | [pass/fail/partial] | [Xm] |
| 2 | ... | ... | ... | ... | ... |

### Outcomes
- **Completed:** [List of things finished this session]
- **Partial:** [Things started but not finished, with state description]
- **Deferred:** [Things identified but intentionally postponed]

### Problems Encountered

| Problem | Severity | Resolved? | Resolution | Related Action # |
|---------|----------|-----------|------------|-----------------|
| [Description] | [blocker/major/minor] | [yes/no/workaround] | [How it was fixed] | [#N] |

### Key Decisions
- [Decision made and rationale, if any non-obvious choices were made]

### Files Changed
- `[path/to/file]` — [what changed and why]

### Commits
- `[short-hash]` — [commit message summary]

### Carry-Forward
> [What the next session should know and where to start]
```

**Notes on the schema:**
- The `[HH:MM–HH:MM]` time range in the header is optional but recommended when known
- The Actions table is the default format for detailed sessions. For quick sessions (< 5 actions, all straightforward), you may use **bullet format** instead:

```markdown
### Actions
- [x] Action description (~Xm) — pass
- [x] Action description (~Xm) — pass, 2 attempts
- [ ] Action description — deferred
```

Use table format when actions involve retries, multiple patterns, or you need the granularity. Use bullet format for simple, linear sessions. Don't mix formats within a single session.

## Time Tracking

### Estimation Rules

Time is tracked per-action using these estimation guidelines:

| Action Type | Base Estimate | Examples |
|---|---|---|
| File read/analysis | 1–2 min | Reading a file, reviewing code structure |
| Simple edit | 2–3 min | Fixing a typo, updating a reference, small CSS change |
| Code generation | 5–15 min | Writing a new function, creating a block, building a component |
| Complex implementation | 15–45 min | Multi-file feature, new block with JS+CSS, migration workflow |
| Debugging/troubleshooting | 10–30 min | Investigating a rendering issue, fixing a broken integration |
| Research/exploration | 5–15 min | Searching codebase, reading docs, exploring block library |
| Conversion/generation | 3–5 min | Markdown to HTML, generating document paths |
| Git operations | 1–2 min | Staging, committing, pushing |
| Visual verification | 3–5 min | Screenshot, preview, visual comparison |

### User Overhead Margin

Every session total includes a **user overhead margin** (5%–15%) to account for:
- User reading and reviewing outputs
- User thinking about next steps between actions
- User providing input or making decisions
- Context switching and interruptions
- Session startup/shutdown

**Margin selection:**
- **5%** — Highly autonomous session, minimal user interaction (e.g., bulk operations)
- **10%** — Typical session with moderate user direction
- **15%** — Exploratory session with frequent user decisions and discussion

The margin is applied to the total agent time: `total = agent_time × (1 + margin)`

## Workflow

### When to Journal

The skill activates at these trigger points:

1. **Session start** — Read `project-context.md` and recent `journal.md` entries to recover context
2. **During session** — Append actions to the current session entry as work progresses
3. **Session end** — Finalize the session entry, update index, update project context, update metrics
4. **On request** — User asks "where did we leave off?", "what did we do?", "update the journal", etc.

### Phase 1: Session Open

**Goal:** Recover context and begin a new session entry.

**Steps:**

1. **Check for existing journal:**
   ```
   /workspace/journal/journal.md     — exists?
   /workspace/journal/project-context.md — exists?
   ```

2. **If journal exists:** Read `project-context.md` for current state, then read the last 1–2 sessions from `journal.md` for recent context.

3. **If no journal:** Initialize the journal directory and files (see Phase 4: Initialization).

4. **Start new session entry:** Append a new session header to `journal.md` with:
   - Session number (increment from last)
   - Today's date
   - Current git branch
   - Session goal (from user's first request or inferred from context)

### Phase 2: During Session

**Goal:** Record actions as they happen.

**Steps:**

1. **After each significant action**, append a row to the current session's Actions table:
   - Action number (sequential within session)
   - What was done (specific — include file names, function names, block names)
   - Pattern: `new` (first attempt), `retry` (re-attempting something that failed), `continuation` (picking up incomplete work)
   - Number of attempts before success (1 if first try worked)
   - Result: `pass` (fully successful), `fail` (did not work), `partial` (partially worked)
   - Estimated time

2. **When a problem is encountered**, add it to the Problems table:
   - Description of what went wrong
   - Severity: `blocker` (can't continue), `major` (significant impediment), `minor` (inconvenience)
   - Whether it was resolved
   - How it was resolved (if applicable)
   - Which action number it relates to

3. **When a decision is made**, note it in Key Decisions:
   - What was decided and why
   - Only for non-obvious choices (don't log "decided to use standard EDS patterns")

### Phase 3: Session Close

**Goal:** Finalize the session record and update derived files.

**Steps:**

1. **Complete the session entry** in `journal.md`:
   - Fill in Outcomes (completed, partial, deferred)
   - Fill in Files Changed
   - Fill in Commits
   - Write the Carry-Forward note
   - Calculate total duration with user margin

2. **Update `journal-index.md`** — Append one line:
   ```markdown
   | [NNN] | [YYYY-MM-DD] | [Brief title] | [duration] | [X completed, Y partial, Z problems] |
   ```

3. **Overwrite `project-context.md`** with current state:
   ```markdown
   # Project Context — [Project Name]
   **Last updated:** [YYYY-MM-DD] (Session [NNN])
   **Branch:** `[branch]`
   **Overall status:** [one-line summary]

   ## What's Done
   - [Completed items with references to sessions]

   ## What's In Progress
   - [Partially completed items with current state]

   ## What's Pending
   - [Known upcoming work]

   ## Active Blockers
   - [Anything preventing progress]

   ## Key Files
   - [Important files and their roles in the project]

   ## Resume Point
   > [Exactly where the next session should begin]
   ```

4. **Update `metrics.md`** with cumulative stats:
   ```markdown
   # Project Metrics

   ## Time
   - **Total sessions:** [N]
   - **Total agent time:** [Xh Ym]
   - **Total with user margin:** [Xh Ym]
   - **Average session length:** [Xm]

   ## Success Rates
   - **Actions attempted:** [N]
   - **First-try success:** [N] ([%])
   - **Required retry:** [N] ([%])
   - **Failed:** [N] ([%])

   ## Problems
   - **Total encountered:** [N]
   - **Resolved:** [N] ([%])
   - **Unresolved:** [N]
   - **Most common category:** [category]
   ```

### Phase 4: Initialization

**Goal:** Set up the journal for a new project.

Run this when no journal exists:

1. **Create directory:** `/workspace/journal/`

2. **Create `journal.md`:**
   ```markdown
   # Project Journal — [Project Name]

   > Running log of all sessions, actions, outcomes, and time tracking.
   > Each session is appended chronologically. Read from bottom for most recent.

   ---
   ```

3. **Create `journal-index.md`:**
   ```markdown
   # Session Index

   | Session | Date | Summary | Duration | Outcomes |
   |---------|------|---------|----------|----------|
   ```

4. **Create `project-context.md`:**
   ```markdown
   # Project Context — [Project Name]
   **Last updated:** [YYYY-MM-DD] (Session 001)
   **Branch:** `[branch]`
   **Overall status:** Project initialized

   ## What's Done
   - (none yet)

   ## What's In Progress
   - (none yet)

   ## What's Pending
   - [Initial goals if known]

   ## Active Blockers
   - (none)

   ## Key Files
   - (to be populated)

   ## Resume Point
   > Begin first working session.
   ```

5. **Create `metrics.md`:**
   ```markdown
   # Project Metrics

   ## Time
   - **Total sessions:** 0
   - **Total agent time:** 0h 0m
   - **Total with user margin:** 0h 0m
   - **Average session length:** —

   ## Success Rates
   - **Actions attempted:** 0
   - **First-try success:** 0 (—)
   - **Required retry:** 0 (—)
   - **Failed:** 0 (—)

   ## Problems
   - **Total encountered:** 0
   - **Resolved:** 0 (—)
   - **Unresolved:** 0
   - **Most common category:** —
   ```

## Backfill Protocol

When this skill is added to an existing project (like this one), create a **backfill session** (Session 000) that summarizes all prior work. Use git log, existing files, and conversation context to reconstruct:

- Major milestones reached
- Key files created/modified
- Known issues and their resolution status
- Approximate total time invested

Mark backfill entries with `[BACKFILL]` so they're clearly distinguished from real-time entries.

## Example Sessions

### Minimal Session (bullet format)

```markdown
---

## Session 005 — 2026-03-01 14:00–14:30 — Fix broken hero image

**Branch:** `fix/hero-image`
**Duration:** 20m (agent) + 10% = 22m
**Session goal:** Fix hero image not loading on homepage

### Actions
- [x] Investigate hero block rendering — found missing alt attribute causing CLS (~3m) — pass
- [x] Fix hero.css to handle missing image gracefully (~5m) — pass
- [x] Verify fix in local preview (~3m) — pass
- [x] Commit fix as `a1b2c3d` (~1m) — pass

### Outcomes
- **Completed:** Hero image rendering fix, CSS fallback for missing images

### Problems Encountered
(none)

### Carry-Forward
> Hero fix committed on `fix/hero-image`. Ready to merge to main. No other open issues.
```

### Session with Problems (table format)

```markdown
---

## Session 008 — 2026-03-05 09:00–11:15 — Migrate pricing page

**Branch:** `issue-12-pricing-page`
**Duration:** 1h 45m (agent) + 15% = 2h 1m
**Session goal:** Migrate pricing page from source site to EDS

### Actions

| # | Action | Pattern | Attempts | Result | Time (est.) |
|---|--------|---------|----------|--------|-------------|
| 1 | Scrape pricing page and identify sections | new | 1 | pass | 10m |
| 2 | Map content to EDS blocks (cards, columns, accordion) | new | 1 | pass | 15m |
| 3 | Generate pricing-page.md with block tables | new | 2 | pass | 20m |
| 4 | Convert to HTML and preview | new | 1 | partial | 5m |
| 5 | Debug accordion block not rendering | new | 3 | pass | 30m |
| 6 | Fix pricing card alignment CSS | new | 1 | pass | 15m |
| 7 | Final preview verification and commit | new | 1 | pass | 10m |

### Outcomes
- **Completed:** Pricing page migrated, accordion block fixed, visual parity achieved
- **Deferred:** Mobile responsive tweaks (identified but out of scope for this session)

### Problems Encountered

| Problem | Severity | Resolved? | Resolution | Related Action # |
|---------|----------|-----------|------------|-----------------|
| Accordion block JS not loading — missing `decorate` export | major | yes | Added `export default function decorate(block)` to accordion.js | #5 |
| First markdown generation had malformed table (missing pipe) | minor | yes | Regenerated with corrected table syntax | #3 |

### Key Decisions
- Used `cards` block for pricing tiers instead of custom `pricing-table` block — simpler authoring, acceptable visual match

### Files Changed
- `content/pricing.md` — New pricing page content
- `content/pricing.html` — Generated HTML for preview
- `blocks/accordion/accordion.js` — Fixed missing decorate export
- `styles/styles.css` — Added pricing card alignment rules

### Commits
- `f4e5d6c` — Migrate pricing page with accordion fix

### Carry-Forward
> Pricing page is live on branch. Mobile responsiveness needs attention (cards stack poorly below 768px). Next priority: migrate the "About Us" page or address mobile CSS.
```

## Reading the Journal

### Quick Context Recovery (start of session)

This is your **default entry point** at the beginning of every session. It should take under 60 seconds:

1. Read `project-context.md` — gives you current state: what's done, what's pending, active blockers
2. Read last entry's **Carry-Forward** section in `journal.md` — tells you exactly where to resume
3. You're ready to work. Start a new session entry.

Only read more if the carry-forward is unclear or the user asks about history.

### Deep Context Recovery (unfamiliar with project)

Use this when you need to understand the full project arc (new contributor, long gap between sessions, etc.):

1. Read `project-context.md` for current state
2. Scan `journal-index.md` for session timeline — identify sessions relevant to your current task
3. Read specific sessions in `journal.md` for detailed history
4. Check `metrics.md` for overall project health (success rates, common problem categories)

### Problem History

Search `journal.md` for the Problems tables to find:
- Recurring issues (same problem across sessions)
- Unresolved blockers
- Resolution patterns that worked
- Categories of problems (check `metrics.md` for the most common category)

## Troubleshooting

**Journal files missing or corrupted:**
- Re-initialize using Phase 4, then backfill from git log
- Git history is the source of truth; the journal is a convenience layer

**Session numbers out of sync:**
- Check `journal-index.md` for the latest session number
- If index is missing, count `## Session` headers in `journal.md`

**Time estimates seem off:**
- Adjust the base estimates table for your project's complexity
- Track actual vs. estimated in a few sessions to calibrate

**Journal too large to read:**
- Use `project-context.md` and `journal-index.md` for quick context
- Only read specific session entries when you need detail
- Consider archiving old sessions to `journal-archive.md` after 50+ sessions

**Metrics drift from journal:**
- If metrics.md numbers don't match what's in journal.md, recount from the journal — journal.md is the source of truth
- Metrics.md is a derived convenience file, not an authoritative record

---

*Journaling Skill v1.1 — Merged from excat-journaling v1.0 + journaling-cursor best practices*
