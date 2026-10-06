import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Download, Zap, RefreshCw, FolderSync } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <nav className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              P
            </div>
            <span className="font-semibold text-lg tracking-tight">PortalSync <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">SaaS</span></span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="#pricing"
              className="text-sm font-medium text-slate-400 hover:text-white transition"
            >
              Pricing
            </Link>
            <Link
              href="#features"
              className="text-sm font-medium text-slate-400 hover:text-white transition"
            >
              Features
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-300 text-xs font-medium mb-8">
          <Zap className="h-3.5 w-3.5 text-blue-400" />
          The Automated Vendor Portal Downloader for Finance & Accounts Payable
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.15] mb-6">
          Never Log Into Vendor Portals to <br />
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
            Download Invoices Manually Again
          </span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Record your portal download procedure once. PortalSync discovers new statements, loops through matching rows, downloads PDFs automatically, and syncs them to your company Google Drive and ERP.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 font-semibold text-white shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 transition"
          >
            Start 14-Day Free Trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800/80 font-medium text-slate-300 transition"
          >
            View Live Demo Console
          </Link>
        </div>
      </section>

      {/* Metrics / Social Proof */}
      <section className="border-y border-slate-900 bg-slate-900/30 py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-extrabold text-white">100%</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Bypasses 2FA & SSO</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-blue-400">18 hrs/mo</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Average Time Saved</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white">0</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Missed Invoices</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-teal-400">&lt; 2 min</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Setup per Portal</div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution */}
      <section id="features" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-white mb-4">
            Built Specifically for High-Friction Portals
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Cloud scraping bots get blocked by Cloudflare and SMS 2FA. PortalSync runs through your authenticated desktop browser while reporting status to the cloud.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition">
            <div className="p-3 w-fit rounded-xl bg-blue-500/10 text-blue-400 mb-4">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">Human-Grade Runner</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Executes locally via Chrome DevTools Protocol. Reuses your active session cookies, hardware fingerprints, and SSO credentials. Zero bot blocks.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition">
            <div className="p-3 w-fit rounded-xl bg-cyan-500/10 text-cyan-400 mb-4">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">Dynamic Table Detection</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Auto-detects invoice tables (ExtJS, DevExpress, AgGrid), loops through unchecked or new items, clicks download buttons, and verifies file receipt.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition">
            <div className="p-3 w-fit rounded-xl bg-teal-500/10 text-teal-400 mb-4">
              <FolderSync className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">Auto Cloud Sync & Dedupe</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Calculates SHA-256 hashes on downloaded PDFs so you never ingest duplicate invoices twice. Syncs clean files directly into Google Drive folders.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 border-t border-slate-900 bg-slate-900/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-4">
              Predictable, Transparent Pricing
            </h2>
            <p className="text-slate-400 text-sm">
              Save hundreds of manual hours every month. ROI guaranteed on week one.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Starter</h3>
                <p className="text-xs text-slate-400 mt-1">For single accountants or small shops</p>
                <div className="mt-6 mb-6">
                  <span className="text-4xl font-extrabold text-white">$29</span>
                  <span className="text-sm text-slate-400"> / month</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-400" /> 1 Team Seat</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-400" /> Up to 3 Vendor Portals</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-400" /> 100 Invoices / month</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-400" /> Local Directory Download</li>
                </ul>
              </div>
              <Link href="/signup?tier=starter" className="mt-8 block text-center py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 font-medium text-sm transition">
                Start Free Trial
              </Link>
            </div>

            {/* Pro (Recommended) */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-blue-950/40 to-slate-900/60 border border-blue-500/40 relative flex flex-col justify-between shadow-2xl shadow-blue-950/50">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-[11px] font-semibold text-white uppercase tracking-wider">
                Most Popular
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Pro</h3>
                <p className="text-xs text-slate-400 mt-1">For growing finance & AP teams</p>
                <div className="mt-6 mb-6">
                  <span className="text-4xl font-extrabold text-white">$99</span>
                  <span className="text-sm text-slate-400"> / month</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-200">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-400" /> 3 Team Seats</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-400" /> Unlimited Portals</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-400" /> 500 Invoices / month</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-400" /> Google Drive & OneDrive Sync</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-400" /> SHA-256 Deduplication</li>
                </ul>
              </div>
              <Link href="/signup?tier=professional" className="mt-8 block text-center py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium text-sm text-white shadow-lg shadow-blue-600/30 transition">
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Business */}
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Enterprise</h3>
                <p className="text-xs text-slate-400 mt-1">For multi-entity accounting & CFOs</p>
                <div className="mt-6 mb-6">
                  <span className="text-4xl font-extrabold text-white">$249</span>
                  <span className="text-sm text-slate-400"> / month</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-400" /> Unlimited Team Seats</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-400" /> Unlimited Portals</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-400" /> 2,500 Invoices / month</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-400" /> Accounting Webhooks (QuickBooks/Xero)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-400" /> Priority Support & Audit Logs</li>
                </ul>
              </div>
              <Link href="/signup?tier=enterprise" className="mt-8 block text-center py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 font-medium text-sm transition">
                Start Enterprise Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-900 text-center text-xs text-slate-500">
        © 2026 PortalSync. Built for enterprise AP & Finance automation.
      </footer>
    </div>
  );
}
