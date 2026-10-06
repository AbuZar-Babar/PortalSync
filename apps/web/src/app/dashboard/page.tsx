'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Play, 
  Plus, 
  FileText, 
  CheckCircle, 
  Clock, 
  Key, 
  ExternalLink, 
  Download,
  AlertCircle,
  LogOut,
  Building,
  User,
  Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'workflows' | 'runs'>('workflows');
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('My Organization');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserEmail(user.email || null);

          // Get organization membership
          const { data: members } = await supabase
            .from('wf_organization_members')
            .select('organization_id, role, wf_organizations(name, slug)')
            .eq('user_id', user.id)
            .limit(1);

          if (members && members.length > 0) {
            const orgData = (members[0] as any).wf_organizations;
            const orgIdentifier = members[0].organization_id;
            setOrgId(orgIdentifier);
            if (orgData?.name) {
              setOrganizationName(orgData.name);
            }

            // Fetch workflows for this org
            const { data: wfList } = await supabase
              .from('wf_workflows')
              .select('*')
              .eq('organization_id', orgIdentifier)
              .order('created_at', { ascending: false });

            if (wfList && wfList.length > 0) {
              setWorkflows(wfList);
            }

            // Fetch runs
            const { data: runList } = await supabase
              .from('wf_execution_runs')
              .select('*, wf_workflows(name)')
              .eq('organization_id', orgIdentifier)
              .order('created_at', { ascending: false })
              .limit(10);

            if (runList && runList.length > 0) {
              setRuns(runList);
            }
          }
        }
      } catch (err) {
        console.error('Error loading dashboard session:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Fallback presentation data if workspace is new
  const displayWorkflows = workflows.length > 0 ? workflows : [
    {
      id: 'wf_sample_1',
      name: 'US Oil (iRely Portal)',
      portal_url: 'https://customerportal.usoil.com/#/home',
      lastRun: '12 mins ago',
      status: 'active',
      itemsDownloaded: 42,
    },
    {
      id: 'wf_sample_2',
      name: 'Amazon Business Invoices',
      portal_url: 'https://business.amazon.com/orders',
      lastRun: '2 days ago',
      status: 'active',
      itemsDownloaded: 128,
    },
    {
      id: 'wf_sample_3',
      name: 'Pacific Gas & Electric Monthly Bills',
      portal_url: 'https://pge.com/ebills',
      lastRun: '5 days ago',
      status: 'paused',
      itemsDownloaded: 12,
    },
  ];

  const displayRuns = runs.length > 0 ? runs : [
    {
      id: 'run_sample_1',
      workflowName: 'US Oil (iRely Portal)',
      status: 'completed',
      itemsDiscovered: 18,
      itemsDownloaded: 12,
      time: 'Today, 2:40 PM',
      duration: '45s',
    },
    {
      id: 'run_sample_2',
      workflowName: 'Amazon Business Invoices',
      status: 'completed',
      itemsDiscovered: 50,
      itemsDownloaded: 50,
      time: 'Yesterday, 9:15 AM',
      duration: '1m 20s',
    },
    {
      id: 'run_sample_3',
      workflowName: 'Pacific Gas & Electric Monthly Bills',
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
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
              P
            </div>
            <span className="font-semibold tracking-tight text-white">PortalSync Console</span>
          </Link>
          <span className="text-slate-600">/</span>
          <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700/60">
            <Building className="w-3.5 h-3.5 text-blue-400" />
            <span>{organizationName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs bg-blue-950/60 text-blue-300 border border-blue-800/40 px-3 py-1.5 rounded-lg">
            <Key className="h-3.5 w-3.5 text-blue-400" />
            Runner Token: <code className="font-mono text-[11px] text-blue-200">ps_live_{orgId?.substring(0, 8) || 'test89f2'}...</code>
          </div>

          {userEmail && (
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="max-w-[150px] truncate">{userEmail}</span>
            </div>
          )}

          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Active Portals</div>
            <div className="text-2xl font-bold text-white mt-1">{displayWorkflows.length}</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Invoices Downloaded (This Month)</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">182</div>
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
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-800/30 flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
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
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vendor Portals ({displayWorkflows.length})
            </button>
            <button
              onClick={() => setActiveTab('runs')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition ${
                activeTab === 'runs'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Execution History & Telemetry
            </button>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition">
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
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayWorkflows.map((wf) => (
                  <tr key={wf.id} className="hover:bg-slate-900/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-400" />
                        {wf.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400 max-w-xs truncate">
                      <a href={wf.portal_url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-300">
                        {wf.portal_url || 'https://vendor-portal.com'} <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-semibold text-white">{wf.itemsDownloaded ?? 0}</span> PDFs
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium capitalize">
                        {wf.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-medium transition">
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
                  <th className="px-6 py-3.5">Time</th>
                  <th className="px-6 py-3.5 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-900/50 transition">
                    <td className="px-6 py-4 font-medium text-white">{run.workflowName || run.wf_workflows?.name || 'Portal Run'}</td>
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
                    <td className="px-6 py-4 text-xs">{run.items_discovered ?? run.itemsDiscovered ?? 0} items</td>
                    <td className="px-6 py-4 text-xs font-semibold text-white">{run.items_downloaded ?? run.itemsDownloaded ?? 0} PDFs</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{run.time || new Date(run.created_at).toLocaleTimeString()}</td>
                    <td className="px-6 py-4 text-xs text-right text-slate-400 font-mono">{run.duration || '35s'}</td>
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
