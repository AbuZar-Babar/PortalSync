'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ShieldAlert, 
  FileText, 
  Download, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Cloud, 
  HardDrive, 
  Loader2, 
  Calendar,
  Square
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { createClient } from '@/lib/supabase/client';
import { RunArtifact, RunStatus } from '@/lib/types/database';

export interface DrawerRunItem {
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
  started_at?: string;
  completed_at?: string | null;
  error_summary?: string | null;
  time?: string;
  created_at?: string;
  duration?: string;
}

interface RunDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  run: DrawerRunItem | null;
  onStopRun?: (runId: string) => void;
}

function formatBytes(bytes?: number | null): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function calculateDuration(startedAt?: string, completedAt?: string | null): string {
  if (!startedAt) return '—';
  const start = new Date(startedAt).getTime();
  if (isNaN(start)) return '—';
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffSec = Math.max(0, Math.floor((end - start) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${mins}m ${secs}s`;
}

export function RunDetailsDrawer({ isOpen, onClose, run, onStopRun }: RunDetailsDrawerProps) {
  const [artifacts, setArtifacts] = useState<RunArtifact[]>([]);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [twoFactorCountdown, setTwoFactorCountdown] = useState(90);

  const handleClose = useCallback(() => {
    setArtifacts([]);
    setTwoFactorCountdown(90);
    onClose();
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Countdown timer for 2FA requires_action
  useEffect(() => {
    if (!run || run.status !== 'requires_action') return;

    const interval = setInterval(() => {
      setTwoFactorCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [run]);

  // Fetch artifacts when drawer opens
  useEffect(() => {
    if (!isOpen || !run?.id) return;

    let isMounted = true;

    async function loadArtifacts(runId: string) {
      await Promise.resolve();
      if (!isMounted) return;
      setLoadingArtifacts(true);

      try {
        // Attempt API route first
        const res = await fetch(`/api/v1/artifacts?run_id=${encodeURIComponent(runId)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.artifacts)) {
            setArtifacts(data.artifacts);
            return;
          }
        }

        // Fallback: direct Supabase query
        const supabase = createClient();
        const { data, error } = await supabase
          .from('wf_run_artifacts')
          .select('*')
          .eq('run_id', runId)
          .order('created_at', { ascending: false });

        if (isMounted && !error && data) {
          setArtifacts(data as unknown as RunArtifact[]);
        }
      } catch (err) {
        console.error('Failed to load run artifacts:', err);
      } finally {
        if (isMounted) {
          setLoadingArtifacts(false);
        }
      }
    }

    loadArtifacts(run.id);

    return () => {
      isMounted = false;
    };
  }, [isOpen, run?.id]);

  if (!isOpen || !run) return null;

  const handleCopyRunId = () => {
    if (!run?.id) return;
    navigator.clipboard.writeText(run.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const workflowTitle =
    run.workflowName ||
    run.wf_workflows?.name ||
    'Vendor Portal Workflow';

  const discoveredCount =
    run.total_items_discovered ??
    run.items_discovered ??
    run.itemsDiscovered ??
    0;

  const processedCount =
    run.items_processed ??
    run.itemsProcessed ??
    0;

  const downloadedCount =
    run.items_downloaded ??
    run.itemsDownloaded ??
    0;

  const durationStr =
    run.duration ||
    calculateDuration(run.started_at, run.completed_at);

  const formattedStartedAt = run.started_at
    ? new Date(run.started_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      })
    : run.time || '—';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="relative w-screen max-w-xl border-l border-slate-800 bg-slate-900 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="border-b border-slate-800 px-6 py-5 bg-slate-950/50">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 id="drawer-title" className="text-base font-semibold text-white">
                    {workflowTitle}
                  </h2>
                  <StatusBadge status={run.status} countdownSeconds={twoFactorCountdown} />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Run ID:</span>
                  <code className="font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded">
                    {run.id}
                  </code>
                  <button
                    onClick={handleCopyRunId}
                    title="Copy Run ID"
                    className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {copiedId ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onStopRun && (run.status === 'pending' || run.status === 'running' || run.status === 'requires_action') && (
                  <button
                    onClick={() => onStopRun(run.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition cursor-pointer"
                  >
                    <Square className="h-3 w-3 fill-current text-rose-400" /> Stop Run
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                  aria-label="Close drawer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Run timing meta */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800/60 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>Started: <strong className="text-slate-200">{formattedStartedAt}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>Duration: <strong className="font-mono text-slate-200">{durationStr}</strong></span>
              </div>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 2FA Alert Box if status === 'requires_action' */}
            {run.status === 'requires_action' && (
              <div className="rounded-xl border border-amber-500/50 bg-amber-950/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                    <ShieldAlert className="h-4 w-4 animate-pulse" />
                    <span>Human 2FA Intervention Required</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950">
                    {twoFactorCountdown}s remaining
                  </span>
                </div>

                <p className="text-xs text-amber-200/90 leading-relaxed">
                  The local browser automation runner detected an OTP/2FA or CAPTCHA challenge in the vendor portal.
                </p>

                <div className="rounded-lg bg-slate-950/80 border border-amber-900/40 p-3 space-y-2 text-xs">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                    <span>Instructions for Local Chrome (Port 9222):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                    <li>Switch to your open Google Chrome browser window.</li>
                    <li>Solve the two-factor authentication or CAPTCHA verification challenge.</li>
                    <li>Once logged in, the runner will resume invoice scraping automatically.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Error Summary Box if status === 'failed' */}
            {run.status === 'failed' && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                  <span>Execution Error Details</span>
                </div>
                <div className="rounded-lg bg-slate-950/70 border border-rose-900/40 p-3 text-xs font-mono text-rose-200 break-words">
                  {run.error_summary || 'Execution terminated unexpectedly without an explicit error summary.'}
                </div>
              </div>
            )}

            {/* Telemetry Metrics Grid */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Telemetry & Execution Metrics
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-center">
                  <span className="text-[11px] text-slate-400 block">Discovered</span>
                  <span className="text-xl font-bold text-white mt-1 block">
                    {discoveredCount}
                  </span>
                  <span className="text-[10px] text-slate-500">items found</span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-center">
                  <span className="text-[11px] text-slate-400 block">Processed</span>
                  <span className="text-xl font-bold text-blue-400 mt-1 block">
                    {processedCount}
                  </span>
                  <span className="text-[10px] text-slate-500">rows parsed</span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-center">
                  <span className="text-[11px] text-slate-400 block">Downloaded</span>
                  <span className="text-xl font-bold text-teal-400 mt-1 block">
                    {downloadedCount}
                  </span>
                  <span className="text-[10px] text-slate-500">invoices</span>
                </div>
              </div>
            </div>

            {/* Artifacts & Invoices Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Download className="h-3.5 w-3.5 text-blue-400" />
                  <span>Downloaded Invoices & Artifacts ({artifacts.length})</span>
                </h3>
                {loadingArtifacts && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading artifacts...
                  </span>
                )}
              </div>

              {artifacts.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-8 text-center">
                  <HardDrive className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-300">No artifacts registered yet</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {run.status === 'running' || run.status === 'pending'
                      ? 'Invoices will appear here as the desktop runner downloads them.'
                      : 'This execution completed without downloading file artifacts.'}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] text-slate-400 font-semibold uppercase">
                        <tr>
                          <th className="px-4 py-3">File Name</th>
                          <th className="px-3 py-3">Size</th>
                          <th className="px-4 py-3">SHA-256 Hash</th>
                          <th className="px-3 py-3 text-right">Storage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {artifacts.map((art) => (
                          <tr key={art.id} className="hover:bg-slate-900/50 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                <span className="font-medium text-white truncate max-w-[140px]" title={art.file_name}>
                                  {art.file_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 font-mono text-slate-400 whitespace-nowrap">
                              {formatBytes(art.file_size_bytes)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                                <span title={art.sha256_hash}>
                                  {art.sha256_hash.slice(0, 10)}...{art.sha256_hash.slice(-6)}
                                </span>
                                <button
                                  onClick={() => handleCopyHash(art.sha256_hash)}
                                  title="Copy SHA-256 Checksum"
                                  className="text-slate-500 hover:text-white transition cursor-pointer"
                                >
                                  {copiedHash === art.sha256_hash ? (
                                    <Check className="h-3 w-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right">
                              {art.cloud_storage_path ? (
                                <div className="inline-flex items-center gap-2 justify-end">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                                    <Cloud className="h-2.5 w-2.5" /> Synced
                                  </span>
                                  <a
                                    href={`/api/v1/artifacts/download?id=${encodeURIComponent(art.id)}`}
                                    download={art.file_name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-[10px] font-medium transition cursor-pointer"
                                    title={`Download ${art.file_name} from cloud storage`}
                                  >
                                    <Download className="h-3 w-3" /> Download
                                  </a>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                  <HardDrive className="h-2.5 w-2.5" /> Local
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 px-6 py-4 bg-slate-950/60 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">
              FlowMind Desktop Engine Bridge v1.0
            </span>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
            >
              Close Drawer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
