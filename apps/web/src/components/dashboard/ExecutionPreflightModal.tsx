'use client';

import React, { useState } from 'react';
import { 
  Play, 
  X, 
  Layers, 
  Repeat, 
  AlertCircle, 
  CheckCircle, 
  Cpu, 
  Settings2,
  Globe,
  Loader2
} from 'lucide-react';
import { Workflow } from '@/lib/types/database';
import { DrawerRunItem } from './RunDetailsDrawer';
import { useDashboard } from '@/context/DashboardContext';

interface ExecutionPreflightModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: Workflow | null;
  onRunDispatched?: (run: DrawerRunItem) => void;
}

function formatDomain(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function ExecutionPreflightModal({
  isOpen,
  onClose,
  workflow,
  onRunDispatched
}: ExecutionPreflightModalProps) {
  const { orgId, isRunnerOnline, refreshDashboard, openRunDetails } = useDashboard();
  const [execMode, setExecMode] = useState<'single' | 'loop'>('single');
  const [itemMode, setItemMode] = useState<'new' | 'all' | 'old'>('new');
  const [maxItems, setMaxItems] = useState<string>('');
  const [paginate, setPaginate] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !workflow) return null;

  const domain = formatDomain(workflow.portal_url);
  const stepCount = Array.isArray(workflow.workflow_definition?.steps) 
    ? workflow.workflow_definition.steps.length 
    : 0;

  const handleLaunch = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const itemsLimit = maxItems.trim() ? parseInt(maxItems, 10) : 0;
      const res = await fetch('/api/v1/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: workflow.id,
          org_id: orgId,
          status: 'pending',
          total_items_discovered: itemsLimit || 0,
          mode: execMode,
          item_mode: itemMode,
          paginate: paginate
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to dispatch workflow execution');
      }

      const json = await res.json();
      const dispatchedRun: DrawerRunItem = {
        ...json.run,
        workflowName: workflow.name,
        wf_workflows: { name: workflow.name }
      };

      await refreshDashboard();
      onClose();
      if (onRunDispatched) {
        onRunDispatched(dispatchedRun);
      }
      openRunDetails(dispatchedRun);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Execution dispatch failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Play className="h-4 w-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">{workflow.name}</h3>
                {domain && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-[11px] text-cyan-300">
                    <Globe className="h-3 w-3 text-cyan-400" />
                    {domain}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Execution Preflight & Dispatch Mission Control</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Runner Readiness Check Badge */}
          <div className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs ${
            isRunnerOnline 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            {isRunnerOnline ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <Cpu className="h-3.5 w-3.5" />
                <span>{isRunnerOnline ? 'Desktop Worker Online & Ready' : 'Desktop Worker Offline'}</span>
              </div>
              <p className="text-slate-400 mt-0.5">
                {isRunnerOnline 
                  ? 'Local runner active on CDP :9222. Execution will begin immediately upon dispatch.' 
                  : 'Run will queue as "pending" in cloud until runner connects with org pairing token.'}
              </p>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Execution Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExecMode('single')}
                className={`flex flex-col p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  execMode === 'single'
                    ? 'border-cyan-500/60 bg-cyan-500/10 text-white ring-1 ring-cyan-500/30'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  <span>Standard Run</span>
                </div>
                <span className="text-xs text-slate-400 mt-1">Replay recorded workflow once from start to finish.</span>
              </button>

              <button
                type="button"
                onClick={() => setExecMode('loop')}
                className={`flex flex-col p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  execMode === 'loop'
                    ? 'border-cyan-500/60 bg-cyan-500/10 text-white ring-1 ring-cyan-500/30'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Repeat className="h-4 w-4 text-cyan-400" />
                  <span>Loop / Batch</span>
                </div>
                <span className="text-xs text-slate-400 mt-1">Iterate across repeating table rows and download files.</span>
              </button>
            </div>
          </div>

          {/* Loop Configuration (if loop selected) */}
          {execMode === 'loop' && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
                <Settings2 className="h-3.5 w-3.5" />
                <span>Batch Iteration Limits</span>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Download & Sync Strategy</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'new', label: 'Skip Existing', desc: 'New files only' },
                    { id: 'all', label: 'All Items', desc: 'Process all rows' },
                    { id: 'old', label: 'Re-download', desc: 'Overwrite files' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setItemMode(opt.id as 'new'|'all'|'old')}
                      className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                        itemMode === opt.id
                          ? 'border-cyan-500/50 bg-cyan-500/20 text-white ring-1 ring-cyan-500/30'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold">{opt.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label htmlFor="inputMaxItems" className="block text-xs text-slate-300 mb-1 font-medium">Max Items Limit</label>
                  <input
                    id="inputMaxItems"
                    type="number"
                    min="1"
                    placeholder="All items (no limit)"
                    value={maxItems}
                    onChange={(e) => setMaxItems(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="chkPaginate"
                    checked={paginate}
                    onChange={(e) => setPaginate(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-800 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer"
                  />
                  <label htmlFor="chkPaginate" className="text-xs text-slate-300 select-none cursor-pointer">
                    Multi-page pagination
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Workflow Summary Metadata */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400">
            <span>Workflow ID: <code className="text-slate-300 font-mono">{workflow.id.slice(0, 8)}...</code></span>
            <span>Recorded Steps: <span className="text-cyan-300 font-medium">{stepCount}</span></span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleLaunch}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span>{submitting ? 'Dispatching...' : 'Dispatch Execution'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
