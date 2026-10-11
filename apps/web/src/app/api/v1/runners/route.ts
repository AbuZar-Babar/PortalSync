import { NextRequest, NextResponse } from 'next/server';
import { authenticateRunnerOrUser, extractRunnerToken } from '@/lib/auth/runner-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RunnerMetadata {
  last_ping_at?: string;
  hostname?: string;
  platform?: string;
  version?: string;
  token?: string;
  cdp_active?: boolean;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRunnerOrUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { orgId, supabase } = auth.context;
  const searchParams = request.nextUrl.searchParams;
  const queryOrgId = searchParams.get('org_id');
  const effectiveOrgId = (queryOrgId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryOrgId))
    ? queryOrgId
    : orgId;

  try {
    const { data: org, error } = await supabase
      .from('wf_organizations')
      .select('id, name, stripe_subscription_id')
      .eq('id', effectiveOrgId)
      .maybeSingle();

    if (error || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    let runnerMeta: RunnerMetadata = {};
    if (org.stripe_subscription_id) {
      try {
        runnerMeta = JSON.parse(org.stripe_subscription_id);
      } catch {
        runnerMeta = {};
      }
    }

    const lastPingMs = runnerMeta.last_ping_at ? new Date(runnerMeta.last_ping_at).getTime() : 0;
    const diffSeconds = lastPingMs > 0 ? (Date.now() - lastPingMs) / 1000 : 999999;
    const isOnline = diffSeconds < 60;

    const defaultToken = `ps_live_${effectiveOrgId.replace(/-/g, '').slice(0, 16)}`;
    const pairedToken = runnerMeta.token || defaultToken;
    const resolvedHostname = runnerMeta.hostname || (isOnline ? 'Active Desktop Runner' : 'FlowMind Desktop Worker');

    const runners = [
      {
        id: 'runner_primary',
        hostname: resolvedHostname,
        label: 'Primary Desktop Runner',
        token: pairedToken,
        platform: runnerMeta.platform || 'Windows 11 x64',
        engineVersion: runnerMeta.version || 'v1.4.0 (Enterprise Engine)',
        status: isOnline ? 'ONLINE' : 'OFFLINE',
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

  let body: Partial<RunnerMetadata> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Fetch existing org metadata to merge and preserve fields
  const { data: existingOrg } = await supabase
    .from('wf_organizations')
    .select('stripe_subscription_id')
    .eq('id', orgId)
    .maybeSingle();

  let existingMeta: RunnerMetadata = {};
  if (existingOrg?.stripe_subscription_id) {
    try {
      existingMeta = JSON.parse(existingOrg.stripe_subscription_id);
    } catch {}
  }

  const payload: RunnerMetadata = {
    ...existingMeta,
    last_ping_at: new Date().toISOString(),
    hostname: body.hostname || request.headers.get('x-runner-hostname') || existingMeta.hostname || 'FlowMind Desktop Worker',
    platform: body.platform || request.headers.get('x-runner-platform') || existingMeta.platform || 'Windows 11 x64',
    version: body.version || request.headers.get('x-runner-version') || existingMeta.version || 'v1.4.0 (Enterprise Engine)',
    token: token || body.token || existingMeta.token || `ps_live_${orgId.replace(/-/g, '').slice(0, 16)}`,
    cdp_active: body.cdp_active !== undefined ? body.cdp_active : (existingMeta.cdp_active ?? true),
  };

  try {
    const { error } = await supabase
      .from('wf_organizations')
      .update({
        stripe_subscription_id: JSON.stringify(payload),
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
