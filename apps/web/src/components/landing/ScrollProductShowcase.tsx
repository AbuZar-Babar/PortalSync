'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MousePointer2,
  Workflow,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  Download,
  RotateCw,
} from 'lucide-react';

interface StageConfig {
  id: string;
  stepNumber: string;
  title: string;
  badge: string;
  shortDesc: string;
  detail: string;
  url: string;
}

const STAGES: StageConfig[] = [
  {
    id: 'capture',
    stepNumber: '01',
    title: 'Natural Chrome Capture',
    badge: '1x Human Speed',
    shortDesc: 'Click and navigate naturally in Google Chrome.',
    detail: 'FlowMind listens via Chrome DevTools Protocol, mapping click coordinates, hierarchy, and input fields without requiring extensions.',
    url: 'app.vendorportal.com/invoices',
  },
  {
    id: 'nodes',
    stepNumber: '02',
    title: 'Visual Node Assembly',
    badge: 'Auto-Compiled',
    shortDesc: 'Clicks convert automatically into an n8n-style workflow graph.',
    detail: 'Every interaction becomes a distinct, reorderable visual block with built-in parameters, delays, and condition checks.',
    url: 'flowmind.internal/canvas/pipeline-902',
  },
  {
    id: 'healing',
    stepNumber: '03',
    title: 'Self-Healing Intelligence',
    badge: 'DOM Drift Shield',
    shortDesc: 'Survives website redesigns and shifted buttons automatically.',
    detail: 'When CSS classes or button coordinates change, our multi-attribute recovery engine matches the target by semantics and ARIA tags in 18ms.',
    url: 'flowmind.internal/recovery-engine/live',
  },
  {
    id: 'replay',
    stepNumber: '04',
    title: '24x Autonomous Execution',
    badge: 'Headless Replay',
    shortDesc: 'Replays the entire process in 0.75s and exports clean data.',
    detail: 'Runs silently on your local machine or cloud runner, validates duplicate downloads with SHA-256 hashes, and outputs clean CSV/JSON.',
    url: 'flowmind.internal/runner/headless-exec',
  },
];

export default function ScrollProductShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeStage, setActiveStage] = useState(0);
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Monitor scroll within the tall container
  useEffect(() => {
    let animationFrameId: number;

    const handleScroll = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollableDistance = rect.height - windowHeight;

      if (totalScrollableDistance <= 0) return;

      // Calculate how far through the container the user has scrolled
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollableDistance));

      animationFrameId = requestAnimationFrame(() => {
        setScrollProgress(progress);

        // Map progress (0 to 1) across the 4 stages
        if (!isManualOverride) {
          if (progress < 0.25) {
            setActiveStage(0);
          } else if (progress < 0.5) {
            setActiveStage(1);
          } else if (progress < 0.75) {
            setActiveStage(2);
          } else {
            setActiveStage(3);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isManualOverride]);

  // Jump smoothly to a specific stage by scrolling to its container percentage
  const jumpToStage = (index: number) => {
    if (!containerRef.current) return;
    setIsManualOverride(true);
    setActiveStage(index);

    const containerTop = containerRef.current.offsetTop;
    const containerHeight = containerRef.current.offsetHeight;
    const windowHeight = window.innerHeight;
    const totalScrollableDistance = containerHeight - windowHeight;

    const targetFraction = (index + 0.12) / STAGES.length;
    const targetScrollY = containerTop + targetFraction * totalScrollableDistance;

    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth',
    });

    // Release override after smooth scroll completes
    setTimeout(() => {
      setIsManualOverride(false);
    }, 700);
  };

  const currentStageConfig = STAGES[activeStage];

  return (
    <div
      ref={containerRef}
      id="interactive-showcase"
      className="relative w-full h-[320vh] bg-transparent my-12"
      aria-label="Interactive Scroll-Driven Product Journey"
    >
      {/* Sticky Viewport Stage: Centered while scrolling */}
      <div className="sticky top-20 sm:top-24 w-full max-w-5xl mx-auto px-4 sm:px-6 z-20 flex flex-col items-center">
        {/* Ambient Radial Backlight Glow */}
        <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-cyan-500/15 to-purple-500/20 rounded-[2.5rem] blur-3xl -z-10 pointer-events-none opacity-75" />

        {/* Top Control Bar: Stage Indicators and Progress Scrubber */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-3 bg-[#0a0a0e]/90 backdrop-blur-md rounded-2xl border border-white/10 px-4 py-2.5 shadow-xl">
          {/* Step Selector Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {STAGES.map((stage, idx) => {
              const isActive = activeStage === idx;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => jumpToStage(idx)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-zinc-950 font-bold shadow-md scale-105'
                      : 'text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5'
                  }`}
                  aria-pressed={isActive}
                  aria-label={`Jump to stage ${stage.stepNumber}: ${stage.title}`}
                >
                  <span className={isActive ? 'text-zinc-950 font-bold' : 'text-zinc-500'}>
                    {stage.stepNumber}
                  </span>
                  <span className="hidden md:inline">{stage.title.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Scroll Progress Meter */}
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider hidden sm:inline">
              Scroll Progress
            </span>
            <div className="w-20 sm:w-28 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-150 ease-out"
                style={{ width: `${Math.round(scrollProgress * 100)}%` }}
              />
            </div>
            <span className="text-white font-bold min-w-[32px] text-right">
              {Math.round(scrollProgress * 100)}%
            </span>
          </div>
        </div>

        {/* Main Studio Display Frame */}
        <div className="w-full rounded-2xl sm:rounded-3xl bg-[#09090d]/95 border border-white/15 shadow-2xl overflow-hidden backdrop-blur-xl relative">
          {/* Browser / Console Header Chrome */}
          <div className="bg-[#0e0e14] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 border-b border-white/10">
            {/* macOS Window Controls */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/80 inline-block shadow-sm" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/80 inline-block shadow-sm" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/80 inline-block shadow-sm" />
            </div>

            {/* Dynamic URL / Environment Pill */}
            <div className="flex items-center gap-2 bg-[#050508] text-zinc-400 text-xs px-3 sm:px-4 py-1 rounded-full border border-white/10 font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeStage === 2 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                }`}
              />
              <span className="truncate max-w-[180px] sm:max-w-[320px] text-zinc-300">
                {currentStageConfig.url}
              </span>
            </div>

            {/* Current Stage Badge */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-200 border border-white/10 font-semibold text-[11px]">
                {currentStageConfig.badge}
              </span>
            </div>
          </div>

          {/* Interactive Canvas Canvas Area */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] bg-[#060609] overflow-hidden flex items-center justify-center p-4 sm:p-6 select-none">
            {/* STAGE 1: Natural Chrome Capture */}
            {activeStage === 0 && (
              <div className="w-full h-full flex flex-col justify-between rounded-xl border border-white/10 bg-[#08080c] p-4 sm:p-6 transition-all duration-500 ease-out relative overflow-hidden">
                {/* Simulated Portal Top Navigation */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="text-xs font-bold text-white font-mono">Enterprise Portal / Invoices</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-white/5">
                      Batch: Q3-2026
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Listening to Chrome CDP
                    </span>
                  </div>
                </div>

                {/* Simulated Table Viewport */}
                <div className="rounded-lg border border-white/10 bg-[#0a0a0f] overflow-hidden my-3">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-zinc-950/90 border-b border-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                    <div className="col-span-3">INVOICE ID</div>
                    <div className="col-span-4">VENDOR</div>
                    <div className="col-span-3">AMOUNT</div>
                    <div className="col-span-2 text-right">ACTION</div>
                  </div>

                  <div className="divide-y divide-white/5 text-xs font-mono">
                    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-zinc-400">
                      <div className="col-span-3 text-zinc-300">#INV-9401</div>
                      <div className="col-span-4">Stripe Payments Europe</div>
                      <div className="col-span-3 text-zinc-300">$1,450.00</div>
                      <div className="col-span-2 text-right">
                        <span className="text-[10px] text-zinc-500">Processed</span>
                      </div>
                    </div>

                    {/* Target Row With Click Detection */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center bg-cyan-500/5 border-l-2 border-cyan-400">
                      <div className="col-span-3 text-white font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span>#INV-9402</span>
                      </div>
                      <div className="col-span-4 text-zinc-200">AWS Cloud Services</div>
                      <div className="col-span-3 text-white font-bold">$3,840.50</div>
                      <div className="col-span-2 text-right">
                        <div className="inline-block relative">
                          <button
                            type="button"
                            className="px-2.5 py-1 rounded bg-white text-zinc-950 text-[11px] font-bold shadow-md ring-2 ring-cyan-400/50"
                          >
                            Export PDF
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-zinc-400">
                      <div className="col-span-3 text-zinc-300">#INV-9403</div>
                      <div className="col-span-4">Figma Design Team</div>
                      <div className="col-span-3 text-zinc-300">$750.00</div>
                      <div className="col-span-2 text-right">
                        <span className="text-[10px] text-zinc-500">Queued</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Captured Action Pill (Bottom) */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-900/90 border border-white/10 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <MousePointer2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-zinc-300">Captured Click:</span>
                    <code className="text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40">
                      button[data-action="export-pdf"]
                    </code>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-semibold">Coordinates: (x: 540, y: 285)</span>
                </div>
              </div>
            )}

            {/* STAGE 2: Visual Node Assembly (n8n-Inspired Pipeline) */}
            {activeStage === 1 && (
              <div className="w-full h-full flex flex-col justify-between rounded-xl border border-white/10 bg-[#07070b] p-4 sm:p-6 transition-all duration-500 ease-out relative overflow-hidden">
                {/* Canvas Grid Background */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

                {/* Canvas Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 z-10">
                  <div className="flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white font-mono">
                      Workflow Pipeline: Invoice Sync
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">4 Connected Nodes</span>
                </div>

                {/* Node Graph Container */}
                <div className="relative my-auto py-4 z-10">
                  {/* Glowing Connection Wires */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-gradient-to-r from-indigo-500/40 via-cyan-500/60 to-emerald-500/40 -z-10" />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {/* Node 1 */}
                    <div className="p-3 rounded-xl bg-[#0e0e14] border border-indigo-500/40 shadow-lg relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-indigo-400 font-bold">NODE 01</span>
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      </div>
                      <h4 className="text-xs font-bold text-white">Trigger</h4>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Everyday at 9:00 AM</p>
                    </div>

                    {/* Node 2 */}
                    <div className="p-3 rounded-xl bg-[#0e0e14] border border-cyan-500/40 shadow-lg relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">NODE 02</span>
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      </div>
                      <h4 className="text-xs font-bold text-white">Navigate Portal</h4>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Chrome DevTools Replay</p>
                    </div>

                    {/* Node 3 */}
                    <div className="p-3 rounded-xl bg-[#0e0e14] border border-purple-500/40 shadow-lg relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-purple-400 font-bold">NODE 03</span>
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                      </div>
                      <h4 className="text-xs font-bold text-white">Filter Rows</h4>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Status == &apos;Ready&apos;</p>
                    </div>

                    {/* Node 4 */}
                    <div className="p-3 rounded-xl bg-[#0e0e14] border border-emerald-500/40 shadow-lg relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">NODE 04</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                      <h4 className="text-xs font-bold text-white">Export &amp; Hash</h4>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">SHA-256 Deduplication</p>
                    </div>
                  </div>
                </div>

                {/* Pipeline Stats */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/90 border border-white/10 text-xs font-mono z-10">
                  <span className="text-zinc-300">Generated from 1 human recording session</span>
                  <span className="text-emerald-400 font-bold">Zero Code Required</span>
                </div>
              </div>
            )}

            {/* STAGE 3: Self-Healing Intelligence */}
            {activeStage === 2 && (
              <div className="w-full h-full flex flex-col justify-between rounded-xl border border-white/10 bg-[#08080c] p-4 sm:p-6 transition-all duration-500 ease-out relative overflow-hidden">
                {/* Warning Pulse */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      Website Redesign Detected: Element Shifted
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    Self-Healing Active
                  </span>
                </div>

                {/* Healing Inspection Radar Card */}
                <div className="my-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left: Broken Selector */}
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-rose-500/30">
                    <span className="text-[10px] font-mono uppercase text-rose-400 font-bold block mb-1">
                      Original Selector (Failed)
                    </span>
                    <code className="text-xs text-rose-300 font-mono line-through block">
                      button.btn-primary-v1
                    </code>
                    <p className="text-[11px] text-zinc-500 mt-2 font-mono">
                      Reason: Vendor updated site from React 18 to Next.js 15. Class names hashed.
                    </p>
                  </div>

                  {/* Right: Healed Alternative */}
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 shadow-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                        Resolved Alternative (Match: 99.4%)
                      </span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <code className="text-xs text-emerald-300 font-mono block">
                      button[aria-label=&apos;Download Invoices&apos;]
                    </code>
                    <p className="text-[11px] text-emerald-400/90 mt-2 font-mono">
                      Auto-recovered in 18ms using semantic text anchor and parent tree topology.
                    </p>
                  </div>
                </div>

                {/* Bottom Assurance */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/90 border border-white/10 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-zinc-300">Resilience Invariant:</span>
                    <span className="text-white font-semibold">Workflow Continues Without Crashing</span>
                  </div>
                  <span className="text-emerald-400 font-mono">0 Breakdowns</span>
                </div>
              </div>
            )}

            {/* STAGE 4: 24x Autonomous Execution & Clean Export */}
            {activeStage === 3 && (
              <div className="w-full h-full flex flex-col justify-between rounded-xl border border-white/10 bg-[#08080c] p-4 sm:p-6 transition-all duration-500 ease-out relative overflow-hidden">
                {/* Speed Execution Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white font-mono">
                      Headless Replay: 24x Real-Time Speed
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-400">Total Time:</span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                      0.75 seconds
                    </span>
                  </div>
                </div>

                {/* Live Progress Bar and Output Chips */}
                <div className="my-auto space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1.5">
                      <span>Processing Batch: 24 Invoices</span>
                      <span className="text-white font-bold">24 / 24 Complete (100%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-900 border border-white/5 overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full" />
                    </div>
                  </div>

                  {/* Clean Export Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <div>
                          <span className="text-xs font-bold text-white block">invoices_q3_clean.csv</span>
                          <span className="text-[10px] text-zinc-500 font-mono">28.4 KB - Deduplicated</span>
                        </div>
                      </div>
                      <span className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 text-xs font-mono">Ready</span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileCode className="w-4 h-4 text-cyan-400" />
                        <div>
                          <span className="text-xs font-bold text-white block">execution_receipt.json</span>
                          <span className="text-[10px] text-zinc-500 font-mono">SHA-256 Verified</span>
                        </div>
                      </div>
                      <span className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 text-xs font-mono">Verified</span>
                    </div>
                  </div>
                </div>

                {/* Final Execution Pill */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Run Completed Successfully</span>
                  </div>
                  <span className="text-zinc-400">Next scheduled run: Tomorrow 9:00 AM</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Narrative Description Banner Synchronized to Active Stage */}
        <div className="w-full mt-4 p-4 sm:p-5 rounded-2xl bg-[#0a0a0e]/95 border border-white/10 backdrop-blur-md shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-cyan-400">
                STAGE {currentStageConfig.stepNumber}
              </span>
              <span className="text-xs text-zinc-500">/</span>
              <h3 className="text-sm font-bold text-white">{currentStageConfig.title}</h3>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {currentStageConfig.detail}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeStage < STAGES.length - 1 ? (
              <button
                type="button"
                onClick={() => jumpToStage(activeStage + 1)}
                className="px-4 py-2 rounded-full bg-white text-zinc-950 text-xs font-bold hover:bg-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Next Stage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => jumpToStage(0)}
                className="px-4 py-2 rounded-full bg-zinc-800 text-white text-xs font-bold hover:bg-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border border-white/10"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Replay Tour</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
