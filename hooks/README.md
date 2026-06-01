# Hooks

Lifecycle hooks for ExCat skills — usable across AI coding tools (Cursor, Claude Code, and others).

## Available hook packs

| Pack | Path | Purpose |
|------|------|---------|
| **Project tracking** | [project-tracking/](./project-tracking/) | Session open/close reminders for excat-project-tracking |

## Install

From your **project root**:

```bash
bash hooks/project-tracking/install.sh all
```

See each pack's README for platform-specific details.

## Adding to a project repo

Commit these paths to your project:

```
hooks/project-tracking/     # hook scripts (required)
.cursor/hooks.json          # Cursor (after install)
.claude/settings.json       # Claude Code (after install)
journal/                    # created at runtime by the skill
```

The `hooks/` directory is the **visible, shareable source** — not buried inside skill templates.
