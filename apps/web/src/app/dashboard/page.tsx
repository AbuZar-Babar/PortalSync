'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Workflow,
  Activity,
  FileText,
  Cpu,
  Plus,
  Play,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  TrendingUp,
  Download,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import { RobotAvatar } from '@/components/dashboard/RobotAvatar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { CreatePortalModal } from '@/components/dashboard/CreatePortalModal';
import { ExecutionPreflightModal } from '@/components/dashboard/ExecutionPreflightModal';
import { DrawerRunItem } from '@/components/dashboard/RunDetailsDrawer';
import { Workflow as WorkflowModel } from '@/lib/types/database';

interface DashboardStats {
  totalWorkflows: number;
  totalRuns: number;
  successRate: number;
  totalArtifacts: number;
}

export default function DashboardOverviewPage() {
  const { orgId, organizationName, isRunnerOnline, openRunDetails, refreshDashboard } = useDashboard();

  const [stats, setStats] = useState<DashboardStats>({
    totalWorkflows: 0,
    totalRuns: 0,
    successRate: 100,
    totalArtifacts: 0
  });

  const [recentRuns, setRecentRuns] = useState<DrawerRunItem[]>([]);
  const [quickWorkflows, setQuickWorkflows] = useState<WorkflowModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPreflightModalOpen, setIsPreflightModalOpen] = useState(false);
  const [selectedWorkflowForRun, setSelectedWorkflowForRun] = useState<WorkflowModel | null>(null);

  useEffect(() => {
    async function loadOverviewData() {
      if (!orgId) return;

      try {
        const supabase = createClient();

        // 1. Fetch workflows count and top workflows
        const { data: workflowsData } = await supabase
          .from('wf_workflows')
          .select('*')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false });

        const workflowsList = (workflowsData || []) as WorkflowModel[];

        // 2. Fetch runs count and recent runs
        const { data: runsData } = await supabase
          .from('wf_execution_runs')
          .select('*, wf_workflows(name)')
          .eq('org_id', orgId)
          .order('started_at', { ascending: false })
          .limit(10);

        const runsList = runsData || [];

        // 3. Fetch artifacts count
        const { count: artifactsCount } = await supabase
          .from('wf_run_artifacts')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId);

        // Compute metrics
        const totalWfs = workflowsList.length;
        const totalR = runsList.length;
        const successCount = runsList.filter(
          (r) => r.status === 'COMPLETED' || r.status === 'SUCCESS' || r.status === 'COMPLETED_WITH_ERRORS'
        ).length;
        const rate = totalR > 0 ? Math.round((successCount / totalR) * 100) : 100;

        setStats({
          totalWorkflows: totalWfs,
          totalRuns: totalR,
          successRate: rate,
          totalArtifacts: artifactsCount || 0
        });

        // Parse recent runs for drawer compatibility
        const parsedRuns: DrawerRunItem[] = runsList.slice(0, 5).map((r) => ({
          id: r.id,
          workflow_id: r.workflow_id,
          workflowName: r.wf_workflows?.name || 'Automated Workflow',
          status: r.status,
          total_items_discovered: r.total_items_discovered || r.items_discovered || 0,
          items_processed: r.items_processed || 0,
          items_downloaded: r.items_downloaded || 0,
          started_at: r.started_at,
          completed_at: r.completed_at,
          error_summary: r.error_summary,
          time: r.started_at
            ? new Date(r.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined
        }));

        setRecentRuns(parsedRuns);
        setQuickWorkflows(workflowsList.slice(0, 3));
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOverviewData();
  }, [orgId]);

  const handleLaunchWorkflow = (wf: WorkflowModel) => {
    setSelectedWorkflowForRun(wf);
    setIsPreflightModalOpen(true);
  };

  const formatDomain = (url?: string) => {
    if (!url) return 'portal';
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0c101d] via-[#11172e] to-[#0c101d] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <RobotAvatar size="medium" state={isRunnerOnline ? 'running' : 'idle'} />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Welcome to Workflow Agent
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 uppercase tracking-wider">
                  AUTONOMOUS
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Control plane for <strong className="text-white">{organizationName}</strong>. Record and replay multi-step portal workflows with self-healing selectors and zero-cloud-cost execution.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/runners"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isRunnerOnline
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  : 'bg-slate-900 border-white/10 text-slate-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isRunnerOnline ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{isRunnerOnline ? 'Desktop Worker Online' : 'Worker Offline'}</span>
            </Link>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Workflow</span>
            </button>
          </div>
        </div>

        {/* Subtle Ambient Background Flare */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Workflows */}
        <Link
          href="/dashboard/workflows"
          className="bg-[#0c101d] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-5 shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">
              Active Workflows
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Workflow className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{stats.totalWorkflows}</span>
            <span className="text-[11px] text-slate-500 font-medium">portals</span>
          </div>
        </Link>

        {/* Metric 2: Executions */}
        <Link
          href="/dashboard/runs"
          className="bg-[#0c101d] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-5 shadow-lg transition-all group"
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
            <span className="text-2xl font-black text-white">{stats.totalRuns}</span>
            <span className="text-[11px] text-slate-500 font-medium">dispatched</span>
          </div>
        </Link>

        {/* Metric 3: Success Rate */}
        <div className="bg-[#0c101d] border border-white/5 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Success Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{stats.successRate}%</span>
            <span className="text-[11px] text-slate-500 font-medium">reliability</span>
          </div>
        </div>

        {/* Metric 4: Outputs Vault */}
        <Link
          href="/dashboard/artifacts"
          className="bg-[#0c101d] border border-white/5 hover:border-purple-500/30 rounded-2xl p-5 shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">
              Extracted Files
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{stats.totalArtifacts}</span>
            <span className="text-[11px] text-slate-500 font-medium">invoices/datasets</span>
          </div>
        </Link>
      </div>

      {/* Main Grid: Quick Workflows + Recent Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Quick Launch Workflows */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white tracking-tight">Quick Launch Workflows</h2>
            </div>
            <Link
              href="/dashboard/workflows"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 group"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {quickWorkflows.length === 0 ? (
            <div className="bg-[#0c101d] border border-white/5 rounded-2xl p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 mx-auto flex items-center justify-center text-slate-500">
                <Workflow className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-400">No workflows recorded yet in this workspace.</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-semibold border border-cyan-500/30"
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
                    className="bg-[#0c101d] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-5 shadow-lg transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-white/5 truncate max-w-[140px]">
                          {formatDomain(wf.portal_url)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {stepCount} steps
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-2 truncate tracking-tight">
                        {wf.name}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <Link
                        href={`/dashboard/workflows/${wf.id}/edit`}
                        className="text-xs font-semibold text-slate-400 hover:text-white"
                      >
                        Edit Canvas
                      </Link>
                      <button
                        onClick={() => handleLaunchWorkflow(wf)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-xs font-bold border border-cyan-400/30 transition-all"
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

        {/* Right Column (1 Col): Recent Runs Activity Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white tracking-tight">Recent Activity</h2>
            </div>
            <Link
              href="/dashboard/runs"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 group"
            >
              <span>All Runs</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="bg-[#0c101d] border border-white/5 rounded-2xl p-4 shadow-lg space-y-3">
            {recentRuns.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No recent executions yet.
              </div>
            ) : (
              recentRuns.map((run) => (
                <div
                  key={run.id}
                  onClick={() => openRunDetails(run)}
                  className="p-3 rounded-xl bg-slate-950/40 border border-white/5 hover:border-white/10 hover:bg-slate-900/40 cursor-pointer transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate max-w-[150px]">
                      {run.workflowName}
                    </span>
                    <StatusBadge status={run.status} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {run.time || 'Today'}
                    </span>
                    <span>
                      {run.items_downloaded && run.items_downloaded > 0
                        ? `${run.items_downloaded} files`
                        : `${run.items_processed || 0} items`}
                    </span>
                  </div>
                </div>
              ))
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
          await refreshDashboard();
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
