'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Play,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Layers,
  FolderDown,
  Wand2,
  MousePointer,
  Crosshair,
  Workflow,
  Radio,
} from 'lucide-react';
import RobotMascot from '@/components/landing/RobotMascot';
import VideoDemoModal from '@/components/landing/VideoDemoModal';
import ProductDemoSimulator from '@/components/landing/ProductDemoSimulator';
import FeatureTabSwitcher from '@/components/landing/FeatureTabSwitcher';
import PricingSection from '@/components/landing/PricingSection';

export default function LandingPage() {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [heroSoundMuted, setHeroSoundMuted] = useState(true);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  const toggleHeroSound = () => {
    if (heroVideoRef.current) {
      heroVideoRef.current.muted = !heroVideoRef.current.muted;
      setHeroSoundMuted(heroVideoRef.current.muted);
    }
  };

  return (
    <div className="min-h-screen bg-flowmind-canvas text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Notification Bar */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-slate-300 text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2 border-b border-white/5">
        <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span className="text-slate-200">
          Connected to Local Automation Engine &middot; Autonomous Robotic Worker Online
        </span>
      </div>

      {/* Main Header */}
      <header className="w-full max-w-7xl mx-auto px-6 lg:px-12 pt-4 pb-3 flex items-center justify-between relative z-20">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group focus:outline-none" aria-label="FlowMind Home">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 transition-transform duration-300 group-hover:scale-105 border border-cyan-400/30">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="10" rx="4" />
              <circle cx="9" cy="16" r="1.5" fill="#00f0ff" />
              <circle cx="15" cy="16" r="1.5" fill="#00f0ff" />
              <path d="M8 7l4-4 4 4" />
              <line x1="12" y1="3" x2="12" y2="11" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-white leading-none">FlowMind</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">AI Automation</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-8">
          <Link
            className="text-sm font-semibold text-cyan-400 relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-0.5 after:bg-cyan-400 after:rounded-full"
            href="#"
          >
            Home
          </Link>
          <Link className="text-sm font-medium text-slate-300 hover:text-white transition-colors" href="#how-it-works">
            How It Works
          </Link>
          <Link className="text-sm font-medium text-slate-300 hover:text-white transition-colors" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium text-slate-300 hover:text-white transition-colors" href="#analytics">
            Live Stats
          </Link>
          <Link className="text-sm font-medium text-slate-300 hover:text-white transition-colors" href="#pricing">
            Pricing
          </Link>
        </nav>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition px-3 py-2 rounded-lg hover:bg-slate-800/60"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-indigo-500 transition-all rounded-full shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 hover:scale-105 border border-cyan-400/40"
          >
            <span>Start Capturing Free</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-3 pb-8">
        <div className="relative w-full rounded-[2.5rem] overflow-hidden min-h-[660px] lg:min-h-[740px] flex items-center shadow-2xl border border-white/20 bg-slate-950">
          {/* Expanded Background Video */}
          <video
            ref={heroVideoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover opacity-80 filter brightness-105 contrast-105 pointer-events-none transition-opacity duration-500"
          >
            <source src="/videos/landing-demo.mp4" type="video/mp4" />
          </video>

          {/* Left Scrim Gradient: Keep text legible while leaving video visible */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent z-10 pointer-events-none" />

          {/* Live Video Floating Controls Pill */}
          <div className="absolute top-6 right-6 z-30 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleHeroSound}
              className="px-3.5 py-1.5 rounded-full bg-slate-900/85 hover:bg-slate-800 text-white text-xs font-semibold border border-white/20 backdrop-blur-md flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105 cursor-pointer"
            >
              <span>{heroSoundMuted ? '🔇' : '🔊'}</span>
              <span>{heroSoundMuted ? 'Sound' : 'Mute'}</span>
            </button>
          </div>

          {/* Hero Content */}
          <div className="relative z-20 w-full p-8 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-white">
            {/* Left Column: Copy & Direct CTAs */}
            <div className="lg:col-span-6 flex flex-col items-start">
              {/* AI Badge Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold tracking-wide mb-5 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="tracking-wider uppercase font-bold text-[11px]">AUTONOMOUS WORKFLOW AGENT</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[3.8rem] font-extrabold tracking-tight text-white leading-[1.1] mb-5">
                Teach it once.<br />
                <span className="text-gradient-purple-blue">Let it work.</span>
              </h1>

              {/* Subheading */}
              <p className="text-base sm:text-lg text-slate-300 max-w-lg leading-relaxed mb-7 font-normal">
                Capture how you work once. Our intelligent agent learns the workflow direction, understands the live website, and performs the task again when you need it.
              </p>

              {/* CTA Action Group */}
              <div className="flex flex-wrap items-center gap-3.5 mb-7">
                <Link
                  href="/signup"
                  className="px-7 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2 hover:scale-105"
                >
                  <span>Start Capturing Free</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Link>
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(true)}
                  className="px-6 py-3.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-sm font-semibold transition-all hover:scale-105 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                  <span>Watch Video Demo</span>
                </button>
              </div>

              {/* Mini Feature Highlights */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Nested Iframe Support</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Zero-Code Setup</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Self-Healing Bots</span>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Robot Mascot & Glass Floating Stepper Card */}
            <div className="lg:col-span-6 relative flex items-center justify-center min-h-[420px]">
              {/* Ambient Radial Glow Behind Mascot */}
              <div className="absolute w-[440px] h-[440px] robot-ambient-glow rounded-full -top-4 pointer-events-none" />
              {/* Orbital Ring */}
              <div className="absolute w-[500px] h-[220px] rounded-[100%] border border-indigo-400/25 rotate-[-12deg] pointer-events-none" />

              {/* 3D Robot Mascot */}
              <RobotMascot />

              {/* Floating Vertical Stepper Glass Card */}
              <div className="absolute right-0 sm:right-2 lg:-right-4 top-1/2 -translate-y-1/2 w-48 sm:w-56 p-5 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-white/20 shadow-2xl z-20 hover:scale-105 transition-transform duration-300">
                <div className="relative flex flex-col space-y-4">
                  {/* Connecting Line */}
                  <div className="absolute left-4 top-4 bottom-4 w-px bg-indigo-500/30 -z-0" />

                  {/* Step 1 */}
                  <div className="flex items-center gap-3 relative z-10 group">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <MousePointer className="w-4 h-4 fill-current rotate-[-45deg] -translate-y-0.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-white">Teach</span>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-3 relative z-10 group">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400 shadow-sm shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-white">Learn</span>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center gap-3 relative z-10 group">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-sm shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-white">Remember</span>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-center gap-3 relative z-10 group">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-sm shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Zap className="w-4 h-4 fill-current" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-white">Run</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 5.6s Synchronized Product Demo Simulator */}
      <ProductDemoSimulator />

      {/* Live Performance Metrics */}
      <section id="analytics" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Metric Card 1: Execution Speed */}
          <div className="group relative bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-700/60 shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold text-xs shadow-inner">
                  ⚡
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Execution Speed</span>
              </div>
              <span className="animate-live-pill text-xs font-extrabold px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 shadow-sm">
                24x Faster
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">0.75s</h3>
              <span className="text-xs font-semibold text-slate-400">per step</span>
            </div>
            <p className="text-xs text-slate-400 mb-4 font-normal">Eliminates human delay and lag with direct CDP browser dispatch.</p>

            {/* Comparison Bar */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                  <span>Manual Human Click</span>
                  <span>18.4s</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-slate-600 h-2 rounded-full" style={{ width: '82%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-bold text-cyan-400 mb-1">
                  <span>FlowMind Autonomous Replay</span>
                  <span>0.75s</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-cyan-500/30">
                  <div className="bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400 h-2 rounded-full animate-count-bar-smooth" />
                </div>
              </div>
            </div>
          </div>

          {/* Metric Card 2: Reliability Rate */}
          <div className="group relative bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-700/60 shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-xs shadow-inner">
                  🛡️
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Reliability Rate</span>
              </div>
              <span className="animate-live-pill text-xs font-extrabold px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-400/40 shadow-sm">
                Zero Break
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">99.8%</h3>
              <span className="text-xs font-semibold text-emerald-400">Success</span>
            </div>
            <p className="text-xs text-slate-400 mb-4 font-normal">Tested on nested dynamic ERP iframes, late-rendering DOMs &amp; canvases.</p>

            {/* Success Ring Bar */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1.5">
                <span>Selector Self-Healing Resilience</span>
                <span className="text-emerald-400 font-bold">100% Injected</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-2 rounded-full" style={{ width: '99.8%' }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-mono">
                <span>Dynamic Grids &middot; ShadowDOM</span>
                <span className="text-emerald-400 font-bold">Autonomous</span>
              </div>
            </div>
          </div>

          {/* Metric Card 3: Monthly Task Volume */}
          <div className="group relative bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-700/60 shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-xs shadow-inner">
                  📈
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Task Volume</span>
              </div>
              <span className="animate-live-pill text-xs font-extrabold px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-400/40 shadow-sm">
                1,480 Tasks
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">142.5 hrs</h3>
              <span className="text-xs font-semibold text-purple-400">Saved/Mo</span>
            </div>
            <p className="text-xs text-slate-400 mb-4 font-normal">Invoices, reports &amp; table loops automated with zero maintenance.</p>

            {/* Equalizer Wave Bars */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-end justify-between gap-1.5 h-7">
                <div className="flex-1 bg-cyan-600 rounded-t wave-bar-1 transition-all" />
                <div className="flex-1 bg-cyan-500 rounded-t wave-bar-2 transition-all" />
                <div className="flex-1 bg-indigo-500 rounded-t wave-bar-3 transition-all" />
                <div className="flex-1 bg-purple-500 rounded-t wave-bar-4 transition-all" />
                <div className="flex-1 bg-cyan-400 rounded-t wave-bar-5 transition-all" />
                <div className="flex-1 bg-emerald-400 rounded-t wave-bar-2 transition-all" />
                <div className="flex-1 bg-cyan-600 rounded-t wave-bar-1 transition-all" />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                <span>MON</span>
                <span>WED</span>
                <span>FRI</span>
                <span>SUN</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 3-Way Feature Tab Switcher */}
      <FeatureTabSwitcher />

      {/* Core Features Grid */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold tracking-wider uppercase mb-2.5 shadow-sm">
            <span>BUILT FOR EVERYDAY WORK</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Everything you need. Nothing broken.
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">
            Built so anyone can automate repetitive daily browser tasks, invoice downloads, and portal searches in minutes — with zero coding required.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Feature 1 */}
          <div className="group relative bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 border border-slate-700/60 shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-cyan-400 transition-colors">
              Works on Every Portal &amp; Popup
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Never gets stuck on customer portal frames, login overlays, or nested web windows. Navigates smoothly just like a real person.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-300">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>portal_window</span>
              </div>
              <span className="text-emerald-400 font-bold">✓ 100% Connected</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="group relative bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 border border-slate-700/60 shadow-xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/25 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
              <FolderDown className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-purple-400 transition-colors">
              Smart Organized Downloads
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Automatically sorts your invoices and PDF reports into neat date-organized folders, and skips duplicates with SHA-256 validation.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-300">
              <span className="truncate max-w-[130px]">invoice_2026.pdf</span>
              <span className="text-purple-400 font-bold">✓ SHA-256 Verified</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="group relative bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 border border-slate-700/60 shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-cyan-400 border border-blue-500/25 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
              <Wand2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-cyan-400 transition-colors">
              Auto-Fixes When Websites Change
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              If a website updates its design, renames buttons, or changes colors, your bot automatically spots the new button and keeps working.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-300">
              <span className="text-slate-500 line-through">Layout Updated</span>
              <span className="text-emerald-400 font-bold">&rarr; Found New Button</span>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="group relative bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 border border-slate-700/60 shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
              <MousePointer className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-emerald-400 transition-colors">
              Natural Human-Like Movement
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Moves the mouse smoothly along Bézier curves and types with natural speed so vendor portals never flag your automated accounts.
            </p>
            <div className="relative h-7 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center px-3">
              <svg className="w-full h-5" viewBox="0 0 150 40">
                <path d="M 10 35 C 40 10, 80 50, 140 20" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" />
                <circle className="animate-bezier-dot" r="4" fill="#10b981" />
              </svg>
            </div>
          </div>

          {/* Feature 5 */}
          <div className="group relative bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 border border-slate-700/60 shadow-xl hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
              <Crosshair className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-amber-400 transition-colors">
              Pinpoint Click Accuracy
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Clicks exact buttons, chart points, and spreadsheet rows without missing, even on complex modern business web apps.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-300">
              <span>Target Button</span>
              <span className="text-amber-400 font-bold">● 100% Accurate</span>
            </div>
          </div>

          {/* Feature 6 */}
          <div className="group relative bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 border border-slate-700/60 shadow-xl hover:shadow-teal-500/10 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/25 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
              <Workflow className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-teal-400 transition-colors">
              Visual Workflow Canvas Editor
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              See every step of your workflow visually. Drag, adjust, or test actions easily without writing a single line of code.
            </p>
            <div className="relative p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[9px] font-mono text-slate-300 overflow-hidden">
              <span className="px-1.5 py-0.5 rounded bg-slate-900 shadow-xs border border-slate-700">Open Page</span>
              <div className="relative flex-1 mx-2 h-0.5 bg-slate-800">
                <div className="animate-node-pulse absolute top-[-3px] w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_6px_#14b8a6]" />
              </div>
              <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 shadow-xs border border-teal-500/40 font-bold">
                Save Invoices
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Tier SaaS Pricing Grid */}
      <PricingSection />

      {/* Bottom CTA Banner */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10">
        <div className="rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-8 sm:p-14 text-center shadow-2xl border border-cyan-500/30 relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 text-white">
              Ready to automate your workflows?
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mb-7 max-w-lg mx-auto leading-relaxed">
              Launch the FlowMind operations center and train your robotic AI agent in seconds.
            </p>
            <Link
              href="/signup"
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 hover:from-cyan-300 hover:to-indigo-400 font-extrabold text-xs sm:text-sm shadow-xl transition-all hover:scale-105 inline-flex items-center gap-2 group"
            >
              <span>Launch Agent Operations Center</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
            </Link>

            {/* Micro-Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-5 mt-7 text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="text-cyan-400">✓</span> 100% Local Execution
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-cyan-400">✓</span> Zero Browser Extensions Required
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-cyan-400">✓</span> Autonomous Selector Healing
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Comprehensive Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white text-[11px] shadow-sm">
            FM
          </div>
          <span className="font-bold text-white">FlowMind AI</span>
          <span className="text-slate-500">&copy; 2026. All rights reserved.</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Link href="#how-it-works" className="hover:text-cyan-400 transition-colors">
            How It Works
          </Link>
          <Link href="#features" className="hover:text-cyan-400 transition-colors">
            Features
          </Link>
          <Link href="#analytics" className="hover:text-cyan-400 transition-colors">
            Metrics
          </Link>
          <Link href="#pricing" className="hover:text-cyan-400 transition-colors">
            Pricing
          </Link>
          <Link href="/login" className="hover:text-cyan-400 transition-colors">
            Sign In
          </Link>
          <Link href="/signup" className="text-cyan-400 font-semibold hover:underline">
            Get Started Free
          </Link>
        </div>
      </footer>

      {/* Video Demo Modal */}
      <VideoDemoModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} />
    </div>
  );
}
