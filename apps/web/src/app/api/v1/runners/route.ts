import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authenticateRunnerOrUser } from '@/lib/auth/runner-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RunnerMetadata {
  last_ping_at?: string;
  hostname?: string;
  platform?: string;
  version?: string;
  token?: string;
  token_revoked?: boolean;
  cdp_active?: boolean;
  rotated_at?: string;
  revoked_at?: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRunnerOrUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Strictly enforce authenticated caller's tenant orgId without query parameter overrides
  const { orgId, supabase } = auth.context;

  try {
    const { data: org, error } = await supabase
      .from('wf_organizations')
      .select('id, name, runner_metadata, runner_token_hash')
      .eq('id', orgId)
      .maybeSingle();

    if (error || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    let runnerMeta: RunnerMetadata = {};
    if (org.runner_metadata) {
      if (typeof org.runner_metadata === 'object' && org.runner_metadata !== null) {
        runnerMeta = org.runner_metadata as RunnerMetadata;
      } else if (typeof org.runner_metadata === 'string') {
        try {
          runnerMeta = JSON.parse(org.runner_metadata);
        } catch {
          runnerMeta = {};
        }
      }
    }

    const lastPingMs = runnerMeta.last_ping_at ? new Date(runnerMeta.last_ping_at).getTime() : 0;
    const diffSeconds = lastPingMs > 0 ? (Date.now() - lastPingMs) / 1000 : 999999;
    const isOnline = diffSeconds < 60 && runnerMeta.token_revoked !== true;

    // Use existing token if valid rf_live_ format, otherwise generate and persist initial token & hash
    let pairedToken = runnerMeta.token;
    if (!pairedToken || !pairedToken.startsWith('rf_live_') || !org.runner_token_hash) {
      const rawOrgHex = orgId.replace(/-/g, '').slice(0, 16);
      const secretHex = crypto.randomBytes(16).toString('hex');
      pairedToken = `rf_live_${rawOrgHex}_${secretHex}`;
      const tokenHash = crypto.createHash('sha256').update(pairedToken).digest('hex');

      runnerMeta = {
        ...runnerMeta,
        token: pairedToken,
        token_revoked: false,
      };

      await supabase
        .from('wf_organizations')
        .update({
          runner_token_hash: tokenHash,
          runner_metadata: runnerMeta,
        })
        .eq('id', orgId);
    }

    const resolvedHostname = runnerMeta.hostname || (isOnline ? 'Active Desktop Runner' : 'unknown');

    const runners = [
      {
        id: 'runner_primary',
        hostname: resolvedHostname,
        label: 'Primary Desktop Runner',
        token: pairedToken,
        platform: runnerMeta.platform || 'unknown',
        engineVersion: runnerMeta.version || 'unknown',
        status: runnerMeta.token_revoked ? 'REVOKED' : (isOnline ? 'ONLINE' : 'OFFLINE'),
        lastPingAt: runnerMeta.last_ping_at || null,
        cdpActive: runnerMeta.cdp_active !== false,
      },
    ];

    return NextResponse.json(
      {
        success: true,
        is_online: isOnline,
        diff_seconds: Math.round(diffSeconds),
        runners,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve runner state';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRunnerOrUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { orgId, supabase, token } = auth.context;

  let body: (Partial<RunnerMetadata> & { action?: string }) = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Fetch existing org metadata to merge and preserve fields
  const { data: existingOrg } = await supabase
    .from('wf_organizations')
    .select('runner_metadata, runner_token_hash')
    .eq('id', orgId)
    .maybeSingle();

  let existingMeta: RunnerMetadata = {};
  if (existingOrg?.runner_metadata) {
    if (typeof existingOrg.runner_metadata === 'object' && existingOrg.runner_metadata !== null) {
      existingMeta = existingOrg.runner_metadata as RunnerMetadata;
    } else if (typeof existingOrg.runner_metadata === 'string') {
      try {
        existingMeta = JSON.parse(existingOrg.runner_metadata);
      } catch {}
    }
  }

  // Handle Token Rotation Action
  if (body.action === 'rotate' || body.action === 'generate') {
    const rawOrgHex = orgId.replace(/-/g, '').slice(0, 16);
    const secretHex = crypto.randomBytes(16).toString('hex');
    const newToken = `rf_live_${rawOrgHex}_${secretHex}`;
    const newHash = crypto.createHash('sha256').update(newToken).digest('hex');

    const updatedMeta = {
      ...existingMeta,
      token: newToken,
      token_revoked: false,
      rotated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('wf_organizations')
      .update({
        runner_token_hash: newHash,
        runner_metadata: updatedMeta,
      })
      .eq('id', orgId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      token: newToken,
      is_online: true,
    });
  }

  // Handle Token Revocation Action
  if (body.action === 'revoke') {
    const updatedMeta = {
      ...existingMeta,
      token_revoked: true,
      revoked_at: new Date().toISOString(),
    };

    const { error: revokeError } = await supabase
      .from('wf_organizations')
      .update({
        runner_token_hash: null,
        runner_metadata: updatedMeta,
      })
      .eq('id', orgId);

    if (revokeError) {
      return NextResponse.json({ error: revokeError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      revoked: true,
    });
  }

  // Handle Runner Heartbeat
  const rawOrgHex = orgId.replace(/-/g, '').slice(0, 16);
  const fallbackToken = existingMeta.token || `rf_live_${rawOrgHex}_${crypto.randomBytes(16).toString('hex')}`;

  const payload: RunnerMetadata = {
    ...existingMeta,
    last_ping_at: new Date().toISOString(),
    hostname: body.hostname || request.headers.get('x-runner-hostname') || existingMeta.hostname || 'unknown',
    platform: body.platform || request.headers.get('x-runner-platform') || existingMeta.platform || 'unknown',
    version: body.version || request.headers.get('x-runner-version') || existingMeta.version || 'unknown',
    token: token || body.token || fallbackToken,
    cdp_active: body.cdp_active !== undefined ? body.cdp_active : (existingMeta.cdp_active ?? true),
  };

  try {
    const { error } = await supabase
      .from('wf_organizations')
      .update({
        runner_metadata: payload,
      })
      .eq('id', orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      timestamp: payload.last_ping_at,
      is_online: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update runner heartbeat';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
