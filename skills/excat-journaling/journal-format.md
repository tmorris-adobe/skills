# Journal Format — Quick Reference

> Portable template for session entries. See `SKILL.md` for full rules and workflow.

---

## Session [NNN] — [YYYY-MM-DD] [HH:MM–HH:MM] — [Brief Title]

**Branch:** `[git-branch-name]`
**Duration:** [agent-time] (agent) + [margin]% user overhead = [total]
**Session goal:** [What the user is trying to accomplish]

### Actions

**Table format** (default — use for sessions with retries or complexity):

| # | Action | Pattern | Attempts | Result | Time (est.) |
|---|--------|---------|----------|--------|-------------|
| 1 | [Specific action with file/function names] | [new/retry/continuation] | [N] | [pass/fail/partial] | [Xm] |

**Bullet format** (for simple, linear sessions with < 5 straightforward actions):

- [x] Action description (~Xm) — pass
- [x] Action description (~Xm) — pass, 2 attempts
- [ ] Action description — deferred

*Pick one format per session. Don't mix.*

### Outcomes
- **Completed:** [Things finished]
- **Partial:** [Things started but not finished, with state]
- **Deferred:** [Things identified but postponed]

### Problems Encountered

| Problem | Severity | Resolved? | Resolution | Related Action # |
|---------|----------|-----------|------------|-----------------|
| [Description] | [blocker/major/minor] | [yes/no/workaround] | [How fixed] | [#N] |

*(Write "(none)" if no problems occurred)*

### Key Decisions
- [Decision and rationale — only for non-obvious choices]

### Files Changed
- `[path/to/file]` — [what changed and why]

### Commits
- `[short-hash]` — [commit message summary]

### Carry-Forward
> [What the next session must know. Where to start. Any open threads.]

---

## Field Reference

| Field | Values | Notes |
|-------|--------|-------|
| Pattern | `new` / `retry` / `continuation` | First attempt, re-attempt after failure, resuming incomplete work |
| Result | `pass` / `fail` / `partial` | Fully successful, did not work, partially worked |
| Severity | `blocker` / `major` / `minor` | Can't continue, significant impediment, inconvenience |
| Resolved | `yes` / `no` / `workaround` | Fixed, still open, temporary fix in place |
| Margin | `5%` / `10%` / `15%` | Autonomous, typical, exploratory sessions |

## Time Estimation Guide

| Action Type | Base Estimate |
|---|---|
| File read/analysis | 1–2 min |
| Simple edit | 2–3 min |
| Code generation | 5–15 min |
| Complex implementation | 15–45 min |
| Debugging/troubleshooting | 10–30 min |
| Research/exploration | 5–15 min |
| Conversion/generation | 3–5 min |
| Git operations | 1–2 min |
| Visual verification | 3–5 min |
