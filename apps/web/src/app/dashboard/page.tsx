'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Workflow as WorkflowIcon,
  Activity,
  FileText,
  Cpu,
  Plus,
  Play,
  ArrowRight,
  Clock,
  Sparkles,
  TrendingUp,
  Download,
  ShieldCheck,
  RotateCw,
  Copy,
  Check,
  Square,
  Network
} from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import { RobotAvatar } from '@/components/dashboard/RobotAvatar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { TwoFactorBanner, ActionRequiredRunInfo } from '@/components/dashboard/TwoFactorBanner';
import { CreatePortalModal } from '@/components/dashboard/CreatePortalModal';
import { ExecutionPreflightModal } from '@/components/dashboard/ExecutionPreflightModal';
import { DrawerRunItem } from '@/components/dashboard/RunDetailsDrawer';
import { Workflow as WorkflowModel, RunStatus } from '@/lib/types/database';

interface DashboardStats {
  totalWorkflows: number;
  totalRuns: number;
  successRate: number;
  totalInvoices: number;
}

interface ActivityRunItem extends DrawerRunItem {
  percent?: number;
}

function extractDomain(url?: string): string {
  if (!url || url === 'about:blank' || url === 'unknown') return 'portal';
  try {
    const raw = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(raw);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || 'portal';
  }
}

function formatRelativeTime(dateInput?: string | null): string {
  if (!dateInput) return 'Recently';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDuration(startedAt?: string | null, completedAt?: string | null): string {
  if (!startedAt) return '—';
  const start = new Date(startedAt).getTime();
  if (isNaN(start)) return '—';
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  if (isNaN(end) || end < start) return '—';

  const diffSec = Math.floor((end - start) / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  const min = Math.floor(diffSec / 60);
  const sec = diffSec % 60;
  return `${min}m ${sec}s`;
}

export default function DashboardOverviewPage() {
  const {
    orgId,
    organizationName,
    isRunnerOnline,
    runnerToken,
    openRunDetails,
    stopActiveRun,
    refreshDashboard
  } = useDashboard();

  const [stats, setStats] = useState<DashboardStats>({
    totalWorkflows: 0,
    totalRuns: 0,
    successRate: 100,
    totalInvoices: 0
  });

  const [recentRuns, setRecentRuns] = useState<ActivityRunItem[]>([]);
  const [allRuns, setAllRuns] = useState<DrawerRunItem[]>([]);
  const [quickWorkflows, setQuickWorkflows] = useState<WorkflowModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [stoppingRunId, setStoppingRunId] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPreflightModalOpen, setIsPreflightModalOpen] = useState(false);
  const [selectedWorkflowForRun, setSelectedWorkflowForRun] = useState<WorkflowModel | null>(null);

  // Load and calculate overview metrics
  const loadOverviewData = useCallback(async (isSilent = false) => {
    if (!orgId) return;
    if (!isSilent) setIsRefreshingLocal(true);

    try {
      const supabase = createClient();

      // 1. Fetch workflows count & quick workflows list
      const { data: workflowsData, count: wfCount } = await supabase
        .from('wf_workflows')
        .select('*', { count: 'exact' })
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      const workflowsList = (workflowsData || []) as WorkflowModel[];

      // 2. Fetch execution runs with exact count and joined workflow name
      const { data: runsData, count: runsCount } = await supabase
        .from('wf_execution_runs')
        .select(
          'id, org_id, workflow_id, status, total_items_discovered, items_processed, items_downloaded, started_at, completed_at, error_summary, wf_workflows(name)',
          { count: 'exact' }
        )
        .eq('org_id', orgId)
        .order('started_at', { ascending: false });

      const rawRuns = (runsData || []) as Array<Record<string, unknown>>;

      // 3. Calculate Invoices Downloaded & Artifacts
      const sumItemsDownloaded = rawRuns.reduce(
        (acc, r) => acc + (Number(r.items_downloaded) || 0),
        0
      );

      const runIds = rawRuns.map((r) => String(r.id));
      let artifactsCount = 0;
      if (runIds.length > 0) {
        const { count: artCount } = await supabase
          .from('wf_run_artifacts')
          .select('id', { count: 'exact', head: true })
          .in('run_id', runIds);
        artifactsCount = artCount ?? 0;
      }
      const totalInvoices = Math.max(sumItemsDownloaded, artifactsCount);

      // 4. Compute Success Rate using case-insensitive status matching
      const totalR = runsCount ?? rawRuns.length;
      const completedCount = rawRuns.filter((r) => {
        const st = String(r.status || '').toLowerCase();
        return st === 'completed' || st === 'success';
      }).length;
      const rate = totalR > 0 ? Math.round((completedCount / totalR) * 100) : 100;

      setStats({
        totalWorkflows: wfCount ?? workflowsList.length,
        totalRuns: totalR,
        successRate: rate,
        totalInvoices
      });

      // 5. Parse runs for live activity stream and global drawer compatibility
      const parsedAllRuns: DrawerRunItem[] = rawRuns.map((r) => {
        const wf = r.wf_workflows as { name?: string } | null;
        const totalItems = Number(r.total_items_discovered || 0);
        const processed = Number(r.items_processed || 0);

        return {
          id: String(r.id),
          workflow_id: r.workflow_id ? String(r.workflow_id) : undefined,
          workflowName: wf?.name || 'Automated Workflow',
          wf_workflows: wf || undefined,
          status: (r.status as RunStatus) || 'pending',
          total_items_discovered: totalItems,
          items_processed: processed,
          items_downloaded: Number(r.items_downloaded || 0),
          started_at: r.started_at ? String(r.started_at) : undefined,
          completed_at: r.completed_at ? String(r.completed_at) : null,
          error_summary: r.error_summary ? String(r.error_summary) : null,
          time: r.started_at ? formatRelativeTime(String(r.started_at)) : undefined,
          duration: formatDuration(
            r.started_at ? String(r.started_at) : null,
            r.completed_at ? String(r.completed_at) : null
          )
        };
      });

      const parsedRecentRuns: ActivityRunItem[] = parsedAllRuns.slice(0, 6).map((run) => {
        const totalItems = run.total_items_discovered || 0;
        const processed = run.items_processed || 0;
        const percent =
          totalItems > 0 ? Math.min(100, Math.round((processed / totalItems) * 100)) : undefined;

        return {
          ...run,
          percent
        };
      });

      setAllRuns(parsedAllRuns);
      setRecentRuns(parsedRecentRuns);
      setQuickWorkflows(workflowsList.slice(0, 4));
    } catch (err) {
      console.error('Error loading dashboard overview data:', err);
    } finally {
      setLoading(false);
      setIsRefreshingLocal(false);
    }
  }, [orgId]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        void loadOverviewData();
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [loadOverviewData]);

  // Realtime subscription on wf_execution_runs
  useEffect(() => {
    if (!orgId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`wf_dashboard_overview_${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wf_execution_runs',
          filter: `org_id=eq.${orgId}`
        },
        () => {
          void loadOverviewData(true);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orgId, loadOverviewData]);

  // Fallback 3s polling when active runs are executing
  const hasActiveRuns = useMemo(() => {
    return recentRuns.some((r) => {
      const st = String(r.status).toLowerCase();
      return st === 'pending' || st === 'running' || st === 'requires_action';
    });
  }, [recentRuns]);

  useEffect(() => {
    if (!hasActiveRuns || !orgId) return;

    const interval = setInterval(() => {
      void loadOverviewData(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [hasActiveRuns, orgId, loadOverviewData]);

  // Identify runs requiring 2FA intervention
  const activeActionRuns: ActionRequiredRunInfo[] = useMemo(() => {
    return allRuns
      .filter((r) => String(r.status).toLowerCase() === 'requires_action')
      .map((r) => ({
        id: r.id,
        workflowName: r.workflowName,
        wf_workflows: r.wf_workflows,
        error_summary: r.error_summary,
        started_at: r.started_at
      }));
  }, [allRuns]);

  // Handlers
  const handleLaunchWorkflow = (wf: WorkflowModel) => {
    setSelectedWorkflowForRun(wf);
    setIsPreflightModalOpen(true);
  };

  const handleStopRun = async (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStoppingRunId(runId);
    try {
      const ok = await stopActiveRun(runId);
      if (ok) {
        setRecentRuns((prev) =>
          prev.map((r) => (r.id === runId ? { ...r, status: 'cancelled' } : r))
        );
        setAllRuns((prev) =>
          prev.map((r) => (r.id === runId ? { ...r, status: 'cancelled' } : r))
        );
      }
    } finally {
      setStoppingRunId(null);
    }
  };

  const handleCopyToken = () => {
    if (runnerToken && typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(runnerToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshingLocal(true);
    await Promise.all([loadOverviewData(false), refreshDashboard()]);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 2FA Challenge Human-in-the-Loop Banner */}
      <TwoFactorBanner
        activeActionRuns={activeActionRuns}
        onSelectRun={(run) => {
          const matched = allRuns.find((r) => r.id === run.id) || recentRuns.find((r) => r.id === run.id);
          if (matched) {
            openRunDetails(matched);
          } else {
            openRunDetails({
              id: run.id,
              workflowName: run.workflowName || run.wf_workflows?.name || 'Automated Workflow',
              wf_workflows: run.wf_workflows,
              status: 'requires_action',
              started_at: run.started_at,
              error_summary: run.error_summary
            });
          }
        }}
      />

      {/* Hero Welcome & Executive Command Center Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0c101d] via-[#11172e] to-[#0c101d] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <RobotAvatar size="card" state={isRunnerOnline ? 'running' : 'idle'} />
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Executive Command Center
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 uppercase tracking-wider shadow-[0_0_10px_rgba(0,240,255,0.15)]">
                  AUTONOMOUS
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Control plane for <strong className="text-white">{organizationName}</strong>. Live workflow telemetry, zero-cloud-cost execution, and resilient self-healing selectors.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Active Worker Diagnostic Pill */}
            <Link
              href="/dashboard/runners"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isRunnerOnline
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                  : 'bg-slate-900 border-white/10 text-slate-400 hover:bg-slate-800'
              }`}
              title={isRunnerOnline ? 'Desktop Worker Online & CDP Port 9222 Active' : 'No runner active. Click to connect'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isRunnerOnline ? 'bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span>{isRunnerOnline ? 'Desktop Worker Online' : 'Worker Offline'}</span>
            </Link>

            {/* Quick Action: New Workflow */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Workflow</span>
            </button>

            {/* Manual Refresh Trigger */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshingLocal}
              className="p-2 rounded-xl bg-slate-900/80 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              title="Refresh overview telemetry"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshingLocal ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Subtle Ambient Background Flare */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 4 Visual KPI Metric Cards with Trend Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Workflows */}
        <Link
          href="/dashboard/workflows"
          className="bg-[#0c101d] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-5 shadow-lg transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">
              Active Workflows
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <WorkflowIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {loading ? '—' : stats.totalWorkflows}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">portals</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400">
            <Sparkles className="w-3 h-3" />
            <span>Ready to Automate</span>
          </div>
        </Link>

        {/* Metric 2: Total Executions */}
        <Link
          href="/dashboard/runs"
          className="bg-[#0c101d] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-5 shadow-lg transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">
              Total Executions
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {loading ? '—' : stats.totalRuns}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">dispatched</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span>Realtime Telemetry</span>
          </div>
        </Link>

        {/* Metric 3: Success Rate (%) */}
        <div className="bg-[#0c101d] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Success Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">
              {loading ? '—' : `${stats.successRate}%`}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">reliability</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            <span>Self-Healing Selectors</span>
          </div>
        </div>

        {/* Metric 4: Invoices Downloaded */}
        <Link
          href="/dashboard/artifacts"
          className="bg-[#0c101d] border border-white/5 hover:border-purple-500/30 rounded-2xl p-5 shadow-lg transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">
              Invoices Downloaded
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {loading ? '—' : stats.totalInvoices}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">files stored</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-purple-400">
            <Download className="w-3 h-3" />
            <span>SHA-256 Vaulted</span>
          </div>
        </Link>
      </div>

      {/* Main Grid: Quick Launch Workflows + Live Execution Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Quick Launch Workflows + Worker Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Launch Workflows Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WorkflowIcon className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">Quick Launch Workflows</h2>
              </div>
              <Link
                href="/dashboard/workflows"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 group"
              >
                <span>View Library</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {loading && quickWorkflows.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="bg-[#0c101d] border border-white/5 rounded-2xl p-5 animate-pulse space-y-3 h-36"
                  >
                    <div className="h-4 bg-slate-800 rounded w-1/3" />
                    <div className="h-5 bg-slate-800 rounded w-2/3" />
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : quickWorkflows.length === 0 ? (
              <div className="bg-[#0c101d] border border-white/5 rounded-2xl p-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 mx-auto flex items-center justify-center text-slate-500">
                  <WorkflowIcon className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-400">No workflows recorded yet in this workspace.</p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-semibold border border-cyan-500/30 cursor-pointer"
                >
                  Create First Workflow
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickWorkflows.map((wf) => {
                  const stepCount = Array.isArray(wf.workflow_definition?.steps)
                    ? wf.workflow_definition.steps.length
                    : 0;
                  return (
                    <div
                      key={wf.id}
                      className="bg-[#0c101d] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-5 shadow-lg transition-all space-y-4 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 border border-white/5 truncate max-w-[140px]">
                            {extractDomain(wf.portal_url)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium bg-slate-900/60 px-2 py-0.5 rounded-md border border-white/5">
                            {stepCount} step{stepCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white mt-2.5 truncate tracking-tight group-hover:text-cyan-300 transition-colors">
                          {wf.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {wf.portal_url || 'Autonomous portal extraction'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        {/* Visual Canvas Shortcut */}
                        <Link
                          href={`/dashboard/workflows/${wf.id}/edit`}
                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                          title="Open in Visual Canvas Editor"
                        >
                          <Network className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Edit Canvas</span>
                        </Link>

                        {/* Direct Preflight Run Button */}
                        <button
                          onClick={() => handleLaunchWorkflow(wf)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-xs font-bold border border-cyan-400/30 transition-all cursor-pointer shadow-sm"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Run</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Worker Telemetry Summary Widget */}
          <div className="bg-[#0c101d] border border-white/5 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white tracking-tight uppercase">Local Worker Daemon Status</h3>
              </div>
              <Link
                href="/dashboard/runners"
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <span>Manage Hub</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 font-medium">Worker State</span>
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRunnerOnline ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span>{isRunnerOnline ? 'Online (Ready)' : 'Disconnected'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 font-medium">Engine Platform</span>
                <div className="font-bold text-white truncate">Windows 11 x64</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 font-medium">Organization Token</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-cyan-300 truncate max-w-[110px]">
                    {runnerToken ? `${runnerToken.slice(0, 12)}...` : 'ps_live_...'}
                  </span>
                  <button
                    onClick={handleCopyToken}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy pairing token"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Live Execution Activity Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white tracking-tight">Live Execution Stream</h2>
            </div>
            <Link
              href="/dashboard/runs"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 group"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="bg-[#0c101d] border border-white/5 rounded-2xl p-4 shadow-lg space-y-3">
            {loading && recentRuns.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 animate-pulse space-y-2"
                  >
                    <div className="h-4 bg-slate-800 rounded w-1/2" />
                    <div className="h-3 bg-slate-800 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : recentRuns.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <Activity className="w-6 h-6 mx-auto text-slate-600" />
                <p>No executions dispatched yet.</p>
              </div>
            ) : (
              recentRuns.map((run) => {
                const isActive = ['pending', 'running', 'requires_action'].includes(
                  String(run.status).toLowerCase()
                );

                return (
                  <div
                    key={run.id}
                    onClick={() => openRunDetails(run)}
                    className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 hover:border-cyan-500/30 hover:bg-slate-900/40 cursor-pointer transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate max-w-[160px]">
                        {run.workflowName}
                      </span>
                      <StatusBadge status={run.status} />
                    </div>

                    {/* Live Progress Bar for active running runs */}
                    {isActive && run.percent !== undefined && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                          <span>Progress</span>
                          <span>
                            {run.items_processed} / {run.total_items_discovered} ({run.percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${run.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {isActive && run.percent === undefined && String(run.status).toLowerCase() === 'running' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                          <span>Executing steps...</span>
                          <span>{run.items_processed || 0} processed</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-cyan-400 h-1.5 rounded-full w-1/3 animate-pulse" />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{run.time || 'Recently'}</span>
                        <span className="text-slate-600">({run.duration})</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <span>
                          {run.items_downloaded && run.items_downloaded > 0
                            ? `${run.items_downloaded} files`
                            : `${run.items_processed || 0} items`}
                        </span>

                        {isActive && (
                          <button
                            onClick={(e) => handleStopRun(run.id, e)}
                            disabled={stoppingRunId === run.id}
                            className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Stop execution"
                          >
                            <Square className="w-3 h-3 fill-current" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Global Modals */}
      <CreatePortalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        orgId={orgId || ''}
        onWorkflowCreated={async () => {
          setIsCreateModalOpen(false);
          await loadOverviewData();
        }}
      />

      <ExecutionPreflightModal
        isOpen={isPreflightModalOpen}
        onClose={() => {
          setIsPreflightModalOpen(false);
          setSelectedWorkflowForRun(null);
        }}
        workflow={selectedWorkflowForRun}
        onRunDispatched={(run) => {
          setIsPreflightModalOpen(false);
          setSelectedWorkflowForRun(null);
          openRunDetails(run);
        }}
      />
    </div>
  );
}
