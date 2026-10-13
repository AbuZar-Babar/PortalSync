-- ============================================================================
-- ReFlow Database Schema
-- Supabase PostgreSQL with Row Level Security (RLS)
-- ============================================================================

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.wf_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_tier TEXT DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'pro', 'business', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Organization Members
CREATE TABLE IF NOT EXISTS public.wf_organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.wf_organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(org_id, user_id)
);

-- 3. Workflows
CREATE TABLE IF NOT EXISTS public.wf_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.wf_organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    portal_url TEXT NOT NULL DEFAULT '',
    schema_version TEXT DEFAULT '1.0.0',
    workflow_definition JSONB DEFAULT '{}'::jsonb NOT NULL,
    filter_rules JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Execution Runs
CREATE TABLE IF NOT EXISTS public.wf_execution_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.wf_organizations(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES public.wf_workflows(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'requires_action', 'completed', 'failed', 'cancelled')),
    total_items_discovered INT DEFAULT 0,
    items_processed INT DEFAULT 0,
    items_downloaded INT DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    completed_at TIMESTAMPTZ,
    error_summary TEXT
);

-- 5. Run Artifacts
CREATE TABLE IF NOT EXISTS public.wf_run_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.wf_execution_runs(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT,
    sha256_hash TEXT NOT NULL,
    item_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    cloud_storage_path TEXT,
    synced_to_drive BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_wf_org_members_user_id ON public.wf_organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_wf_workflows_org_id ON public.wf_workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_wf_execution_runs_org_id ON public.wf_execution_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_wf_execution_runs_status ON public.wf_execution_runs(status);
CREATE INDEX IF NOT EXISTS idx_wf_execution_runs_workflow_id ON public.wf_execution_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_run_artifacts_run_id ON public.wf_run_artifacts(run_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.wf_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wf_organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wf_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wf_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wf_run_artifacts ENABLE ROW LEVEL SECURITY;

-- Organization Members RLS Policies
CREATE POLICY "Users can view their organizations" ON public.wf_organizations
    FOR ALL USING (
        id IN (SELECT org_id FROM public.wf_organization_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can view their organization memberships" ON public.wf_organization_members
    FOR ALL USING (
        org_id IN (SELECT org_id FROM public.wf_organization_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can manage workflows in their org" ON public.wf_workflows
    FOR ALL USING (
        org_id IN (SELECT org_id FROM public.wf_organization_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can manage execution runs in their org" ON public.wf_execution_runs
    FOR ALL USING (
        org_id IN (SELECT org_id FROM public.wf_organization_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can manage artifacts in their org" ON public.wf_run_artifacts
    FOR ALL USING (
        run_id IN (
            SELECT r.id FROM public.wf_execution_runs r
            JOIN public.wf_organization_members m ON r.org_id = m.org_id
            WHERE m.user_id = auth.uid()
        )
    );
