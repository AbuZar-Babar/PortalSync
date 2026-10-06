import { NextRequest } from 'next/server';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export interface RunnerAuthContext {
  authenticated: true;
  authType: 'runner_token' | 'session_user';
  orgId: string;
  userId?: string;
  token?: string;
  supabase: SupabaseClient;
}

export type RunnerAuthResult =
  | { success: true; context: RunnerAuthContext }
  | { success: false; error: string; status: number };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function extractRunnerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader) {
    const trimmed = authHeader.trim();
    if (trimmed.toLowerCase().startsWith('bearer ')) {
      return trimmed.slice(7).trim();
    }
    if (trimmed.startsWith('ps_live_')) {
      return trimmed;
    }
  }

  const runnerHeader = request.headers.get('x-runner-token') || request.headers.get('X-Runner-Token');
  if (runnerHeader) {
    return runnerHeader.trim();
  }

  return null;
}

async function resolveOrCreateOrgId(rawOrgId: string, supabase: SupabaseClient): Promise<string | null> {
  if (!rawOrgId) return null;

  // Strip any trailing ellipsis or whitespace (e.g. user copying ps_live_12345678...)
  const sanitized = rawOrgId.replace(/[\.\s]+$/, '').trim();
  if (!sanitized) return null;

  // 1. Full UUID format
  if (UUID_REGEX.test(sanitized)) {
    const { data: existing } = await supabase
      .from('wf_organizations')
      .select('id')
      .eq('id', sanitized)
      .maybeSingle();

    if (existing) {
      return existing.id;
    }

    // Auto-create to satisfy foreign keys
    const { data: created, error } = await supabase
      .from('wf_organizations')
      .insert({
        id: sanitized,
        name: `Org ${sanitized.slice(0, 8)}`,
        slug: `org-${sanitized.slice(0, 8)}-${Date.now()}`,
        billing_tier: 'starter',
      })
      .select('id')
      .maybeSingle();

    if (!error && created) {
      return created.id;
    }
    return sanitized;
  }

  // 2. Lookup by slug
  const { data: bySlug } = await supabase
    .from('wf_organizations')
    .select('id')
    .eq('slug', sanitized)
    .maybeSingle();

  if (bySlug) {
    return bySlug.id;
  }

  // 3. Lookup by UUID prefix safely (query IDs and check prefix in JS to avoid invalid PostgreSQL UUID ilike)
  const { data: allOrgs } = await supabase
    .from('wf_organizations')
    .select('id')
    .limit(50);

  if (allOrgs) {
    const matched = allOrgs.find((o) => o.id.toLowerCase().startsWith(sanitized.toLowerCase()));
    if (matched) {
      return matched.id;
    }
  }

  // 4. Lookup by name
  const { data: byName } = await supabase
    .from('wf_organizations')
    .select('id')
    .eq('name', rawOrgId)
    .maybeSingle();

  if (byName) {
    return byName.id;
  }

  // 5. Create new organization with safe slug
  const safeSlug =
    rawOrgId.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 40) ||
    `org-${Date.now()}`;

  const { data: createdOrg } = await supabase
    .from('wf_organizations')
    .insert({
      name: rawOrgId,
      slug: safeSlug,
      plan_tier: 'starter',
    })
    .select('id')
    .maybeSingle();

  if (createdOrg) {
    return createdOrg.id;
  }

  return null;
}

export async function authenticateRunnerOrUser(request: NextRequest): Promise<RunnerAuthResult> {
  const runnerToken = extractRunnerToken(request);
  const client = getServiceClient();

  // If a bearer or runner token header was provided:
  if (runnerToken !== null) {
    if (!runnerToken.startsWith('ps_live_')) {
      return {
        success: false,
        error: 'Unauthorized: Invalid runner token format. Expected ps_live_<org_id>',
        status: 401,
      };
    }

    const rawOrgId = runnerToken.slice('ps_live_'.length).trim();
    if (!rawOrgId) {
      return {
        success: false,
        error: 'Unauthorized: Missing org_id in runner token',
        status: 401,
      };
    }

    const orgId = await resolveOrCreateOrgId(rawOrgId, client);
    if (!orgId) {
      return {
        success: false,
        error: 'Unauthorized: Unable to resolve organization from runner token',
        status: 401,
      };
    }

    return {
      success: true,
      context: {
        authenticated: true,
        authType: 'runner_token',
        orgId,
        token: runnerToken,
        supabase: client,
      },
    };
  }

  // Fallback to browser session cookie authentication
  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: 'Unauthorized: Authentication required (Bearer token, x-runner-token, or session cookie)',
        status: 401,
      };
    }

    // Resolve user's organization
    const { data: members } = await client
      .from('wf_organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1);

    let orgId: string | null = null;
    if (members && members.length > 0) {
      orgId = members[0].org_id;
    }

    // Check query params if specified
    const requestedOrgId = request.nextUrl.searchParams.get('org_id');
    if (requestedOrgId && UUID_REGEX.test(requestedOrgId)) {
      orgId = requestedOrgId;
    }

    // If user has no organization yet, resolve or create default
    if (!orgId) {
      const defaultSlug = `user-${user.id.slice(0, 8)}`;
      const { data: defaultOrg } = await client
        .from('wf_organizations')
        .insert({
          name: `${user.email?.split('@')[0] || 'User'}'s Organization`,
          slug: defaultSlug,
          plan_tier: 'starter',
        })
        .select('id')
        .maybeSingle();

      if (defaultOrg) {
        orgId = defaultOrg.id;
        await client.from('wf_organization_members').insert({
          org_id: orgId,
          user_id: user.id,
          role: 'owner',
        });
      }
    }

    if (!orgId) {
      return {
        success: false,
        error: 'Forbidden: No organization associated with user',
        status: 403,
      };
    }

    return {
      success: true,
      context: {
        authenticated: true,
        authType: 'session_user',
        orgId,
        userId: user.id,
        supabase: client,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication failed';
    return {
      success: false,
      error: `Unauthorized: ${message}`,
      status: 401,
    };
  }
}
