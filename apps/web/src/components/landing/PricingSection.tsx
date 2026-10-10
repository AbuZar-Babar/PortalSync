'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, ArrowRight } from 'lucide-react';

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  const starterPrice = isAnnual ? '$23' : '$29';
  const proPrice = isAnnual ? '$79' : '$99';
  const enterprisePrice = isAnnual ? '$199' : '$249';

  const periodLabel = isAnnual ? '/ month, billed annually' : '/ month';

  return (
    <section id="pricing" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 relative">
      {/* Ambient Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold tracking-wider uppercase mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>SIMPLE &amp; PREDICTABLE PRICING</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Plans Built for Real Work. No Hidden Fees.
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-2.5 max-w-xl mx-auto leading-relaxed">
          Choose the plan that fits your workload. All plans include automated browser execution, duplicate file protection, and zero coding required.
        </p>

        {/* Monthly / Annual Billing Toggle Switch */}
        <div className="inline-flex items-center justify-center p-1 mt-7 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-lg">
          <button
            type="button"
            onClick={() => setIsAnnual(false)}
            className={`px-5 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
              !isAnnual
                ? 'text-white bg-gradient-to-r from-cyan-500 to-indigo-600 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setIsAnnual(true)}
            className={`px-5 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
              isAnnual
                ? 'text-white bg-gradient-to-r from-cyan-500 to-indigo-600 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Annual Billing</span>
            <span className="px-1.5 py-0.5 text-[10px] font-extrabold text-cyan-300 bg-cyan-500/20 border border-cyan-400/30 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Grid (3 Cards: Starter, Pro, Enterprise) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10 items-stretch">
        {/* Card 1: Starter Plan */}
        <div className="relative bg-slate-900/80 backdrop-blur-md rounded-3xl p-7 border border-slate-700/60 shadow-xl flex flex-col justify-between hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-1">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Starter</h3>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                Solo &amp; Small Teams
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Great for individuals and small offices automating repetitive daily downloads and web forms.
            </p>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{starterPrice}</span>
              <span className="text-xs text-slate-400 font-medium">{periodLabel}</span>
            </div>

            <div className="w-full h-px bg-slate-800 mb-6" />

            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3.5">What&apos;s included:</p>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span><strong>25,000 automated steps</strong> every month</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span><strong>Up to 10 saved workflows</strong></span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span><strong>5 GB clean file storage</strong> (~25,000 PDF invoices)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span>Automatic clean date-stamped folders</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span>Smart duplicate download blocker</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span>Standard email support &amp; quick-start guides</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <Link
              href="/signup?tier=starter"
              className="w-full py-3 px-4 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-slate-600"
            >
              <span>Get Started with Starter</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Pro Plan (Highlighted) */}
        <div className="relative bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-md rounded-3xl p-7 border-2 border-cyan-400/60 shadow-2xl shadow-cyan-500/15 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 lg:-translate-y-2">
          {/* Floating Highlight Pill */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 text-[11px] font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-1.5 whitespace-nowrap">
            <span>★</span> <span>MOST POPULAR &amp; BEST VALUE</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4 mt-2">
              <h3 className="text-xl font-bold text-white">Pro</h3>
              <span className="text-[11px] font-bold text-cyan-300 bg-cyan-500/20 px-2.5 py-1 rounded-full border border-cyan-400/30">
                Growing Teams
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Our most popular plan. Built for businesses automating daily customer portals, bank reports &amp; vendor invoices.
            </p>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">{proPrice}</span>
              <span className="text-xs text-slate-400 font-medium">{periodLabel}</span>
            </div>

            <div className="w-full h-px bg-slate-800 mb-6" />

            <p className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider mb-3.5">Everything in Starter, plus:</p>
            <ul className="space-y-3 text-xs text-slate-200">
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span><strong>150,000 automated steps</strong> every month</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span><strong>Unlimited saved workflows</strong></span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span><strong>25 GB high-speed storage</strong> (~100,000 documents)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span><strong>Auto-healing bot:</strong> adapts if websites change buttons</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span><strong>High-speed browser worker:</strong> handles heavy portals smoothly</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span>Export to Excel, CSV, Google Drive or local folders</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span>Priority email &amp; chat onboarding support</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <Link
              href="/signup?tier=pro"
              className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/25 hover:scale-[1.02]"
            >
              <span>Get Started with Pro</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Card 3: Enterprise Plan */}
        <div className="relative bg-slate-900/80 backdrop-blur-md rounded-3xl p-7 border border-slate-700/60 shadow-xl flex flex-col justify-between hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Enterprise</h3>
              <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/30">
                High Volume
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              For operations managing multi-branch portals, hundreds of daily downloads, or custom security needs.
            </p>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{enterprisePrice}</span>
              <span className="text-xs text-slate-400 font-medium">{periodLabel}</span>
            </div>

            <div className="w-full h-px bg-slate-800 mb-6" />

            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3.5">Everything in Pro, plus:</p>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span><strong>500,000+ automated steps</strong> every month</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span><strong>Multiple bots running concurrently</strong> (side-by-side)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span><strong>100 GB dedicated storage</strong> or direct company cloud sync</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span>Custom workflow building &amp; setup by our automation team</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span>99.9% uptime SLA &amp; dedicated account manager</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Check className="w-3 h-3" />
                </span>
                <span>24/7 VIP priority support &amp; custom security review</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <Link
              href="/signup?tier=enterprise"
              className="w-full py-3 px-4 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-slate-600"
            >
              <span>Get Started with Enterprise</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Clear, Easy FAQ Box */}
      <div className="mt-12 rounded-2xl bg-slate-900/70 border border-slate-800 p-6 sm:p-8 backdrop-blur-md relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-1.5">
              <span className="text-base">💡</span>
              <h4>What is an automated step?</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every click, typing action, or download your bot performs counts as 1 step. For example, logging into a portal and downloading 10 invoices takes about 30 steps total.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm mb-1.5">
              <span className="text-base">🔄</span>
              <h4>Can I change or cancel anytime?</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Yes, completely! You can upgrade, downgrade, or cancel your subscription anytime with zero fees and no long-term lock-in contracts.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1.5">
              <span className="text-base">🛡️</span>
              <h4>Do I need any technical skills?</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Zero technical experience needed. If you know how to browse a website, you can use FlowMind. Click record, do your work once, and the bot learns it instantly.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
