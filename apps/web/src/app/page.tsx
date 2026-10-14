'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Layers,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  Download,
} from 'lucide-react';
import ProductLoopShowcase from '@/components/landing/ProductLoopShowcase';
import RunningTicker from '@/components/landing/RunningTicker';
import SocialProofStrip from '@/components/landing/SocialProofStrip';
import DesktopRunnerShowcase from '@/components/landing/DesktopRunnerShowcase';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      } catch {
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

      {/* Top Floating Header Capsule */}
      <div className="fixed top-4 inset-x-0 z-40 max-w-5xl mx-auto px-4 sm:px-6">
        <header className="w-full bg-[#0a0a0d]/90 backdrop-blur-md rounded-full border border-white/10 px-5 sm:px-6 py-2.5 flex items-center justify-between shadow-2xl">
          {/* Typographic Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group focus:outline-none focus:ring-1 focus:ring-white/40 rounded-full"
            aria-label="ReFlow Home"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white group-hover:scale-110 transition-transform" />
            <span className="text-base font-extrabold tracking-tight text-white">ReFlow.</span>
          </Link>

          {/* Minimal Navigation Links */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-6 lg:gap-7 text-xs font-medium text-zinc-400">
            <Link className="hover:text-white transition-colors" href="#demo">
              Demo
            </Link>
            <Link className="hover:text-white transition-colors" href="#pipeline">
              How It Works
            </Link>
            <Link className="hover:text-white transition-colors flex items-center gap-1.5" href="#download">
              <span>Runner</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Win &middot; Mac
              </span>
            </Link>
            <Link className="hover:text-white transition-colors" href="#capabilities">
              Features
            </Link>
            <Link className="hover:text-white transition-colors" href="#pricing">
              Pricing
            </Link>
          </nav>

          {/* Header Action Button & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
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
                  className="text-xs font-medium text-zinc-400 hover:text-white transition px-2 py-1 rounded-md cursor-pointer hidden sm:flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuth('signin')}
                  className="text-xs font-medium text-zinc-400 hover:text-white transition px-3 py-1 cursor-pointer hidden sm:inline-block"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('signup')}
                  className="px-4 sm:px-5 py-2 text-xs font-bold text-zinc-950 bg-white hover:bg-zinc-200 transition-all rounded-full flex items-center gap-1.5 cursor-pointer shadow-sm group"
                >
                  <span>Start Free</span>
                  <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 text-zinc-400 hover:text-white focus:outline-none cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-2 p-5 rounded-3xl bg-[#0a0a0e]/95 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-3 text-sm font-medium text-zinc-300">
              <Link
                href="#demo"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1 px-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                Demo
              </Link>
              <Link
                href="#pipeline"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1 px-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="#download"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1 px-2 hover:bg-white/5 rounded-lg transition-colors flex items-center justify-between"
              >
                <span>Desktop Runner</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Windows &middot; Mac
                </span>
              </Link>
              <Link
                href="#capabilities"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1 px-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1 px-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                Pricing
              </Link>
            </nav>

            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              {currentUser ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-2.5 px-4 text-xs font-bold text-zinc-950 bg-white rounded-xl text-center shadow-sm"
                  >
                    Console ↗
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full py-2 px-4 text-xs font-medium text-zinc-400 hover:text-white text-center cursor-pointer"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openAuth('signin');
                    }}
                    className="py-2.5 px-4 text-xs font-medium text-zinc-300 bg-zinc-900 border border-white/10 rounded-xl text-center cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openAuth('signup');
                    }}
                    className="py-2.5 px-4 text-xs font-bold text-zinc-950 bg-white rounded-xl text-center shadow-sm cursor-pointer"
                  >
                    Start Free
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hero Section */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-32 sm:pt-36 pb-12" id="main-content">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto" id="demo">
          {/* High-Impact Eyebrow Pill */}
          <ScrollReveal direction="up" delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 text-xs font-mono mb-6 shadow-sm backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="tracking-wider uppercase font-bold">AUTONOMOUS BROWSER RPA</span>
            </div>
          </ScrollReveal>

          {/* Display Headline */}
          <ScrollReveal direction="up" delay={80}>
            <h1 className="text-4xl sm:text-6xl lg:text-[4.75rem] font-extrabold tracking-tight text-white leading-[1.08] mb-6">
              Automate your repetitive <br />
              <span className="text-zinc-500">browser routines in 60 seconds.</span>
            </h1>
          </ScrollReveal>

          {/* Subheading */}
          <ScrollReveal direction="up" delay={160}>
            <p className="text-base sm:text-lg text-zinc-300 max-w-2xl leading-relaxed mb-8">
              Teach it once in Google Chrome. ReFlow detects tables, buttons, and popups automatically, replaying your routine 24x faster with zero code and self-healing selectors.
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
                  <span>Launch Operations Console</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuth('signup')}
                  className="px-8 py-3.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg hover:scale-105 cursor-pointer"
                >
                  <span>Start Capturing Free →</span>
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

              <a
                href="#download"
                className="px-6 py-3.5 rounded-full border border-cyan-500/20 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 font-medium text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm group"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Download Runner (Win &middot; Mac)</span>
              </a>
            </div>
          </ScrollReveal>
        </div>

        {/* Continuous Running Marquee Ribbon */}
        <RunningTicker />

        {/* Live Looping Mockup Showcase */}
        <ScrollReveal direction="up" delay={100}>
          <ProductLoopShowcase />
        </ScrollReveal>
      </main>

      {/* Social Proof & Practitioner Testimonials Strip */}
      <SocialProofStrip />

      {/* Upgraded Benefits Strip */}
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
                  24x Speed
                </span>
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1">
                  Machine Velocity
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Replays your recorded actions at machine speed without human hesitation or delay.
                </p>
              </div>
            </ScrollReveal>

            {/* Metric 2 */}
            <ScrollReveal direction="up" delay={90}>
              <div className="flex flex-col">
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono mb-1">
                  Zero Code
                </span>
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1">
                  Visual Capture
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  No Python, Selenium, or extensions required. Just click through your routine once.
                </p>
              </div>
            </ScrollReveal>

            {/* Metric 3 */}
            <ScrollReveal direction="up" delay={180}>
              <div className="flex flex-col">
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono mb-1">
                  Self-Healing
                </span>
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1">
                  Never Breaks
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Autonomous selector fallback tree adapts automatically when target websites update layouts.
                </p>
              </div>
            </ScrollReveal>

            {/* Metric 4 */}
            <ScrollReveal direction="up" delay={270}>
              <div className="flex flex-col">
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono mb-1">
                  100% Local
                </span>
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1">
                  Private &amp; Secure
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Runs directly on your computer over Chrome CDP. Passwords and downloads never leak to clouds.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 02 / How ReFlow Works (Node Pipeline & Step Inspector) */}
      <WorkflowNodePipeline />

      {/* 03 / Dedicated Local Desktop Runner Showcase with Windows & Mac Downloads */}
      <DesktopRunnerShowcase />

      {/* 04 / Core Capabilities */}
      <FeatureCapabilities onActionClick={() => openAuth('signup')} />

      {/* 05 / Subscription Pricing & Interactive FAQ */}
      <PricingSection onSelectTier={(tier) => openAuth('signup', tier)} />

      {/* Bottom CTA Card */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16">
        <ScrollReveal direction="up" distance={36}>
          <div className="rounded-3xl bg-[#0a0a0e] border border-white/10 p-8 sm:p-14 text-center relative overflow-hidden">
            {/* Subtle Glow Behind CTA */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-2xl mx-auto relative z-10">
              <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-3 inline-block">
                06 / GET STARTED
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
                Ready to eliminate your daily browser chores?
              </h2>
              <p className="text-zinc-300 text-xs sm:text-sm mb-8 max-w-lg mx-auto leading-relaxed">
                Join operations teams automating daily portal downloads, form fills, and reports in 60 seconds.
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
                  <span>Get Started in 60 Seconds →</span>
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

      {/* Comprehensive Architectural Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-12 border-t border-white/10 text-xs text-zinc-400">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
              <span className="text-base font-extrabold text-white tracking-tight">ReFlow.</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Autonomous browser automation and RPA platform with zero-code capture, self-healing selectors, and local execution.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>All systems operational</span>
            </div>
          </div>

          {/* Col 2: Product Anchors */}
          <div className="space-y-2.5 font-mono text-xs">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block mb-2">Product</span>
            <div><Link href="#demo" className="hover:text-white transition-colors">Interactive Demo</Link></div>
            <div><Link href="#pipeline" className="hover:text-white transition-colors">How It Works</Link></div>
            <div><Link href="#download" className="hover:text-white transition-colors">Desktop Runner (Win / Mac)</Link></div>
            <div><Link href="#capabilities" className="hover:text-white transition-colors">Core Features</Link></div>
            <div><Link href="#pricing" className="hover:text-white transition-colors">Subscription Pricing</Link></div>
          </div>

          {/* Col 3: Trust & Legal */}
          <div className="space-y-2.5 font-mono text-xs">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block mb-2">Legal &amp; Trust</span>
            <div><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></div>
            <div><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></div>
            <div><a href="mailto:privacy@reflow.app" className="hover:text-white transition-colors">Data Security Inquiry</a></div>
            <div><a href="mailto:enterprise@reflow.app" className="hover:text-white transition-colors">Enterprise SLA</a></div>
          </div>

          {/* Col 4: Platform Console & Contact */}
          <div className="space-y-2.5 font-mono text-xs">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block mb-2">Connect</span>
            <div><a href="mailto:hello@reflow.app" className="hover:text-white transition-colors">hello@reflow.app</a></div>
            <div>
              {currentUser ? (
                <Link href="/dashboard" className="text-cyan-400 font-bold hover:underline">
                  Launch Console ↗
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuth('signin')}
                  className="text-white hover:underline cursor-pointer"
                >
                  Sign In to Console ↗
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-zinc-500">
          <span>&copy; 2026 ReFlow Inc. All rights reserved.</span>
          <span>Chrome DevTools Protocol (CDP) Local Engine</span>
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
