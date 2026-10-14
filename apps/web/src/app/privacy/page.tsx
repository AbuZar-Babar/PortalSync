import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy',
  description: 'ReFlow local-first architecture disclosures, Chrome CDP privacy invariants, and data security policies.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#050507] text-white selection:bg-white selection:text-black py-16 px-4 sm:px-6 lg:px-8">
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[400px] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(99,102,241,0.15),transparent)] pointer-events-none -z-10" />

      <div className="max-w-3xl mx-auto">
        {/* Top Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Return to ReFlow Home</span>
        </Link>

        {/* Header */}
        <div className="border-b border-white/10 pb-8 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-300 mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>LOCAL-FIRST ARCHITECTURE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Privacy Policy &amp; Data Guarantees
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 font-mono">
            Effective Date: October 14, 2026 &middot; Version 1.0.0
          </p>
        </div>

        {/* Key Guarantees Card */}
        <div className="rounded-2xl bg-[#09090d] border border-white/10 p-6 mb-10 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>Core Privacy Invariants</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-zinc-300">
            <div className="p-3 rounded-xl bg-zinc-950 border border-white/5">
              <span className="font-bold text-white block mb-1">Local Chrome Only</span>
              All browser replays occur inside your local Google Chrome session over standard CDP port 9222.
            </div>
            <div className="p-3 rounded-xl bg-zinc-950 border border-white/5">
              <span className="font-bold text-white block mb-1">No Cloud Keylogging</span>
              ReFlow does not harvest passwords, keystrokes, or confidential form data to our servers.
            </div>
            <div className="p-3 rounded-xl bg-zinc-950 border border-white/5">
              <span className="font-bold text-white block mb-1">Local Storage</span>
              Downloaded files, PDFs, and spreadsheets remain on your machine unless you configure cloud sync.
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-8 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          <section>
            <h3 className="text-base font-bold text-white mb-2">1. Information We Collect</h3>
            <p className="text-zinc-400">
              When you use ReFlow, we collect minimal operational information required to authenticate your account and orchestrate workflow execution:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-zinc-400">
              <li><strong>Account Credentials:</strong> Email address and hashed authentication tokens managed via Supabase Auth.</li>
              <li><strong>Workflow Recipes:</strong> JSON metadata describing user-recorded UI actions (click coordinates, CSS selectors, step sequencing).</li>
              <li><strong>Execution Telemetry:</strong> High-level operational metrics including step execution counts, execution duration, and failure status codes.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-bold text-white mb-2">2. Local Runner &amp; Desktop Daemon</h3>
            <p className="text-zinc-400">
              The ReFlow Desktop Runner connects to your local browser through standard Chrome DevTools Protocol (CDP). All confidential session cookies, two-factor authentication prompts, and DOM snapshots execute strictly inside your local runtime. We do not inspect, record, or transmit financial records, health data, or personal credentials entered during recorded workflows.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-white mb-2">3. File Handling &amp; Artifact Deduplication</h3>
            <p className="text-zinc-400">
              When a workflow exports CSV, PDF, or XLSX files, ReFlow computes a cryptographic SHA-256 hash locally to prevent duplicate downloads. Files remain stored inside your local downloads directory unless you explicitly pair an Amazon S3 or Google Cloud Storage bucket in your team console.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-white mb-2">4. Third-Party Disclosures &amp; Subprocessors</h3>
            <p className="text-zinc-400">
              We never sell or license your personal information or automation routines. We utilize industry-standard infrastructure providers for database hosting (Supabase, PostgreSQL) and edge routing (Next.js / Cloudflare / Vercel), each governed by enterprise Data Processing Agreements.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-white mb-2">5. Data Retention &amp; Deletion Rights</h3>
            <p className="text-zinc-400">
              You retain full ownership of your workflow recipes. You may export or permanently delete your workflows, execution history, and runner tokens at any time through the ReFlow Web Console under Workspace Settings.
            </p>
          </section>

          <section className="pt-6 border-t border-white/10">
            <h3 className="text-base font-bold text-white mb-2">6. Contact Our Compliance Team</h3>
            <p className="text-zinc-400">
              For privacy inquiries, GDPR data requests, or compliance audits, contact our team at{' '}
              <a href="mailto:privacy@reflow.app" className="text-white underline hover:text-cyan-400 transition-colors">
                privacy@reflow.app
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
