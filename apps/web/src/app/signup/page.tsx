'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Bot, Loader2 } from 'lucide-react';
import { AuthCard } from '@/components/auth/AuthCard';

function SignupPageContent() {
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom') || '/dashboard';
  const tab = searchParams.get('tab') === 'signin' ? 'signin' : 'signup';

  return (
    <AuthCard
      defaultTab={tab}
      redirectedFrom={redirectedFrom}
    />
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2.5 group mb-4">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 group-hover:border-blue-500/50 transition">
            <Bot className="w-8 h-8" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            PortalSync
          </span>
        </Link>
        <h2 className="text-center text-2xl font-black tracking-tight text-white">
          Create Organization
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Set up your organization workspace or sign in to an existing one
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Suspense
          fallback={
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          }
        >
          <SignupPageContent />
        </Suspense>
      </div>
    </div>
  );
}
