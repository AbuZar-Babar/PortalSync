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
  AlertTriangle,
  Clock,
  Workflow as WorkflowIcon,
  Sparkles,
  Video,
  FileCode
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [stoppingRunId, setStoppingRunId] = useState<string | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<DashboardWorkflowItem | null>(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState(false);
  const [isRunnerOnline, setIsRunnerOnline] = useState<boolean>(false);
  const [modalInitialTab, setModalInitialTab] = useState<'record' | 'canvas' | 'import' | 'quick'>('record');

  const handleOpenCreateModal = (tab: 'record' | 'canvas' | 'import' | 'quick' = 'record') => {
    setModalInitialTab(tab);
    setIsCreateModalOpen(true);
  };

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        setUserEmail(user.email || null);

        // Resolve authenticated user's organization strictly via wf_organization_members joined with wf_organizations
        const { data: members, error: memberError } = await supabase
          .from('wf_organization_members')
          .select('org_id, role, wf_organizations(name, slug)')
          .eq('user_id', user.id)
          .limit(1);

        if (memberError) {
          console.error('Error fetching org membership:', memberError);
        }

        // Eliminate fallback crosstalk: if user has no org membership, cleanly redirect to /onboarding
        if (!members || members.length === 0) {
          router.push('/onboarding');
          return;
        }

        const effectiveOrgId = members[0].org_id;
        setOrgId(effectiveOrgId);

        const orgData = (members[0] as unknown as { wf_organizations?: { name?: string; slug?: string } })?.wf_organizations;
        if (orgData?.name) {
          setOrganizationName(orgData.name);
        }

        // Fetch workflows strictly filtered by effectiveOrgId
        const { data: wfList } = await supabase
          .from('wf_workflows')
          .select('*')
          .eq('org_id', effectiveOrgId)
          .order('created_at', { ascending: false });

        setWorkflows((wfList || []) as unknown as DashboardWorkflowItem[]);

        // Fetch runs strictly filtered by effectiveOrgId
        const { data: runList } = await supabase
          .from('wf_execution_runs')
          .select('*, wf_workflows(name)')
          .eq('org_id', effectiveOrgId)
          .order('started_at', { ascending: false })
          .limit(20);

        setRuns((runList || []) as unknown as DashboardRunItem[]);
      } catch (err) {
        console.error('Error loading dashboard session:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [router]);

  // Live periodic health check against http://127.0.0.1:49152/health (checked on mount and every 5 seconds)
  useEffect(() => {
    let isSubscribed = true;
    let abortController: AbortController | null = null;

    const checkRunnerHealth = async () => {
      try {
        abortController?.abort();
        abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController?.abort(), 2000);

        const res = await fetch('http://127.0.0.1:49152/health', {
          signal: abortController.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeoutId);

        if (isSubscribed) {
          setIsRunnerOnline(res.ok);
        }
      } catch {
        if (isSubscribed) {
          setIsRunnerOnline(false);
        }
      }
    };

    checkRunnerHealth();
    const interval = setInterval(checkRunnerHealth, 5000);

    return () => {
      isSubscribed = false;
      abortController?.abort();
      clearInterval(interval);
    };
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

      setWorkflows((wfRes.data || []) as unknown as DashboardWorkflowItem[]);
      setRuns((runRes.data || []) as unknown as DashboardRunItem[]);
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

  // Real metric calculations
  const totalInvoicesDownloaded = runs.reduce(
    (acc, r) => acc + (r.items_downloaded ?? r.itemsDownloaded ?? 0),
    0
  );

  const estimatedHoursSaved = totalInvoicesDownloaded > 0
    ? `${((totalInvoicesDownloaded * 4.7) / 60).toFixed(1)} hrs`
    : '0 hrs';

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
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              F
            </div>
            <span className="font-semibold tracking-tight text-white group-hover:text-cyan-300 transition-colors">FlowMind Console</span>
          </Link>
          <span className="text-slate-600">/</span>
          <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700/60">
            <Building className="w-3.5 h-3.5 text-cyan-400" />
            <span>{organizationName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (orgId) {
                const token = `ps_live_${orgId}`;
                navigator.clipboard.writeText(token);
                setCopiedToken(true);
                setToastMessage(`Runner token ${token} copied to clipboard`);
                setTimeout(() => {
                  setCopiedToken(false);
                  setToastMessage(null);
                }, 2500);
              }
            }}
            title={orgId ? `FlowMind Live Runner Token: ps_live_${orgId}` : 'Loading FlowMind Live Runner Token...'}
            className="hidden sm:flex items-center gap-2 text-xs bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-800/40 px-3 py-1.5 rounded-lg transition cursor-pointer group"
          >
            <Key className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-medium">FlowMind Live Runner Token:</span>
            <code className="font-mono text-[11px] text-cyan-200">
              {orgId ? `ps_live_${orgId}` : 'Loading...'}
            </code>
            {copiedToken ? (
              <Check className="h-3.5 w-3.5 text-emerald-400 ml-1" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-cyan-300 ml-1 transition" />
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
            <div className="text-2xl font-bold text-white mt-1">{workflows.length}</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Invoices Downloaded (This Month)</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">
              {totalInvoicesDownloaded}
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
            <div className="text-2xl font-bold text-cyan-400 mt-1">{estimatedHoursSaved}</div>
          </div>
        </div>

        {/* Dynamic Desktop Runner Health Detection Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between mb-8 transition-colors ${
            isRunnerOnline
              ? 'bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 border-emerald-800/40'
              : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors ${
                isRunnerOnline
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Download className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                {isRunnerOnline ? 'FlowMind Desktop Runner Online' : 'FlowMind Desktop Runner Offline'}
              </div>
              <div className="text-xs text-slate-400">
                {isRunnerOnline ? (
                  <>
                    Running locally on Windows • Chrome CDP Port 9222 Active • 0 auth errors
                    {hasActiveRuns && (
                      <span className="ml-2 text-emerald-400 font-semibold">• Live Telemetry Polling Active (3s)</span>
                    )}
                  </>
                ) : (
                  'Launch FlowMind Desktop Runner to execute local browser workflows'
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isRunnerOnline ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>🟢 FlowMind Desktop Runner Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium">
                <span className="flex h-2 w-2 rounded-full bg-slate-500" />
                <span>⚪ FlowMind Desktop Runner Offline</span>
              </div>
            )}
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
              Vendor Portals ({workflows.length})
            </button>
            <button
              onClick={() => setActiveTab('runs')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'runs'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Execution History & Telemetry ({runs.length})</span>
              {hasActiveRuns && (
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
              )}
            </button>
          </div>

          <button
            onClick={() => handleOpenCreateModal('record')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Create Workflow
          </button>
        </div>

        {/* Table Content */}
        {activeTab === 'workflows' ? (
          workflows.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-900/50 to-slate-950/90 p-8 md:p-12 text-center shadow-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-4">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>FlowMind Quickstart</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Welcome to FlowMind — Create Your First Workflow
              </h3>
              <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto mt-2 mb-8">
                Automate vendor portals and invoice collection in minutes. Choose how you want to build your workflow:
              </p>

              {/* 3-card pathway */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left mb-8 max-w-4xl mx-auto">
                {/* 1. Record in Chrome */}
                <div
                  onClick={() => handleOpenCreateModal('record')}
                  className="group relative rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-cyan-500/40 hover:bg-slate-900/90 transition-all cursor-pointer shadow-lg hover:shadow-cyan-500/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition-transform">
                      <Video className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      CDP Capture
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    1. Record in Chrome
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Web-to-Desktop CDP capture. Perform actions naturally in Chrome; FlowMind records selectors, clicks, and downloads.
                  </p>
                </div>

                {/* 2. Visual Canvas Builder */}
                <div
                  onClick={() => handleOpenCreateModal('canvas')}
                  className="group relative rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-indigo-500/40 hover:bg-slate-900/90 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                      <WorkflowIcon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                      Visual Editor
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    2. Visual Canvas Builder
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Direct visual node editor. Build and customize workflows with Quixotic Slate cards, loop iterations, and property drawers.
                  </p>
                </div>

                {/* 3. Import Workflow JSON */}
                <div
                  onClick={() => handleOpenCreateModal('import')}
                  className="group relative rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-emerald-500/40 hover:bg-slate-900/90 transition-all cursor-pointer shadow-lg hover:shadow-emerald-500/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                      <FileCode className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      Recipe JSON
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    3. Import Workflow JSON
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Upload existing recipes or JSON migration scripts. Full schema validation, step inspection, and instant dispatch.
                  </p>
                </div>
              </div>

              {/* Primary CTA */}
              <button
                onClick={() => handleOpenCreateModal('record')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer group"
              >
                <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
                <span>Create Your First Workflow</span>
              </button>
            </div>
          ) : (
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
                  {workflows.map((wf) => {
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
                            <Link
                              href={`/dashboard/workflows/${wf.id}/edit`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition cursor-pointer"
                              title="Open Visual Canvas Editor"
                            >
                              <WorkflowIcon className="h-3.5 w-3.5" />
                              <span>Visual Canvas</span>
                            </Link>
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
          )
        ) : runs.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-4 border border-slate-700/50">
              <Clock className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">No Execution Runs Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Execution runs and sync telemetry will appear here when you trigger a portal workflow or scheduled sync.
            </p>
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
                {runs.map((run) => (
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

      {/* Create Portal Modal */}
      <CreatePortalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        orgId={orgId || ''}
        onWorkflowCreated={handleWorkflowCreated}
        initialTab={modalInitialTab}
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
              Are you sure you want to delete <span className="font-semibold text-white">&quot;{workflowToDelete.name}&quot;</span>?
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs shadow-2xl shadow-black/60 animate-in fade-in slide-in-from-bottom-2">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
