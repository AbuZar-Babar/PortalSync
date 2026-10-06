import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflow_id');

  let query = supabase.from('wf_execution_runs').select('*').order('started_at', { ascending: false });

  if (workflowId) {
    query = query.eq('workflow_id', workflowId);
  }

  const { data: runs, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { org_id, workflow_id, total_items_discovered } = body;

    if (!org_id || !workflow_id) {
      return NextResponse.json(
        { error: 'Missing required fields: org_id, workflow_id' },
        { status: 400 }
      );
    }

    const { data: newRun, error } = await supabase
      .from('wf_execution_runs')
      .insert({
        org_id,
        workflow_id,
        status: 'running',
        total_items_discovered: total_items_discovered || 0,
        items_processed: 0,
        items_downloaded: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ run: newRun }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid JSON body' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { run_id, status, items_processed, items_downloaded, error_summary, completed_at } = body;

    if (!run_id) {
      return NextResponse.json({ error: 'Missing run_id' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (status) updatePayload.status = status;
    if (items_processed !== undefined) updatePayload.items_processed = items_processed;
    if (items_downloaded !== undefined) updatePayload.items_downloaded = items_downloaded;
    if (error_summary !== undefined) updatePayload.error_summary = error_summary;
    if (completed_at) updatePayload.completed_at = completed_at;

    const { data: updatedRun, error } = await supabase
      .from('wf_execution_runs')
      .update(updatePayload)
      .eq('id', run_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ run: updatedRun });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid JSON body' }, { status: 400 });
  }
}
