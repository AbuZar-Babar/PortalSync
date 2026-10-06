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

  const { data: workflows, error } = await supabase
    .from('wf_workflows')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workflows });
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
    const { org_id, name, portal_url, workflow_definition, filter_rules } = body;

    if (!org_id || !name || !portal_url || !workflow_definition) {
      return NextResponse.json(
        { error: 'Missing required fields: org_id, name, portal_url, workflow_definition' },
        { status: 400 }
      );
    }

    const { data: newWorkflow, error } = await supabase
      .from('wf_workflows')
      .insert({
        org_id,
        name,
        portal_url,
        workflow_definition,
        filter_rules: filter_rules || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workflow: newWorkflow }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid JSON body' }, { status: 400 });
  }
}
