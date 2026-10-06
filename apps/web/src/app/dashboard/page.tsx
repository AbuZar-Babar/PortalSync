'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Play, 
  Plus, 
  FileText, 
  CheckCircle, 
  Clock, 
  Key, 
  ExternalLink, 
  Download,
  AlertCircle
} from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'workflows' | 'runs'>('workflows');

  const mockWorkflows = [
    {
      id: 'wf_1',
      name: 'iRely Invoices Only Flow',
      portal_url: 'https://customerportal.usoil.com/#/home',
      lastRun: '12 mins ago',
      status: 'Active',
      itemsDownloaded: 42,
    },
    {
      id: 'wf_2',
      name: 'Amazon Business Statement Extractor',
      portal_url: 'https://business.amazon.com/orders',
      lastRun: '2 days ago',
      status: 'Active',
      itemsDownloaded: 128,
    },
    {
      id: 'wf_3',
      name: 'Pacific Gas & Electric Monthly Bills',
      portal_url: 'https://pge.com/ebills',
      lastRun: '5 days ago',
      status: 'Paused',
      itemsDownloaded: 12,
    },
  ];

  const mockRuns = [
    {
      id: 'run_101',
      workflowName: 'iRely Invoices Only Flow',
      status: 'completed',
      itemsDiscovered: 18,
      itemsDownloaded: 12,
      time: 'Today, 2:40 PM',
      duration: '45s',
    },
    {
      id: 'run_102',
      workflowName: 'Amazon Business Statement Extractor',
      status: 'completed',
      itemsDiscovered: 50,
      itemsDownloaded: 50,
      time: 'Yesterday, 9:15 AM',
      duration: '1m 20s',
    },
    {
      id: 'run_103',
      workflowName: 'iRely Invoices Only Flow',
      status: 'failed',
      itemsDiscovered: 6,
      itemsDownloaded: 2,
      time: 'Oct 4, 11:30 AM',
      duration: '18s',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
              P
            </div>
            <span className="font-semibold tracking-tight text-white">PortalSync Console</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            Acme Finance Org
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 px-3 py-1.5 rounded-lg">
            <Key className="h-3.5 w-3.5 text-indigo-400" />
            Runner Token: <code className="font-mono text-[11px] text-indigo-200">ps_live_89f2...</code>
          </div>
          <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
            AB
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Active Portals</div>
            <div className="text-2xl font-bold text-white mt-1">3</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Invoices Downloaded (This Month)</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1">182</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Drive Sync Status</div>
            <div className="text-2xl font-bold text-teal-400 mt-1 flex items-center gap-1.5">
              <CheckCircle className="h-5 w-5" /> Healthy
            </div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Estimated Time Saved</div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">14.2 hrs</div>
          </div>
        </div>

        {/* Desktop Runner Connection Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-800/30 flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Desktop Runner Connected</div>
              <div className="text-xs text-slate-400">
                Running locally on Windows • Chrome CDP Port 9222 Active • 0 auth errors
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">Online</span>
          </div>
        </div>

        {/* Tabs and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('workflows')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition ${
                activeTab === 'workflows'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vendor Portals (Workflows)
            </button>
            <button
              onClick={() => setActiveTab('runs')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition ${
                activeTab === 'runs'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Execution History & Telemetry
            </button>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition">
            <Plus className="h-3.5 w-3.5" /> Record New Portal
          </button>
        </div>

        {/* Table Content */}
        {activeTab === 'workflows' ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Portal / Workflow Name</th>
                  <th className="px-6 py-3.5">Target Portal URL</th>
                  <th className="px-6 py-3.5">Downloaded Invoices</th>
                  <th className="px-6 py-3.5">Last Run</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {mockWorkflows.map((wf) => (
                  <tr key={wf.id} className="hover:bg-slate-900/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-400" />
                        {wf.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400 max-w-xs truncate">
                      <a href={wf.portal_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-300">
                        {wf.portal_url} <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-semibold text-white">{wf.itemsDownloaded}</span> PDFs
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      {wf.lastRun}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition">
                        <Play className="h-3 w-3 fill-current" /> Run Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Workflow</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Discovered</th>
                  <th className="px-6 py-3.5">Downloaded</th>
                  <th className="px-6 py-3.5">Started</th>
                  <th className="px-6 py-3.5 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {mockRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-900/50 transition">
                    <td className="px-6 py-4 font-medium text-white">{run.workflowName}</td>
                    <td className="px-6 py-4 text-xs">
                      {run.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          <CheckCircle className="h-3 w-3" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                          <AlertCircle className="h-3 w-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">{run.itemsDiscovered} items</td>
                    <td className="px-6 py-4 text-xs font-semibold text-white">{run.itemsDownloaded} PDFs</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{run.time}</td>
                    <td className="px-6 py-4 text-xs text-right text-slate-400 font-mono">{run.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
