'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Layers,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import ProductLoopShowcase from '@/components/landing/ProductLoopShowcase';
import RunningTicker from '@/components/landing/RunningTicker';
import WorkflowNodePipeline from '@/components/landing/WorkflowNodePipeline';
import FeatureCapabilities from '@/components/landing/FeatureCapabilities';
import PricingSection from '@/components/landing/PricingSection';
import ScrollReveal from '@/components/landing/ScrollReveal';
import { AuthCard, PlanTier } from '@/components/auth/AuthCard';
import { createClient } from '@/lib/supabase/client';

export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');
  const [selectedTier, setSelectedTier] = useState<PlanTier>('starter');
  const [currentUser, setCurrentUser] = useState<{ email?: string; id?: string } | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser({ email: user.email, id: user.id });
        }
      } catch (err) {
        // silent
      }
    }
    loadUser();
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setCurrentUser(null);
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out error:', err);
      window.location.href = '/';
    }
  };

  const openAuth = (tab: 'signin' | 'signup', tier: PlanTier = 'starter') => {
    setAuthModalTab(tab);
    setSelectedTier(tier);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white selection:bg-white selection:text-black relative overflow-x-hidden">
      {/* Background Radial Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[640px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.2),rgba(255,255,255,0))] pointer-events-none -z-10" />
      <div className="absolute top-[400px] left-1/2 -translate-x-1/2 w-3/4 h-[400px] bg-[radial-gradient(circle,rgba(0,240,255,0.08)_0%,transparent_70%)] pointer-events-none -z-10 blur-3xl" />

      {/* Top Floating Header Capsule (Ref: BZ DesignX Image 1) */}
      <div className="fixed top-4 inset-x-0 z-40 max-w-5xl mx-auto px-4 sm:px-6">
        <header className="w-full bg-[#0a0a0d]/85 backdrop-blur-md rounded-full border border-white/10 px-5 sm:px-6 py-2.5 flex items-center justify-between shadow-2xl">
          {/* Typographic Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group focus:outline-none focus:ring-1 focus:ring-white/40 rounded-full"
            aria-label="FlowMind Home"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white group-hover:scale-110 transition-transform" />
            <span className="text-base font-extrabold tracking-tight text-white">FlowMind.</span>
          </Link>

          {/* Minimal Navigation Links */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-7 text-xs font-medium text-zinc-400">
            <Link className="hover:text-white transition-colors" href="#demo">
              Demo
            </Link>
            <Link className="hover:text-white transition-colors" href="#pipeline">
              How It Works
            </Link>
            <Link className="hover:text-white transition-colors" href="#capabilities">
              Features
            </Link>
            <Link className="hover:text-white transition-colors" href="#pricing">
              Pricing
            </Link>
          </nav>

          {/* Header Action Button: High-Contrast Stark White Pill */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-4 py-1.5 text-xs font-bold text-zinc-950 bg-white hover:bg-zinc-200 transition-all rounded-full flex items-center gap-1.5 shadow-sm"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Console ↗</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-xs font-medium text-zinc-400 hover:text-white transition px-2 py-1 rounded-md cursor-pointer flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuth('signin')}
                  className="text-xs font-medium text-zinc-400 hover:text-white transition px-3 py-1 cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('signup')}
                  className="px-5 py-2 text-xs font-bold text-zinc-950 bg-white hover:bg-zinc-200 transition-all rounded-full flex items-center gap-1.5 cursor-pointer shadow-sm group"
                >
                  <span>Start Free</span>
                  <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </>
            )}
          </div>
        </header>
      </div>

      {/* Hero Section */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-32 sm:pt-36 pb-12" id="demo">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          {/* Subtle Eyebrow Pill */}
          <ScrollReveal direction="up" delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-zinc-900/80 text-zinc-300 text-xs font-mono mb-6 shadow-sm backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="tracking-wider uppercase">SIMPLE BROWSER AUTOMATION</span>
            </div>
          </ScrollReveal>

          {/* Massive Display Headline */}
          <ScrollReveal direction="up" delay={80}>
            <h1 className="text-4xl sm:text-6xl lg:text-[4.75rem] font-extrabold tracking-tight text-white leading-[1.08] mb-6">
              Teach it once. <br />
              <span className="text-zinc-500">Let it do your daily browser tasks.</span>
            </h1>
          </ScrollReveal>

          {/* User-Friendly Subheading */}
          <ScrollReveal direction="up" delay={160}>
            <p className="text-base sm:text-lg text-zinc-300 max-w-2xl leading-relaxed mb-8">
              Record what you do in Google Chrome once. FlowMind remembers your clicks and repeats your task in seconds with zero manual effort.
            </p>
          </ScrollReveal>

          {/* Primary CTA Row */}
          <ScrollReveal direction="up" delay={240}>
            <div className="flex flex-wrap items-center justify-center gap-3.5 mb-8">
              {currentUser ? (
                <Link
                  href="/dashboard"
                  className="px-8 py-3.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg hover:scale-105"
                >
                  <span>Launch Console</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuth('signup')}
                  className="px-8 py-3.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg hover:scale-105 cursor-pointer"
                >
                  <span>Start Capturing Free</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              )}

              <a
                href="#pipeline"
                className="px-6 py-3.5 rounded-full border border-white/15 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 font-medium text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm group"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>See How It Works ↓</span>
              </a>
            </div>
          </ScrollReveal>

        </div>

        {/* Continuous Running Marquee Ribbon (Ref: BZ DesignX) */}
        <RunningTicker />

        {/* Live Looping Mockup Showcase */}
        <ScrollReveal direction="up" delay={100}>
          <ProductLoopShowcase />
        </ScrollReveal>
      </main>

      {/* Benefits Strip (Simple, Clean, Zero Jargon) */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10">
        <div className="border-t border-b border-white/10 py-10">
          <ScrollReveal direction="up" className="mb-4">
            <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
              01 / KEY ADVANTAGES
            </span>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Metric 1 */}
            <ScrollReveal direction="up" delay={0}>
              <div className="flex flex-col">
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono mb-1">
                  Instant
                </span>
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1">
                  Fast Replay
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Repeats your clicks and downloads in seconds without hesitation.
                </p>
              </div>
            </ScrollReveal>

            {/* Metric 2 */}
            <ScrollReveal direction="up" delay={90}>
              <div className="flex flex-col">
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono mb-1">
                  0 Setup
                </span>
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1">
                  Works in Chrome
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Runs directly in your browser with zero extensions or plugins needed.
                </p>
              </div>
            </ScrollReveal>

            {/* Metric 3 */}
            <ScrollReveal direction="up" delay={180}>
              <div className="flex flex-col">
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono mb-1">
                  Auto-Fix
                </span>
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1">
                  Always Reliable
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Keeps working smoothly even if the website updates its buttons.
                </p>
              </div>
            </ScrollReveal>

            {/* Metric 4 */}
            <ScrollReveal direction="up" delay={270}>
              <div className="flex flex-col">
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono mb-1">
                  100%
                </span>
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1">
                  Private &amp; Secure
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Runs safely on your own computer without sharing your logins.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 02 / How FlowMind Works (n8n-style Node Pipeline & Step Inspector) */}
      <WorkflowNodePipeline />

      {/* 03 / Core Capabilities */}
      <FeatureCapabilities onActionClick={() => openAuth('signup')} />

      {/* 04 / Subscription Pricing & Technical FAQ */}
      <PricingSection onSelectTier={(tier) => openAuth('signup', tier)} />

      {/* Bottom CTA Card */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16">
        <ScrollReveal direction="up" distance={36}>
          <div className="rounded-3xl bg-[#0a0a0e] border border-white/10 p-8 sm:p-14 text-center relative overflow-hidden">
            {/* Subtle Glow Behind CTA */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-2xl mx-auto relative z-10">
              <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-3 inline-block">
                05 / GET STARTED
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
                Ready to automate your browser routines?
              </h2>
              <p className="text-zinc-300 text-xs sm:text-sm mb-8 max-w-lg mx-auto leading-relaxed">
                Launch the FlowMind operations console and create your first automated routine in minutes.
              </p>

              {currentUser ? (
                <Link
                  href="/dashboard"
                  className="px-8 py-3.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 group shadow-lg"
                >
                  <span>Launch Operations Console</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuth('signup')}
                  className="px-8 py-3.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 group shadow-lg cursor-pointer"
                >
                  <span>Start Capturing Free</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              )}

              <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-xs font-mono text-zinc-400">
                <span>✓ 100% Local Run Execution</span>
                <span>✓ Zero Extension Sandbox</span>
                <span>✓ Autonomous DOM Healing</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Minimal Architectural Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-10 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-white" />
          <span className="font-extrabold text-white">FlowMind.</span>
          <span>&copy; 2026. All rights reserved.</span>
        </div>

        <div className="flex flex-wrap items-center gap-6 font-mono text-xs">
          <Link href="#demo" className="hover:text-white transition-colors">
            Demo
          </Link>
          <Link href="#pipeline" className="hover:text-white transition-colors">
            How It Works
          </Link>
          <Link href="#capabilities" className="hover:text-white transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </Link>
          {currentUser ? (
            <Link href="/dashboard" className="text-white font-bold hover:underline">
              Console ↗
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuth('signin')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => openAuth('signup')}
                className="text-white font-bold hover:underline cursor-pointer"
              >
                Start Free ↗
              </button>
            </>
          )}
        </div>
      </footer>

      {/* Auth Modal Overlay */}
      {isAuthModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAuthModalOpen(false);
          }}
        >
          <div className="w-full max-w-md relative my-auto">
            <AuthCard
              key={`${authModalTab}-${selectedTier}`}
              defaultTab={authModalTab}
              selectedPlan={selectedTier}
              isModal={true}
              onClose={() => setIsAuthModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
