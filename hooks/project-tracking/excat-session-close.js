#!/usr/bin/env node
/**
 * ExCat project tracking — session close / stop hook
 * Supports: Cursor (stop + followup_message), Claude Code (Stop + block/continue)
 */

const {
  getProjectRoot,
  readJournalDir,
  getSessionState,
  buildCloseMessage,
  detectPlatform,
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
  });
}

function shouldSkipClose(input, platform) {
  if (platform === 'cursor') {
    if (input.status && input.status !== 'completed') return true;
    if ((input.loop_count || 0) > 0) return true;
    return false;
  }
  if (platform === 'claude-code') {
    const event = input.hook_event_name || '';
    if (event && event !== 'Stop') return true;
    return false;
  }
  return false;
}

async function main() {
  const input = await readStdin();
  const platform = detectPlatform(input);

  if (shouldSkipClose(input, platform)) {
    outputAllow(platform);
    return;
  }

  const root = getProjectRoot();
  const journalDir = process.env.EXCAT_JOURNAL_DIR || readJournalDir(root);

  if (!journalDir) {
    outputAllow(platform);
    return;
  }

  const { status, activeSession } = getSessionState(root, journalDir);

  if (status !== 'open') {
    outputAllow(platform);
    return;
  }

  const message = buildCloseMessage(journalDir, activeSession);

  if (platform === 'cursor') {
    console.log(JSON.stringify({ followup_message: message }));
    return;
  }

  if (platform === 'claude-code') {
    console.log(JSON.stringify({
      decision: 'block',
      reason: message,
    }));
    return;
  }

  // Generic
  console.error('[excat-project-tracking]', message);
  outputAllow(platform);
}

function outputAllow(platform) {
  if (platform === 'claude-code') {
    console.log(JSON.stringify({ decision: 'allow' }));
  } else {
    console.log('{}');
  }
}

main().catch(() => {
  console.log(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
});
