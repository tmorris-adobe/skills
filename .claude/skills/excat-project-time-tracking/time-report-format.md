# Time Report — Schema and Format

> Portable template for daily time tracking reports. See `SKILL.md` for full rules and workflow.

The report lives in the same directory as the journal (default: `journal/time-tracking.md`).

---

## File header (once)

```markdown
# Time Tracking — [Project Name]

> Daily time reports compiled from journal.md session data.
> Last updated: [YYYY-MM-DD] (after Session [NNN])

**Project total:** [Xh Ym] (agent) / [Xh Ym] (with margin)
```

---

## Daily section (repeat per date, reverse chronological)

```markdown
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
```

Notes:
- Most recent date first
- Multiple sessions per day get separate subsections
- Each session shows action-level time breakdown
- Per-session subtotals appear below each action table
- Daily total sums all sessions for that date

---

## Cumulative summary (bottom of file)

```markdown
---

## Cumulative Summary

| Date | Sessions | Agent Time | With Margin | Actions |
|------|----------|------------|-------------|---------|
| [YYYY-MM-DD] | [N] | [Xh Ym] | [Xh Ym] | [N] |
| ...  | ...      | ...        | ...         | ...     |
| **Total** | **[N]** | **[Xh Ym]** | **[Xh Ym]** | **[N]** |
```

---

## Time display rules

- Per-action: keep as recorded in journal (`20m`, `1h 30m`) or normalize to minutes.
- Subtotals and totals: use `Xh Ym` when >= 60m, else `Xm`.
- If margin wasn't recorded in the journal, omit "Session total (with margin)" for that session and add a note: *"Margin not in journal; add 5-15% for user overhead if needed."*

---

## Example

```markdown
# Time Tracking — Zelis EDS Migration

> Daily time reports compiled from journal.md session data.
> Last updated: 2026-02-26 (after Session 003)

**Project total:** ~4h 45m (agent) / ~5h 16m (with margin)

---

## 2026-02-26 — ~4h 30m (with margin)

### Session 001 — Hero Lottie Fix (~1h 30m agent + 10% = ~1h 39m)

| # | Action | Time |
|---|--------|------|
| 1 | Hero Lottie: implement link-based DA authoring pattern | 20m |
| 2 | Fix DA URL mangling — match by link text content, not href | 15m |
| 3 | Touch migration files to force sync with remote | 3m |
| 4 | Add cards block refinement | 10m |
| 5 | Fix hero Lottie detection to use `.textContent.trim().endsWith('.json')` | 10m |
| 6 | Reduce delayed.js load timeout from 3s to 1.5s | 5m |
| **Total** | | **63m** |

**Session subtotal (agent):** 1h 3m
**Session total (with margin):** ~1h 39m

---

### Session 002 — Animation Migration Skill (~2h 15m agent + 10% = ~2h 29m)

| # | Action | Time |
|---|--------|------|
| 1 | Create animation migration SKILL.md | 30m |
| 2 | Create detect-animations.js | 15m |
| ... | ... | ... |
| **Total** | | **135m** |

**Session subtotal (agent):** 2h 15m
**Session total (with margin):** ~2h 29m

---

**Daily total:** ~3h 45m (agent) / ~4h 8m (with margin)

---

## 2026-02-18 — ~3h 18m (with margin)

### Session 000 — [BACKFILL] Project Setup (~3h 0m agent + 10% = ~3h 18m)
...

---

## Cumulative Summary

| Date | Sessions | Agent Time | With Margin | Actions |
|------|----------|------------|-------------|---------|
| 2026-02-26 | 2 | ~3h 45m | ~4h 8m | 15 |
| 2026-02-18 | 1 | ~3h 0m | ~3h 18m | 8 |
| **Total** | **3** | **~6h 45m** | **~7h 26m** | **23** |
```

---

Use the same format in any project; only the project name and data change.
