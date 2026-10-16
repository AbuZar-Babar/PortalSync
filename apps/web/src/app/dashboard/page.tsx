'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Workflow as WorkflowIcon,
  Activity,
  FileText,
  Plus,
  ArrowRight,
  Square
} from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { TwoFactorBanner, ActionRequiredRunInfo } from '@/components/dashboard/TwoFactorBanner';
import { CreatePortalModal } from '@/components/dashboard/CreatePortalModal';
import { DrawerRunItem } from '@/components/dashboard/RunDetailsDrawer';
import { Workflow as WorkflowModel, RunStatus } from '@/lib/types/database';

interface DashboardStats {
  totalWorkflows: number;
  totalRuns: number;
  successRate: number | null;
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
    openRunDetails,
    stopActiveRun
  } = useDashboard();

  const [stats, setStats] = useState<DashboardStats>({
    totalWorkflows: 0,
    totalRuns: 0,
    successRate: null,
    totalInvoices: 0
  });

  const [recentRuns, setRecentRuns] = useState<ActivityRunItem[]>([]);
  const [allRuns, setAllRuns] = useState<DrawerRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stoppingRunId, setStoppingRunId] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Load and calculate overview metrics
  const loadOverviewData = useCallback(async (isSilent = false) => {
    if (!orgId) return;
    try {
      setLoadError(null);
      const supabase = createClient();

      // 1. Fetch workflows count & quick workflows list
      const { data: workflowsData, count: wfCount, error: workflowsError } = await supabase
        .from('wf_workflows')
        .select('*', { count: 'exact' })
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });
      if (workflowsError) throw workflowsError;

      const workflowsList = (workflowsData || []) as WorkflowModel[];

      // 2. Fetch execution runs with exact count and joined workflow name
      const { data: runsData, count: runsCount, error: runsError } = await supabase
        .from('wf_execution_runs')
        .select(
          'id, org_id, workflow_id, status, total_items_discovered, items_processed, items_downloaded, started_at, completed_at, error_summary, wf_workflows(name)',
          { count: 'exact' }
        )
        .eq('org_id', orgId)
        .order('started_at', { ascending: false });
      if (runsError) throw runsError;

      const rawRuns = (runsData || []) as Array<Record<string, unknown>>;

      // 3. Calculate Invoices Downloaded & Artifacts
      const sumItemsDownloaded = rawRuns.reduce(
        (acc, r) => acc + (Number(r.items_downloaded) || 0),
        0
      );

      const runIds = rawRuns.map((r) => String(r.id));
      let artifactsCount = 0;
      if (runIds.length > 0) {
        const { count: artCount, error: artifactsError } = await supabase
          .from('wf_run_artifacts')
          .select('id', { count: 'exact', head: true })
          .in('run_id', runIds);
        if (artifactsError) throw artifactsError;
        artifactsCount = artCount ?? 0;
      }
      const totalInvoices = Math.max(sumItemsDownloaded, artifactsCount);

      // 4. Compute Success Rate using case-insensitive status matching
      const totalR = runsCount ?? rawRuns.length;
      const completedCount = rawRuns.filter((r) => {
        const st = String(r.status || '').toLowerCase();
        return st === 'completed' || st === 'success';
      }).length;
      const rate = totalR > 0 ? Math.round((completedCount / totalR) * 100) : null;

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
      setLoadError('We couldn’t load your dashboard data. Please try again.');
    } finally {
      setLoading(false);
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
    <div className="space-y-6 pb-10 sm:space-y-8">
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

      {/* Compact page heading and primary action */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground,#f8fafc)]">Overview</h1>
          <p className="text-sm text-slate-400">Monitor your workflows and recent activity.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg bg-[var(--primary-color,#00d9e8)] px-4 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color,#00f0ff)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas-bg,#060913)] sm:self-auto"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          <span>New Workflow</span>
        </button>
      </section>

      {/* Four compact workspace metrics */}
      <section aria-label="Workspace metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link
          href="/dashboard/workflows"
          className="group rounded-xl border border-[var(--border-color,rgba(255,255,255,0.08))] bg-[var(--surface-bg,#0c101d)] p-4 transition-colors hover:border-[var(--primary-color,#00f0ff)] sm:p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400 sm:text-sm">Workflows</span>
            <WorkflowIcon aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-[var(--primary-color,#00f0ff)]" />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground,#f8fafc)]">
            {loadError || loading ? '—' : stats.totalWorkflows}
          </p>
        </Link>

        <Link
          href="/dashboard/runs"
          className="group rounded-xl border border-[var(--border-color,rgba(255,255,255,0.08))] bg-[var(--surface-bg,#0c101d)] p-4 transition-colors hover:border-[var(--primary-color,#00f0ff)] sm:p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400 sm:text-sm">Executions</span>
            <Activity aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-[var(--primary-color,#00f0ff)]" />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground,#f8fafc)]">
            {loadError || loading ? '—' : stats.totalRuns}
          </p>
        </Link>

        <div className="rounded-xl border border-[var(--border-color,rgba(255,255,255,0.08))] bg-[var(--surface-bg,#0c101d)] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400 sm:text-sm">Success rate</span>
            <span aria-hidden="true" className="text-sm text-[var(--primary-color,#00f0ff)]">%</span>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground,#f8fafc)]">
            {loadError || loading || stats.successRate === null ? '—' : `${stats.successRate}%`}
          </p>
        </div>

        <Link
          href="/dashboard/artifacts"
          className="group rounded-xl border border-[var(--border-color,rgba(255,255,255,0.08))] bg-[var(--surface-bg,#0c101d)] p-4 transition-colors hover:border-[var(--primary-color,#00f0ff)] sm:p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400 sm:text-sm">Invoices downloaded</span>
            <FileText aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-[var(--primary-color,#00f0ff)]" />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground,#f8fafc)]">
            {loadError || loading ? '—' : stats.totalInvoices}
          </p>
        </Link>
      </section>

      {/* Recent executions remain the primary operational content */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight text-[var(--foreground,#f8fafc)]">Recent executions</h2>
            <p className="text-xs text-slate-400">The latest activity across your workflows.</p>
          </div>
          <Link
            href="/dashboard/runs"
            className="inline-flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[var(--primary-color,#00f0ff)] transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color,#00f0ff)]"
          >
            <span>View all</span>
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-xl border border-[var(--border-color,rgba(255,255,255,0.08))] bg-[var(--surface-bg,#0c101d)] px-4 sm:px-5">
          {loadError ? (
            <div className="flex flex-col items-start gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--foreground,#f8fafc)]">Dashboard data is unavailable</p>
                <p className="text-xs text-slate-400">{loadError}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadOverviewData()}
                className="rounded-lg border border-[var(--border-color,rgba(255,255,255,0.1))] px-3 py-2 text-xs font-medium text-[var(--foreground,#f8fafc)] transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color,#00f0ff)]"
              >
                Try again
              </button>
            </div>
          ) : loading && recentRuns.length === 0 ? (
            <div className="space-y-4 py-5" aria-label="Loading recent executions">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex animate-pulse items-center gap-3 py-2">
                  <div className="h-9 w-9 rounded-lg bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-slate-800" />
                    <div className="h-2.5 w-1/4 rounded bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentRuns.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--foreground,#f8fafc)]">No executions yet</p>
                <p className="text-xs text-slate-400">Create a workflow to start automating your work.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-lg border border-[var(--border-color,rgba(255,255,255,0.1))] px-3 py-2 text-xs font-medium text-[var(--foreground,#f8fafc)] transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color,#00f0ff)]"
              >
                Create workflow
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color,rgba(255,255,255,0.07))]">
              {recentRuns.map((run) => {
                const status = String(run.status).toLowerCase();
                const isActive = ['pending', 'running', 'requires_action'].includes(status);

                return (
                  <div key={run.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
                    <button
                      type="button"
                      onClick={() => openRunDetails(run)}
                      className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color,#00f0ff)]"
                      aria-label={`View execution details for ${run.workflowName}`}
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--surface-hover,#11182c)]">
                        <WorkflowIcon aria-hidden="true" className="h-4 w-4 text-[var(--primary-color,#00f0ff)]" />
                      </span>
                      <span className="min-w-0 flex-1 space-y-1.5">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-[var(--foreground,#f8fafc)]">{run.workflowName}</span>
                          <StatusBadge status={run.status} />
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                          <span>{run.time || 'Recently'}</span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span>{run.duration}</span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span>{run.items_downloaded && run.items_downloaded > 0
                            ? `${run.items_downloaded} files downloaded`
                            : `${run.items_processed || 0} items processed`}</span>
                        </span>
                        {isActive && run.percent !== undefined && (
                          <span className="block max-w-md space-y-1 pt-1">
                            <span className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Progress</span>
                              <span>{run.items_processed} / {run.total_items_discovered} ({run.percent}%)</span>
                            </span>
                            <span className="block h-1.5 overflow-hidden rounded-full bg-slate-800">
                              <span className="block h-full rounded-full bg-[var(--primary-color,#00f0ff)] transition-all duration-300" style={{ width: `${run.percent}%` }} />
                            </span>
                          </span>
                        )}
                        {isActive && run.percent === undefined && status === 'running' && (
                          <span className="block pt-1 text-[10px] text-slate-400">
                            Executing steps · {run.items_processed || 0} processed
                          </span>
                        )}
                      </span>
                    </button>

                    {isActive && (
                      <button
                        type="button"
                        onClick={(e) => void handleStopRun(run.id, e)}
                        disabled={stoppingRunId === run.id}
                        className="inline-flex min-h-8 items-center justify-center gap-1.5 self-start rounded-md px-2 text-xs text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 sm:self-auto"
                        title="Stop execution"
                        aria-label={`Stop execution for ${run.workflowName}`}
                      >
                        <Square aria-hidden="true" className="h-3 w-3 fill-current" />
                        <span>Stop</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

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
