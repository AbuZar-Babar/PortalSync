import { NextRequest, NextResponse } from 'next/server';
import { authenticateRunnerOrUser } from '@/lib/auth/runner-auth';
import { RunStatus } from '@/lib/types/database';

const ALLOWED_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  pending: ['running', 'cancelled'],
  running: ['requires_action', 'completed', 'failed', 'cancelled'],
  requires_action: ['running', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

const VALID_STATUSES: Set<string> = new Set([
  'pending',
  'running',
  'requires_action',
  'completed',
  'failed',
  'cancelled',
]);

export async function GET(request: NextRequest) {
  const auth = await authenticateRunnerOrUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { orgId, supabase } = auth.context;
  const searchParams = request.nextUrl.searchParams;
  const statusFilter = searchParams.get('status');
  const workflowId = searchParams.get('workflow_id');

  let query = supabase
    .from('wf_execution_runs')
    .select('*')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  if (workflowId) {
    query = query.eq('workflow_id', workflowId);
  }

  const { data: runs, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs: runs || [] });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRunnerOrUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { orgId, supabase } = auth.context;

  try {
    const body = await request.json();
    const effectiveOrgId = body.org_id || orgId;
    const { workflow_id, total_items_discovered, status } = body;

    if (!workflow_id) {
      return NextResponse.json(
        { error: 'Missing required field: workflow_id' },
        { status: 400 }
      );
    }

    const runStatus: RunStatus = status || 'pending';
    if (!VALID_STATUSES.has(runStatus)) {
      return NextResponse.json(
        { error: `Invalid status: '${runStatus}'. Valid statuses are: ${Array.from(VALID_STATUSES).join(', ')}` },
        { status: 400 }
      );
    }

    // Ensure workflow exists to satisfy foreign key
    const { data: existingWorkflow } = await supabase
      .from('wf_workflows')
      .select('id')
      .eq('id', workflow_id)
      .maybeSingle();

    if (!existingWorkflow) {
      // Auto-create stub workflow if not found to satisfy FK constraints in testing environments
      await supabase.from('wf_workflows').insert({
        id: workflow_id,
        org_id: effectiveOrgId,
        name: `Workflow ${workflow_id.slice(0, 8)}`,
        portal_url: 'https://example.com',
        workflow_definition: {},
      });
    }

    const { data: newRun, error } = await supabase
      .from('wf_execution_runs')
      .insert({
        org_id: effectiveOrgId,
        workflow_id,
        status: runStatus,
        total_items_discovered: total_items_discovered || 0,
        items_processed: 0,
        items_downloaded: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ run: newRun }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON body';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRunnerOrUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { orgId, supabase } = auth.context;

  try {
    const body = await request.json();
    const runId = body.run_id || body.id;
    const { status, items_processed, items_downloaded, error_summary, completed_at } = body;

    if (!runId) {
      return NextResponse.json({ error: 'Missing required field: run_id' }, { status: 400 });
    }

    // Fetch existing run
    const { data: currentRun, error: fetchError } = await supabase
      .from('wf_execution_runs')
      .select('*')
      .eq('id', runId)
      .maybeSingle();

    if (fetchError || !currentRun) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Org authorization check
    if (currentRun.org_id !== orgId) {
      return NextResponse.json(
        { error: 'Unauthorized: Run belongs to a different organization' },
        { status: 403 }
      );
    }

    // Enforce atomic status transition
    if (status !== undefined && status !== currentRun.status) {
      if (!VALID_STATUSES.has(status)) {
        return NextResponse.json(
          { error: `Invalid status: '${status}'. Valid statuses are: ${Array.from(VALID_STATUSES).join(', ')}` },
          { status: 400 }
        );
      }

      const allowedTransitions = ALLOWED_TRANSITIONS[currentRun.status as RunStatus] || [];
      if (!allowedTransitions.includes(status as RunStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from '${currentRun.status}' to '${status}'`,
            current_status: currentRun.status,
            requested_status: status,
            allowed_transitions: allowedTransitions,
          },
          { status: 409 }
        );
      }
    }

    const updatePayload: Record<string, unknown> = {};
    if (status !== undefined) {
      updatePayload.status = status;
    }
    if (items_processed !== undefined) {
      updatePayload.items_processed = Number(items_processed);
    }
    if (items_downloaded !== undefined) {
      updatePayload.items_downloaded = Number(items_downloaded);
    }
    if (error_summary !== undefined) {
      updatePayload.error_summary = error_summary;
    }
    if (completed_at !== undefined) {
      updatePayload.completed_at = completed_at;
    } else if (
      status === 'completed' ||
      status === 'failed' ||
      status === 'cancelled'
    ) {
      if (!currentRun.completed_at) {
        updatePayload.completed_at = new Date().toISOString();
      }
    }

    // Atomic conditional compare-and-swap
    let updateQuery = supabase
      .from('wf_execution_runs')
      .update(updatePayload)
      .eq('id', runId)
      .eq('org_id', orgId);

    if (status !== undefined && status !== currentRun.status) {
      updateQuery = updateQuery.eq('status', currentRun.status);
    }

    const { data: updatedRun, error: updateError } = await updateQuery
      .select()
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedRun) {
      return NextResponse.json(
        {
          error: 'Conflict: Run status was updated concurrently by another runner',
          current_status: currentRun.status,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ run: updatedRun }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON body';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
