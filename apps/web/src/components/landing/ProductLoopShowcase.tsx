'use client';

import { useState, useEffect } from 'react';
import {
  MousePointer2,
  Play,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  RotateCw,
} from 'lucide-react';

export default function ProductLoopShowcase() {
  // Phase 0: Workflow Created (Click Recorded)
  // Phase 1: Workflow Running
  // Phase 2: File Downloaded
  const [currentPhase, setCurrentPhase] = useState<0 | 1 | 2>(0);

  // Continuous background loop: 2.6s per phase (7.8s total cycle) - Runs forever without pausing
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhase((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
    }, 2600);

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
        <div className="bg-[#0e0e14] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 border-b border-white/10">
          {/* Window Dots */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/80 inline-block" />
          </div>

          {/* Simple Address Pill */}
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
            <span className="text-zinc-300">portal.company.com/invoices</span>
          </div>

          {/* Live Action Status Pill */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {currentPhase === 0 && (
              <span className="px-3 py-1 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 font-semibold flex items-center gap-1.5 transition-all">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>1. Workflow Created</span>
              </span>
            )}
            {currentPhase === 1 && (
              <span className="px-3 py-1 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40 font-semibold flex items-center gap-1.5 transition-all">
                <RotateCw className="w-3 h-3 animate-spin text-amber-400" />
                <span>2. Running Automatically</span>
              </span>
            )}
            {currentPhase === 2 && (
              <span className="px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-semibold flex items-center gap-1.5 transition-all">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>3. File Downloaded</span>
              </span>
            )}
          </div>
        </div>

        {/* The Live Portal Canvas */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] bg-[#07070b] overflow-hidden flex flex-col justify-between p-4 sm:p-7 select-none">
          {/* Portal Internal Nav */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                P
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight">Invoice Management Portal</h4>
                <p className="text-[10px] text-zinc-400">Monthly billing and automated file exports</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-900 border border-white/10 text-zinc-300">
                Filter: Unpaid (24)
              </span>
            </div>
          </div>

          {/* Portal Data Table */}
          <div className="rounded-xl border border-white/10 bg-[#0a0a0f] overflow-hidden my-auto shadow-inner">
            <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-zinc-950/90 border-b border-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              <div className="col-span-3">INVOICE</div>
              <div className="col-span-4">ACCOUNT</div>
              <div className="col-span-3">AMOUNT</div>
              <div className="col-span-2 text-right">ACTION</div>
            </div>

            <div className="divide-y divide-white/5 text-xs font-mono">
              {/* Row 1 */}
              <div className="grid grid-cols-12 gap-3 px-4 py-3 items-center text-zinc-400">
                <div className="col-span-3 text-zinc-300">#INV-2041</div>
                <div className="col-span-4 text-zinc-400 truncate">Acme Software Corp</div>
                <div className="col-span-3 text-zinc-300">$1,200.00</div>
                <div className="col-span-2 text-right">
                  <span className="text-[11px] text-zinc-500">Processed</span>
                </div>
              </div>

              {/* Row 2: Target Action Row */}
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
                  <span>#INV-2042</span>
                </div>
                <div className="col-span-4 text-zinc-200 truncate">Global Cloud Hosting</div>
                <div className="col-span-3 text-white font-bold">$3,840.00</div>
                <div className="col-span-2 text-right">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded text-xs font-bold transition-all shadow-md ${
                      currentPhase === 0
                        ? 'bg-white text-zinc-950 ring-4 ring-cyan-400/30 scale-105'
                        : currentPhase === 1
                        ? 'bg-amber-400 text-zinc-950'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {currentPhase === 0
                      ? 'Export'
                      : currentPhase === 1
                      ? 'Running...'
                      : 'Saved ✓'}
                  </button>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-12 gap-3 px-4 py-3 items-center text-zinc-400">
                <div className="col-span-3 text-zinc-300">#INV-2043</div>
                <div className="col-span-4 text-zinc-400 truncate">Design Studio Tools</div>
                <div className="col-span-3 text-zinc-300">$640.00</div>
                <div className="col-span-2 text-right">
                  <span className="text-[11px] text-zinc-500">In Queue</span>
                </div>
              </div>
            </div>
          </div>

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

          {/* Phase 1: Running Banner Overlay */}
          <div
            className={`transition-all duration-500 flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 border border-white/10 ${
              currentPhase === 1
                ? 'opacity-100 translate-y-0'
                : 'opacity-40 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <RotateCw
                className={`w-4 h-4 text-amber-400 ${
                  currentPhase === 1 ? 'animate-spin' : ''
                }`}
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  Executing Recorded Actions
                </span>
                <span className="text-[11px] text-zinc-400">
                  Processing table rows automatically with zero manual effort
                </span>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
              Speed: 24x Auto
            </span>
          </div>

          {/* Phase 2: Download Card Drop-in Notification */}
          <div
            className={`absolute bottom-5 right-5 sm:bottom-7 sm:right-7 z-30 transition-all duration-500 ${
              currentPhase === 2
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
            }`}
          >
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#0e0e16] border border-emerald-500/40 shadow-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Invoices_2026.csv</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-[11px] text-zinc-400 block mt-0.5">
                  File Downloaded and Ready
                </span>
              </div>
              <div className="pl-2 border-l border-white/10">
                <span className="p-1.5 rounded-md bg-white text-zinc-950 block text-[10px] font-bold">
                  Saved
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Simplified Options (Zero Explanations, Ultra Clean) */}
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
          aria-label="Step 1: Record Workflow"
        >
          <MousePointer2
            className={`w-3.5 h-3.5 shrink-0 ${
              currentPhase === 0 ? 'text-cyan-400' : 'text-zinc-500'
            }`}
          />
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            1. Record
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
          aria-label="Step 2: Run Workflow Automatically"
        >
          <Play
            className={`w-3.5 h-3.5 shrink-0 ${
              currentPhase === 1 ? 'text-amber-400 fill-amber-400' : 'text-zinc-500'
            }`}
          />
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            2. Run
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
          aria-label="Step 3: Download Clean Files"
        >
          <Download
            className={`w-3.5 h-3.5 shrink-0 ${
              currentPhase === 2 ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          />
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            3. Download
          </span>
        </button>
      </div>
    </div>
  );
}
