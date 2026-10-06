'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Play, 
  Plus, 
  FileText, 
  CheckCircle, 
  Key, 
  ExternalLink, 
  Download,
  LogOut,
  Building,
  User,
  Loader2,
  Eye,
  RefreshCw,
  Copy,
  Check,
  Square,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CreatePortalModal } from '@/components/dashboard/CreatePortalModal';
import { RunDetailsDrawer, DrawerRunItem } from '@/components/dashboard/RunDetailsDrawer';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { TwoFactorBanner } from '@/components/dashboard/TwoFactorBanner';
import { RunStatus, Workflow } from '@/lib/types/database';

interface DashboardWorkflowItem {
  id: string;
  name: string;
  portal_url: string;
  lastRun?: string;
  status?: string;
  itemsDownloaded?: number;
}

interface DashboardRunItem {
  id: string;
  workflow_id?: string;
  workflowName?: string;
  wf_workflows?: { name?: string };
  status: RunStatus | string;
  total_items_discovered?: number;
  items_discovered?: number;
  itemsDiscovered?: number;
  items_processed?: number;
  itemsProcessed?: number;
  items_downloaded?: number;
  itemsDownloaded?: number;
  time?: string;
  started_at?: string;
  completed_at?: string | null;
  error_summary?: string | null;
  duration?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'workflows' | 'runs'>('workflows');
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('My Organization');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<DashboardWorkflowItem[]>([]);
  const [runs, setRuns] = useState<DashboardRunItem[]>([]);

  // Modal and Drawer states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<DrawerRunItem | null>(null);
  const [triggeringWorkflowId, setTriggeringWorkflowId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [stoppingRunId, setStoppingRunId] = useState<string | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<DashboardWorkflowItem | null>(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let effectiveOrgId: string | null = null;

        if (user) {
          setUserEmail(user.email || null);

          // Get organization membership using org_id
          const { data: members } = await supabase
            .from('wf_organization_members')
            .select('org_id, role, wf_organizations(name, slug)')
            .eq('user_id', user.id)
            .limit(1);

          if (members && members.length > 0) {
            const orgData = (members[0] as unknown as { wf_organizations?: { name?: string; slug?: string } })?.wf_organizations;
            effectiveOrgId = members[0].org_id;
            setOrgId(effectiveOrgId);
            if (orgData?.name) {
              setOrganizationName(orgData.name);
            }
          }
        }

        // If no member record found or demo mode, fallback to default organization
        if (!effectiveOrgId) {
          const { data: orgs } = await supabase
            .from('wf_organizations')
            .select('id, name')
            .limit(1);

          if (orgs && orgs.length > 0) {
            effectiveOrgId = orgs[0].id;
            setOrgId(effectiveOrgId);
            setOrganizationName(orgs[0].name);
          } else {
            effectiveOrgId = '00000000-0000-0000-0000-000000000001';
            setOrgId(effectiveOrgId);
          }
        }

        if (effectiveOrgId) {
          // Fetch workflows for this org using org_id
          const { data: wfList } = await supabase
            .from('wf_workflows')
            .select('*')
            .eq('org_id', effectiveOrgId)
            .order('created_at', { ascending: false });

          if (wfList && wfList.length > 0) {
            setWorkflows(wfList as unknown as DashboardWorkflowItem[]);
          }

          // Fetch runs using org_id and started_at
          const { data: runList } = await supabase
            .from('wf_execution_runs')
            .select('*, wf_workflows(name)')
            .eq('org_id', effectiveOrgId)
            .order('started_at', { ascending: false })
            .limit(20);

          if (runList && runList.length > 0) {
            setRuns(runList as unknown as DashboardRunItem[]);
          }
        }
      } catch (err) {
        console.error('Error loading dashboard session:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Active run polling: every 3 seconds when runs are pending, running, or requires_action
  const hasActiveRuns = runs.some(
    (r) => r.status === 'pending' || r.status === 'running' || r.status === 'requires_action'
  );

  useEffect(() => {
    if (!orgId || !hasActiveRuns) return;

    const pollInterval = setInterval(async () => {
      try {
        const supabase = createClient();
        const { data: updatedRuns, error } = await supabase
          .from('wf_execution_runs')
          .select('*, wf_workflows(name)')
          .eq('org_id', orgId)
          .order('started_at', { ascending: false })
          .limit(20);

        if (!error && updatedRuns && updatedRuns.length > 0) {
          setRuns(updatedRuns as unknown as DashboardRunItem[]);

          // Keep drawer data synchronized in real time
          setSelectedRun((curr) => {
            if (!curr) return null;
            const match = updatedRuns.find((r) => r.id === curr.id);
            return match ? (match as unknown as DrawerRunItem) : curr;
          });
        }
      } catch (err) {
        console.error('Error during active run telemetry poll:', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [orgId, hasActiveRuns]);

  const handleManualRefresh = async () => {
    if (!orgId) return;
    setRefreshing(true);
    try {
      const supabase = createClient();
      const [wfRes, runRes] = await Promise.all([
        supabase
          .from('wf_workflows')
          .select('*')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false }),
        supabase
          .from('wf_execution_runs')
          .select('*, wf_workflows(name)')
          .eq('org_id', orgId)
          .order('started_at', { ascending: false })
          .limit(20),
      ]);

      if (wfRes.data && wfRes.data.length > 0) {
        setWorkflows(wfRes.data as unknown as DashboardWorkflowItem[]);
      }
      if (runRes.data && runRes.data.length > 0) {
        setRuns(runRes.data as unknown as DashboardRunItem[]);
      }
    } catch (err) {
      console.error('Failed to manually refresh dashboard:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Trigger Run Now: inserts real run into Supabase wf_execution_runs with status: 'pending'
  const handleRunNow = async (workflowId: string, workflowName: string) => {
    if (!orgId) return;
    setTriggeringWorkflowId(workflowId);

    try {
      const supabase = createClient();
      const startedAt = new Date().toISOString();

      const { data: newRun, error } = await supabase
        .from('wf_execution_runs')
        .insert({
          org_id: orgId,
          workflow_id: workflowId,
          status: 'pending',
          total_items_discovered: 0,
          items_processed: 0,
          items_downloaded: 0,
          started_at: startedAt,
        })
        .select('*, wf_workflows(name)')
        .single();

      if (error) {
        // Fallback: trigger via API route
        const res = await fetch('/api/v1/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflow_id: workflowId,
            org_id: orgId,
            status: 'pending',
            total_items_discovered: 0,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const apiRun: DashboardRunItem = {
            ...json.run,
            workflowName,
            wf_workflows: { name: workflowName },
          };
          setRuns((prev) => [apiRun, ...prev]);
          setActiveTab('runs');
          return;
        }

        throw new Error(error.message);
      }

      if (newRun) {
        const createdRun: DashboardRunItem = {
          ...(newRun as unknown as DashboardRunItem),
          workflowName:
            (newRun as unknown as { wf_workflows?: { name?: string } })?.wf_workflows?.name ||
            workflowName,
        };
        setRuns((prev) => [createdRun, ...prev]);
        setActiveTab('runs');
      }
    } catch (err) {
      console.error('Failed to trigger workflow run:', err);
    } finally {
      setTriggeringWorkflowId(null);
    }
  };

  // Stop Run: cancels active run atomically in cloud and signals local HTTP bridge
  const handleStopRun = async (runId: string) => {
    setStoppingRunId(runId);
    try {
      // 1. Signal local Desktop HTTP Bridge for zero-latency local abort
      try {
        await fetch('http://127.0.0.1:49152/run/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => {});
      } catch {
        // Local bridge may be offline if viewing dashboard remotely
      }

      // 2. Atomic PATCH to cloud API to mark run as cancelled
      const res = await fetch('/api/v1/runs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: runId,
          status: 'cancelled',
          error_summary: 'Stopped by user from console',
        }),
      });

      if (res.ok) {
        setRuns((prev) =>
          prev.map((r) =>
            r.id === runId
              ? { ...r, status: 'cancelled', error_summary: 'Stopped by user from console' }
              : r
          )
        );

        setSelectedRun((curr) =>
          curr && curr.id === runId
            ? { ...curr, status: 'cancelled', error_summary: 'Stopped by user from console' }
            : curr
        );
      }
    } catch (err) {
      console.error('Failed to stop run:', err);
    } finally {
      setStoppingRunId(null);
    }
  };

  // Delete Workflow: verifies no active run and cascades removal of past history
  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete || !orgId) return;
    setDeletingWorkflow(true);

    try {
      const res = await fetch(`/api/v1/workflows?workflow_id=${workflowToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: workflowToDelete.id,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || 'Failed to delete workflow');
        return;
      }

      // Remove from workflows state
      setWorkflows((prev) => prev.filter((w) => w.id !== workflowToDelete.id));
      // Remove associated runs from runs state
      setRuns((prev) => prev.filter((r) => r.workflow_id !== workflowToDelete.id));
      setWorkflowToDelete(null);
    } catch (err) {
      console.error('Failed to delete workflow:', err);
      alert('Network error while deleting workflow');
    } finally {
      setDeletingWorkflow(false);
    }
  };

  const handleWorkflowCreated = (newWorkflow: Workflow) => {
    const item: DashboardWorkflowItem = {
      id: newWorkflow.id,
      name: newWorkflow.name,
      portal_url: newWorkflow.portal_url,
      lastRun: 'Just created',
      status: 'active',
      itemsDownloaded: 0,
    };
    setWorkflows((prev) => [item, ...prev]);
    setActiveTab('workflows');
  };

  const handleOpenRunDetails = (run: DashboardRunItem) => {
    setSelectedRun(run as unknown as DrawerRunItem);
    setIsDrawerOpen(true);
  };

  // Active 2FA intervention runs
  const activeActionRuns = runs.filter((r) => r.status === 'requires_action');

  // Fallback presentation data if workspace has zero configured items
  const displayWorkflows = workflows.length > 0 ? workflows : [
    {
      id: 'wf_sample_1',
      name: 'US Oil (iRely Portal)',
      portal_url: 'https://customerportal.usoil.com/#/home',
      lastRun: '12 mins ago',
      status: 'active',
      itemsDownloaded: 42,
    },
    {
      id: 'wf_sample_2',
      name: 'Amazon Business Invoices',
      portal_url: 'https://business.amazon.com/orders',
      lastRun: '2 days ago',
      status: 'active',
      itemsDownloaded: 128,
    },
    {
      id: 'wf_sample_3',
      name: 'Pacific Gas & Electric Monthly Bills',
      portal_url: 'https://pge.com/ebills',
      lastRun: '5 days ago',
      status: 'paused',
      itemsDownloaded: 12,
    },
  ];

  const displayRuns = runs.length > 0 ? runs : [
    {
      id: 'run_sample_1',
      workflowName: 'US Oil (iRely Portal)',
      status: 'completed',
      itemsDiscovered: 18,
      itemsDownloaded: 12,
      time: 'Today, 2:40 PM',
      duration: '45s',
    },
    {
      id: 'run_sample_2',
      workflowName: 'Amazon Business Invoices',
      status: 'completed',
      itemsDiscovered: 50,
      itemsDownloaded: 50,
      time: 'Yesterday, 9:15 AM',
      duration: '1m 20s',
    },
    {
      id: 'run_sample_3',
      workflowName: 'Pacific Gas & Electric Monthly Bills',
      status: 'failed',
      itemsDiscovered: 6,
      itemsDownloaded: 2,
      time: 'Oct 4, 11:30 AM',
      duration: '18s',
      error_summary: 'Target login timeout: password reset prompt displayed.',
    },
  ];

  const totalInvoicesDownloaded = runs.reduce(
    (acc, r) => acc + (r.items_downloaded ?? r.itemsDownloaded ?? 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
              P
            </div>
            <span className="font-semibold tracking-tight text-white">PortalSync Console</span>
          </Link>
          <span className="text-slate-600">/</span>
          <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700/60">
            <Building className="w-3.5 h-3.5 text-blue-400" />
            <span>{organizationName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (orgId) {
                navigator.clipboard.writeText(`ps_live_${orgId}`);
                setCopiedToken(true);
                setTimeout(() => setCopiedToken(false), 2000);
              }
            }}
            title="Click to copy full runner token"
            className="hidden sm:flex items-center gap-2 text-xs bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800/40 px-3 py-1.5 rounded-lg transition cursor-pointer group"
          >
            <Key className="h-3.5 w-3.5 text-blue-400" />
            <span>Runner Token:</span>
            <code className="font-mono text-[11px] text-blue-200">ps_live_{orgId?.substring(0, 8) || 'test89f2'}...</code>
            {copiedToken ? (
              <Check className="h-3.5 w-3.5 text-emerald-400 ml-1" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300 ml-1 transition" />
            )}
            {copiedToken && <span className="text-[10px] text-emerald-400 font-medium">Copied!</span>}
          </button>

          <button
            onClick={handleManualRefresh}
            title="Refresh dashboard data"
            className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {userEmail && (
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="max-w-[150px] truncate">{userEmail}</span>
            </div>
          )}

          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Prominent 2FA Intervention Banner if any run requires action */}
        <TwoFactorBanner
          activeActionRuns={activeActionRuns}
          onSelectRun={(run) => handleOpenRunDetails(run as unknown as DashboardRunItem)}
        />

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Active Portals</div>
            <div className="text-2xl font-bold text-white mt-1">{displayWorkflows.length}</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Invoices Downloaded (This Month)</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">
              {totalInvoicesDownloaded > 0 ? totalInvoicesDownloaded : 182}
            </div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Drive Sync Status</div>
            <div className="text-2xl font-bold text-teal-400 mt-1 flex items-center gap-1.5">
              <CheckCircle className="h-5 w-5" /> Healthy
            </div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Estimated Time Saved</div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">14.2 hrs</div>
          </div>
        </div>

        {/* Desktop Runner Connection Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-800/30 flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Desktop Runner Connected</div>
              <div className="text-xs text-slate-400">
                Running locally on Windows • Chrome CDP Port 9222 Active • 0 auth errors
                {hasActiveRuns && (
                  <span className="ml-2 text-blue-400 font-semibold">• Live Telemetry Polling Active (3s)</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">Online</span>
          </div>
        </div>

        {/* Tabs and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('workflows')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'workflows'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vendor Portals ({displayWorkflows.length})
            </button>
            <button
              onClick={() => setActiveTab('runs')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'runs'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Execution History & Telemetry ({displayRuns.length})</span>
              {hasActiveRuns && (
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
              )}
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Record New Portal
          </button>
        </div>

        {/* Table Content */}
        {activeTab === 'workflows' ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Portal / Workflow Name</th>
                  <th className="px-6 py-3.5">Target Portal URL</th>
                  <th className="px-6 py-3.5">Downloaded Invoices</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayWorkflows.map((wf) => {
                  const activeRun = runs.find(
                    (r) => r.workflow_id === wf.id && (r.status === 'pending' || r.status === 'running' || r.status === 'requires_action')
                  );
                  const isStopping = activeRun && stoppingRunId === activeRun.id;

                  return (
                    <tr key={wf.id} className="hover:bg-slate-900/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-400" />
                          {wf.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400 max-w-xs truncate">
                        <a
                          href={wf.portal_url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 hover:text-blue-300"
                        >
                          {wf.portal_url || 'https://vendor-portal.com'} <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="font-semibold text-white">{wf.itemsDownloaded ?? 0}</span> PDFs
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {activeRun ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-medium capitalize animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
                            {activeRun.status === 'requires_action' ? '2FA Action' : 'Running'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium capitalize">
                            {wf.status || 'Active'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {activeRun ? (
                            <button
                              onClick={() => handleStopRun(activeRun.id)}
                              disabled={isStopping}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-medium transition cursor-pointer disabled:opacity-50"
                              title="Immediately stop workflow execution"
                            >
                              {isStopping ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" /> Stopping...
                                </>
                              ) : (
                                <>
                                  <Square className="h-3 w-3 fill-current text-red-400" /> Stop Run
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRunNow(wf.id, wf.name)}
                              disabled={triggeringWorkflowId === wf.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-medium transition cursor-pointer disabled:opacity-50"
                            >
                              {triggeringWorkflowId === wf.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" /> Dispatching...
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3 fill-current" /> Run Now
                                </>
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => setWorkflowToDelete(wf)}
                            disabled={!!activeRun}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={activeRun ? "Cannot delete while run is active" : "Delete portal"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Workflow</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Discovered</th>
                  <th className="px-6 py-3.5">Downloaded</th>
                  <th className="px-6 py-3.5">Time / Started</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayRuns.map((run) => (
                  <tr
                    key={run.id}
                    onClick={() => handleOpenRunDetails(run)}
                    className="hover:bg-slate-900/60 transition cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium text-white">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span>{run.workflowName || run.wf_workflows?.name || 'Portal Run'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300">
                      {run.total_items_discovered ?? run.items_discovered ?? run.itemsDiscovered ?? 0} items
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-white">
                      {run.items_downloaded ?? run.itemsDownloaded ?? 0} PDFs
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {run.time || (run.started_at ? new Date(run.started_at).toLocaleTimeString() : 'Just now')}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      {run.duration || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRunDetails(run);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Dual-Mode Portal Creator Modal */}
      <CreatePortalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        orgId={orgId || '00000000-0000-0000-0000-000000000001'}
        onWorkflowCreated={handleWorkflowCreated}
      />

      {/* Run Details & Artifacts Slide-over Drawer */}
      <RunDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        run={selectedRun}
        onStopRun={handleStopRun}
      />

      {/* Delete Workflow Confirmation Modal */}
      {workflowToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Portal Workflow</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to delete <span className="font-semibold text-white">"{workflowToDelete.name}"</span>?
              All associated execution runs and recorded artifacts will be permanently removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setWorkflowToDelete(null)}
                disabled={deletingWorkflow}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteWorkflow}
                disabled={deletingWorkflow}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-500 transition shadow-lg shadow-red-500/20 cursor-pointer disabled:opacity-50"
              >
                {deletingWorkflow ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Delete Portal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
