'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Copy,
  Check,
  RefreshCw,
  Download,
  Terminal,
  ShieldCheck,
  Server,
  Activity,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  HardDrive,
  Clock,
  Sparkles
} from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import { RobotAvatar } from '@/components/dashboard/RobotAvatar';

interface RunnerDevice {
  id: string;
  token: string;
  label?: string;
  os?: string;
  version?: string;
  last_ping_at?: string;
  status?: 'ONLINE' | 'EXECUTING' | 'OFFLINE';
  active_run_id?: string | null;
}

export default function RunnersPage() {
  const { orgId, organizationName, isRunnerOnline, runnerToken, refreshDashboard } = useDashboard();
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [runners, setRunners] = useState<RunnerDevice[]>([]);
  const [loadingRunners, setLoadingRunners] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function fetchRunners() {
      if (!orgId) return;
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('wf_runner_tokens')
          .select('id, token, label, last_ping_at, created_at')
          .eq('org_id', orgId)
          .order('last_ping_at', { ascending: false });

        if (!error && data) {
          const parsed = data.map((r) => {
            const lastPing = r.last_ping_at ? new Date(r.last_ping_at).getTime() : 0;
            const diffSeconds = (Date.now() - lastPing) / 1000;
            const isOnline = diffSeconds < 45;

            return {
              id: r.id,
              token: r.token,
              label: r.label || 'Local Desktop Runner',
              os: 'Windows 11 x64',
              version: 'v1.4.0 (Enterprise Engine)',
              last_ping_at: r.last_ping_at,
              status: isOnline ? 'ONLINE' : 'OFFLINE'
            } as RunnerDevice;
          });
          setRunners(parsed);
        }
      } catch (err) {
        console.error('Error fetching runners:', err);
      } finally {
        setLoadingRunners(false);
        setRefreshing(false);
      }
    }

    fetchRunners();
  }, [orgId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshDashboard();
    if (orgId) {
      const supabase = createClient();
      const { data } = await supabase
        .from('wf_runner_tokens')
        .select('id, token, label, last_ping_at, created_at')
        .eq('org_id', orgId);
      if (data) {
        setRunners(
          data.map((r) => ({
            id: r.id,
            token: r.token,
            label: r.label || 'Local Desktop Runner',
            os: 'Windows 11 x64',
            version: 'v1.4.0',
            last_ping_at: r.last_ping_at,
            status: r.last_ping_at && (Date.now() - new Date(r.last_ping_at).getTime()) / 1000 < 45 ? 'ONLINE' : 'OFFLINE'
          }))
        );
      }
    }
    setRefreshing(false);
  };

  const copyToken = () => {
    if (!runnerToken) return;
    navigator.clipboard.writeText(runnerToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const terminalCmd = `npm run runner -- --token ${runnerToken || 'ps_live_token'}`;
  const copyTerminalCmd = () => {
    navigator.clipboard.writeText(terminalCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const formatRelativeTime = (isoDate?: string) => {
    if (!isoDate) return 'Never connected';
    const diffSec = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (diffSec < 15) return 'Active just now';
    if (diffSec < 60) return `Active ${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <RobotAvatar size="badge" state={isRunnerOnline ? 'running' : 'idle'} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">WORKERS &amp; RUNNERS</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase tracking-wider">
                EXECUTION ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage your connected desktop automation workers, claim tokens, and hybrid cloud-to-local execution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-slate-900/60 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-all"
            title="Refresh connected worker status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Token Card & Quick Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Runner Pairing Token Card */}
        <div className="lg:col-span-2 bg-[#0c101d] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Organization Pairing Token</h2>
                  <p className="text-[11px] text-slate-400">Use this secret key to authenticate your Desktop Runner</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            {/* Token Copy Box */}
            <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3 font-mono text-xs text-cyan-300">
              <span className="truncate select-all tracking-wide">
                {runnerToken || 'Generating token...'}
              </span>
              <button
                onClick={copyToken}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-xs font-sans font-semibold border border-cyan-400/30 transition-all flex-shrink-0"
                title="Copy token to clipboard"
              >
                {copiedToken ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Token</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong className="text-slate-400">Security note:</strong> Any machine running with this token is authorized to claim, execute, and upload artifacts for{' '}
              <span className="text-slate-300 font-semibold">{organizationName}</span>. Do not expose this key in public repositories.
            </p>
          </div>

          {/* Quick Terminal Startup Snippet */}
          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Quick CLI Command:
              </span>
              <button
                onClick={copyTerminalCmd}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                {copiedCmd ? 'Copied CLI Command!' : 'Copy Command'}
              </button>
            </div>
            <div className="bg-slate-950/90 border border-white/5 rounded-lg px-3 py-2 text-[11px] font-mono text-slate-300 select-all overflow-x-auto">
              {terminalCmd}
            </div>
          </div>
        </div>

        {/* Desktop App Download & Setup Guide */}
        <div className="bg-gradient-to-br from-[#0c101d] to-[#12172b] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Desktop Worker App</h2>
                <p className="text-[11px] text-slate-400">Zero cloud cost local execution</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-[11px] leading-relaxed">
                  Download &amp; launch the desktop app on your machine.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-[11px] leading-relaxed">
                  Paste your organization token to pair the worker.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                  3
                </span>
                <p className="text-[11px] leading-relaxed">
                  Click <strong className="text-white">Run</strong> from anywhere on the web — your local Chrome automates the workflow!
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert('The Desktop Runner package is available in apps/desktop. You can run it via `npm run runner` or build the standalone executable.');
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Desktop Runner</span>
            </a>
            <p className="text-[10px] text-center text-slate-500">
              Compatible with Windows 10/11 x64 &middot; MacOS &amp; Linux
            </p>
          </div>
        </div>
      </div>

      {/* Connected Workers Section */}
      <div className="bg-[#0c101d] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Active Connected Workers</h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/5">
              {runners.length} Registered
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-slate-400">System Status:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] ${
                isRunnerOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border border-white/5'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isRunnerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {isRunnerOnline ? 'Daemon Operational' : 'Awaiting Connection'}
            </span>
          </div>
        </div>

        {/* Workers List / Cards */}
        {loadingRunners ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
            <span className="text-xs">Detecting active workers...</span>
          </div>
        ) : runners.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">No Desktop Runners Connected Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Launch the local Desktop Runner with your organization pairing token above to start automating tasks on your computer.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {runners.map((runner) => (
              <div
                key={runner.id}
                className="bg-slate-950/60 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        runner.status === 'ONLINE'
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                          : 'bg-slate-900 border-white/5 text-slate-500'
                      }`}
                    >
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">{runner.label}</h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {runner.os} &middot; {runner.version}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      runner.status === 'ONLINE'
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'bg-slate-800 text-slate-500 border border-white/5'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${runner.status === 'ONLINE' ? 'bg-cyan-400' : 'bg-slate-500'}`} />
                    {runner.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Heartbeat</span>
                    <span className="text-slate-300 font-medium flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatRelativeTime(runner.last_ping_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Token Suffix</span>
                    <span className="text-cyan-400/90 font-mono font-medium block mt-0.5">
                      ...{runner.token.slice(-8)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
