'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowRight, ExternalLink } from 'lucide-react';

export interface ActionRequiredRunInfo {
  id: string;
  workflowName?: string;
  wf_workflows?: { name?: string };
  error_summary?: string | null;
  started_at?: string;
}

interface TwoFactorBannerProps {
  activeActionRuns: ActionRequiredRunInfo[];
  onSelectRun?: (run: ActionRequiredRunInfo) => void;
}

export function TwoFactorBanner({ activeActionRuns, onSelectRun }: TwoFactorBannerProps) {
  const [countdown, setCountdown] = useState<number>(90);

  useEffect(() => {
    if (!activeActionRuns || activeActionRuns.length === 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeActionRuns]);

  if (!activeActionRuns || activeActionRuns.length === 0) {
    return null;
  }

  const primaryRun = activeActionRuns[0];
  const workflowTitle =
    primaryRun.workflowName ||
    primaryRun.wf_workflows?.name ||
    'Vendor Portal Workflow';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="relative overflow-hidden rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-950/70 via-amber-900/40 to-slate-900 p-4 shadow-lg shadow-amber-950/20 mb-8"
    >
      <div className="absolute top-0 right-0 -mt-2 -mr-2 h-24 w-24 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-inner">
            <ShieldAlert className="h-5 w-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white tracking-wide">
                2FA Intervention Required in Local Chrome
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                {countdown}s remaining
              </span>
            </div>

            <p className="text-xs text-amber-200/90 mt-0.5">
              Run for <span className="font-semibold text-white">{workflowTitle}</span> is paused awaiting OTP / login confirmation on Chrome port 9222.
              {activeActionRuns.length > 1 && ` (+${activeActionRuns.length - 1} more)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-amber-300/80 bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-800/40 font-mono">
            <span>Chrome CDP :9222</span>
            <ExternalLink className="h-3 w-3" />
          </div>

          {onSelectRun && (
            <button
              onClick={() => onSelectRun(primaryRun)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <span>Inspect Run Details</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
