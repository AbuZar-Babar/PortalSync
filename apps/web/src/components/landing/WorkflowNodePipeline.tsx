'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MousePointer,
  Eye,
  Wand2,
  Zap,
  FolderTree,
  CheckCircle2,
} from 'lucide-react';
import ScrollReveal from '@/components/landing/ScrollReveal';

interface StepCardData {
  id: string;
  stepNumber: string;
  title: string;
  badge: string;
  description: string;
  icon: typeof MousePointer;
  accentColor: string;
  dotColor: string;
  borderColor: string;
}

const STEPS: StepCardData[] = [
  {
    id: 'step-1',
    stepNumber: '01',
    title: 'Click & Record',
    badge: 'No Extensions Needed',
    description: 'Do your task once in Google Chrome. FlowMind captures your clicks naturally.',
    icon: MousePointer,
    accentColor: 'text-cyan-400',
    dotColor: 'bg-cyan-400',
    borderColor: 'hover:border-cyan-500/40',
  },
  {
    id: 'step-2',
    stepNumber: '02',
    title: 'Smart Detection',
    badge: 'Auto-Detect',
    description: 'Identifies tables, buttons, and popups automatically without getting stuck.',
    icon: Eye,
    accentColor: 'text-indigo-400',
    dotColor: 'bg-indigo-400',
    borderColor: 'hover:border-indigo-500/40',
  },
  {
    id: 'step-3',
    stepNumber: '03',
    title: 'Self-Healing',
    badge: 'Never Breaks',
    description: 'Keeps working even if the target website updates its buttons or layout.',
    icon: Wand2,
    accentColor: 'text-purple-400',
    dotColor: 'bg-purple-400',
    borderColor: 'hover:border-purple-500/40',
  },
  {
    id: 'step-4',
    stepNumber: '04',
    title: 'Fast Replay',
    badge: '24x Speed',
    description: 'Repeats your workflow 24x faster than a human and skips duplicate downloads.',
    icon: Zap,
    accentColor: 'text-amber-400',
    dotColor: 'bg-amber-400',
    borderColor: 'hover:border-amber-500/40',
  },
  {
    id: 'step-5',
    stepNumber: '05',
    title: 'Clean Folders',
    badge: '100% Private',
    description: 'Saves your downloaded files neatly organized into date folders on your computer.',
    icon: FolderTree,
    accentColor: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    borderColor: 'hover:border-emerald-500/40',
  },
];

function TimelineCard({
  step,
  isLeft,
}: {
  step: StepCardData;
  isLeft: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const currentEl = cardRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl);
      }
    };
  }, []);

  const IconComponent = step.icon;

  return (
    <div
      ref={cardRef}
      className={`relative flex items-center w-full my-6 sm:my-8 transition-all duration-700 ease-out ${
        isVisible
          ? 'opacity-100 translate-x-0 translate-y-0'
          : isLeft
          ? 'opacity-0 -translate-x-12 sm:-translate-x-16 translate-y-4'
          : 'opacity-0 translate-x-12 sm:translate-x-16 translate-y-4'
      }`}
    >
      {/* Desktop 2-Column Split: Alternating Left and Right */}
      <div
        className={`w-full flex flex-col md:flex-row items-center ${
          isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
        }`}
      >
        {/* Card Body Column (Occupies 50% on desktop) */}
        <div className="w-full md:w-1/2 px-2 sm:px-4">
          <div
            className={`p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-[#09090d]/95 border border-white/10 ${step.borderColor} shadow-2xl backdrop-blur-xl transition-all duration-300 group hover:-translate-y-1`}
          >
            {/* Top Card Bar: Step Badge & Feature Chip */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="font-mono text-xs font-bold text-zinc-500 uppercase tracking-widest">
                STEP {step.stepNumber}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-zinc-300">
                <CheckCircle2 className={`w-3 h-3 ${step.accentColor}`} />
                <span>{step.badge}</span>
              </span>
            </div>

            {/* Icon + Title */}
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <IconComponent className={`w-4 h-4 ${step.accentColor}`} />
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {step.title}
              </h3>
            </div>

            {/* Minimal 1-Sentence Explanation */}
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>

        {/* Center Node Marker on the Timeline (Desktop) */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center z-10">
          <div
            className={`w-9 h-9 rounded-full bg-[#0a0a0f] border-2 border-white/20 flex items-center justify-center font-mono text-xs font-bold text-white shadow-lg transition-transform duration-500 ${
              isVisible ? 'scale-110 border-white/60 ring-4 ring-cyan-500/20' : 'scale-90'
            }`}
          >
            <span className={step.accentColor}>{step.stepNumber}</span>
          </div>
        </div>

        {/* Empty Placeholder for Opposite Column (Keeps balance on desktop) */}
        <div className="hidden md:block w-1/2" />
      </div>
    </div>
  );
}

export default function WorkflowNodePipeline() {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative" id="pipeline">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-80 bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Section Header */}
      <ScrollReveal direction="up" className="text-center max-w-2xl mx-auto mb-16">
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          02 / HOW IT WORKS
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mt-2 mb-3">
          5 Simple Steps. <span className="text-zinc-500">Zero Manual Work.</span>
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
          Scroll down to see how FlowMind turns your repetitive daily clicks into an autonomous, self-healing routine.
        </p>
      </ScrollReveal>

      {/* Central Timeline Spine & Alternating Cards Container */}
      <div className="relative">
        {/* Central Vertical Timeline Hairline (Desktop) */}
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 -translate-x-1/2 w-[1px] bg-gradient-to-b from-cyan-500/40 via-indigo-500/30 to-emerald-500/40 pointer-events-none" />

        {/* The 5 Alternating Cards */}
        <div className="flex flex-col space-y-4 sm:space-y-6">
          {STEPS.map((step, index) => {
            // Even index (0, 2, 4) -> Left
            // Odd index (1, 3) -> Right
            const isLeft = index % 2 === 0;
            return <TimelineCard key={step.id} step={step} isLeft={isLeft} />;
          })}
        </div>
      </div>
    </section>
  );
}
