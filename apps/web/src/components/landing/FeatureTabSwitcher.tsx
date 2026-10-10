'use client';

import { useState } from 'react';
import { Video, Search, Play, CheckCircle2, Cpu, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type TabKey = 'record' | 'discover' | 'replay';

interface TabData {
  id: TabKey;
  label: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  capabilities: {
    title: string;
    description: string;
  }[];
  metrics: {
    label: string;
    value: string;
    subtext: string;
  }[];
}

const TABS: TabData[] = [
  {
    id: 'record',
    label: 'Record Once',
    badge: 'Human Demonstration',
    title: 'Zero-Extension Chrome CDP Capture',
    subtitle: 'Demonstration-based capture with zero code and zero browser extensions.',
    description:
      'Perform your workflow naturally in genuine Google Chrome. FlowMind communicates directly with the Chrome DevTools Protocol to capture keystrokes, smooth Bézier mouse paths, and multi-tab download popups without injecting intrusive extensions.',
    capabilities: [
      {
        title: 'Native CDP Bridge',
        description: 'Bypasses Manifest V3 extension limitations with direct protocol hooks for 100% fidelity.',
      },
      {
        title: 'Natural Bézier Movement',
        description: 'Tracks realistic acceleration curves that prevent anti-bot and security false positives.',
      },
      {
        title: 'Multi-Window Lifecycle',
        description: 'Tracks auxiliary popups, child window tabs, and background file download triggers automatically.',
      },
    ],
    metrics: [
      { label: 'Setup Time', value: '< 60s', subtext: 'Zero extension install' },
      { label: 'Capture Speed', value: '1x Human', subtext: 'Natural recording' },
      { label: 'Fidelity', value: '100%', subtext: 'Full CDP event coverage' },
    ],
  },
  {
    id: 'discover',
    label: 'Discover Intelligently',
    badge: 'Deep Inspection',
    title: 'Universal DOM & Table Extraction',
    subtitle: 'Autonomous element recognition across complex enterprise portals.',
    description:
      'FlowMind penetrates nested cross-domain iframes, ShadowDOM boundaries, and legacy ExtJS/AgGrid web tables. Its universal date parsing and compound boolean engine filter rows accurately without brittle XPath reliance.',
    capabilities: [
      {
        title: 'Control-Column Alignment',
        description: 'Ignores tree expander glyphs and row checkboxes so target data columns never misalign.',
      },
      {
        title: 'Universal Date & Boolean Engine',
        description: 'Accurately evaluates US/EU/ISO date formats and compound rules like "Status = Pending AND Amount > 500".',
      },
      {
        title: 'Nested Iframe Penetration',
        description: 'Traverses legacy ERP iframes, transparent overlay backdrops, and modal viewports seamlessly.',
      },
    ],
    metrics: [
      { label: 'Table Formats', value: 'ExtJS / AgGrid', subtext: 'Universal grid support' },
      { label: 'Date Parser', value: 'Strict Calendar', subtext: 'US, EU, ISO-8601' },
      { label: 'Expander Safe', value: 'Dual Regex', subtext: 'Zero column shift' },
    ],
  },
  {
    id: 'replay',
    label: 'Replay Resiliently',
    badge: 'Self-Healing Replay',
    title: '24x High-Speed Self-Healing Execution',
    subtitle: 'Autonomous robotic replay that adapts when vendor websites change.',
    description:
      'Replay workflows at 24x human speed (0.75s per step). FlowMind continuously heals broken selectors using multi-attribute fallback trees, preserves transparent backdrop overlays, and invokes 90-second HITL alerts if a 2FA challenge occurs.',
    capabilities: [
      {
        title: 'State-Aware Checkbox Idempotency',
        description: 'Always enforces intended boolean state (default ON) with pre-click verification to prevent double-clicking.',
      },
      {
        title: 'Case Q Transparent Backdrop Recovery',
        description: 'Detects and preserves CDK transparent overlay backdrops without corrupting execution states.',
      },
      {
        title: '90s HITL Challenge Alerts',
        description: 'Detects CAPTCHA or 2FA challenges, flags requires_action state, and invites human intervention.',
      },
    ],
    metrics: [
      { label: 'Replay Speed', value: '24x Faster', subtext: '0.75s avg step speed' },
      { label: 'Healing Rate', value: '99.8%', subtext: 'Multi-attribute fallback' },
      { label: 'Intervention', value: '90s HITL', subtext: 'Real-time cloud alerts' },
    ],
  },
];

export default function FeatureTabSwitcher() {
  const [activeTab, setActiveTab] = useState<TabKey>('record');
  const current = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-14" id="features">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold tracking-wider uppercase mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>TRI-PILLAR AUTOMATION ENGINE</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-white tracking-tight">
          Engineered for Resilient Enterprise Automation
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-2.5 max-w-xl mx-auto leading-relaxed">
          Switch through the three core phases that make FlowMind reliable on real-world business websites.
        </p>

        {/* 3-Way Tab Switcher Buttons */}
        <div className="inline-flex p-1.5 mt-8 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-md max-w-xl w-full justify-between gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 px-3 sm:px-5 rounded-full text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.id === 'record' && <Video className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-cyan-400'}`} />}
                {tab.id === 'discover' && <Search className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-purple-400'}`} />}
                {tab.id === 'replay' && <Play className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-400'}`} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Display Card */}
      <div className="w-full rounded-[2.5rem] bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 border border-slate-800 shadow-2xl p-6 sm:p-10 lg:p-12 relative overflow-hidden backdrop-blur-xl">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          {/* Left Column: Description & Capabilities */}
          <div className="lg:col-span-7 flex flex-col items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-4">
              <span>{current.badge}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              {current.title}
            </h3>
            <p className="text-sm font-semibold text-cyan-400 mb-4">{current.subtitle}</p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-8">{current.description}</p>

            {/* Capabilities List */}
            <div className="space-y-4 w-full">
              {current.capabilities.map((cap, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">{cap.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{cap.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/signup"
                className="px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
              >
                <span>Experience {current.label}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Telemetry Card & Metrics */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Interactive Telemetry Box */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 shadow-inner">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    FLOWMIND_CORE // {current.id.toUpperCase()}
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ACTIVE
                </span>
              </div>

              {/* Dynamic Console Simulation */}
              <div className="space-y-2.5 font-mono text-[11px] text-slate-300">
                {activeTab === 'record' && (
                  <>
                    <div className="text-slate-500">{'// CDP session initialized on port 9222'}</div>
                    <div className="text-cyan-300">&gt; Target: chrome://newtab &rarr; https://erp.portal.internal</div>
                    <div className="text-slate-300">&gt; Recorded: click (selector: #btn-filter-date, bezier: true)</div>
                    <div className="text-emerald-400">&gt; Checkbox idempotency state: verified (checked: true)</div>
                    <div className="text-purple-300">&gt; Child tab spawned: TargetID(0x9B41) captured</div>
                  </>
                )}
                {activeTab === 'discover' && (
                  <>
                    <div className="text-slate-500">{'// Penetrating nested iframes & dynamic DOM'}</div>
                    <div className="text-cyan-300">&gt; Discovered table: ExtJS 6.x Grid &middot; 48 visible rows</div>
                    <div className="text-purple-300">&gt; Applied rule: Date &gt;= 2026-01-01 AND Status == &apos;Paid&apos;</div>
                    <div className="text-emerald-400">&gt; Ignored expander column: index 0 (glyph: &#x25B6;)</div>
                    <div className="text-amber-300">&gt; Field alignment: Column 2 matched to [Invoice ID]</div>
                  </>
                )}
                {activeTab === 'replay' && (
                  <>
                    <div className="text-slate-500">{'// 24x Replay Execution Engine'}</div>
                    <div className="text-cyan-300">&gt; Step 01 executed in 0.68s &middot; Target verified</div>
                    <div className="text-purple-300">&gt; Case Q transparent backdrop detected: preserved</div>
                    <div className="text-emerald-400">&gt; Step 02 executed in 0.72s &middot; File download initiated</div>
                    <div className="text-slate-300">&gt; Dedup hash: SHA-256 matched &middot; Clean storage</div>
                  </>
                )}
              </div>

              {/* Live Status Bar */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Memory: 42 MB</span>
                <span className="text-cyan-400">Zero Extension Overhead</span>
              </div>
            </div>

            {/* 3 Metric Pills */}
            <div className="grid grid-cols-3 gap-3">
              {current.metrics.map((m, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 text-center flex flex-col justify-between"
                >
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</span>
                  <span className="text-lg sm:text-xl font-extrabold text-white my-1 text-cyan-300 font-mono">
                    {m.value}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">{m.subtext}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
