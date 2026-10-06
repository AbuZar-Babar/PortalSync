import { NextRequest, NextResponse } from 'next/server';
import { authenticateRunnerOrUser } from '@/lib/auth/runner-auth';
import { WorkflowDefinition } from '@/lib/types/database';

export async function GET(request: NextRequest) {
  const auth = await authenticateRunnerOrUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { orgId, supabase } = auth.context;

  const { data: workflows, error } = await supabase
    .from('wf_workflows')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workflows: workflows || [] });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRunnerOrUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { orgId, userId, supabase } = auth.context;

  try {
    const body = await request.json();
    const effectiveOrgId = body.org_id || orgId;
    const {
      name,
      portal_url,
      workflow_definition,
      filter_rules,
      upload_to_cloud,
      target_folder,
    } = body;

    if (!name || !portal_url) {
      return NextResponse.json(
        { error: 'Missing required fields: name, portal_url' },
        { status: 400 }
      );
    }

    const baseDefinition: WorkflowDefinition =
      typeof workflow_definition === 'object' && workflow_definition !== null
        ? { ...workflow_definition }
        : {};

    // Incorporate hybrid storage preferences into workflow_definition
    const finalDefinition: WorkflowDefinition = {
      ...baseDefinition,
      upload_to_cloud:
        upload_to_cloud !== undefined
          ? Boolean(upload_to_cloud)
          : Boolean(baseDefinition.upload_to_cloud ?? false),
      target_folder:
        target_folder !== undefined
          ? String(target_folder)
          : String(baseDefinition.target_folder ?? ''),
    };

    const { data: newWorkflow, error } = await supabase
      .from('wf_workflows')
      .insert({
        org_id: effectiveOrgId,
        name,
        portal_url,
        workflow_definition: finalDefinition,
        filter_rules: filter_rules || {},
        created_by: userId || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workflow: newWorkflow }, { status: 201 });
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
    const workflowId = body.workflow_id || body.id;
    const {
      name,
      portal_url,
      workflow_definition,
      filter_rules,
      upload_to_cloud,
      target_folder,
    } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Missing required field: workflow_id' },
        { status: 400 }
      );
    }

    const { data: currentWf, error: fetchError } = await supabase
      .from('wf_workflows')
      .select('*')
      .eq('id', workflowId)
      .maybeSingle();

    if (fetchError || !currentWf) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (currentWf.org_id !== orgId) {
      return NextResponse.json(
        { error: 'Unauthorized: Workflow belongs to a different organization' },
        { status: 403 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updatePayload.name = name;
    if (portal_url !== undefined) updatePayload.portal_url = portal_url;
    if (filter_rules !== undefined) updatePayload.filter_rules = filter_rules;

    let updatedDefinition: WorkflowDefinition =
      typeof currentWf.workflow_definition === 'object' && currentWf.workflow_definition !== null
        ? { ...currentWf.workflow_definition }
        : {};
    let definitionModified = false;

    if (workflow_definition !== undefined && typeof workflow_definition === 'object' && workflow_definition !== null) {
      updatedDefinition = { ...updatedDefinition, ...workflow_definition };
      definitionModified = true;
    }

    if (upload_to_cloud !== undefined) {
      updatedDefinition.upload_to_cloud = Boolean(upload_to_cloud);
      definitionModified = true;
    }

    if (target_folder !== undefined) {
      updatedDefinition.target_folder = String(target_folder);
      definitionModified = true;
    }

    if (definitionModified) {
      updatePayload.workflow_definition = updatedDefinition;
    }

    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('wf_workflows')
      .update(updatePayload)
      .eq('id', workflowId)
      .eq('org_id', orgId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ workflow: updatedWorkflow }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON body';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
