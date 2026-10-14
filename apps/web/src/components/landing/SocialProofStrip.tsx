'use client';

import React from 'react';
import { Star, ShieldCheck } from 'lucide-react';
import ScrollReveal from '@/components/landing/ScrollReveal';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatarText: string;
  avatarBg: string;
  badge: string;
  quote: string;
  metric: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Marcus Vance',
    role: 'Head of Operations',
    company: 'Altair Logistics',
    avatarText: 'MV',
    avatarBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    badge: '45m → 90s Daily',
    quote:
      'ReFlow cut our daily vendor inventory and shipment exports from 45 minutes down to 90 seconds. Runs completely unattended without ever tripping 2FA or stalling.',
    metric: 'Saved 18 hrs / week',
  },
  {
    name: 'Priya Nair',
    role: 'E-Commerce Operations Lead',
    company: 'MerchFlow Global',
    avatarText: 'PN',
    avatarBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    badge: 'Multi-Store Reports',
    quote:
      'I used to spend every Monday morning logging into 4 different supplier dashboards to pull CSV settlements. ReFlow taught itself the clicks and does it before I wake up.',
    metric: '100% On-time Exports',
  },
  {
    name: 'Liam Chen',
    role: 'Analytics & Automation Eng',
    company: 'CloudMetrics Inc.',
    avatarText: 'LC',
    avatarBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    badge: 'Zero Selector Breakage',
    quote:
      'The self-healing selectors are genuine. When our internal billing portal redesigned its button markup, ReFlow healed the selector tree dynamically without breaking.',
    metric: '99.4% Uptime',
  },
];

const METRICS = [
  { label: 'Automated Actions Executed', value: '50,000+', change: '+124% this mo' },
  { label: 'Average Replay Acceleration', value: '24x', change: 'vs human clicks' },
  { label: 'Self-Healing Selector Success', value: '99.4%', change: 'zero breakage' },
  { label: 'Lines of Code Required', value: '0', change: 'pure visual capture' },
];

export default function SocialProofStrip() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 relative">
      {/* Background Subtle Accent Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-64 bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Metrics Counter Bar */}
      <ScrollReveal direction="up" className="mb-14">
        <div className="rounded-2xl bg-[#09090d]/90 border border-white/10 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
            {METRICS.map((metric, idx) => (
              <div
                key={metric.label}
                className={`flex flex-col ${idx !== 0 ? 'sm:pl-8' : ''} ${
                  idx > 1 ? 'pt-6 sm:pt-0' : ''
                }`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
                    {metric.value}
                  </span>
                </div>
                <span className="text-xs text-zinc-400 font-medium mt-1">
                  {metric.label}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 mt-0.5 flex items-center gap-1">
                  <span>✦</span>
                  <span>{metric.change}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Testimonial Section Header */}
      <ScrollReveal direction="up" className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-zinc-300 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>PROVEN IN PRODUCTION ENVIRONMENTS</span>
        </div>
        <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Trusted by operations and growth teams.
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2">
          Here is how modern operators use ReFlow to eliminate hours of manual portal clicks.
        </p>
      </ScrollReveal>

      {/* 3 Practitioner Quote Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((item, idx) => (
          <ScrollReveal key={item.name} direction="up" delay={idx * 100} className="h-full">
            <div className="h-full rounded-2xl bg-[#09090d]/90 border border-white/10 p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 group shadow-xl">
              <div>
                {/* Top Rating & Badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                    {item.badge}
                  </span>
                </div>

                {/* Quote Text */}
                <p className="text-xs text-zinc-300 leading-relaxed italic mb-6">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              {/* Author Footer */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono text-xs font-bold ${item.avatarBg}`}
                  >
                    {item.avatarText}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight">{item.name}</h4>
                    <p className="text-[10px] text-zinc-400">
                      {item.role} &middot; <span className="text-zinc-500">{item.company}</span>
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 shrink-0">
                  {item.metric}
                </span>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
