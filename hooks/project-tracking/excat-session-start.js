#!/usr/bin/env node
/**
 * ExCat project tracking — session start hook
 * Supports: Cursor (sessionStart), Claude Code (SessionStart), generic stdout
 */

const fs = require('fs');
const path = require('path');
const {
  getProjectRoot,
  readJournalDir,
  getSessionState,
  buildStartContext,
  detectPlatform,
  writeClaudeEnv,
} = require('./lib');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try {
        resolve(data.trim() ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    if (process.stdin.readableEnded) resolve({});
  });
}

async function main() {
  const input = await readStdin();
  const root = getProjectRoot();
  const journalDir = process.env.EXCAT_JOURNAL_DIR || readJournalDir(root);
  const platform = detectPlatform(input);

  if (!journalDir || !fs.existsSync(path.join(root, journalDir))) {
    if (platform === 'claude-code') {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: '',
        },
      }));
    } else {
      console.log('{}');
    }
    return;
  }

  const { status, activeSession } = getSessionState(root, journalDir);
  const context = buildStartContext(journalDir, status, activeSession);

  writeClaudeEnv(journalDir);

  if (platform === 'claude-code') {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: context,
      },
      suppressOutput: true,
    }));
    return;
  }

  if (platform === 'cursor') {
    console.log(JSON.stringify({
      env: {
        EXCAT_JOURNAL_DIR: journalDir,
        EXCAT_TRACKING_ENABLED: '1',
      },
      additional_context: context,
    }));
    return;
  }

  // Generic: plain text for tools that inject stdout
  console.log(context);
}

main().catch(() => {
  console.log('{}');
  process.exit(0);
});
