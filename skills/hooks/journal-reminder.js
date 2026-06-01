#!/usr/bin/env node

/**
 * DEPRECATED — use hooks/project-tracking/excat-session-close.js
 *
 * Journal Reminder Hook (Stop event) — legacy Claude Code hook.
 * Superseded by cross-platform hooks in hooks/project-tracking/.
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE = process.env.CLAUDE_PROJECT_DIR || '/workspace';
const JOURNAL_FILE = path.join(WORKSPACE, 'journal', 'journal.md');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    if (data.hook_event_name !== 'Stop') {
      console.log(JSON.stringify({ decision: 'allow' }));
      return;
    }

    let journalFresh = false;
    try {
      const stat = fs.statSync(JOURNAL_FILE);
      const ageMs = Date.now() - stat.mtimeMs;
      journalFresh = ageMs < 5 * 60 * 1000;
    } catch {
      // Journal file doesn't exist
    }

    if (journalFresh) {
      console.log(JSON.stringify({ decision: 'allow' }));
    } else {
      console.log(JSON.stringify({
        decision: 'block',
        reason: 'Session journal entry not written. Please run the journaling skill (say "please journal this session") before ending the session, so the work is logged.',
      }));
    }
  } catch {
    console.log(JSON.stringify({ decision: 'allow' }));
  }
});
