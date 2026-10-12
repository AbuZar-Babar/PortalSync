'use client';

import { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  FolderDown,
  ToggleLeft,
  Sparkles,
  Layers,
  Wand2,
  Globe,
} from 'lucide-react';
import ScrollReveal from '@/components/landing/ScrollReveal';

interface Capability {
  id: string;
  stepNumber: string;
  title: string;
  summary: string;
  badge: string;
  type: 'chrome' | 'portal' | 'healing' | 'toggle' | 'download';
}

const CAPABILITIES: Capability[] = [
  {
    id: '01',
    stepNumber: '01',
    title: 'Genuine Google Chrome',
    summary: 'Runs directly in your real browser with zero extensions or plugins.',
    badge: 'No Plugins Needed',
    type: 'chrome',
  },
  {
    id: '02',
    stepNumber: '02',
    title: 'Complex Portals & Popups',
    summary: 'Navigates customer portals, nested frames, and login windows smoothly.',
    badge: 'Handles Iframes',
    type: 'portal',
  },
  {
    id: '03',
    stepNumber: '03',
    title: 'Auto-Healing Intelligence',
    summary: 'Spots shifted buttons and changed layouts so workflows never break.',
    badge: 'Never Breaks',
    type: 'healing',
  },
  {
    id: '04',
    stepNumber: '04',
    title: 'Safe Form Toggling',
    summary: 'Checks switches and filters before clicking to avoid double-toggle mistakes.',
    badge: 'Zero Double Clicks',
    type: 'toggle',
  },
  {
    id: '05',
    stepNumber: '05',
    title: 'Clean Date Folders',
    summary: 'Sorts invoices into clean date folders and automatically skips duplicate files.',
    badge: 'Auto-Organized',
    type: 'download',
  },
];

interface FeatureCapabilitiesProps {
  onActionClick: () => void;
}

export default function FeatureCapabilities({ onActionClick }: FeatureCapabilitiesProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isManual, setIsManual] = useState(false);

  // Auto-cycle through capabilities every 4.2 seconds unless user is clicking
  useEffect(() => {
    if (isManual) return;

    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % CAPABILITIES.length);
    }, 4200);

    return () => clearInterval(timer);
  }, [isManual]);

  const selectCapability = (index: number) => {
    setActiveIdx(index);
    setIsManual(true);
    // Resume auto-cycle after 10s of inactivity
    setTimeout(() => setIsManual(false), 10000);
  };

  const activeCapability = CAPABILITIES[activeIdx];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-20 relative" id="capabilities">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Column: Headline and Interactive Visual Stage */}
        <div className="lg:col-span-5 flex flex-col lg:sticky lg:top-28">
          <ScrollReveal direction="left">
            <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-3 block">
              03 / CORE CAPABILITIES
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.08] mb-4">
              Built for everyday work. <br />
              <span className="text-zinc-500">Nothing broken.</span>
            </h2>

            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6 max-w-md">
              Most automation tools crash when websites change their buttons or popup layouts. FlowMind is built with smart resilience to keep your routines running without maintenance.
            </p>

            {/* Creative Animated Visual Demonstration Box */}
            <div className="w-full rounded-2xl bg-[#09090d]/95 border border-white/15 p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden mb-8 min-h-[175px] flex flex-col justify-between">
              {/* Top Bar inside Demo Box */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs font-mono">
                <span className="text-zinc-400 flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Feature Demo: {activeCapability.title}</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-zinc-300">
                  {activeCapability.badge}
                </span>
              </div>

              {/* Dynamic Micro-Animation per Capability */}
              <div className="my-auto py-2">
                {/* 01: Chrome Demo */}
                {activeCapability.type === 'chrome' && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#050508] border border-white/10 text-xs font-mono text-zinc-300">
                      <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">chrome://inspect (Native Browser Session)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Direct Browser Hook Active
                      </span>
                      <span className="text-[10px] text-zinc-500">0 Extensions Loaded</span>
                    </div>
                  </div>
                )}

                {/* 02: Portal & Popup Demo */}
                {activeCapability.type === 'portal' && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="p-3 rounded-lg bg-[#050508] border border-indigo-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-xs font-bold text-white font-mono">Nested Portal Frame</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono">
                        Iframe Bypassed
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Smoothly captures inside login popups and complex accounting grids.
                    </p>
                  </div>
                )}

                {/* 03: Self-Healing Demo */}
                {activeCapability.type === 'healing' && (
                  <div className="space-y-2.5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-400">Website Redesign Detected</span>
                      <span className="text-emerald-400 font-bold">Healed in 18ms ✓</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/40 flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-300 font-semibold">button[text=&quot;Export&quot;]</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500 text-zinc-950 font-bold text-[10px]">
                        Match: 99.4%
                      </span>
                    </div>
                  </div>
                )}

                {/* 04: Toggle & Click Safety Demo */}
                {activeCapability.type === 'toggle' && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#050508] border border-white/10 text-xs font-mono">
                      <span className="text-zinc-300">Filter: Download Only Unpaid</span>
                      <div className="w-10 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center px-0.5 transition-all">
                        <div className="w-4 h-4 rounded-full bg-emerald-400 shadow-sm translate-x-4 transition-transform" />
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono block">
                      ✓ Pre-verified state (no double clicks)
                    </span>
                  </div>
                )}

                {/* 05: Clean Date Folders Demo */}
                {activeCapability.type === 'download' && (
                  <div className="space-y-2.5 animate-in fade-in duration-300">
                    <div className="p-2.5 rounded-lg bg-[#050508] border border-white/10 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <FolderDown className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-zinc-200">./downloads/2026/01/</span>
                      </div>
                      <span className="text-emerald-400 text-[10px] font-bold">14 Invoices Saved</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono block">
                      Automatically skips duplicate files to keep folders tidy.
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Progress Bar showing 4s cycle */}
              <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mt-2">
                <div
                  key={activeIdx}
                  className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full animate-[countFillShimmer_4.2s_linear_infinite]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onActionClick}
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-white text-zinc-950 font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg group"
            >
              <span>Start Capturing Free</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </ScrollReveal>
        </div>

        {/* Right Column: 5 Simple Interactive Capability Cards */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          {CAPABILITIES.map((cap, index) => {
            const isSelected = activeIdx === index;
            return (
              <ScrollReveal
                key={cap.id}
                direction="right"
                delay={index * 90}
                className="w-full"
              >
                <div
                  onClick={() => selectCapability(index)}
                  className={`p-5 sm:p-6 rounded-2xl border transition-all duration-300 cursor-pointer text-left relative group ${
                    isSelected
                      ? 'bg-[#12121a] border-white/40 shadow-xl shadow-cyan-500/5 -translate-y-0.5'
                      : 'bg-[#09090d]/80 border-white/10 hover:border-white/20 hover:bg-[#0d0d12]'
                  }`}
                >
                  {/* Active Indicator Bar on Left */}
                  {isSelected && (
                    <span className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-cyan-400 to-indigo-500 rounded-r" />
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-xs font-bold text-zinc-500 mt-0.5">
                        {cap.stepNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white tracking-tight">
                            {cap.title}
                          </h3>
                          {isSelected && (
                            <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-white/10 text-cyan-300 text-[10px] font-mono">
                              Live Demo
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-[13px] text-zinc-400 mt-1 leading-relaxed">
                          {cap.summary}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`p-2 rounded-full border transition-all shrink-0 ${
                        isSelected
                          ? 'border-white text-white bg-white/10 scale-105'
                          : 'border-white/10 text-zinc-500 group-hover:text-white'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
