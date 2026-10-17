import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pagePath = path.resolve(__dirname, '../src/app/dashboard/runners/page.tsx');
const runnersRoutePath = path.resolve(__dirname, '../src/app/api/v1/runners/route.ts');
const runnerAuthPath = path.resolve(__dirname, '../src/lib/auth/runner-auth.ts');

describe('Desktop connection pairing flow', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  const runnersRoute = fs.readFileSync(runnersRoutePath, 'utf8');
  const runnerAuth = fs.readFileSync(runnerAuthPath, 'utf8');

  test('uses a compact page header and a separate pairing help dialog', () => {
    assert.match(page, /Desktop connection/i);
    assert.match(page, /How to connect/);
    assert.match(page, /aria-modal="true"/);
    assert.match(page, /aria-labelledby="pairing-help-title"/);
    assert.match(page, /event\.key === 'Escape'/);
  });

  test('removes permanent download and numbered setup content from the main page', () => {
    assert.doesNotMatch(page, /Download Windows Installer/);
    assert.doesNotMatch(page, /Download Portable Standalone/);
    assert.doesNotMatch(page, /Setup &amp; Downloads/);
    assert.doesNotMatch(page, /Install ReFlow Desktop/);
    assert.doesNotMatch(page, /desktop-setup/);
  });

  test('keeps token management controls and reports token actions only after server responses', () => {
    assert.match(page, /Regenerate Token/);
    assert.match(page, /Revoke/);
    assert.match(page, /action:\s*'rotate'/);
    assert.match(page, /action:\s*'revoke'/);
    assert.match(page, /setActionErrorNotice/);
  });

  test('pairing status distinguishes waiting, connected, and request failure states', () => {
    assert.match(page, /Waiting for your desktop/);
    assert.match(page, /Desktop connected/);
    assert.match(page, /Connection check failed/);
    assert.match(page, /pairingCheckError/);
    assert.match(page, /Check connection/);
  });

  test('worker actions check fresh server-recorded heartbeats and do not claim direct ping semantics', () => {
    assert.match(page, /Check all/);
    assert.match(page, /Check status/);
    assert.match(page, /Recent heartbeat confirmed/);
    assert.match(page, /does not send a direct network ping/);
    assert.match(page, /lastPingAt/);
  });

  test('API returns independently tracked workers with per-worker heartbeat status', () => {
    assert.match(runnersRoute, /registeredWorkers\.map/);
    assert.match(runnersRoute, /workers:\s*nextWorkers/);
    assert.match(runnersRoute, /worker_id:\s*stableIdentity/);
    assert.match(runnersRoute, /worker\.last_ping_at/);
  });

  test('browser readiness is only shown when explicitly reported', () => {
    assert.doesNotMatch(page, /cdpActive: r\.cdpActive !== false/);
    assert.doesNotMatch(page, /cdpActive: meta\.cdp_active !== false/);
    assert.doesNotMatch(runnersRoute, /cdpActive: runnerMeta\.cdp_active !== false/);
    assert.doesNotMatch(runnerAuth, /meta\.cdp_active \?\? true/);
  });
});
