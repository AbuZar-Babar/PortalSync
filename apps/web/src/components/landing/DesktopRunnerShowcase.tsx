'use client';

import React from 'react';
import {
  Download,
  ShieldCheck,
  Monitor,
  Apple,
  HardDrive,
  Lock,
} from 'lucide-react';
import ScrollReveal from '@/components/landing/ScrollReveal';

export default function DesktopRunnerShowcase() {
  return (
    <section id="download" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-20 relative">
      {/* Background Accent Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-80 bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Section Header */}
      <ScrollReveal direction="up" className="text-center max-w-2xl mx-auto mb-14">
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          03 / HYBRID LOCAL RUNNER
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mt-3 mb-4">
          Run locally on your desktop. <span className="text-zinc-500">Keep data 100% private.</span>
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
          ReFlow communicates directly with Google Chrome via standard Chrome DevTools Protocol (CDP port 9222).
          Your passwords, session cookies, and downloaded files never leave your computer.
        </p>
      </ScrollReveal>

      {/* Main Runner Console & Download Cards Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Side: Runner Terminal / Architecture Mockup (7 cols) */}
        <ScrollReveal direction="up" delay={0} className="lg:col-span-7 h-full">
          <div className="h-full rounded-2xl bg-[#09090d]/95 border border-white/10 p-6 sm:p-7 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            {/* Terminal Top Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/80 inline-block" />
                <span className="text-xs font-mono text-zinc-400 ml-2 font-medium">reflow-desktop-daemon &middot; v1.0.0</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>CDP ACTIVE :9222</span>
              </div>
            </div>

            {/* Terminal Body Log Lines */}
            <div className="font-mono text-xs space-y-2.5 text-zinc-400 bg-[#050508] p-4 sm:p-5 rounded-xl border border-white/5 my-auto">
              <div className="flex items-center gap-2 text-zinc-500">
                <span>[10:14:02]</span>
                <span className="text-cyan-400 font-bold">INFO</span>
                <span>Attached to Chrome instance on 127.0.0.1:9222</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500">
                <span>[10:14:03]</span>
                <span className="text-indigo-400 font-bold">PAIR</span>
                <span>Session token verified &middot; Org: Production Cluster</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500">
                <span>[10:14:05]</span>
                <span className="text-amber-400 font-bold">EXEC</span>
                <span>Dispatching recorded workflow: Daily Invoice Pull (24 steps)</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500">
                <span>[10:14:08]</span>
                <span className="text-emerald-400 font-bold">DEDUP</span>
                <span className="text-zinc-300">File verified (SHA-256: 7e2f...a109) &middot; Saved to local disk</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500 pt-1 border-t border-white/5">
                <span>[10:14:09]</span>
                <span className="text-white font-bold">STATUS</span>
                <span className="text-emerald-400">Execution completed in 4.2s (24x speedup vs manual)</span>
              </div>
            </div>

            {/* Privacy Invariants Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-5 mt-5 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-zinc-300">Local Disk Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-zinc-300">Zero Cloud Keylogging</span>
              </div>
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-zinc-300">SHA-256 Deduplication</span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Right Side: Dual OS Download Cards (5 cols) */}
        <ScrollReveal direction="up" delay={120} className="lg:col-span-5 h-full flex flex-col gap-4 justify-between">
          {/* Card 1: Windows Download */}
          <div className="bg-[#09090d]/95 border border-white/10 hover:border-cyan-500/40 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <Monitor className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold uppercase">
                  Windows 10 / 11
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">ReFlow Desktop for Windows</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Native Windows runner with auto-update daemon and background tray minimizer.
              </p>
              <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-zinc-500">
                <span>x64 / ARM64</span>
                <span>&middot;</span>
                <span>.exe Installer</span>
                <span>&middot;</span>
                <span>~93 MB</span>
              </div>
            </div>

            <div className="mt-5">
              <a
                href="/api/v1/runners/download?type=installer&os=windows"
                download="ReFlow-Worker-Setup-1.0.0.exe"
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download for Windows (.exe)</span>
              </a>
            </div>
          </div>

          {/* Card 2: macOS Download */}
          <div className="bg-[#09090d]/95 border border-white/10 hover:border-purple-500/40 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <Apple className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-bold uppercase">
                  macOS Universal
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">ReFlow Desktop for Mac</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Universal binary optimized for Apple Silicon (M1/M2/M3) and Intel Macs with menu bar control.
              </p>
              <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-zinc-500">
                <span>Apple Silicon &amp; Intel</span>
                <span>&middot;</span>
                <span>.dmg Package</span>
                <span>&middot;</span>
                <span>~88 MB</span>
              </div>
            </div>

            <div className="mt-5">
              <a
                href="/api/v1/runners/download?type=installer&os=mac"
                download="ReFlow-Worker-1.0.0.dmg"
                className="w-full py-3 px-4 rounded-xl border border-white/20 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-zinc-300" />
                <span>Download for macOS (.dmg)</span>
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
