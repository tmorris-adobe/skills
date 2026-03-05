#!/usr/bin/env node

/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * Auto-Convert Markdown to HTML Hook
 *
 * This hook automatically converts .md files to .html when they are written
 * in the /workspace directory. It uses the same conversion pipeline as the
 * convert_markdown_to_html MCP tool.
 *
 * Hook Event: PostToolUse (Write|Edit)
 * Input: JSON via stdin containing tool_input with file_path
 * Output: JSON with conversion status
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the conversion function
const conversionToolsPath = path.join(__dirname, '../tools/excatops-mcp/src/tools/conversion-tools.js');
const { conversionTools } = await import(conversionToolsPath);
const convertMarkdownToHtml = conversionTools[0].handler;

// Import the buildFullHtml function
const htmlUtilsPath = path.join(__dirname, './html-utils.js');
const { buildFullHtml } = await import(htmlUtilsPath);

/**
 * Read JSON input from stdin
 */
async function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => {
      try {
        const data = Buffer.concat(chunks).toString('utf-8');
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error(`Failed to parse stdin JSON: ${error.message}`));
      }
    });
    process.stdin.on('error', reject);
  });
}

/**
 * Extract base URL from file content (if available)
 * Looks for common patterns like source URLs in comments or metadata
 */
function extractBaseUrl(content) {
  // Look for source URL in markdown comments or metadata
  const patterns = [
    /<!-- source: (https?:\/\/[^\s]+) -->/i,
    /<!-- baseUrl: (https?:\/\/[^\s]+) -->/i,
    /\[source\]: (https?:\/\/[^\s]+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Log to debug file for troubleshooting
 */
function debugLog(message, data = null) {
  const logPath = path.join(__dirname, 'auto-convert-debug.log');
  const timestamp = new Date().toISOString();
  const logEntry = data
    ? `[${timestamp}] ${message}\n${JSON.stringify(data, null, 2)}\n`
    : `[${timestamp}] ${message}\n`;

  try {
    fs.appendFileSync(logPath, logEntry);
  } catch (err) {
    // Ignore logging errors
  }
}

/**
 * Main hook logic
 */
async function main() {
  try {
    debugLog('=== Hook invoked ===');

    // Read hook input from stdin
    const hookInput = await readStdin();
    debugLog('Received hook input', hookInput);

    // Extract file path from tool input
    const filePath = hookInput?.tool_input?.file_path;
    debugLog(`File path: ${filePath}`);

    if (!filePath) {
      debugLog('No file path found, exiting');
      process.exit(0);
    }

    // Only process .md files in content directory
    const isMarkdown = filePath.endsWith('.md');
    if (!isMarkdown) {
      debugLog('Not a .md file, exiting');
      process.exit(0);
    }

    // Check if file is in workspace or is a special root file (nav.md, footer.md)
    const inWorkspace = filePath.includes('/workspace');

    debugLog(`isMarkdown: ${isMarkdown}, inWorkspace: ${inWorkspace}`);

    console.error(`🔄 [Auto-Convert Hook] Detected .md file write: ${path.basename(filePath)}`);

    // Read markdown content
    let markdownContent;
    try {
      markdownContent = fs.readFileSync(filePath, 'utf-8');
      debugLog(`Read markdown file (${markdownContent.length} bytes)`);
    } catch (error) {
      debugLog(`Failed to read markdown file: ${error.message}`);
      console.error(`❌ [Auto-Convert Hook] Failed to read markdown file: ${error.message}`);
      process.exit(0);
    }

    // Try to extract base URL from content
    const baseUrl = extractBaseUrl(markdownContent);
    debugLog(`Base URL: ${baseUrl || 'none'}`);

    if (baseUrl) {
      console.error(`🔗 [Auto-Convert Hook] Found base URL: ${baseUrl}`);
    }

    // Convert markdown to HTML
    console.error(`🔨 [Auto-Convert Hook] Converting to HTML...`);
    debugLog('Starting conversion');

    const result = await convertMarkdownToHtml({
      markdown: markdownContent,
      baseUrl: baseUrl,
      wrapInBody: false,
    });

    debugLog('Conversion result', { success: result.success, contentLength: result.contentLength });

    if (!result.success) {
      debugLog(`Conversion failed: ${result.error}`);
      console.error(`❌ [Auto-Convert Hook] Conversion failed: ${result.error}`);
      process.exit(0);
    }

    // Generate .plain.html file path for semantic HTML
    const plainHtmlFilePath = filePath.replace(/\.md$/, '.plain.html');
    debugLog(`Plain HTML file path: ${plainHtmlFilePath}`);

    // Ensure parent directory exists
    const htmlDir = path.dirname(plainHtmlFilePath);
    debugLog(`Ensuring directory exists: ${htmlDir}`);
    try {
      fs.mkdirSync(htmlDir, { recursive: true });
      debugLog(`Directory created/verified: ${htmlDir}`);
    } catch (dirError) {
      debugLog(`Failed to create directory: ${dirError.message}`, { stack: dirError.stack });
      console.error(`❌ [Auto-Convert Hook] Failed to create directory ${htmlDir}: ${dirError.message}`);
      process.exit(0);
    }

    // Write .plain.html file (semantic HTML)
    try {
      fs.writeFileSync(plainHtmlFilePath, result.htmlContent, 'utf-8');
      debugLog(`Wrote plain HTML file (${result.contentLength} bytes)`);
      console.error(`✅ [Auto-Convert Hook] Created: ${path.basename(plainHtmlFilePath)} (${result.contentLength} bytes)`);

    } catch (error) {
      debugLog(`Failed to write plain HTML file: ${error.message}`, { stack: error.stack });
      console.error(`❌ [Auto-Convert Hook] Failed to write plain HTML file: ${error.message}`);
      process.exit(0);
    }

    // Generate full HTML with head.html wrapper
    const fullHtmlFilePath = filePath.replace(/\.md$/, '.html');
    debugLog(`Full HTML file path: ${fullHtmlFilePath}`);

    try {
      // Wrap semantic HTML in full EDS structure using shared utility
      const fullHtml = buildFullHtml(result.htmlContent, {
        filePath,
        logger: debugLog
      });

      fs.writeFileSync(fullHtmlFilePath, fullHtml, 'utf-8');
      debugLog(`Wrote full HTML file (${fullHtml.length} bytes)`);
      console.error(`✅ [Auto-Convert Hook] Created: ${path.basename(fullHtmlFilePath)} (${fullHtml.length} bytes)`);

      // Output success JSON for Claude
      const output = {
        success: true,
        message: `Auto-converted ${path.basename(filePath)} to ${path.basename(plainHtmlFilePath)} and ${path.basename(fullHtmlFilePath)}`,
        mdFile: filePath,
        plainHtmlFile: plainHtmlFilePath,
        fullHtmlFile: fullHtmlFilePath,
        plainHtmlSize: result.contentLength,
        fullHtmlSize: fullHtml.length,
        baseUrlUsed: baseUrl || 'none',
      };
      debugLog('Success output', output);
      console.log(JSON.stringify(output));

    } catch (error) {
      debugLog(`Failed to write full HTML file: ${error.message}`, { stack: error.stack });
      console.error(`❌ [Auto-Convert Hook] Failed to write full HTML file: ${error.message}`);
      process.exit(0);
    }

  } catch (error) {
    debugLog(`Unexpected error: ${error.message}`, { stack: error.stack });
    console.error(`❌ [Auto-Convert Hook] Unexpected error: ${error.message}`);
    console.error(error.stack);
    process.exit(0);
  }
}

main();
