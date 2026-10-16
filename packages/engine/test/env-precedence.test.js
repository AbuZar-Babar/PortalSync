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

test('Environment Configuration - CloudClient token resolution', () => {
  const origReflowToken = process.env.REFLOW_RUNNER_TOKEN;

  try {
    process.env.REFLOW_RUNNER_TOKEN = 'ps_live_reflow_token';
    const client1 = new CloudClient({ fetch: () => {} });
    assert.strictEqual(client1.token, 'ps_live_reflow_token');

    delete process.env.REFLOW_RUNNER_TOKEN;
    const client2 = new CloudClient({ fetch: () => {} });
    assert.strictEqual(client2.token, '');
  } finally {
    if (origReflowToken !== undefined) process.env.REFLOW_RUNNER_TOKEN = origReflowToken;
    else delete process.env.REFLOW_RUNNER_TOKEN;
  }
});

test('Environment Configuration - CloudClient cloud URL resolution', () => {
  const origReflowUrl = process.env.REFLOW_CLOUD_URL;

  try {
    process.env.REFLOW_CLOUD_URL = 'https://reflow-api.local';
    const client1 = new CloudClient({ fetch: () => {} });
    assert.strictEqual(client1.baseUrl, 'https://reflow-api.local');

    delete process.env.REFLOW_CLOUD_URL;
    const client2 = new CloudClient({ fetch: () => {} });
    assert.strictEqual(client2.baseUrl, 'http://localhost:3000');
  } finally {
    if (origReflowUrl !== undefined) process.env.REFLOW_CLOUD_URL = origReflowUrl;
    else delete process.env.REFLOW_CLOUD_URL;
  }
});

test('Folder Resolution - Downloads directory defaults to ReFlow', () => {
  const resolved = resolveDefaultDownloadFolder();
  assert.ok(typeof resolved === 'string' && resolved.length > 0);
  assert.strictEqual(resolved, path.join(os.homedir(), 'Downloads', 'ReFlow'));
});

test('Folder Resolution - Invoices directory defaults to OS documents under ReFlow', () => {
  const resolved = resolveDefaultInvoiceFolder();
  assert.ok(typeof resolved === 'string' && resolved.length > 0);
  assert.strictEqual(resolved, path.join(os.homedir(), 'Documents', 'ReFlow', 'Invoices'));
});
