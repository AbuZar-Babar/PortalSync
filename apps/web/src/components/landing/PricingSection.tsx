'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowUpRight } from 'lucide-react';
import ScrollReveal from '@/components/landing/ScrollReveal';

interface PricingSectionProps {
  onSelectTier?: (tier: 'starter' | 'pro' | 'enterprise') => void;
}

export default function PricingSection({ onSelectTier }: PricingSectionProps = {}) {
  const [isAnnual, setIsAnnual] = useState(false);

  const starterPrice = isAnnual ? '$23' : '$29';
  const proPrice = isAnnual ? '$79' : '$99';
  const enterprisePrice = isAnnual ? '$199' : '$249';

  const periodLabel = isAnnual ? '/ month, billed annually' : '/ month';

  return (
    <section id="pricing" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-20 relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-80 bg-purple-500/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Header */}
      <ScrollReveal direction="up" className="text-center max-w-2xl mx-auto mb-14">
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          04 / SUBSCRIPTION TIERS
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mt-3 mb-4">
          Simple, predictable plans. <span className="text-zinc-500">No hidden surprises.</span>
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Choose the plan that fits your workload. All plans include automated Chrome replay, duplicate file protection, and zero coding required.
        </p>

        {/* Monthly / Annual Billing Toggle Switch */}
        <div className="inline-flex items-center justify-center p-1 mt-8 rounded-full bg-zinc-950 border border-white/10 shadow-sm">
          <button
            type="button"
            onClick={() => setIsAnnual(false)}
            className={`px-5 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
              !isAnnual
                ? 'text-zinc-950 bg-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setIsAnnual(true)}
            className={`px-5 py-2 text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-2 ${
              isAnnual
                ? 'text-zinc-950 bg-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Annual Billing</span>
            <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full ${
              isAnnual ? 'bg-zinc-900 text-white' : 'bg-white/10 text-white'
            }`}>
              Save 20%
            </span>
          </button>
        </div>
      </ScrollReveal>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Card 1: Starter */}
        <ScrollReveal direction="up" delay={0} className="h-full">
          <div className="h-full bg-[#09090c] border border-white/10 rounded-2xl p-8 flex flex-col justify-between transition-all hover:border-white/20">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Starter</h3>
              <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                Solo Operators
              </span>
            </div>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              For individuals automating daily report exports, portal downloads, and web form fills.
            </p>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white tracking-tight font-mono">{starterPrice}</span>
              <span className="text-xs text-zinc-500 font-medium">{periodLabel}</span>
            </div>

            <div className="w-full h-px bg-white/10 mb-6" />

            <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-4">Included capabilities:</p>
            <ul className="space-y-3 text-xs text-zinc-300">
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span><strong>25,000 automated steps</strong> / month</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span>Up to 10 saved workflows</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span>5 GB clean deduplicated file storage</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span>SHA-256 duplicate file prevention</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span>Standard email onboarding</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            {onSelectTier ? (
              <button
                type="button"
                onClick={() => onSelectTier('starter')}
                className="w-full py-3 px-4 rounded-full border border-white/20 bg-zinc-900/60 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Select Starter</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Link
                href="/signup?tier=starter"
                className="w-full py-3 px-4 rounded-full border border-white/20 bg-zinc-900/60 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Select Starter</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </ScrollReveal>

        {/* Card 2: Pro (High-Contrast Hero Card) */}
        <ScrollReveal direction="up" delay={120} className="h-full">
          <div className="h-full bg-[#0e0e14] border-2 border-white/30 rounded-2xl p-8 flex flex-col justify-between shadow-2xl relative">
            <div className="absolute -top-3 left-8 px-3 py-0.5 rounded-full bg-white text-zinc-950 text-[10px] font-mono font-bold uppercase tracking-wider">
              RECOMMENDED
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 mt-1">
                <h3 className="text-xl font-bold text-white">Pro</h3>
                <span className="text-[11px] font-mono text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20">
                  Growing Teams
                </span>
              </div>
              <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
                For teams requiring multi-iframe ERP traversal, selector self-healing, and recurring unattended execution.
              </p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-mono">{proPrice}</span>
                <span className="text-xs text-zinc-400 font-medium">{periodLabel}</span>
              </div>

              <div className="w-full h-px bg-white/10 mb-6" />

              <p className="text-[11px] font-mono text-white uppercase tracking-wider mb-4">Everything in Starter, plus:</p>
              <ul className="space-y-3 text-xs text-zinc-200">
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-white text-zinc-950 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  <span><strong>150,000 automated steps</strong> / month</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-white text-zinc-950 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  <span>Unlimited saved workflows</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-white text-zinc-950 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  <span>25 GB clean deduplicated file storage</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-white text-zinc-950 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  <span>Self-healing selector fallback trees</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-white text-zinc-950 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  <span>Nested ERP iframe &amp; shadowDOM traversal</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-white text-zinc-950 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  <span>Priority email &amp; direct chat onboarding</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4">
              {onSelectTier ? (
                <button
                  type="button"
                  onClick={() => onSelectTier('pro')}
                  className="w-full py-3.5 px-4 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                >
                  <span>Get Started with Pro</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              ) : (
                <Link
                  href="/signup?tier=pro"
                  className="w-full py-3.5 px-4 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                >
                  <span>Get Started with Pro</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Card 3: Enterprise */}
        <ScrollReveal direction="up" delay={240} className="h-full">
          <div className="h-full bg-[#09090c] border border-white/10 rounded-2xl p-8 flex flex-col justify-between transition-all hover:border-white/20">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Enterprise</h3>
                <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                  High Volume
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                For large-scale operations with dedicated headless runners, custom SLA requirements, and multi-tenant portals.
              </p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white tracking-tight font-mono">{enterprisePrice}</span>
                <span className="text-xs text-zinc-500 font-medium">{periodLabel}</span>
              </div>

              <div className="w-full h-px bg-white/10 mb-6" />

              <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-4">Everything in Pro, plus:</p>
              <ul className="space-y-3 text-xs text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    <Check className="w-3 h-3" />
                  </span>
                  <span><strong>500,000+ automated steps</strong> / month</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    <Check className="w-3 h-3" />
                  </span>
                  <span>Concurrent runner workers</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    <Check className="w-3 h-3" />
                  </span>
                  <span>100 GB dedicated storage or direct cloud sync</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    <Check className="w-3 h-3" />
                  </span>
                  <span>Custom workflow recipe validation by our team</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    <Check className="w-3 h-3" />
                  </span>
                  <span>Direct engineer support channel</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4">
              {onSelectTier ? (
                <button
                  type="button"
                  onClick={() => onSelectTier('enterprise')}
                  className="w-full py-3 px-4 rounded-full border border-white/20 bg-zinc-900/60 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Contact for Enterprise</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <Link
                  href="/signup?tier=enterprise"
                  className="w-full py-3 px-4 rounded-full border border-white/20 bg-zinc-900/60 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Contact for Enterprise</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Honest Technical FAQ Strip (Resolves R-28) */}
      <ScrollReveal direction="up" delay={100} className="mt-16">
        <div className="rounded-2xl bg-[#09090c] border border-white/10 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-2">
                01 / What counts as a step?
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Every discrete mouse click, keystroke sequence, or file download executed by the runner counts as 1 step. Typical invoice extraction batches consume 15 to 30 steps.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-2">
                02 / How does it connect to Chrome?
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                FlowMind communicates via standard Chrome DevTools Protocol (CDP) port 9222. It requires zero browser extensions and does not tamper with DOM sandboxes.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-2">
                03 / Where does execution occur?
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Replays run on your local desktop runner or your private cloud worker. Confidential session tokens and local files remain securely inside your environment.
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
