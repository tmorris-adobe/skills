#!/usr/bin/env node
/**
 * Shared logic for ExCat project-tracking hooks.
 * Used by session-start and session-close entrypoints.
 */

const fs = require('fs');
const path = require('path');

function getProjectRoot() {
  return process.env.CLAUDE_PROJECT_DIR
    || process.env.CURSOR_PROJECT_DIR
    || process.cwd();
}

function readJournalDir(root) {
  const configPath = path.join(root, 'journal-config.yaml');
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    const match = content.match(/^\s*journal_dir:\s*["']?([^"'\n\r]+)["']?/m);
    if (match) return match[1].trim();
  }
  const journalPath = path.join(root, 'journal');
  if (fs.existsSync(journalPath) && fs.statSync(journalPath).isDirectory()) {
    return 'journal';
  }
  return '';
}

function readYamlValue(filePath, key) {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath, 'utf8');
  const re = new RegExp(`^\\s*${key}:\\s*["']?([^"'\n\r#]+)["']?`, 'm');
  const match = content.match(re);
  return match ? match[1].trim() : '';
}

function getSessionState(root, journalDir) {
  const stateFile = path.join(root, journalDir, 'session-state.yaml');
  return {
    stateFile,
    status: readYamlValue(stateFile, 'status'),
    activeSession: readYamlValue(stateFile, 'active_session'),
  };
}

function buildStartContext(journalDir, sessionStatus, activeSession) {
  let context = `ExCat project tracking is enabled. Journal directory: ${journalDir}/.

At session start, follow excat-project-tracking SKILL:
1. Run Status mode (read project-context.md + last Carry-Forward).
2. If session-state.yaml status is not open, open a new journal session and set session-state.yaml to status: open.`;

  if (sessionStatus === 'open' && activeSession && activeSession !== 'null') {
    context += `

RESUME: Journal session ${activeSession} is already open. Continue logging actions to journal.md; do not start a duplicate session.`;
  } else {
    context += `

No open journal session detected. Open one before significant work (append session header + update session-state.yaml).`;
  }
  return context;
}

function buildCloseMessage(journalDir, activeSession) {
  const sessionLabel = activeSession || 'unknown';
  return `ExCat session close required: journal session ${sessionLabel} is still open in ${journalDir}/session-state.yaml.

Run excat-project-tracking CLOSE checklist now:
1. Finalize journal.md (Outcomes, Duration, Carry-Forward)
2. Update journal-index.md and project-context.md
3. Update problems-reference.md if this session had problems
4. Regenerate time-tracking.md
5. Update metrics.md
6. Set session-state.yaml status: closed

See hooks/project-tracking/README.md or excat-project-tracking/references/session-close-checklist.md`;
}

function detectPlatform(input) {
  const event = input.hook_event_name || input.hookEventName || '';
  if (/^SessionStart$/i.test(event) || /^Stop$/i.test(event)) return 'claude-code';
  if (input.session_id !== undefined && input.composer_mode !== undefined) return 'cursor';
  if (input.status !== undefined && input.loop_count !== undefined) return 'cursor';
  if (process.env.CLAUDE_PROJECT_DIR) return 'claude-code';
  if (process.env.CURSOR_PROJECT_DIR) return 'cursor';
  return 'generic';
}

function writeClaudeEnv(journalDir) {
  const envFile = process.env.CLAUDE_ENV_FILE;
  if (!envFile) return;
  try {
    fs.appendFileSync(envFile, `export EXCAT_JOURNAL_DIR=${journalDir}\n`);
    fs.appendFileSync(envFile, 'export EXCAT_TRACKING_ENABLED=1\n');
  } catch {
    // fail open
  }
}

module.exports = {
  getProjectRoot,
  readJournalDir,
  getSessionState,
  buildStartContext,
  buildCloseMessage,
  detectPlatform,
  writeClaudeEnv,
};
