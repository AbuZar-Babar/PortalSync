'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDot,
  Download,
  FileSearch,
  Layers,
  LockKeyhole,
  Menu,
  Monitor,
  Play,
  Repeat2,
  Workflow,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ScrollReveal from '@/components/landing/ScrollReveal';
import { AuthCard, PlanTier } from '@/components/auth/AuthCard';
import PricingSection from '@/components/landing/PricingSection';

const STORY_ITEMS = [
  {
    title: 'Capture the process',
    summary: 'Turn browser interactions into an editable sequence.',
    description:
      'Start with the task as it is performed today. Review the captured sequence and adjust the steps to match the way your team works.',
    icon: Workflow,
    label: 'Captured workflow',
    rows: ['01  Open records page', '02  Select a record', '03  Export details'],
  },
  {
    title: 'Find matching records',
    summary: 'Organize discovered items around the task you need to complete.',
    description:
      'Work with discovered records and relevant fields. Use the information available to identify which items belong in your workflow.',
    icon: FileSearch,
    label: 'Discovered records',
    rows: ['INV-1042  ·  Pending', 'INV-1043  ·  Paid', 'INV-1044  ·  Pending'],
  },
  {
    title: 'Repeat steps across items',
    summary: 'Structure recurring actions around multiple records.',
    description:
      'Build a workflow that processes records using your configured steps and conditions instead of manually repeating the same sequence for every item.',
    icon: Repeat2,
    label: 'Workflow sequence',
    rows: ['Record 01  ·  Step complete', 'Record 02  ·  Step complete', 'Record 03  ·  Next in sequence'],
  },
  {
    title: 'Bring output back to work',
    summary: 'Keep generated results and downloaded files organized.',
    description:
      'Design the final steps around the output your process needs, such as collecting information or downloading files for the next stage of work.',
    icon: Download,
    label: 'Workflow output',
    rows: ['invoice-summary.csv', 'invoice-records.json', 'downloaded-documents/'],
  },
];

function BrandMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200">
      <Workflow className="h-[18px] w-[18px]" aria-hidden="true" />
    </span>
  );
}

function ProductWindow() {
  const steps = [
    { name: 'Find invoice records', detail: 'Locate matching items', icon: FileSearch },
    { name: 'Read invoice details', detail: 'Collect relevant fields', icon: Layers },
    { name: 'Export results', detail: 'Prepare the output', icon: Download },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.11] bg-[#0d1110] shadow-[0_35px_100px_rgba(0,0,0,0.4)]">
      <div className="flex h-12 items-center justify-between border-b border-white/[0.08] bg-[#111614] px-4">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-zinc-600" />
          <span className="h-2 w-2 rounded-full bg-zinc-600" />
          <span className="h-2 w-2 rounded-full bg-zinc-600" />
        </div>
        <span className="text-[10px] text-zinc-500">ReFlow / Workspace</span>
        <span className="flex items-center gap-2 text-[10px] text-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          Workspace
        </span>
      </div>

      <div className="grid min-h-[330px] grid-cols-[118px_minmax(0,1fr)] sm:grid-cols-[150px_minmax(0,1fr)]">
        <aside className="border-r border-white/[0.07] bg-[#101412] p-2.5 sm:p-3.5">
          <p className="mb-3 px-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-zinc-600">Workspace</p>
          <div className="mb-1 flex items-center gap-2 rounded-lg bg-emerald-300/[0.09] px-2 py-2.5 text-[10px] text-emerald-200">
            <Layers className="h-3.5 w-3.5 shrink-0" />
            Workflows
          </div>
          <div className="mb-1 flex items-center gap-2 rounded-lg px-2 py-2.5 text-[10px] text-zinc-500">
            <CircleDot className="h-3.5 w-3.5 shrink-0" />
            Activity
          </div>
          <div className="mb-1 flex items-center gap-2 rounded-lg px-2 py-2.5 text-[10px] text-zinc-500">
            <FileSearch className="h-3.5 w-3.5 shrink-0" />
            Discover
          </div>
          <div className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-[10px] text-zinc-500">
            <LockKeyhole className="h-3.5 w-3.5 shrink-0" />
            Settings
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-5">
          <h3 className="text-base font-semibold tracking-tight text-zinc-100 sm:text-lg">Invoice processing</h3>
          <p className="mb-5 mt-1 text-[10px] text-zinc-500">A reusable sequence for a recurring task</p>

          <div className="space-y-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.name} className="grid grid-cols-[28px_minmax(0,1fr)_18px] items-center gap-2.5 rounded-lg border border-white/[0.08] bg-[#131816] p-2.5 sm:gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-300/[0.09] text-emerald-200">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] font-semibold text-zinc-200">{step.name}</span>
                    <span className="mt-0.5 block truncate text-[9px] text-zinc-500">{step.detail}</span>
                  </span>
                  <span className="text-[9px] text-zinc-600">0{index + 1}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/[0.08] pt-4">
            <span className="text-[9px] text-zinc-500">Workflow editor</span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-200 px-2.5 py-2 text-[10px] font-bold text-[#08130e]">
              <Play className="h-3 w-3 fill-current" />
              Run workflow
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RedesignedLandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signup');
  const [selectedTier, setSelectedTier] = useState<PlanTier>('starter');
  const [currentUser, setCurrentUser] = useState<{ email?: string; id?: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeStory, setActiveStory] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (mounted && user) setCurrentUser({ email: user.email, id: user.id });
      } catch {
        // The landing page remains usable when auth is unavailable.
      }
    }

    void loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-story-index]'));
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (mostVisible) {
          const index = Number((mostVisible.target as HTMLElement).dataset.storyIndex);
          if (Number.isInteger(index)) setActiveStory(index);
        }
      },
      { threshold: [0.25, 0.5, 0.7], rootMargin: '-18% 0px -18% 0px' },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const openAuth = (tab: 'signin' | 'signup', tier: PlanTier = 'starter') => {
    setAuthModalTab(tab);
    setSelectedTier(tier);
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setCurrentUser(null);
      window.location.href = '/';
    }
  };

  const navItems = [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Features', href: '#features' },
    { label: 'Desktop runner', href: '#desktop-runner' },
    { label: 'Pricing', href: '#pricing' },
  ];

  return (
    <div className="min-h-screen overflow-x-clip bg-[#090b0b] text-zinc-100 selection:bg-emerald-200/30 selection:text-emerald-50">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#090b0b]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2.5 rounded-lg text-lg font-bold tracking-tight text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-200" aria-label="ReFlow home">
            <BrandMark />
            ReFlow
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-xs text-zinc-400 transition-colors hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            {currentUser ? (
              <>
                <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-emerald-200 px-4 py-2.5 text-xs font-bold text-[#07120d] transition hover:bg-emerald-100">
                  Open workspace <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <button type="button" onClick={handleSignOut} className="rounded-lg px-2 py-2 text-xs text-zinc-400 transition hover:text-white">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => openAuth('signin')} className="rounded-lg px-3 py-2 text-xs text-zinc-400 transition hover:text-white">
                  Sign in
                </button>
                <button type="button" onClick={() => openAuth('signup')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-200 px-4 py-2.5 text-xs font-bold text-[#07120d] transition hover:bg-emerald-100">
                  Get started <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-300 sm:hidden"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="border-t border-white/[0.06] bg-[#0c100e] px-5 py-4 sm:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1" aria-label="Mobile navigation">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm text-zinc-300 hover:bg-white/[0.04]">
                  {item.label}
                </Link>
              ))}
              {currentUser ? (
                <>
                  <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="mt-2 rounded-lg bg-emerald-200 px-4 py-3 text-center text-sm font-bold text-[#07120d]">Open workspace</Link>
                  <button type="button" onClick={handleSignOut} className="px-4 py-3 text-sm text-zinc-400">Sign out</button>
                </>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openAuth('signin')} className="rounded-lg border border-white/10 px-4 py-3 text-sm text-zinc-200">Sign in</button>
                  <button type="button" onClick={() => openAuth('signup')} className="rounded-lg bg-emerald-200 px-4 py-3 text-sm font-bold text-[#07120d]">Get started</button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <main id="main-content">
        <section className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -right-48 -top-48 -z-10 h-[620px] w-[620px] rounded-full bg-emerald-400/[0.07] blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.94fr_1.06fr] lg:gap-16 lg:px-12 lg:py-28">
            <ScrollReveal direction="left" className="min-w-0">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.17em] text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-200" />
                Automation for repetitive work
              </div>
              <h1 className="max-w-[650px] text-[clamp(2.75rem,6vw,4.65rem)] font-semibold leading-[1.04] tracking-[-0.055em] text-white">
                Teach ReFlow once. <span className="text-emerald-200">Let it handle the routine.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-zinc-400 sm:text-lg">
                Turn repetitive browser tasks into reusable workflows. Capture the process, configure the steps, and let ReFlow handle the routine while you focus on the work that matters.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {currentUser ? (
                  <Link href="/dashboard" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-emerald-200 px-5 text-sm font-bold text-[#07120d] transition hover:-translate-y-0.5 hover:bg-emerald-100">
                    Open workspace <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <button type="button" onClick={() => openAuth('signup')} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-emerald-200 px-5 text-sm font-bold text-[#07120d] transition hover:-translate-y-0.5 hover:bg-emerald-100">
                    Get started <ArrowUpRight className="h-4 w-4" />
                  </button>
                )}
                <Link href="#how-it-works" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-5 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.05]">
                  See how it works <ArrowDown className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-4 text-xs text-zinc-600">Start with one workflow. Refine it as your process evolves.</p>
            </div>
            </ScrollReveal>

            <ScrollReveal direction="right" className="min-w-0">
            <div>
              <ProductWindow />
              <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-zinc-600">
                <span>Illustrative product interface</span>
                <span className="flex items-center gap-2 text-zinc-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-200" /> Capture · Configure · Run</span>
              </div>
            </div>
            </ScrollReveal>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-white/[0.06] bg-[#0d100f]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
            <ScrollReveal direction="up" className="max-w-2xl">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.17em] text-emerald-200">A simpler way to automate</p>
              <h2 className="text-3xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-5xl">From manual steps to a reusable workflow.</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">Build a repeatable process around the work you already do. Start small, then refine the workflow to match your needs.</p>
            </ScrollReveal>

            <div className="mt-12 grid gap-9 md:grid-cols-3 md:gap-10">
              {[
                { number: '01 / CAPTURE', title: 'Show the process', body: 'Record the browser actions that make up a recurring task and turn them into a workflow you can review.' },
                { number: '02 / CONFIGURE', title: 'Make it reusable', body: 'Organize the steps, adjust the details, and configure how the workflow should handle your inputs.' },
                { number: '03 / RUN', title: 'Repeat the routine', body: 'Run the workflow again when the task returns, inspect the outcome, and refine the process when needed.' },
              ].map((step) => (
                <article key={step.number} className="border-t border-white/15 pt-5">
                  <p className="mb-6 text-[11px] font-bold tracking-[0.14em] text-emerald-200">{step.number}</p>
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-100">{step.title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-7 text-zinc-400">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="grid items-start gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
            <ScrollReveal direction="left" className="lg:sticky lg:top-28">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.17em] text-emerald-200">Built around your process</p>
              <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-5xl">Less repetition. More control.</h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-zinc-400 sm:text-base">ReFlow brings the steps of a browser task into one manageable workflow. Explore how each part fits together.</p>
              <a href="#desktop-runner" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 transition hover:text-emerald-100">
                Explore the desktop runner <ArrowRight className="h-4 w-4" />
              </a>
            </ScrollReveal>

            <div className="space-y-3">
              {STORY_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const isActive = activeStory === index;
                return (
                  <article
                    key={item.title}
                    data-story-index={index}
                    className={'overflow-hidden rounded-xl border transition-colors duration-300 ' + (isActive ? 'border-emerald-200/30 bg-[#111815]' : 'border-white/[0.09] bg-[#0e1210]')}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveStory(index)}
                      aria-expanded={isActive}
                      aria-controls={'story-detail-' + index}
                      className="grid w-full grid-cols-[40px_minmax(0,1fr)_20px] items-center gap-4 p-4 text-left sm:p-5"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-lg border border-emerald-200/10 bg-emerald-200/[0.07] text-emerald-200">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold tracking-tight text-zinc-100 sm:text-base">{item.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-zinc-400">{item.summary}</span>
                      </span>
                      <ChevronDown className={'h-4 w-4 text-zinc-500 transition-transform duration-300 ' + (isActive ? 'rotate-180' : '')} />
                    </button>

                    <div id={'story-detail-' + index} aria-hidden={!isActive} className={'grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ' + (isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                      <div className="min-h-0 overflow-hidden px-4 pb-5 sm:pl-[76px] sm:pr-5">
                        <p className="mb-4 text-sm leading-7 text-zinc-400">{item.description}</p>
                        <div className="rounded-lg border border-white/[0.08] bg-[#0a0e0c] p-4">
                          <div className="mb-3 flex items-center justify-between gap-3 text-[10px] text-zinc-500">
                            <span>{item.label}</span>
                            <span className="rounded-md bg-emerald-200/[0.09] px-2 py-1 text-emerald-200">Example data</span>
                          </div>
                          {item.rows.map((row, rowIndex) => (
                            <div key={row} className="flex items-center justify-between gap-3 border-t border-white/[0.06] py-2.5 text-[11px] text-zinc-300">
                              <span>{row}</span>
                              <span className="shrink-0 text-emerald-200">{index === 1 && rowIndex === 1 ? 'Excluded' : 'Ready'}</span>
                            </div>
                          ))}
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                            <div className="h-full w-[72%] rounded-full bg-emerald-200/80" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="desktop-runner" className="border-y border-white/[0.06] bg-[#0d100f]">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-20 lg:px-12">
            <div>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.17em] text-emerald-200">Workspace + desktop runner</p>
              <h2 className="max-w-lg text-3xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-5xl">Your workflows. A setup that fits your work.</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
                Manage workflows through the ReFlow workspace and use the desktop runner for browser automation on a compatible computer. Review your execution and data-handling requirements for your setup.
              </p>
              <ul className="mt-7 space-y-4 text-sm text-zinc-300">
                <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />Organize workflows and review their configured steps.</li>
                <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />Run compatible workflows through the desktop environment.</li>
                <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />Keep execution, access, and data-handling requirements clear.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/[0.09] bg-[#101513] p-5 sm:p-7">
              <div className="flex items-center gap-3 border-b border-white/[0.08] pb-5">
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-emerald-200/15 bg-emerald-200/[0.07] text-emerald-200"><Monitor className="h-6 w-6" /></span>
                <div>
                  <h3 className="font-semibold text-zinc-100">ReFlow desktop runner</h3>
                  <p className="mt-1 text-xs text-zinc-500">Choose the compatible installer for your system.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <a href="/api/v1/runners/download?type=installer&os=windows" download="ReFlow-Worker-Setup-1.0.0.exe" className="group flex items-center gap-4 rounded-xl border border-white/[0.09] bg-[#0c100e] p-4 transition hover:border-emerald-200/30 hover:bg-white/[0.025]">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/[0.04] text-zinc-200"><Download className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-zinc-100">Windows</span><span className="mt-1 block text-xs text-zinc-500">Windows installer (.exe)</span></span>
                  <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-emerald-200" />
                </a>
                <a href="/api/v1/runners/download?type=installer&os=mac" download="ReFlow-Worker-1.0.0.dmg" className="group flex items-center gap-4 rounded-xl border border-white/[0.09] bg-[#0c100e] p-4 transition hover:border-emerald-200/30 hover:bg-white/[0.025]">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/[0.04] text-zinc-200"><Download className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-zinc-100">macOS</span><span className="mt-1 block text-xs text-zinc-500">macOS package (.dmg)</span></span>
                  <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-emerald-200" />
                </a>
              </div>
              <p className="mt-4 text-[10px] leading-5 text-zinc-600">Installer availability depends on the current release configuration.</p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <PricingSection onSelectTier={(tier) => openAuth('signup', tier)} />
        </div>

        <section id="get-started" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200/20 bg-[#101714] px-6 py-16 text-center sm:px-12">
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-280px] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-emerald-300/[0.08] blur-3xl" />
            <div className="relative mx-auto max-w-2xl">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.17em] text-emerald-200">Start with one workflow</p>
              <h2 className="text-3xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-5xl">Give repetitive work a better way forward.</h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">Choose a recurring task, map out the steps, and explore how ReFlow could fit into your process.</p>
              <button type="button" onClick={() => currentUser ? (window.location.href = '/dashboard') : openAuth('signup')} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-lg bg-emerald-200 px-5 text-sm font-bold text-[#07120d] transition hover:-translate-y-0.5 hover:bg-emerald-100">
                {currentUser ? 'Open workspace' : 'Get started'} <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 px-5 py-8 sm:px-8 md:flex-row md:items-center lg:px-12">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-white">
              <BrandMark /> ReFlow
            </Link>
            <p className="mt-2 text-[11px] text-zinc-600">Browser workflows, made reusable.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-zinc-400" aria-label="Footer navigation">
            <Link href="#how-it-works" className="transition hover:text-white">How it works</Link>
            <Link href="#features" className="transition hover:text-white">Features</Link>
            <Link href="#pricing" className="transition hover:text-white">Pricing</Link>
            <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
            <Link href="/terms" className="transition hover:text-white">Terms</Link>
          </nav>
        </div>
        <div className="border-t border-white/[0.06] py-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 text-[10px] text-zinc-600 sm:px-8 md:flex-row md:justify-between lg:px-12">
            <span>© {new Date().getFullYear()} ReFlow. All rights reserved.</span>
            <span>Designed for more deliberate workflows.</span>
          </div>
        </div>
      </footer>

      {isAuthModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsAuthModalOpen(false);
          }}
        >
          <div className="my-auto w-full max-w-md">
            <AuthCard
              key={authModalTab + '-' + selectedTier}
              defaultTab={authModalTab}
              selectedPlan={selectedTier}
              isModal
              onClose={() => setIsAuthModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
