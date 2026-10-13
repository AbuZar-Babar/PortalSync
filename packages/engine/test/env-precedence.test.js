const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const { CloudClient } = require('../src/runner/cloud-client');
const {
  resolveDefaultDownloadFolder,
  resolveDefaultInvoiceFolder,
  resolvePortalStorageDir,
} = require('../src/runner/dedup-helper');

test('Environment Precedence - CloudClient token precedence', () => {
  const origReflowToken = process.env.REFLOW_RUNNER_TOKEN;
  const origPortalSyncToken = process.env.PORTALSYNC_RUNNER_TOKEN;

  try {
    // 1. Both set: REFLOW takes precedence
    process.env.REFLOW_RUNNER_TOKEN = 'ps_live_reflow_token';
    process.env.PORTALSYNC_RUNNER_TOKEN = 'ps_live_legacy_token';
    const client1 = new CloudClient({ fetch: () => {} });
    assert.strictEqual(client1.token, 'ps_live_reflow_token');

    // 2. Only legacy set: falls back to PORTALSYNC
    delete process.env.REFLOW_RUNNER_TOKEN;
    process.env.PORTALSYNC_RUNNER_TOKEN = 'ps_live_legacy_only';
    const client2 = new CloudClient({ fetch: () => {} });
    assert.strictEqual(client2.token, 'ps_live_legacy_only');
  } finally {
    if (origReflowToken !== undefined) process.env.REFLOW_RUNNER_TOKEN = origReflowToken;
    else delete process.env.REFLOW_RUNNER_TOKEN;

    if (origPortalSyncToken !== undefined) process.env.PORTALSYNC_RUNNER_TOKEN = origPortalSyncToken;
    else delete process.env.PORTALSYNC_RUNNER_TOKEN;
  }
});

test('Environment Precedence - CloudClient cloud URL precedence', () => {
  const origReflowUrl = process.env.REFLOW_CLOUD_URL;
  const origPortalSyncUrl = process.env.PORTALSYNC_CLOUD_URL;

  try {
    // 1. Both set: REFLOW takes precedence
    process.env.REFLOW_CLOUD_URL = 'https://reflow-api.local';
    process.env.PORTALSYNC_CLOUD_URL = 'https://portalsync-api.local';
    const client1 = new CloudClient({ fetch: () => {} });
    assert.strictEqual(client1.baseUrl, 'https://reflow-api.local');

    // 2. Only legacy set: falls back to PORTALSYNC
    delete process.env.REFLOW_CLOUD_URL;
    process.env.PORTALSYNC_CLOUD_URL = 'https://portalsync-legacy.local';
    const client2 = new CloudClient({ fetch: () => {} });
    assert.strictEqual(client2.baseUrl, 'https://portalsync-legacy.local');
  } finally {
    if (origReflowUrl !== undefined) process.env.REFLOW_CLOUD_URL = origReflowUrl;
    else delete process.env.REFLOW_CLOUD_URL;

    if (origPortalSyncUrl !== undefined) process.env.PORTALSYNC_CLOUD_URL = origPortalSyncUrl;
    else delete process.env.PORTALSYNC_CLOUD_URL;
  }
});

test('Folder Resolution - Downloads directory reuses legacy or defaults to ReFlow', () => {
  const resolved = resolveDefaultDownloadFolder();
  assert.ok(typeof resolved === 'string' && resolved.length > 0);

  const legacyFolder = path.join(os.homedir(), 'Downloads', 'PortalSync');
  if (fs.existsSync(legacyFolder)) {
    assert.strictEqual(resolved, legacyFolder, 'Must reuse legacy folder if it exists on disk');
  } else {
    assert.strictEqual(resolved, path.join(os.homedir(), 'Downloads', 'ReFlow'));
  }
});

test('Folder Resolution - Invoices directory defaults to OS documents under ReFlow unless legacy exists', () => {
  const resolved = resolveDefaultInvoiceFolder();
  assert.ok(typeof resolved === 'string' && resolved.length > 0);

  if (process.platform === 'win32' && fs.existsSync('C:\\FlowMind\\Invoices')) {
    assert.strictEqual(resolved, 'C:\\FlowMind\\Invoices');
  } else {
    assert.strictEqual(resolved, path.join(os.homedir(), 'Documents', 'ReFlow', 'Invoices'));
  }
});
