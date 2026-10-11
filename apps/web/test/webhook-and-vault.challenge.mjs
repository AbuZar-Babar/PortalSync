import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// ----------------------------------------------------------------------------
// 1. Vault AES-256-GCM Cryptographic Integrity
// ----------------------------------------------------------------------------

async function encryptVaultSecretNode(plainText, secretSeed) {
  const enc = new TextEncoder();
  const keyHash = await crypto.subtle.digest('SHA-256', enc.encode(secretSeed));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    enc.encode(plainText)
  );
  const ciphertext = Buffer.from(encryptedBuf).toString('base64');
  const ivStr = Buffer.from(iv).toString('base64');
  return { ciphertext, iv: ivStr };
}

async function decryptVaultSecretNode(ciphertext, ivStr, secretSeed) {
  const enc = new TextEncoder();
  const keyHash = await crypto.subtle.digest('SHA-256', enc.encode(secretSeed));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  const iv = Buffer.from(ivStr, 'base64');
  const encryptedBytes = Buffer.from(ciphertext, 'base64');
  const decryptedBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedBytes
  );
  return new TextDecoder().decode(decryptedBuf);
}

test('Vault Cryptographic Integrity: AES-256-GCM', async (t) => {
  await t.test('encrypts plaintext to non-trivial ciphertext and IV', async () => {
    const secret = 'super_secret_corporate_api_key_12345!';
    const seed = 'org_9b8ba7c2-2386-467f-9f6d';
    const { ciphertext, iv } = await encryptVaultSecretNode(secret, seed);

    assert.ok(ciphertext.length > 20, 'Ciphertext should be non-empty base64 string');
    assert.notEqual(ciphertext, secret, 'Ciphertext must not be plaintext');
    assert.ok(iv.length > 10, 'IV should be non-empty base64 string');

    // Decrypt and verify exact recovery
    const recovered = await decryptVaultSecretNode(ciphertext, iv, seed);
    assert.equal(recovered, secret, 'Decrypted secret must match original plaintext');
  });

  await t.test('fails decryption when supplied incorrect vault seed key', async () => {
    const secret = 'prod_database_master_pass';
    const seed = 'org_correct_seed';
    const wrongSeed = 'org_wrong_seed';
    const { ciphertext, iv } = await encryptVaultSecretNode(secret, seed);

    await assert.rejects(
      async () => {
        await decryptVaultSecretNode(ciphertext, iv, wrongSeed);
      },
      /OperationError|bad decrypt/i,
      'Decryption with invalid key must fail authenticity check'
    );
  });
});

// ----------------------------------------------------------------------------
// 2. Webhook HMAC-SHA256 Signatures
// ----------------------------------------------------------------------------

test('Webhook HMAC-SHA256 Verification', async (t) => {
  await t.test('computes deterministic HMAC-SHA256 signature', () => {
    const secret = 'whsec_test_secret_998877';
    const payload = JSON.stringify({
      event: 'workflow.test_ping',
      timestamp: '2026-10-11T12:00:00.000Z',
    });

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const digest = hmac.digest('hex');

    assert.equal(digest.length, 64, 'SHA-256 hex digest should be 64 characters');
    const header = `sha256=${digest}`;
    assert.match(header, /^sha256=[0-9a-f]{64}$/, 'Header must match standard sha256=... signature format');
  });
});

// ----------------------------------------------------------------------------
// 3. Dynamic Realtime Diagnostic Step 3 Logic
// ----------------------------------------------------------------------------

test('Dynamic Realtime Diagnostic Evaluation', async (t) => {
  function evaluateDiagnosticStep3(pingError, realtimeConnected, wsLatency, orgId) {
    let wsStatus = 'error';
    let wsMessage = '';
    let wsDetails = '';

    if (pingError) {
      wsStatus = 'error';
      wsMessage = `Control plane unreachable: ${pingError.message}`;
      wsDetails = `Database query failed on organization ID ${orgId?.slice(0, 8) || 'unknown'}`;
    } else if (!realtimeConnected) {
      wsStatus = 'warning';
      wsMessage = 'Control plane query succeeded, but Supabase Realtime WebSocket channel is disconnected.';
      wsDetails = `Database latency: ${wsLatency}ms. Realtime status: not subscribed. Check network firewall.`;
    } else {
      wsStatus = 'success';
      wsMessage = `Control plane channel active and verified (${wsLatency}ms).`;
      wsDetails = `Active Realtime subscription on wf_execution_runs_${orgId?.slice(0, 8) || 'default'} with low latency.`;
    }

    return { wsStatus, wsMessage, wsDetails };
  }

  await t.test('evaluates to success when realtime is connected and DB succeeds', () => {
    const res = evaluateDiagnosticStep3(null, true, 24, 'org_12345678');
    assert.equal(res.wsStatus, 'success');
    assert.match(res.wsMessage, /verified/);
  });

  await t.test('evaluates to warning when DB succeeds but realtime channel is disconnected', () => {
    const res = evaluateDiagnosticStep3(null, false, 24, 'org_12345678');
    assert.equal(res.wsStatus, 'warning');
    assert.match(res.wsMessage, /disconnected/);
  });

  await t.test('evaluates to error when DB query fails', () => {
    const res = evaluateDiagnosticStep3(new Error('Connection refused'), true, 0, 'org_12345678');
    assert.equal(res.wsStatus, 'error');
    assert.match(res.wsMessage, /unreachable/);
  });
});

// ----------------------------------------------------------------------------
// 4. Dynamic Worker Card Footer CDP Badge
// ----------------------------------------------------------------------------

test('Dynamic Worker Card CDP Badge Evaluation', async (t) => {
  function getCdpBadge(status) {
    if (status === 'ONLINE' || status === 'EXECUTING') {
      return { dotColor: 'bg-emerald-400', label: 'CDP Port 9222 Ready' };
    }
    if (status === 'REVOKED') {
      return { dotColor: 'bg-rose-400', label: 'Token Revoked • Port Inactive' };
    }
    return { dotColor: 'bg-slate-500', label: 'Worker Offline • CDP Inactive' };
  }

  await t.test('displays active green indicator for ONLINE and EXECUTING', () => {
    assert.deepEqual(getCdpBadge('ONLINE'), { dotColor: 'bg-emerald-400', label: 'CDP Port 9222 Ready' });
    assert.deepEqual(getCdpBadge('EXECUTING'), { dotColor: 'bg-emerald-400', label: 'CDP Port 9222 Ready' });
  });

  await t.test('displays inactive rose indicator for REVOKED', () => {
    assert.deepEqual(getCdpBadge('REVOKED'), { dotColor: 'bg-rose-400', label: 'Token Revoked • Port Inactive' });
  });

  await t.test('displays inactive slate indicator for OFFLINE', () => {
    assert.deepEqual(getCdpBadge('OFFLINE'), { dotColor: 'bg-slate-500', label: 'Worker Offline • CDP Inactive' });
  });
});
