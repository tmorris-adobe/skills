# ExCat Project Tracking Hooks

Cross-platform hooks for **automatic session open reminders** and **session close prompts** when using `excat-project-tracking`.

Works with **Cursor**, **Claude Code**, and other tools that run shell/Node commands on session lifecycle events.

## Files (source of truth)

```
hooks/project-tracking/
├── README.md                    ← this file
├── lib.js                       ← shared logic
├── excat-session-start.js       ← SessionStart / sessionStart
├── excat-session-close.js       ← Stop / stop
├── install.sh                   ← wire into Cursor or Claude Code
├── cursor/hooks.json            ← Cursor config (paths relative to project root)
└── claude-code/settings.fragment.json
```

## What the hooks do

| Event | Script | Behavior |
|-------|--------|----------|
| Session start | `excat-session-start.js` | If `journal/` exists, inject tracking context; set `EXCAT_JOURNAL_DIR` |
| Session stop | `excat-session-close.js` | If `journal/session-state.yaml` has `status: open`, prompt close checklist |

The agent must still run excat-project-tracking OPEN/WORK/CLOSE workflows. Hooks detect state and nudge — they do not write journal files.

## Quick install

From **project root** (where `hooks/project-tracking/` lives):

```bash
bash hooks/project-tracking/install.sh all
```

Or per platform:

```bash
bash hooks/project-tracking/install.sh cursor    # writes .cursor/hooks.json
bash hooks/project-tracking/install.sh claude    # merges .claude/settings.json
```

## Manual install

### Cursor

Copy or merge into `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      { "command": "node hooks/project-tracking/excat-session-start.js" }
    ],
    "stop": [
      {
        "command": "node hooks/project-tracking/excat-session-close.js",
        "loop_limit": 1
      }
    ]
  }
}
```

Paths are **relative to project root**. Commit `hooks/project-tracking/` and `.cursor/hooks.json` together.

### Claude Code

Merge [claude-code/settings.fragment.json](./claude-code/settings.fragment.json) into `.claude/settings.json`, or run `install.sh claude`.

Uses `${CLAUDE_PROJECT_DIR}` so paths resolve correctly in any workspace.

### Other AI coding tools

If your tool supports lifecycle hooks with stdin JSON and stdout JSON/text:

```bash
node hooks/project-tracking/excat-session-start.js   # at session open
node hooks/project-tracking/excat-session-close.js # at session end
```

- **Session start:** script prints plain-text context on stdout (generic mode)
- **Session close:** script prints reminder to stderr if session still open

Adapt the config format for Windsurf, Copilot CLI, Codex, etc. using the same scripts.

## session-state.yaml

Hooks read `journal/session-state.yaml`:

```yaml
active_session: "003"
started_at: "2026-06-01T14:00:00Z"
project: "My Project"
branch: "main"
status: open   # open | closed
```

Set by excat-project-tracking on OPEN; clear on CLOSE.

## Requirements

- **Node.js** (v16+)
- **journal/** directory (created by excat-project-tracking on first session)

## Copy into your project

When using the skills repo as a template:

1. Copy `hooks/project-tracking/` into your project repo root
2. Copy `skills/excat-project-tracking/` (or `.cursor/skills/...`) for the skill
3. Run `bash hooks/project-tracking/install.sh all`
4. Commit `hooks/`, `.cursor/hooks.json`, and `.claude/settings.json`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Hook not found | Run from project root; check path in hooks.json |
| No close reminder | Set `session-state.yaml` to `status: open` to test |
| Claude hook error | Script must output valid JSON — use provided `.js` files |
| Cursor no context | `additional_context` may be unreliable; `env` vars still set |

See also: `skills/excat-project-tracking/references/hook-setup.md`
