import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pagePath = path.resolve(__dirname, '../src/app/dashboard/runners/page.tsx');

describe('Desktop connection primary flow', () => {
  const page = fs.readFileSync(pagePath, 'utf8');

  test('uses the current page as a human-readable desktop connection flow', () => {
    assert.match(page, /Desktop connection/i);
    assert.match(page, /Set up desktop/i);
    assert.match(page, /Check connection/i);
  });

  test('does not infer an online runner from dashboard context or a status label alone', () => {
    assert.doesNotMatch(page, /diffSeconds\s*<\s*60\s*\|\|\s*isRunnerOnline/);
    assert.doesNotMatch(page, /diffSeconds\s*<\s*60\s*\|\|\s*r\.status\s*===\s*'ONLINE'/);
  });

  test('never fabricates a heartbeat timestamp when none was reported by the runner', () => {
    assert.doesNotMatch(page, /lastPingAt:\s*r\.lastPingAt\s*\|\|\s*\(isOnline\s*\?\s*new Date\(\)\.toISOString\(\)/);
    assert.doesNotMatch(page, /lastPingAt:\s*meta\.last_ping_at\s*\|\|\s*\(isOnline\s*\?\s*new Date\(\)\.toISOString\(\)/);
    assert.doesNotMatch(page, /const lastPing = isRunnerOnline \? new Date\(\)\.toISOString\(\)/);
  });

  test('does not invent a client-side runner token when no server-issued token is available', () => {
    assert.doesNotMatch(page, /const defaultToken = `rf_live_/);
    assert.doesNotMatch(page, /currentToken \|\| runnerToken \|\| `rf_live_/);
  });

  test('token rotation failures are reported rather than represented as successful rotation', () => {
    assert.doesNotMatch(page, /const randomSuffix = Math\.random\(\)/);
    assert.match(page, /action:\s*'rotate'/);
  });

  test('token revocation calls the server before showing success', () => {
    assert.match(page, /action:\s*'revoke'/);
  });
});
