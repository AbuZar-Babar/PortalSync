'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Layers,
  FileCheck2,
  CopyX,
  Play,
  RotateCcw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeStage, setActiveStage] = useState<0 | 1 | 2>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewMode, setViewMode] = useState<'interactive' | 'video'>('interactive');

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setIsAuthenticated(true);
        }
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (viewMode !== 'interactive' || isPaused) return;

    const timer = setInterval(() => {
      setActiveStage((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
    }, 4500);

    return () => clearInterval(timer);
  }, [viewMode, isPaused]);

  const primaryHref = isAuthenticated ? '/dashboard' : '/login';
  const signupHref = isAuthenticated ? '/dashboard' : '/login?tab=signup';

  return (
    <div className="min-h-screen bg-[#090A0F] text-zinc-100 selection:bg-cyan-500/20 selection:text-cyan-200 antialiased relative">
      {/* Subtle top spotlight gradient */}
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.12),transparent)] -z-10"
        aria-hidden="true"
      />

      {/* Section A — Sticky Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#090A0F]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-zinc-100 tracking-tight">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono text-xs">
              RF
            </div>
            <span>ReFlow</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#how-it-works" className="hover:text-zinc-100 transition-colors">
              How It Works
            </a>
            <a href="#comparison" className="hover:text-zinc-100 transition-colors">
              Why ReFlow
            </a>
            <a href="#pricing" className="hover:text-zinc-100 transition-colors">
              Pricing
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-zinc-400 hover:text-zinc-100 px-3 py-2 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href={signupHref}
                  className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  Start Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Section B — Hero Header */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        {/* Top Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/[0.08] text-xs text-zinc-300 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Local Chrome CDP + Cloud Control Plane</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-zinc-100 leading-[1.1] mb-6">
          Automate any web portal.
          <br />
          <span className="text-zinc-400">Just demonstrate it once.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          Record your clicks in your own local Chrome browser. ReFlow turns a single demonstration into a
          resilient workflow that handles logins, 2FA prompts, table pagination, and invoice downloads
          automatically.
        </p>

        {/* CTA Row */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={signupHref}
            className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>{isAuthenticated ? 'Go to Dashboard' : 'Start Automating Free'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'interactive' ? 'video' : 'interactive')}
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/[0.1] font-medium text-sm px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            {viewMode === 'interactive' ? (
              <>
                <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                <span>Watch 30s Video Demo</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Back to Interactive Walkthrough</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Section C — Interactive 3-Stage Product Showcase */}
      <section
        className="max-w-5xl mx-auto px-6 pb-24"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="rounded-2xl border border-white/[0.1] bg-zinc-950/90 shadow-2xl overflow-hidden">
          {/* Top Browser Bar */}
          <div className="px-4 py-3 border-b border-white/[0.08] bg-zinc-900/70 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
              <div className="px-3 py-1 rounded-md bg-zinc-950 border border-white/[0.06] font-mono text-xs text-zinc-400 truncate">
                {activeStage === 0 && 'chrome://cdp:9222 • portal.vendor-billing.com/invoices'}
                {activeStage === 1 && 'reflow://runner • LoopDetector (24 rows) + 2FA Guard'}
                {activeStage === 2 && 'reflow://vault • SHA-256 Deduplicated Storage'}
              </div>
            </div>

            {/* Segmented View Mode Toggle */}
            <div className="flex items-center rounded-lg bg-zinc-950 p-0.5 border border-white/[0.08] text-xs shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('interactive')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'interactive'
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Interactive
              </button>
              <button
                type="button"
                onClick={() => setViewMode('video')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'video'
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Video
              </button>
            </div>
          </div>

          {/* 3 Clickable Stage Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-white/[0.08] bg-zinc-900/30">
            <button
              type="button"
              onClick={() => {
                setActiveStage(0);
                setIsPaused(true);
              }}
              className={`p-4 text-left transition-colors cursor-pointer border-b-2 sm:border-b-2 ${
                activeStage === 0
                  ? 'bg-zinc-900/90 text-zinc-100 border-cyan-400'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border-transparent'
              }`}
            >
              <div className="text-xs font-semibold tracking-wide uppercase text-cyan-400 font-mono mb-1">
                1. Demonstrate Once
              </div>
              <div className="text-xs text-zinc-300">Click 1 row in local Chrome</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveStage(1);
                setIsPaused(true);
              }}
              className={`p-4 text-left transition-colors cursor-pointer border-b-2 sm:border-b-2 ${
                activeStage === 1
                  ? 'bg-zinc-900/90 text-zinc-100 border-cyan-400'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border-transparent'
              }`}
            >
              <div className="text-xs font-semibold tracking-wide uppercase text-cyan-400 font-mono mb-1">
                2. Generalize &amp; Handle 2FA
              </div>
              <div className="text-xs text-zinc-300">Auto-loop rows + 90s OTP handoff</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveStage(2);
                setIsPaused(true);
              }}
              className={`p-4 text-left transition-colors cursor-pointer border-b-2 sm:border-b-2 ${
                activeStage === 2
                  ? 'bg-zinc-900/90 text-zinc-100 border-cyan-400'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border-transparent'
              }`}
            >
              <div className="text-xs font-semibold tracking-wide uppercase text-cyan-400 font-mono mb-1">
                3. Deduplicate &amp; Vault
              </div>
              <div className="text-xs text-zinc-300">SHA-256 hash check before saving</div>
            </button>
          </div>

          {/* Stage Viewport */}
          <div className="p-6 sm:p-8 min-h-[340px] flex flex-col justify-between">
            {viewMode === 'video' ? (
              <div className="flex items-center justify-center">
                <video
                  src="/videos/landing-demo.mp4"
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full rounded-lg border border-white/[0.08] bg-black max-h-[420px]"
                />
              </div>
            ) : (
              <>
                {/* Stage 0: Demonstrate Once */}
                {activeStage === 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
                    {/* Simulated Table */}
                    <div className="lg:col-span-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 p-4 overflow-hidden">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] text-xs text-zinc-400">
                        <span className="font-semibold text-zinc-200">Vendor Billing Portal</span>
                        <span className="font-mono text-[11px] text-zinc-500">Live CDP Stream</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        {/* Row 1 - Highlighted */}
                        <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-medium text-cyan-300">INV-2026-104</span>
                            <span className="text-zinc-400">$1,420.00</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Paid
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-400 text-zinc-950">
                              Captured Click #1
                            </span>
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded text-xs font-medium ring-2 ring-cyan-400 bg-cyan-500/20 text-cyan-300"
                            >
                              Download PDF
                            </button>
                          </div>
                        </div>

                        {/* Row 2 */}
                        <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-white/[0.04] flex items-center justify-between gap-3 text-zinc-400">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-zinc-300">INV-2026-103</span>
                            <span>$890.50</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Paid
                            </span>
                          </div>
                          <button
                            type="button"
                            className="px-2.5 py-1 rounded text-xs text-zinc-400 bg-zinc-800 border border-white/[0.06]"
                          >
                            Download PDF
                          </button>
                        </div>

                        {/* Row 3 */}
                        <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-white/[0.04] flex items-center justify-between gap-3 text-zinc-400">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-zinc-300">INV-2026-102</span>
                            <span>$3,110.00</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Paid
                            </span>
                          </div>
                          <button
                            type="button"
                            className="px-2.5 py-1 rounded text-xs text-zinc-400 bg-zinc-800 border border-white/[0.06]"
                          >
                            Download PDF
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Inspector / Code Card */}
                    <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-zinc-950 p-4 font-mono text-xs">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08] text-zinc-400">
                        <span className="text-zinc-200 font-semibold font-sans">Multi-Attribute Fingerprint</span>
                        <span className="text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                          CDP Event
                        </span>
                      </div>
                      <div className="space-y-2 text-zinc-300">
                        <div>
                          <span className="text-zinc-500">tag: </span>
                          <span className="text-cyan-300">&quot;button&quot;</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">text: </span>
                          <span className="text-zinc-200">&quot;Download PDF&quot;</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">rowRelativeSelector: </span>
                          <br />
                          <span className="text-amber-300 text-[11px]">
                            &quot;tr &gt;&gt; td:nth-child(4) button&quot;
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500">dynamicIdsStripped: </span>
                          <span className="text-emerald-400">true (React/ExtJS safe)</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-zinc-500 font-sans">
                        Identifies matching targets across tables without brittle XPaths.
                      </div>
                    </div>
                  </div>
                )}

                {/* Stage 1: Generalize & Handle 2FA */}
                {activeStage === 1 && (
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
                    {/* Visual Loop Pipeline */}
                    <div className="lg:col-span-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 p-5 space-y-4">
                      <div className="flex items-center justify-between text-xs pb-3 border-b border-white/[0.06]">
                        <span className="font-semibold text-zinc-200">Execution Pipeline</span>
                        <span className="font-mono text-cyan-400">14 / 24 rows processed</span>
                      </div>

                      {/* Setup Steps */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                          Setup Steps
                        </span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2.5 py-1 rounded bg-zinc-800 border border-white/[0.08] text-zinc-300">
                            1. Login
                          </span>
                          <span className="text-zinc-600">→</span>
                          <span className="px-2.5 py-1 rounded bg-zinc-800 border border-white/[0.08] text-zinc-300">
                            2. Navigate Invoices
                          </span>
                        </div>
                      </div>

                      {/* Loop Steps */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-zinc-500 uppercase tracking-wider">
                            Loop Steps (Row 1 generalized → 24 rows)
                          </span>
                          <span className="text-zinc-400">58% Complete</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 w-[58%]" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        <span>Streaming table items sequentially via CDP cursor</span>
                      </div>
                    </div>

                    {/* 90-Second Human-in-the-Loop 2FA Banner */}
                    <div className="lg:col-span-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold text-amber-300">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>MFA Challenge Detected</span>
                        </div>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 font-semibold">
                          84s remaining
                        </span>
                      </div>
                      <p className="text-zinc-300 leading-relaxed text-[11px]">
                        Execution paused safely. Enter the SMS code in your local Chrome window—ReFlow resumes
                        automatically once authenticated.
                      </p>
                      <div className="pt-2 border-t border-amber-500/20 flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                        <Check className="w-3.5 h-3.5" />
                        <span>✓ Session Cookie Verified — Resuming Loop</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stage 2: Deduplicate & Vault */}
                {activeStage === 2 && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/50 p-4">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] text-xs">
                        <span className="font-semibold text-zinc-200">Collected Invoice Artifacts</span>
                        <span className="font-mono text-[11px] text-zinc-400">SHA-256 In-Memory Verification</span>
                      </div>
                      <div className="space-y-2.5 text-xs font-mono">
                        {/* Artifact 1 */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-zinc-950/80 border border-white/[0.06] gap-2">
                          <div className="flex items-center gap-3">
                            <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-zinc-200 font-sans font-medium">INV-2026-104.pdf</span>
                            <span className="text-zinc-500 text-[11px]">sha256: 8f4a...9c12</span>
                          </div>
                          <span className="self-start sm:self-auto text-[10px] font-sans px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Saved to Vault
                          </span>
                        </div>

                        {/* Artifact 2 */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-zinc-950/80 border border-white/[0.06] gap-2">
                          <div className="flex items-center gap-3">
                            <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-zinc-200 font-sans font-medium">INV-2026-103.pdf</span>
                            <span className="text-zinc-500 text-[11px]">sha256: 3b91...44e0</span>
                          </div>
                          <span className="self-start sm:self-auto text-[10px] font-sans px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Saved to Vault
                          </span>
                        </div>

                        {/* Artifact 3 - Duplicate */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-zinc-950/80 border border-white/[0.06] gap-2 opacity-85">
                          <div className="flex items-center gap-3">
                            <CopyX className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-zinc-300 font-sans font-medium">INV-2026-102.pdf</span>
                            <span className="text-zinc-500 text-[11px]">sha256: 7c19...02a8</span>
                          </div>
                          <span className="self-start sm:self-auto text-[10px] font-sans px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Skipped Duplicate
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Summary Bar */}
                    <div className="rounded-lg bg-zinc-950 border border-white/[0.06] p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-400">
                      <span>Local Folder: ~/Downloads/ReFlow</span>
                      <span>Cloud Vault: AES-256-GCM Synced</span>
                      <span className="text-emerald-400 font-sans font-medium">0 Duplicate Writes</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Section D — Why Enterprise Portals Break Cloud Bots vs ReFlow */}
      <section id="comparison" className="max-w-6xl mx-auto px-6 py-20 border-t border-white/[0.06]">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-zinc-100 mb-3">
            Why enterprise portals break cloud bots
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Vendor billing and utility portals actively block datacenter browsers. ReFlow runs where you
            already have access.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          {/* Left Card: Traditional Cloud Headless Bots */}
          <div className="bg-zinc-900/50 border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-6 sm:p-8 transition-colors">
            <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-white/[0.08]">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <h3 className="font-semibold text-zinc-200 text-lg">Traditional Cloud Headless Bots</h3>
            </div>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li className="flex items-start gap-3">
                <span className="text-rose-400 font-bold shrink-0">✕</span>
                <span>Datacenter IPs blocked by Cloudflare, DataDome &amp; PerimeterX</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-rose-400 font-bold shrink-0">✕</span>
                <span>Runs crash immediately when SMS 2FA or CAPTCHA appears</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-rose-400 font-bold shrink-0">✕</span>
                <span>Single-attribute XPaths break whenever React/Angular re-renders</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-rose-400 font-bold shrink-0">✕</span>
                <span>Re-downloads the same invoices on every scheduled run</span>
              </li>
            </ul>
          </div>

          {/* Right Card: ReFlow Hybrid Local + Cloud */}
          <div className="bg-zinc-900/50 border border-cyan-500/30 hover:border-cyan-500/50 rounded-xl p-6 sm:p-8 transition-colors shadow-lg shadow-cyan-950/20">
            <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-white/[0.08]">
              <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
              <h3 className="font-semibold text-zinc-100 text-lg">ReFlow Hybrid Local + Cloud</h3>
            </div>
            <ul className="space-y-4 text-sm text-zinc-200">
              <li className="flex items-start gap-3">
                <span className="text-cyan-400 font-bold shrink-0">✓</span>
                <span>Genuine local Chrome on your residential IP &amp; persistent profile</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-cyan-400 font-bold shrink-0">✓</span>
                <span>90-second Human-in-the-Loop pause &amp; auto-resume for 2FA</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-cyan-400 font-bold shrink-0">✓</span>
                <span>Multi-attribute element fingerprinting + automatic row loop detection</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-cyan-400 font-bold shrink-0">✓</span>
                <span>In-memory SHA-256 hashing skips duplicate files before disk write</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section E — How It Works in 3 Steps */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20 border-t border-white/[0.06]">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-zinc-100 mb-3">
            From demonstration to scheduled automation in 3 steps
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            No complex setup scripts or brittle browser plugins. ReFlow connects over native Chrome DevTools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {/* Step 01 */}
          <div className="bg-zinc-900/50 border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-6 transition-colors">
            <div className="font-mono text-xs text-cyan-400 font-semibold mb-3">STEP 01</div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Pair Desktop Worker</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Launch the lightweight system tray worker and pair it with a hashed rf_live_ token. It attaches to
              your local Chrome over CDP port 9222.
            </p>
          </div>

          {/* Step 02 */}
          <div className="bg-zinc-900/50 border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-6 transition-colors">
            <div className="font-mono text-xs text-cyan-400 font-semibold mb-3">STEP 02</div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Record One Example</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Click through login and download a single row&apos;s invoice. LoopDetector splits setup steps from
              repeating table actions automatically.
            </p>
          </div>

          {/* Step 03 */}
          <div className="bg-zinc-900/50 border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-6 transition-colors">
            <div className="font-mono text-xs text-cyan-400 font-semibold mb-3">STEP 03</div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Run &amp; Collect Artifacts</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Trigger runs from the cloud dashboard, apply date or status filters, and collect deduplicated PDFs
              and CSVs locally and in the cloud vault.
            </p>
          </div>
        </div>
      </section>

      {/* Section F — Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20 border-t border-white/[0.06]">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-zinc-100 mb-3">
            Simple, predictable pricing
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Start free on your local machine and scale to automated multi-portal routines with team collaboration.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Tier 1: Starter */}
          <div className="bg-zinc-900/50 border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-6 flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-zinc-100">Starter</h3>
                <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                  Solo Operators
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                For individuals automating daily report exports, portal downloads, and web form fills.
              </p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zinc-100 font-mono tracking-tight">$0</span>
                <span className="text-xs text-zinc-500 font-medium">/ month</span>
              </div>
              <div className="w-full h-px bg-white/[0.08] mb-6" />
              <ul className="space-y-3 text-xs text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span>25,000 automated steps / month</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span>Up to 10 saved workflows</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span>5 GB deduplicated file storage</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span>SHA-256 duplicate file prevention</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span>Standard email onboarding</span>
                </li>
              </ul>
            </div>
            <div className="mt-8 pt-4">
              <Link
                href={signupHref}
                className="w-full py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/[0.1] font-medium text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>Select Starter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Tier 2: Pro (Highlighted) */}
          <div className="bg-zinc-900/70 border border-cyan-500/40 rounded-xl p-6 flex flex-col justify-between shadow-xl relative">
            <div className="absolute -top-3 left-6 px-2.5 py-0.5 rounded-full bg-cyan-400 text-zinc-950 text-[10px] font-mono font-bold uppercase tracking-wider">
              RECOMMENDED
            </div>
            <div>
              <div className="flex items-center justify-between mb-3 mt-1">
                <h3 className="text-lg font-semibold text-zinc-100">Pro</h3>
                <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                  Growing Teams
                </span>
              </div>
              <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
                For teams requiring multi-iframe ERP traversal, selector self-healing, and recurring unattended
                execution.
              </p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zinc-100 font-mono tracking-tight">$49</span>
                <span className="text-xs text-zinc-400 font-medium">/ month</span>
              </div>
              <div className="w-full h-px bg-white/[0.08] mb-6" />
              <ul className="space-y-3 text-xs text-zinc-200">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>150,000 automated steps</strong> / month</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Unlimited saved workflows</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>25 GB deduplicated file storage</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Self-healing selector fallback trees</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Nested ERP iframe &amp; shadowDOM traversal</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Priority email &amp; direct chat onboarding</span>
                </li>
              </ul>
            </div>
            <div className="mt-8 pt-4">
              <Link
                href={signupHref}
                className="w-full py-2.5 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>Get Started with Pro</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Tier 3: Enterprise */}
          <div className="bg-zinc-900/50 border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-6 flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-zinc-100">Enterprise</h3>
                <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                  High Volume
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                For large-scale operations with dedicated headless runners, custom SLA requirements, and
                multi-tenant portals.
              </p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zinc-100 font-mono tracking-tight">$199</span>
                <span className="text-xs text-zinc-500 font-medium">/ month</span>
              </div>
              <div className="w-full h-px bg-white/[0.08] mb-6" />
              <ul className="space-y-3 text-xs text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span><strong>500,000+ automated steps</strong> / month</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span>Concurrent runner workers</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span>100 GB dedicated storage or direct cloud sync</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span>Custom workflow recipe validation by our team</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span>Direct engineer support channel</span>
                </li>
              </ul>
            </div>
            <div className="mt-8 pt-4">
              <Link
                href={signupHref}
                className="w-full py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/[0.1] font-medium text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>Contact Enterprise</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section G — Minimal Footer */}
      <footer className="border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <span>&copy; 2026 ReFlow. Hybrid Browser Automation.</span>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="hover:text-zinc-300 transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="hover:text-zinc-300 transition-colors">
              Pricing
            </a>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">
              Sign In
            </Link>
            <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
