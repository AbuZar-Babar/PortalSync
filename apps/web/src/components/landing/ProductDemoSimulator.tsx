'use client';

export default function ProductDemoSimulator() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16" id="how-it-works">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          03 / LIVE REPLAY SIMULATION
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mt-3 mb-4">
          Show it once. <span className="text-zinc-500">Watch it execute autonomously.</span>
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
          FlowMind maps DOM geometry, records keystrokes and Bézier mouse paths via Chrome DevTools Protocol, and transitions immediately to silent 24x replay.
        </p>
      </div>

      {/* 4-Step Architectural Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {/* Step 1 */}
        <div className="sync-step-1 bg-[#0c0c10] border border-white/10 rounded-2xl p-5 transition-all hover:border-white/20">
          <div className="flex items-center justify-between mb-3 text-[11px] font-mono">
            <span className="text-zinc-400 font-bold">01 / SHOW IT</span>
            <span className="text-zinc-500">0.0s – 1.8s</span>
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5 flex items-center justify-between">
            <span>Natural Demonstration</span>
            <span className="text-xs text-white">● Record</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Perform the workflow once in Google Chrome without writing scripts or installing extensions.
          </p>
          <div className="w-full bg-zinc-900 h-1 rounded-full mt-4 overflow-hidden">
            <div className="bg-white h-full w-full rounded-full" />
          </div>
        </div>

        {/* Step 2 */}
        <div className="sync-step-2 bg-[#0c0c10] border border-white/10 rounded-2xl p-5 transition-all hover:border-white/20">
          <div className="flex items-center justify-between mb-3 text-[11px] font-mono">
            <span className="text-zinc-400 font-bold">02 / MAP IT</span>
            <span className="text-zinc-500">1.8s – 3.0s</span>
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5 flex items-center justify-between">
            <span>DOM Inspection</span>
            <span className="text-xs text-zinc-400">● Mapping</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Extracts coordinate geometry, resolves nested ERP iframes, and identifies table rows dynamically.
          </p>
          <div className="w-full bg-zinc-900 h-1 rounded-full mt-4 overflow-hidden">
            <div className="bg-zinc-400 h-full w-full rounded-full" />
          </div>
        </div>

        {/* Step 3 */}
        <div className="sync-step-3 bg-[#0c0c10] border border-white/10 rounded-2xl p-5 transition-all hover:border-white/20">
          <div className="flex items-center justify-between mb-3 text-[11px] font-mono">
            <span className="text-zinc-400 font-bold">03 / REMEMBER</span>
            <span className="text-zinc-500">3.0s – 3.8s</span>
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5 flex items-center justify-between">
            <span>Self-Healing Tree</span>
            <span className="text-xs text-emerald-400">✓ Saved</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Stores multi-attribute selector fallback trees resilient to vendor website redesigns.
          </p>
          <div className="w-full bg-zinc-900 h-1 rounded-full mt-4 overflow-hidden">
            <div className="bg-emerald-500 h-full w-full rounded-full" />
          </div>
        </div>

        {/* Step 4 */}
        <div className="sync-step-4 bg-[#0c0c10] border border-white/10 rounded-2xl p-5 transition-all hover:border-white/20">
          <div className="flex items-center justify-between mb-3 text-[11px] font-mono">
            <span className="text-zinc-400 font-bold">04 / EXECUTE</span>
            <span className="text-zinc-500">3.8s – 5.6s</span>
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5 flex items-center justify-between">
            <span>Autonomous Replay</span>
            <span className="text-xs text-white font-mono">24x Auto</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Executes the captured workflow at 24x speed with zero manual babysitting.
          </p>
          <div className="w-full bg-zinc-900 h-1 rounded-full mt-4 overflow-hidden">
            <div className="bg-white h-full w-full rounded-full" />
          </div>
        </div>
      </div>

      {/* Architectural Studio Mockup */}
      <div className="w-full rounded-2xl bg-[#09090c] border border-white/10 shadow-2xl overflow-hidden relative">
        {/* Minimal macOS Top Header Bar */}
        <div className="bg-[#0e0e13] px-5 py-3.5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 inline-block" />
          </div>

          <div className="bg-[#050508] text-zinc-400 text-xs px-4 py-1 rounded-full font-mono flex items-center gap-2 max-w-sm w-full justify-center border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="truncate text-zinc-300">https://engine.flowmind.ai/workspace/invoices</span>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
            <span className="hidden sm:inline">PORT 9222</span>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white font-bold">
              CDP ACTIVE
            </span>
          </div>
        </div>

        {/* Studio Surface */}
        <div className="p-6 sm:p-8 min-h-[380px] bg-[#07070a] select-none relative">
          {/* Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-5 border-b border-white/10">
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">Financial Batches &amp; Invoice Export</h4>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">Automated ExtJS Grid Extraction • SHA-256 Deduplication</p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="animate-filter-btn px-3 py-1.5 rounded-lg border border-white/15 bg-zinc-900 text-xs font-mono text-zinc-300 flex items-center gap-1.5">
                <span>Filter: Date &gt;= 2026-01</span>
              </div>
              <div className="animate-input-field px-3 py-1.5 rounded-lg border border-white/15 bg-zinc-900 text-xs font-mono text-zinc-300 flex items-center gap-1.5 min-w-[150px]">
                <span className="text-zinc-500">ID:</span>
                <span className="animate-typing-text text-white font-semibold font-mono">INV-2026-Q3</span>
                <span className="w-1 h-3 bg-white inline-block animate-pulse" />
              </div>
            </div>
          </div>

          {/* Minimal Data Table */}
          <div className="rounded-xl border border-white/10 bg-[#0a0a0e] overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-zinc-950/80 border-b border-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              <div className="col-span-3">INVOICE BATCH</div>
              <div className="col-span-3">VENDOR / ACCOUNT</div>
              <div className="col-span-2">AMOUNT</div>
              <div className="col-span-2">STATUS</div>
              <div className="col-span-2 text-right">ACTION</div>
            </div>

            <div className="divide-y divide-white/5 text-xs font-mono">
              {/* Row 1 */}
              <div className="grid grid-cols-12 gap-3 px-5 py-3 items-center text-zinc-400">
                <div className="col-span-3 text-zinc-300">#INV-8491</div>
                <div className="col-span-3 text-zinc-400">Stripe Billing Services</div>
                <div className="col-span-2 text-zinc-300">$1,240.00</div>
                <div className="col-span-2">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300">Processed</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-[11px] text-zinc-500">Completed</span>
                </div>
              </div>

              {/* Row 2: Target Row */}
              <div className="animate-table-row-highlight grid grid-cols-12 gap-3 px-5 py-3 items-center bg-white/[0.02]">
                <div className="col-span-3 text-white font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span>#INV-8492</span>
                </div>
                <div className="col-span-3 text-zinc-200">AWS Enterprise Cloud</div>
                <div className="col-span-2 text-white font-bold">$4,892.50</div>
                <div className="col-span-2">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    Ready
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <button
                    type="button"
                    className="animate-export-btn px-3 py-1 rounded bg-white text-zinc-950 text-[11px] font-bold shadow-sm"
                  >
                    Export ↗
                  </button>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-12 gap-3 px-5 py-3 items-center text-zinc-400">
                <div className="col-span-3 text-zinc-300">#INV-8493</div>
                <div className="col-span-3 text-zinc-400">Figma Organization</div>
                <div className="col-span-2 text-zinc-300">$750.00</div>
                <div className="col-span-2">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300">In Queue</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-[11px] text-zinc-500">Queued</span>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Saved Notification Pill */}
          <div className="animate-saved-checkmark absolute top-1/2 left-1/2 z-30 px-6 py-4 rounded-xl bg-zinc-900 border border-white/20 shadow-2xl flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-white text-zinc-950 flex items-center justify-center font-bold text-sm mb-2">
              ✓
            </div>
            <span className="text-xs font-bold text-white">Workflow Mapped &amp; Saved</span>
            <span className="text-[10px] font-mono text-zinc-400 mt-0.5">Self-healing selector fallback ready</span>
          </div>

          {/* Animated Cursor */}
          <div className="animate-saas-cursor absolute top-0 left-0 pointer-events-none z-40">
            <svg className="w-5 h-5 text-white filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.438z" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
