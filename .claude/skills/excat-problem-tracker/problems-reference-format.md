# Problems Reference — Schema and Format

> Portable template for the problems reference file. See `SKILL.md` for full rules and workflow.

The reference file lives in the same directory as the journal (default: `journal/problems-reference.md`) so it stays portable with the project.

---

## File header (once)

```markdown
# Problems Reference — [Project Name]

> Referential index of problems encountered (from the project journal), their
> resolutions, and how to avoid them. Updated by the problem tracker skill.

**Source:** `journal/journal.md`
**Last review:** [YYYY-MM-DD] (after Session [NNN])
```

---

## Prevention checklists (top of file)

One subsection per category. Checkbox format for pre-work scanning. Each item starts with a verb, includes the specific technique, and references the problem ID.

```markdown
## Quick Reference — Prevention Checklists

### [Category Name]
- [ ] [Verb] [specific technique/value] — [brief context] ([ID])
- [ ] ...
```

---

## Category section (repeat per category)

Each category gets a table with all problems in that category, plus annotations.

```markdown
## [Category Name]

| Problem | ID | Cause | Resolution | How to avoid | Sessions | Severity | Resolved? |
|---------|----|-------|------------|--------------|----------|----------|-----------|
| [Short desc] | [DA-001] | [What caused it] | [How fixed] | [Concrete guidance] | [001, 003] | [blocker/major/minor] | [yes/no/workaround] |

**Recurring:** Yes/No
**Notes:** [Optional: link to code, doc, or skill that encodes the fix]
```

---

## Field reference

| Field | Description | Values |
|-------|-------------|--------|
| Problem | Short, normalized description | Free text (consistent wording for recurring issues) |
| ID | Stable identifier | `{PREFIX}-{NNN}` (e.g., `DA-001`, `GIT-002`) |
| Cause | What led to it — root cause or context | Free text |
| Resolution | How it was fixed | Free text or "unresolved" |
| How to avoid | Actionable guidance | "Always X / never Y" format preferred |
| Sessions | Where this appeared | Comma-separated session numbers (e.g., "001, 003") |
| Severity | Impact level | `blocker` / `major` / `minor` |
| Resolved? | Resolution status | `yes` / `no` / `workaround` |

### Category prefixes

| Category | Prefix |
|----------|--------|
| DA / URL and path mangling | `DA` |
| Git / environment | `GIT` |
| Performance / loading | `PERF` |
| File sync / auto-generation | `SYNC` |
| Build / deployment | `BUILD` |
| Content authoring | `AUTH` |
| Block rendering | `BLOCK` |

New categories get a short uppercase prefix on first encounter.

---

## Unresolved section (only if needed)

```markdown
## Unresolved or Workaround-Only

| Problem | ID | Sessions | Current state |
|---------|----|----------|---------------|
| [Desc] | [ID] | [001, 003] | Workaround: [brief]. Still open: [what's left]. |
```

---

## Example (single category)

```markdown
## DA / URL and Path Mangling

| Problem | ID | Cause | Resolution | How to avoid | Sessions | Severity | Resolved? |
|---------|----|-------|------------|--------------|----------|----------|-----------|
| DA converts dots to hyphens in hrefs (`.json` → `-json`) | DA-001 | DA rewrites URLs; dots in hrefs normalized to hyphens | Match links by `a.textContent.trim()`, never by `a.href` | For any link whose text is a file path: use `a.textContent.trim().endsWith('.json')` to detect; never use `a.getAttribute('href')` for paths | 001 | blocker | yes |
| SKILL.md referenced non-existent file | DA-002 | File renamed during development; reference not updated | Updated reference to actual filename `animation-verification.md` | After renaming files, grep for all references to the old name across the project | 003 | major | yes |

**Recurring:** No (so far — but both involve file reference mismatches)
**Notes:** DA-001 documented in `skills/excat-animate-migration/SKILL.md`. Both problems stem from platforms transforming file paths/references.
```

---

Use the same format in any project; only the project name and table rows change.
