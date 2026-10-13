'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AuthCard, PlanTier } from '@/components/auth/AuthCard';

function SignupPageContent() {
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom') || '/dashboard';
  const tab = searchParams.get('tab') === 'signin' ? 'signin' : 'signup';
  const tierParam = searchParams.get('tier');
  const validTier: PlanTier =
    tierParam === 'pro' || tierParam === 'enterprise' || tierParam === 'starter'
      ? tierParam
      : 'starter';

  return (
    <AuthCard
      defaultTab={tab}
      selectedPlan={validTier}
      redirectedFrom={redirectedFrom}
    />
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Radial Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[420px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.18),rgba(255,255,255,0))] pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Typographic Brand Logo */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 group mb-6 focus:outline-none"
          aria-label="ReFlow Home"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-white group-hover:scale-110 transition-transform" />
          <span className="text-xl font-extrabold tracking-tight text-white">ReFlow.</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
          Create your account
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
          Record once in Google Chrome. ReFlow repeats your routine in seconds.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Suspense
          fallback={
            <div className="bg-[#09090d] border border-white/10 rounded-2xl p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          }
        >
          <SignupPageContent />
        </Suspense>
      </div>
    </div>
  );
}
