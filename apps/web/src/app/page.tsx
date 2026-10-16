'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Layers,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react';
import ProductLoopShowcase from '@/components/landing/ProductLoopShowcase';
import RunningTicker from '@/components/landing/RunningTicker';
import SocialProofStrip from '@/components/landing/SocialProofStrip';
import DesktopRunnerShowcase from '@/components/landing/DesktopRunnerShowcase';
import WorkflowNodePipeline from '@/components/landing/WorkflowNodePipeline';
import FeatureCapabilities from '@/components/landing/FeatureCapabilities';
import PricingSection from '@/components/landing/PricingSection';
import ScrollReveal from '@/components/landing/ScrollReveal';
import { RobotMascot } from '@/components/landing/RobotMascot';
import { AuthCard, PlanTier } from '@/components/auth/AuthCard';
import { createClient } from '@/lib/supabase/client';

const bgColors = ['#07080a', '#101218', '#151821', '#090b10'] as const;

export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');
  const [selectedTier, setSelectedTier] = useState<PlanTier>('starter');
  const [currentUser, setCurrentUser] = useState<{ email?: string; id?: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrollSection, setScrollSection] = useState<0 | 1 | 2 | 3>(0);

  // Desktop Smooth Custom Cursor Refs (zero React re-renders on mousemove)
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const isHovering = useRef(false);

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

  // Subtle Scroll-Based Background Color Transition Listener
  useEffect(() => {
    const handleScroll = () => {
      const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = window.scrollY / scrollMax;
      if (progress < 0.22) {
        setScrollSection(0);
      } else if (progress < 0.50) {
        setScrollSection(1);
      } else if (progress < 0.78) {
        setScrollSection(2);
      } else {
        setScrollSection(3);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth Custom Cursor Loop (Desktop Only)
  useEffect(() => {
    let animationFrameId: number;

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      const target = e.target as HTMLElement | null;
      const isInteractive = !!target?.closest('a, button, [role="button"], input, summary, [tabindex="0"]');
      if (isInteractive !== isHovering.current) {
        isHovering.current = isInteractive;
        if (ringRef.current) {
          ringRef.current.setAttribute('data-hover', isInteractive ? 'true' : 'false');
        }
      }
    };

    const renderCursor = () => {
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.18;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.18;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }
      animationFrameId = requestAnimationFrame(renderCursor);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    animationFrameId = requestAnimationFrame(renderCursor);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
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
    <div
      style={{ backgroundColor: bgColors[scrollSection] }}
      className="min-h-screen flex flex-col text-[#f3f4f6] selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden relative transition-colors duration-700 ease-out"
    >
      {/* Desktop Smooth Custom Cursor Follower */}
      <div className="hidden lg:block pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
        <div
          ref={dotRef}
          className="w-2 h-2 -ml-1 -mt-1 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-transform duration-75 absolute top-0 left-0"
        />
        <div
          ref={ringRef}
          data-hover="false"
          className="w-8 h-8 -ml-4 -mt-4 rounded-full border border-indigo-400/40 bg-indigo-500/[0.04] transition-[width,height,margin,border-color,background-color] duration-200 data-[hover=true]:w-12 data-[hover=true]:h-12 data-[hover=true]:-ml-6 data-[hover=true]:-mt-6 data-[hover=true]:border-cyan-400/60 data-[hover=true]:bg-cyan-400/10 absolute top-0 left-0"
        />
      </div>

      {/* Background Radial Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[640px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.18),rgba(255,255,255,0))] pointer-events-none -z-10" />
      <div className="absolute top-[400px] left-1/2 -translate-x-1/2 w-3/4 h-[400px] bg-[radial-gradient(circle,rgba(0,240,255,0.06)_0%,transparent_70%)] pointer-events-none -z-10 blur-3xl" />

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
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-32 sm:pt-36 pb-12 relative" id="main-content">
        {/* Floating Mascot Companion with "Let's Go!" Bubble (Desktop Only) */}
        <div className="hidden xl:flex flex-col items-center absolute right-8 2xl:right-16 top-28 z-20 select-none pointer-events-auto">
          {/* Speech Bubble Popup */}
          <div
            className="relative mb-2.5 px-3.5 py-1.5 rounded-2xl bg-zinc-900/95 border border-indigo-500/40 shadow-[0_8px_24px_rgba(99,102,241,0.2)] backdrop-blur-md animate-bounce"
            style={{ animationDuration: '3s' }}
          >
            <span className="text-xs font-bold tracking-wide text-white flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Let&apos;s Go!
            </span>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-zinc-900 border-r border-b border-indigo-500/40" />
          </div>
          <RobotMascot size="md" />
        </div>

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

          {/* Primary CTA Row (Deduplicated: 1 Primary + 1 Secondary Scroll CTA) */}
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
                <span>Explore How It Works ↓</span>
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
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 bg-transparent">
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
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 bg-transparent">
        <ScrollReveal direction="up" distance={36}>
          <div className="rounded-3xl bg-zinc-950/70 border border-white/10 p-8 sm:p-14 text-center relative overflow-hidden backdrop-blur-md">
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
      <footer className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-12 border-t border-white/10 text-xs text-zinc-400 bg-transparent">
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
