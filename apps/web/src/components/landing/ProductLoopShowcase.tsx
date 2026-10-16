'use client';

import { useState, useEffect } from 'react';
import {
  MousePointer2,
  Play,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  RotateCw,
  ShieldCheck,
  Clock,
  Fingerprint,
} from 'lucide-react';

export default function ProductLoopShowcase() {
  // Phase 0: Record in Local Chrome
  // Phase 1: Smart Loop & 90s 2FA Pause
  // Phase 2: SHA-256 Vault & Master CSV
  const [currentPhase, setCurrentPhase] = useState<0 | 1 | 2>(0);

  // Continuous background loop: 3.2s per phase
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhase((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative w-full max-w-5xl mx-auto my-8"
      aria-label="Automated Workflow Demonstration"
    >
      {/* Subtle Ambient Backlight Glow */}
      <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/15 via-cyan-500/15 to-purple-500/15 rounded-[2.5rem] blur-3xl -z-10 pointer-events-none opacity-80" />

      {/* Main Studio Frame */}
      <div className="rounded-2xl sm:rounded-3xl bg-[#09090d]/95 border border-white/15 shadow-2xl overflow-hidden backdrop-blur-xl relative">
        {/* Top Browser Bar */}
        <div className="bg-[#0e0e14] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
          {/* Window Dots & Address */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/80 inline-block" />
            </div>

            {/* Address Pill */}
            <div className="flex items-center gap-2 bg-[#050508] text-zinc-400 text-xs px-3.5 py-1 rounded-full border border-white/10 font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  currentPhase === 0
                    ? 'bg-cyan-400 animate-pulse'
                    : currentPhase === 1
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-zinc-300">chrome://cdp:9222 • portal.acme-vendor.com/invoices</span>
            </div>
          </div>

          {/* Live Action Status Pill */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {currentPhase === 0 && (
              <span className="px-3 py-1 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 font-semibold flex items-center gap-1.5 transition-all">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>1. Record in Local Chrome</span>
              </span>
            )}
            {currentPhase === 1 && (
              <span className="px-3 py-1 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40 font-semibold flex items-center gap-1.5 transition-all">
                <RotateCw className="w-3 h-3 animate-spin text-amber-400" />
                <span>2. Auto-Loop &amp; 2FA Handoff</span>
              </span>
            )}
            {currentPhase === 2 && (
              <span className="px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-semibold flex items-center gap-1.5 transition-all">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>3. SHA-256 Vault &amp; CSV</span>
              </span>
            )}
          </div>
        </div>

        {/* The Live Portal Canvas */}
        <div className="relative min-h-[360px] sm:min-h-[400px] bg-[#07070b] overflow-hidden flex flex-col justify-between p-4 sm:p-7 select-none">
          {/* Portal Internal Nav */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xs font-mono font-bold text-cyan-400">
                RF
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight">Acme Vendor Billing Portal</h4>
                <p className="text-[10px] text-zinc-400">Connected over local Chrome DevTools Protocol (:9222)</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-900 border border-white/10 text-zinc-300">
                Filter: Paid (24)
              </span>
            </div>
          </div>

          {/* Portal Data Table */}
          <div className="rounded-xl border border-white/10 bg-[#0a0a0f] overflow-hidden my-3 shadow-inner">
            <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-zinc-950/90 border-b border-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              <div className="col-span-3">INVOICE</div>
              <div className="col-span-4">SUPPLIER</div>
              <div className="col-span-3">AMOUNT</div>
              <div className="col-span-2 text-right">ACTION</div>
            </div>

            <div className="divide-y divide-white/5 text-xs font-mono">
              {/* Row 1: Target Action Row */}
              <div
                className={`grid grid-cols-12 gap-3 px-4 py-3 items-center transition-all duration-300 ${
                  currentPhase === 0
                    ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                    : currentPhase === 1
                    ? 'bg-amber-500/10 border-l-2 border-amber-400'
                    : 'bg-emerald-500/10 border-l-2 border-emerald-400'
                }`}
              >
                <div className="col-span-3 text-white font-bold flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentPhase === 2 ? 'bg-emerald-400' : 'bg-cyan-400'
                    }`}
                  />
                  <span>#INV-2026-104</span>
                </div>
                <div className="col-span-4 text-zinc-200 truncate">Acme Supplier Inc</div>
                <div className="col-span-3 text-white font-bold">$1,420.00</div>
                <div className="col-span-2 text-right">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded text-xs font-bold transition-all shadow-md ${
                      currentPhase === 0
                        ? 'bg-cyan-400 text-zinc-950 ring-4 ring-cyan-400/30 scale-105'
                        : currentPhase === 1
                        ? 'bg-amber-400 text-zinc-950'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {currentPhase === 0
                      ? 'Download PDF'
                      : currentPhase === 1
                      ? 'Looping (1/24)'
                      : 'Saved ✓'}
                  </button>
                </div>
              </div>

              {/* Row 2 */}
              <div
                className={`grid grid-cols-12 gap-3 px-4 py-3 items-center text-zinc-400 transition-colors ${
                  currentPhase === 1 ? 'bg-zinc-900/60 text-zinc-200' : ''
                }`}
              >
                <div className="col-span-3 text-zinc-300">#INV-2026-103</div>
                <div className="col-span-4 text-zinc-400 truncate">Delta Freight Logistics</div>
                <div className="col-span-3 text-zinc-300">$890.50</div>
                <div className="col-span-2 text-right">
                  <span
                    className={`text-[11px] ${
                      currentPhase === 1
                        ? 'text-amber-400 font-semibold'
                        : currentPhase === 2
                        ? 'text-emerald-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {currentPhase === 1
                      ? 'In Queue (2/24)'
                      : currentPhase === 2
                      ? 'Downloaded ✓'
                      : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-12 gap-3 px-4 py-3 items-center text-zinc-400">
                <div className="col-span-3 text-zinc-300">#INV-2026-102</div>
                <div className="col-span-4 text-zinc-400 truncate">Apex Utility Grid</div>
                <div className="col-span-3 text-zinc-300">$3,110.00</div>
                <div className="col-span-2 text-right">
                  <span className="text-[11px] text-zinc-500">
                    {currentPhase === 2 ? 'Skipped (Duplicate)' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 0 Floating Inspector Tooltip: Resilient Fingerprint */}
          {currentPhase === 0 && (
            <div className="hidden sm:flex items-center gap-2 p-2.5 rounded-lg bg-zinc-950/90 border border-cyan-500/30 text-xs font-mono text-cyan-300 shadow-xl self-start">
              <Fingerprint className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Captured Selector:</span>
              <span className="text-white font-semibold">tr &gt;&gt; button[aria-label=&quot;Download PDF&quot;]</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Dynamic IDs Stripped
              </span>
            </div>
          )}

          {/* Moving Mouse Cursor (Active in Phase 0) */}
          <div
            className={`absolute pointer-events-none transition-all duration-700 ease-out z-20 ${
              currentPhase === 0
                ? 'right-[65px] top-[148px] sm:right-[75px] sm:top-[165px] opacity-100 scale-100'
                : 'right-[120px] top-[260px] opacity-0 scale-75'
            }`}
          >
            <div className="relative">
              <MousePointer2 className="w-5 h-5 text-white fill-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]" />
              {/* Click Ripple Ring */}
              {currentPhase === 0 && (
                <span className="absolute -top-1 -left-1 w-7 h-7 rounded-full border-2 border-cyan-400 animate-ping pointer-events-none" />
              )}
            </div>
          </div>

          {/* Phase 1: Smart Loop & 90s 2FA Pause Banner */}
          <div
            className={`transition-all duration-500 flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 gap-2.5 ${
              currentPhase === 1
                ? 'opacity-100 translate-y-0'
                : 'opacity-40 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div>
                <span className="text-xs font-bold text-white block">
                  2FA Challenge Handled in Local Chrome (90s Window)
                </span>
                <span className="text-[11px] text-zinc-300">
                  LoopDetector paused safely for SMS OTP. Cookie verified — auto-resuming 24 table rows.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30 font-bold">
                14 / 24 Rows Processed
              </span>
            </div>
          </div>

          {/* Phase 2: SHA-256 Vault & Master CSV Notification */}
          <div
            className={`absolute bottom-5 right-5 sm:bottom-7 sm:right-7 z-30 transition-all duration-500 ${
              currentPhase === 2
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
            }`}
          >
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#0e0e16] border border-emerald-500/40 shadow-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">_extracted_data.csv &amp; 24 PDFs</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    SHA-256 Verified (0 Duplicates)
                  </span>
                  <span className="text-[10px] text-zinc-400">~/Downloads/ReFlow</span>
                </div>
              </div>
              <div className="pl-2 border-l border-white/10 shrink-0">
                <span className="p-1.5 rounded-md bg-emerald-400 text-zinc-950 block text-[10px] font-bold">
                  Synced
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Step Selectors */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mt-5">
        {/* Step 1 */}
        <button
          type="button"
          onClick={() => setCurrentPhase(0)}
          className={`py-3 px-2 sm:px-4 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
            currentPhase === 0
              ? 'bg-[#14141e] border-white/40 shadow-lg text-white scale-[1.02]'
              : 'bg-[#09090d]/80 border-white/10 hover:border-white/25 text-zinc-400 hover:text-white'
          }`}
          aria-label="Step 1: Record in Local Chrome"
        >
          <MousePointer2
            className={`w-3.5 h-3.5 shrink-0 ${
              currentPhase === 0 ? 'text-cyan-400' : 'text-zinc-500'
            }`}
          />
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            1. Record in Chrome
          </span>
        </button>

        {/* Step 2 */}
        <button
          type="button"
          onClick={() => setCurrentPhase(1)}
          className={`py-3 px-2 sm:px-4 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
            currentPhase === 1
              ? 'bg-[#14141e] border-white/40 shadow-lg text-white scale-[1.02]'
              : 'bg-[#09090d]/80 border-white/10 hover:border-white/25 text-zinc-400 hover:text-white'
          }`}
          aria-label="Step 2: Auto-Loop & 2FA Handoff"
        >
          <Play
            className={`w-3.5 h-3.5 shrink-0 ${
              currentPhase === 1 ? 'text-amber-400 fill-amber-400' : 'text-zinc-500'
            }`}
          />
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            2. Auto-Loop &amp; 2FA
          </span>
        </button>

        {/* Step 3 */}
        <button
          type="button"
          onClick={() => setCurrentPhase(2)}
          className={`py-3 px-2 sm:px-4 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
            currentPhase === 2
              ? 'bg-[#14141e] border-white/40 shadow-lg text-white scale-[1.02]'
              : 'bg-[#09090d]/80 border-white/10 hover:border-white/25 text-zinc-400 hover:text-white'
          }`}
          aria-label="Step 3: SHA-256 Vault & CSV"
        >
          <Download
            className={`w-3.5 h-3.5 shrink-0 ${
              currentPhase === 2 ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          />
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            3. Vault &amp; Master CSV
          </span>
        </button>
      </div>
    </div>
  );
}
