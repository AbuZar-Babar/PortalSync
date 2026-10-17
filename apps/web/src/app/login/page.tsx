'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AuthCard } from '@/components/auth/AuthCard';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom') || '/dashboard';
  const tab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin';

  return (
    <AuthCard
      defaultTab={tab}
      redirectedFrom={redirectedFrom}
    />
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Radial Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[420px] bg-[radial-gradient(ellipse_75%_55%_at_50%_-10%,rgba(110,231,183,0.09),rgba(255,255,255,0))] pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Typographic Brand Logo */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 group mb-6 focus:outline-none"
          aria-label="ReFlow Home"
        >
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-200 transition-transform duration-200 group-hover:scale-110" />
          <span className="text-xl font-extrabold tracking-tight text-white">ReFlow.</span>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Suspense
          fallback={
            <div className="flex items-center justify-center rounded-2xl border border-white/[0.10] bg-[#090909] p-8">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          }
        >
          <LoginPageContent />
        </Suspense>
      </div>
    </div>
  );
}
