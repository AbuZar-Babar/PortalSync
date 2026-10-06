'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Bot, Building2, CheckCircle2, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [tier, setTier] = useState<'starter' | 'professional' | 'enterprise'>('professional');

  useEffect(() => {
    async function checkExistingOrg() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?redirectedFrom=/onboarding');
        return;
      }

      // Check if user already has an org
      const { data: members } = await supabase
        .from('wf_organization_members')
        .select('organization_id')
        .eq('user_id', user.id);

      if (members && members.length > 0) {
        router.push('/dashboard');
        return;
      }

      // Pre-fill company name from user metadata if provided
      if (user.user_metadata?.company_name) {
        setCompanyName(user.user_metadata.company_name);
      }

      setLoading(false);
    }

    checkExistingOrg();
  }, [router]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setError(null);
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'workspace';
      const uniqueSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;

      // 1. Create Organization
      const { data: orgData, error: orgError } = await supabase
        .from('wf_organizations')
        .insert({
          name: companyName.trim(),
          slug: uniqueSlug,
          billing_tier: tier,
        })
        .select('id')
        .single();

      if (orgError) throw orgError;

      // 2. Add User as Owner
      const { error: memberError } = await supabase
        .from('wf_organization_members')
        .insert({
          org_id: orgData.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      // Redirect to console
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to setup workspace. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm">Preparing your workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="p-2 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
            <Bot className="w-8 h-8" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">PortalSync</span>
        </div>

        <h2 className="text-center text-3xl font-extrabold tracking-tight text-white">
          Welcome! Let&apos;s set up your team workspace
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          This workspace will hold your automated vendor portals, run histories, and invoice vaults.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-8 backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleCreateOrg}>
            <div>
              <label className="block text-sm font-medium text-slate-300">Organization or Company Name</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Financial Corp"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Select Initial Plan Tier</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'starter', label: 'Starter', portals: 'Up to 3 Portals' },
                  { id: 'professional', label: 'Pro', portals: 'Up to 15 Portals', recommended: true },
                  { id: 'enterprise', label: 'Enterprise', portals: 'Unlimited' },
                ].map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setTier(plan.id as 'starter' | 'professional' | 'enterprise')}
                    className={`relative p-3 rounded-xl border text-left transition ${
                      tier === plan.id
                        ? 'border-blue-500 bg-blue-600/10 text-white shadow-sm shadow-blue-500/20'
                        : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {plan.recommended && (
                      <span className="absolute -top-2 right-2 bg-blue-500 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                    <div className="font-semibold text-sm">{plan.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{plan.portals}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workspace Features Included:</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Multi-Tenant RLS</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Desktop Runner Bridge</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Auto PDF Hash Deduplication</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Live WebSocket Telemetry</div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !companyName.trim()}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Launching Workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Workspace & Open Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
