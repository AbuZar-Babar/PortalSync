'use client';

export default function ProductDemoSimulator() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12" id="how-it-works">
      <div className="w-full rounded-[2.5rem] bg-slate-950/80 backdrop-blur-2xl border border-cyan-500/20 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Subtle Ambient Shimmer Background */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Title & Subtitle */}
        <div className="text-center max-w-2xl mx-auto mb-10 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[11px] font-bold tracking-wider uppercase mb-3 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            HOW IT WORKS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-white tracking-tight leading-tight">
            You show. It learns. It does.
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2.5 max-w-xl mx-auto leading-relaxed">
            Watch FlowMind map UI geometry, record human actions in real time, and instantly transition to 24x autonomous robotic replay.
          </p>
        </div>

        {/* 4-Step Interactive Flow Cards (Synchronized with the 5.6s Animation Loop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 relative z-10">
          {/* Step 1 Card: Show it */}
          <div className="sync-step-1 group relative bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-700/60 shadow-sm transition-all duration-300 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                STEP 01
              </span>
              <span className="text-[10px] text-cyan-400 font-mono font-semibold">0.0s – 1.8s</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-inner group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 rotate-[-45deg] -translate-y-0.5 fill-cyan-400" viewBox="0 0 24 24">
                <polygon points="3 3 10.5 21 13.5 13.5 21 10.5 3 3" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center justify-between">
              <span>Show it</span>
              <span className="text-cyan-400 text-[11px] font-semibold">● Recording</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Perform the workflow once in Chrome as you normally do without complex scripting.
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-cyan-400 h-full w-full rounded-full" />
            </div>
          </div>

          {/* Step 2 Card: Learn */}
          <div className="sync-step-2 group relative bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-700/60 shadow-sm transition-all duration-300 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-full">
                STEP 02
              </span>
              <span className="text-[10px] text-purple-400 font-mono font-semibold">1.8s – 3.0s</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 shadow-inner group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 stroke-[2] text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center justify-between">
              <span>Learn</span>
              <span className="text-purple-400 text-[11px] font-semibold">● Mapping</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              FlowMind maps your clicks, identifies dynamic form fields, and solves nested iframes automatically.
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-purple-500 h-full w-full rounded-full" />
            </div>
          </div>

          {/* Step 3 Card: Remember */}
          <div className="sync-step-3 group relative bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-700/60 shadow-sm transition-all duration-300 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                STEP 03
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-semibold">3.0s – 3.8s</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-inner group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 stroke-[2] text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center justify-between">
              <span>Remember</span>
              <span className="text-emerald-400 text-[11px] font-semibold">● Saved ✓</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Saves as an autonomous recipe with self-healing selector fallback trees resilient to site updates.
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-full w-full rounded-full" />
            </div>
          </div>

          {/* Step 4 Card: Run */}
          <div className="sync-step-4 group relative bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-700/60 shadow-sm transition-all duration-300 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                STEP 04
              </span>
              <span className="text-[10px] text-cyan-400 font-mono font-semibold">3.8s – 5.6s</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-inner group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 translate-x-0.5 fill-cyan-400" viewBox="0 0 24 24">
                <polygon points="6 4 19 12 6 20 6 4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center justify-between">
              <span>Run</span>
              <span className="text-cyan-400 text-[11px] font-semibold">● 24x Auto</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              FlowMind executes the full workflow autonomously at 24x speed with zero manual babysitting.
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full w-full rounded-full" />
            </div>
          </div>
        </div>

        {/* Centerpiece: Clean Modern Robotic Automation Window */}
        <div className="w-full rounded-3xl bg-slate-950 border border-cyan-500/25 shadow-2xl overflow-hidden relative">
          {/* Browser Window Minimal Header Bar */}
          <div className="bg-slate-900/90 px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800 backdrop-blur-md">
            {/* Window Controls */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block shadow-sm" />
            </div>

            {/* Browser Address Bar Pill */}
            <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 rounded-full font-mono flex items-center gap-2 max-w-md w-full justify-center border border-slate-700/80 shadow-sm">
              <svg className="w-3 h-3 text-cyan-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
              </svg>
              <span className="truncate text-slate-200 font-medium">https://app.flowmind.ai/workspace/invoices</span>
            </div>

            {/* Live Dynamic Phase Indicator Switcher */}
            <div className="relative flex items-center justify-end min-w-[170px] h-6 overflow-hidden">
              {/* Phase 1: Human Teaching */}
              <div className="animate-phase-human absolute right-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>1. Human Teaching</span>
              </div>
              {/* Phase Saved Confirmation */}
              <div className="animate-phase-saved absolute right-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-bold shadow-sm">
                <span className="text-emerald-400">✓</span>
                <span>Workflow Saved</span>
              </div>
              {/* Phase 2: Full Automation Replay */}
              <div className="animate-phase-auto absolute right-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400 text-purple-300 text-[10px] font-bold shadow-sm">
                <span className="text-cyan-400">⚡</span>
                <span>2. 24x Auto Replay</span>
              </div>
            </div>
          </div>

          {/* Simulated Robotic Dashboard Interface Surface */}
          <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 min-h-[360px] sm:min-h-[400px] overflow-hidden select-none">
            {/* Glowing Scanlines */}
            <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-cyan-500/0 via-cyan-500/15 to-indigo-500/20 pointer-events-none animate-saas-scanline blur-[2px]" />
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none animate-saas-scanline shadow-[0_0_16px_rgba(0,240,255,0.9)]" />

            {/* Top Interactive Dashboard Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-800 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 flex items-center justify-center font-bold text-sm shadow-md">
                  FM
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white tracking-tight">Financial Batches &amp; Invoice Export</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Auto-detecting nested table iframes &amp; download modals</p>
                </div>
              </div>

              {/* Action Controls Group */}
              <div className="flex items-center gap-2.5">
                {/* Filter Button */}
                <button
                  type="button"
                  className="animate-filter-btn px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-200 shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>Filter by Date</span>
                </button>

                {/* Form Input Field */}
                <div className="animate-input-field relative px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-mono text-slate-200 shadow-sm flex items-center gap-1.5 transition-all min-w-[170px]">
                  <span className="text-cyan-400 font-bold">$</span>
                  <span className="text-slate-500">ID:</span>
                  <span className="animate-typing-text text-cyan-300 font-semibold font-mono">INV-2026-Q3</span>
                  <span className="w-1.5 h-3 bg-cyan-400 animate-pulse inline-block -ml-0.5" />
                </div>
              </div>
            </div>

            {/* Minimalist Robotic Data Table Layout */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-sm overflow-hidden relative z-10">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-950/90 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                <div className="col-span-3">INVOICE BATCH</div>
                <div className="col-span-3">VENDOR / ACCOUNT</div>
                <div className="col-span-2">AMOUNT</div>
                <div className="col-span-2">STATUS</div>
                <div className="col-span-2 text-right">ACTION</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-slate-800/80 text-xs">
                {/* Row 1 */}
                <div className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-slate-800/40 transition-colors">
                  <div className="col-span-3 font-mono font-semibold text-slate-200">#INV-8491</div>
                  <div className="col-span-3 text-slate-400 font-medium">Stripe Billing Services</div>
                  <div className="col-span-2 font-mono text-slate-300 font-semibold">$1,240.00</div>
                  <div className="col-span-2">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">Processed</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <button type="button" className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors">
                      Export
                    </button>
                  </div>
                </div>

                {/* Row 2: TARGET ELEMENT */}
                <div className="animate-table-row-highlight grid grid-cols-12 gap-3 px-5 py-3.5 items-center transition-all border-l-4 border-transparent">
                  <div className="col-span-3 font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>#INV-8492</span>
                  </div>
                  <div className="col-span-3 text-white font-semibold">AWS Enterprise Cloud</div>
                  <div className="col-span-2 font-mono text-cyan-300 font-bold">$4,892.50</div>
                  <div className="col-span-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>Ready</span>
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <button type="button" className="animate-export-btn px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold shadow-md transition-all">
                      Export
                    </button>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-slate-800/40 transition-colors">
                  <div className="col-span-3 font-mono font-semibold text-slate-200">#INV-8493</div>
                  <div className="col-span-3 text-slate-400 font-medium">Figma Organization</div>
                  <div className="col-span-2 font-mono text-slate-300 font-semibold">$750.00</div>
                  <div className="col-span-2">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">In Queue</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <button type="button" className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors">
                      Export
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Saved Checkmark Modal */}
            <div className="animate-saved-checkmark absolute top-1/2 left-1/2 z-40 px-6 py-5 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-emerald-400/50 shadow-[0_20px_50px_rgba(16,185,129,0.3)] flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mb-2.5 shadow-[0_0_24px_rgba(52,211,153,0.7)] animate-bounce">
                <svg className="w-7 h-7 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-extrabold text-white tracking-tight">Workflow Mapped &amp; Saved!</span>
              <span className="text-[11px] font-semibold text-emerald-400 mt-0.5">Self-healing selectors saved in 0.75s</span>
              <div className="mt-2 text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                bot: invoice_export_v1 &middot; deterministic
              </div>
            </div>

            {/* Animated Simulated Cursor */}
            <div className="animate-saas-cursor absolute top-0 left-0 pointer-events-none z-50 transition-transform">
              <svg className="w-6 h-6 text-white filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.438z" />
              </svg>
              <div className="w-5 h-5 -mt-3 -ml-2 rounded-full border-2 border-cyan-400 animate-ping opacity-75" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
