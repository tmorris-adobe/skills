#!/usr/bin/env bash
# Install ExCat project-tracking hooks for Cursor, Claude Code, or both.
# Run from project root: bash hooks/project-tracking/install.sh [cursor|claude|all]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(pwd)"
TARGET="${1:-all}"

rel_path() {
  python3 -c "import os; print(os.path.relpath('$1', '$2'))"
}

HOOKS_REL="$(rel_path "$SCRIPT_DIR" "$PROJECT_ROOT")"
START_CMD="node ${HOOKS_REL}/excat-session-start.js"
CLOSE_CMD="node ${HOOKS_REL}/excat-session-close.js"

install_cursor() {
  mkdir -p "${PROJECT_ROOT}/.cursor"
  cat > "${PROJECT_ROOT}/.cursor/hooks.json" <<EOF
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "command": "${START_CMD}"
      }
    ],
    "stop": [
      {
        "command": "${CLOSE_CMD}",
        "loop_limit": 1
      }
    ]
  }
}
EOF
  echo "Cursor: wrote ${PROJECT_ROOT}/.cursor/hooks.json"
  echo "  sessionStart → ${START_CMD}"
  echo "  stop         → ${CLOSE_CMD}"
}

install_claude() {
  mkdir -p "${PROJECT_ROOT}/.claude"
  local settings="${PROJECT_ROOT}/.claude/settings.json"
  local fragment="${SCRIPT_DIR}/claude-code/settings.fragment.json"

  if [ ! -f "$settings" ]; then
    cp "$fragment" "$settings"
    echo "Claude Code: created ${settings}"
    return
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 <<PY
import json
from pathlib import Path

settings_path = Path("${settings}")
fragment_path = Path("${fragment}")
hooks_rel = "${HOOKS_REL}"

settings = json.loads(settings_path.read_text()) if settings_path.exists() else {}
fragment = json.loads(fragment_path.read_text())

# Rewrite commands to use relative path from project root
for event, groups in fragment.get("hooks", {}).items():
    for group in groups:
        for hook in group.get("hooks", []):
            cmd = hook.get("command", "")
            if "excat-session-start" in cmd:
                hook["command"] = f'node "{hooks_rel}/excat-session-start.js"'
            elif "excat-session-close" in cmd:
                hook["command"] = f'node "{hooks_rel}/excat-session-close.js"'

settings.setdefault("hooks", {})
for event, groups in fragment["hooks"].items():
    settings["hooks"][event] = groups

settings_path.write_text(json.dumps(settings, indent=2) + "\n")
print(f"Claude Code: merged hooks into {settings_path}")
PY
  else
    echo "Claude Code: settings.json exists — merge manually from:"
    echo "  ${fragment}"
    echo "Update command paths to: node ${HOOKS_REL}/excat-session-*.js"
  fi
}

chmod +x "${SCRIPT_DIR}/excat-session-start.js" "${SCRIPT_DIR}/excat-session-close.js" 2>/dev/null || true

case "$TARGET" in
  cursor) install_cursor ;;
  claude) install_claude ;;
  all) install_cursor; install_claude ;;
  *)
    echo "Usage: bash hooks/project-tracking/install.sh [cursor|claude|all]" >&2
    exit 1
    ;;
esac

echo ""
echo "Commit hooks/project-tracking/ and the platform config(s) to share with your team."
echo "Requires Node.js and excat-project-tracking skill for full workflow."
