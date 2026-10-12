'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Workflow as WorkflowIcon,
  Activity,
  FileText,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  TrendingUp,
  Download,
  ShieldCheck,
  Square
} from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import { RobotAvatar } from '@/components/dashboard/RobotAvatar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { TwoFactorBanner, ActionRequiredRunInfo } from '@/components/dashboard/TwoFactorBanner';
import { CreatePortalModal } from '@/components/dashboard/CreatePortalModal';
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
  const [loading, setLoading] = useState(true);
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);
  const [stoppingRunId, setStoppingRunId] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <RobotAvatar size="card" state={isRunnerOnline ? 'running' : 'idle'} />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Executive Command Center
            </h1>
          </div>

          <div>
            {/* Quick Action: New Workflow */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Workflow</span>
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

      {/* Live Execution Activity Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Live Execution Stream</h2>
          </div>
          <Link
            href="/dashboard/runs"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 group"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="bg-[#0c101d] border border-white/5 rounded-2xl p-5 shadow-lg">
          {loading && recentRuns.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-slate-950/40 border border-white/5 animate-pulse space-y-3"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentRuns.map((run) => {
                const isActive = ['pending', 'running', 'requires_action'].includes(
                  String(run.status).toLowerCase()
                );

                return (
                  <div
                    key={run.id}
                    onClick={() => openRunDetails(run)}
                    className="p-4 rounded-xl bg-slate-950/40 border border-white/5 hover:border-cyan-500/30 hover:bg-slate-900/40 cursor-pointer transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate max-w-[180px]">
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
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
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
                            className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                            title="Stop execution"
                          >
                            <Square className="w-3 h-3 fill-current" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
    </div>
  );
}
