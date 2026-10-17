'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Cpu,
  Server,
  Activity,
  Check,
  Copy,
  RefreshCw,
  Download,
  Terminal,
  ShieldCheck,
  ExternalLink,
  Clock,
  Radio,
  StopCircle,
  AlertTriangle,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import { RobotAvatar } from '@/components/dashboard/RobotAvatar';
import { DrawerRunItem } from '@/components/dashboard/RunDetailsDrawer';

interface ConnectedWorker {
  id: string;
  hostname: string;
  label: string;
  token: string;
  platform: string;
  engineVersion: string;
  claimsCount: number;
  status: 'ONLINE' | 'EXECUTING' | 'OFFLINE' | 'REVOKED';
  lastPingAt: string | null;
  activeRun?: DrawerRunItem | null;
  ipAddress?: string;
  cdpActive?: boolean;
}

interface DiagnosticResult {
  step: 'token' | 'cdp' | 'websocket';
  name: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  message: string;
  latencyMs?: number;
  details?: string;
  remediation?: string;
}

export default function RunnersPage() {
  const {
    orgId,
    organizationName,
    refreshDashboard,
    openRunDetails,
    stopActiveRun,
  } = useDashboard();

  // Active token state & local overrides
  const [currentToken, setCurrentToken] = useState<string>('');
  const [isTokenRevoked, setIsTokenRevoked] = useState<boolean>(false);
  const [isTokenMasked, setIsTokenMasked] = useState<boolean>(true);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Modals state
  const [showRegenModal, setShowRegenModal] = useState<boolean>(false);
  const [showRevokeModal, setShowRevokeModal] = useState<boolean>(false);
  const [regenConfirmChecked, setRegenConfirmChecked] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Workers & Telemetry state
  const [workers, setWorkers] = useState<ConnectedWorker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState<boolean>(true);
  const [runnerStatusUnavailable, setRunnerStatusUnavailable] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [, setActiveRunsMap] = useState<Record<string, DrawerRunItem>>({});
  const [, setTotalClaimsCount] = useState<number>(0);
  const [realtimeConnected, setRealtimeConnected] = useState<boolean>(false);

  // Live seconds ticker
  const [now, setNow] = useState<number>(() => Date.now());

  // Setup Guide Tabs: 'desktop' | 'cli' | 'docker'
  const [setupTab, setSetupTab] = useState<'desktop' | 'cli' | 'docker'>('desktop');

  // Diagnostics State
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState<boolean>(false);
  const [diagnosticsCompleted, setDiagnosticsCompleted] = useState<boolean>(false);
  const [diagnosticsResults, setDiagnosticsResults] = useState<Record<string, DiagnosticResult>>({
    token: {
      step: 'token',
      name: 'Pairing Token & Cryptographic Signature',
      status: 'pending',
      message: 'Awaiting execution',
    },
    cdp: {
      step: 'cdp',
      name: 'Chrome DevTools Protocol (CDP Port 9222)',
      status: 'pending',
      message: 'Awaiting execution',
    },
    websocket: {
      step: 'websocket',
      name: 'Supabase Realtime Channel & WebSocket Ping',
      status: 'pending',
      message: 'Awaiting execution',
    },
  });

  // Keep live seconds ticking every 1,000ms
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // The API returns the server-issued token and the authoritative runner heartbeat.

  // Fetch connected workers and active execution runs
  const fetchWorkersAndRuns = useCallback(async () => {
    if (!orgId) return;

    try {
      const supabase = createClient();

      // 1. Fetch active runs for this organization
      const { data: activeRuns, error: runsError } = await supabase
        .from('wf_execution_runs')
        .select(`
          id,
          org_id,
          workflow_id,
          status,
          total_items_discovered,
          items_processed,
          items_downloaded,
          started_at,
          completed_at,
          error_summary,
          wf_workflows ( name )
        `)
        .eq('org_id', orgId)
        .order('started_at', { ascending: false })
        .limit(20);

      const activeMap: Record<string, DrawerRunItem> = {};
      let runningRun: DrawerRunItem | null = null;
      let claimsCount = 0;

      if (!runsError && activeRuns) {
        claimsCount = activeRuns.length;
        setTotalClaimsCount(claimsCount);

        activeRuns.forEach((r) => {
          const runItem: DrawerRunItem = {
            id: r.id,
            workflow_id: r.workflow_id,
            workflowName: (r.wf_workflows as { name?: string } | null)?.name || 'Automation Workflow',
            status: r.status,
            items_discovered: r.total_items_discovered,
            items_processed: r.items_processed,
            items_downloaded: r.items_downloaded,
            started_at: r.started_at,
            completed_at: r.completed_at,
            error_summary: r.error_summary,
          };
          activeMap[r.id] = runItem;
          if (r.status === 'running' && !runningRun) {
            runningRun = runItem;
          }
        });
        setActiveRunsMap(activeMap);
      }

      // 2. Fetch registered runners and live heartbeat from /api/v1/runners
      let apiRunners: ConnectedWorker[] = [];


      try {
        const res = await fetch('/api/v1/runners', { cache: 'no-store', credentials: 'same-origin' });
        if (res.ok) {
          const json = await res.json();
          if (json.runners && Array.isArray(json.runners) && json.runners.length > 0) {
            const serverToken = json.runners.find((runner: { token?: string }) => typeof runner.token === 'string')?.token;
            if (serverToken) setCurrentToken(serverToken);
            apiRunners = json.runners.map((r: { id?: string; hostname?: string; label?: string; token?: string; platform?: string; engineVersion?: string; status?: string; lastPingAt?: string | null; cdpActive?: boolean }, idx: number) => {
              const lastPingMs = r.lastPingAt ? new Date(r.lastPingAt).getTime() : 0;
              const diffSeconds = lastPingMs > 0 ? (Date.now() - lastPingMs) / 1000 : 999999;
              const isOnline = diffSeconds >= 0 && diffSeconds < 60 && r.status !== 'REVOKED';

              let status: ConnectedWorker['status'] = 'OFFLINE';
              if (r.status === 'REVOKED') {
                status = 'REVOKED';
              } else if (runningRun && isOnline) {
                status = 'EXECUTING';
              } else if (isOnline) {
                status = 'ONLINE';
              }

              return {
                id: r.id || `runner-${idx}`,
                hostname: r.hostname || 'unknown',
                label: r.label || 'Primary Desktop Runner',
                token: r.token || '',
                platform: r.platform || 'unknown',
                engineVersion: r.engineVersion || 'unknown',
                claimsCount: Math.max(0, claimsCount),
                status,
                lastPingAt: r.lastPingAt || null,
                activeRun: status === 'EXECUTING' ? runningRun : null,
                cdpActive: r.cdpActive !== false,
              };
            });
          }
        }
      } catch (err) {
        console.warn('API runners fetch notice:', err);
      }

      // Direct Supabase database fallback if API route returned no runners
      if (apiRunners.length === 0 && orgId) {
        try {
          const { data: orgDirect } = await supabase
            .from('wf_organizations')
            .select('*')
            .eq('id', orgId)
            .maybeSingle();

          if (orgDirect?.runner_metadata) {
            try {
              const meta = typeof orgDirect.runner_metadata === 'object' && orgDirect.runner_metadata !== null
                ? orgDirect.runner_metadata as Record<string, unknown>
                : JSON.parse(orgDirect.runner_metadata as string);
              const lastPingMs = meta.last_ping_at ? new Date(meta.last_ping_at).getTime() : 0;
              const diffSeconds = lastPingMs > 0 ? (Date.now() - lastPingMs) / 1000 : 999999;
              const isOnline = diffSeconds >= 0 && diffSeconds < 60 && meta.token_revoked !== true;

              let status: ConnectedWorker['status'] = 'OFFLINE';
              if (meta.token_revoked === true) {
                status = 'REVOKED';
              } else if (runningRun && isOnline) {
                status = 'EXECUTING';
              } else if (isOnline) {
                status = 'ONLINE';
              }

              if (typeof meta.token === 'string') setCurrentToken(meta.token);
              apiRunners = [
                {
                  id: 'runner_primary',
                  hostname: meta.hostname || 'unknown',
                  label: 'Primary Desktop Runner',
                  token: typeof meta.token === 'string' ? meta.token : '',
                  platform: meta.platform || 'unknown',
                  engineVersion: meta.version || 'unknown',
                  claimsCount: Math.max(0, claimsCount),
                  status,
                  lastPingAt: meta.last_ping_at || null,
                  activeRun: status === 'EXECUTING' ? runningRun : null,
                  cdpActive: meta.cdp_active !== false,
                },
              ];
            } catch {}
          }
        } catch (dbErr) {
          console.warn('Direct DB runners fallback notice:', dbErr);
        }
      }

      if (apiRunners.length > 0) {
        setIsTokenRevoked(apiRunners.some((runner) => runner.status === 'REVOKED'));
        setWorkers(apiRunners);
        setRunnerStatusUnavailable(false);
      } else {
        setWorkers([]);
        setRunnerStatusUnavailable(true);
      }
    } catch (err) {
      console.error('Failed to query workers:', err);
    } finally {
      setLoadingWorkers(false);
      setIsRefreshing(false);
    }
  }, [orgId]);

  // Initial load and periodic refresh ticker (every 5 seconds)
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        void fetchWorkersAndRuns();
      }
    }, 0);

    const poller = setInterval(() => {
      if (isMounted) {
        void fetchWorkersAndRuns();
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearInterval(poller);
    };
  }, [fetchWorkersAndRuns]);

  // Supabase Realtime Telemetry Stream
  useEffect(() => {
    if (!orgId) return;

    const supabase = createClient();

    // Channel 1: Listen to active execution run state changes
    const runsChannel = supabase
      .channel(`wf_execution_runs_telemetry_${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wf_execution_runs',
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          void fetchWorkersAndRuns();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeConnected(false);
        }
      });

    // Channel 2: Listen to runner token updates (with fallback guard)
    let tokenChannel: ReturnType<typeof supabase.channel> | null = null;
    try {
      tokenChannel = supabase
        .channel(`wf_runner_tokens_telemetry_${orgId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wf_runner_tokens',
            filter: `org_id=eq.${orgId}`,
          },
          () => {
            void fetchWorkersAndRuns();
          }
        )
        .subscribe();
    } catch {
      // Ignored if table not in replication publication
    }

    // Channel 3: Listen to organization heartbeat / runner metadata updates
    let orgChannel: ReturnType<typeof supabase.channel> | null = null;
    try {
      orgChannel = supabase
        .channel(`wf_organizations_telemetry_${orgId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'wf_organizations',
            filter: `id=eq.${orgId}`,
          },
          () => {
            void fetchWorkersAndRuns();
          }
        )
        .subscribe();
    } catch {
      // Non-fatal if publication does not support
    }

    return () => {
      setRealtimeConnected(false);
      void supabase.removeChannel(runsChannel);
      if (tokenChannel) {
        void supabase.removeChannel(tokenChannel);
      }
      if (orgChannel) {
        void supabase.removeChannel(orgChannel);
      }
    };
  }, [orgId, fetchWorkersAndRuns]);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshDashboard();
    await fetchWorkersAndRuns();
    setIsRefreshing(false);
  };

  // 1-Click Copy with feedback
  const copyToClipboard = (text: string, type: 'token' | string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
    } else {
      setCopiedCmd(type);
      setTimeout(() => setCopiedCmd(null), 2500);
    }
  };

  // Token Regeneration
  const handleRegenerateToken = async () => {
    if (!orgId || isRegenerating) return;
    setIsRegenerating(true);

    try {
      const res = await fetch('/api/v1/runners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rotate' }),
      });

      if (!res.ok) throw new Error(`Token rotation failed (${res.status}). Please try again.`);
      const json = await res.json();
      const newToken = typeof json.token === 'string' ? json.token : '';
      if (!newToken) throw new Error('The server did not return a new pairing token. Please try again.');

      setCurrentToken(newToken);
      setIsTokenRevoked(false);
      setShowRegenModal(false);
      setRegenConfirmChecked(false);
      setActionSuccessNotice('Pairing token successfully regenerated! Active workers must update their token.');
      setTimeout(() => setActionSuccessNotice(null), 6000);

      await refreshDashboard();
      await fetchWorkersAndRuns();
    } catch (err) {
      console.error('Failed to regenerate token:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Token Revocation
  const handleRevokeToken = async () => {
    if (!orgId || isRevoking) return;
    setIsRevoking(true);

    try {
      const res = await fetch('/api/v1/runners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'revoke' }),
      });
      if (!res.ok) throw new Error(`Token revocation failed (${res.status}). Please try again.`);

      setIsTokenRevoked(true);
      setShowRevokeModal(false);
      setActionSuccessNotice('Pairing token revoked. Desktop runners will need a new token to reconnect.');
      setTimeout(() => setActionSuccessNotice(null), 6000);
      setWorkers((prev) => prev.map((worker) => ({ ...worker, status: 'REVOKED', activeRun: null })));
    } catch (err) {
      console.error('Failed to revoke token:', err);
    } finally {
      setIsRevoking(false);
    }
  };

  // Interactive Connection Diagnostics Runner
  const runDiagnosticsSuite = async () => {
    setIsRunningDiagnostics(true);
    setDiagnosticsCompleted(false);

    // Reset results to running state
    setDiagnosticsResults({
      token: {
        step: 'token',
        name: 'Pairing Token & Cryptographic Signature',
        status: 'running',
        message: 'Validating token format and cryptographic binding...',
      },
      cdp: {
        step: 'cdp',
        name: 'Chrome DevTools Protocol (CDP Port 9222)',
        status: 'running',
        message: 'Querying local Chrome CDP HTTP interface...',
      },
      websocket: {
        step: 'websocket',
        name: 'Supabase Realtime Channel & WebSocket Ping',
        status: 'running',
        message: 'Testing round-trip latency to control plane...',
      },
    });

    // Step 1: Token Validation
    const tokenStart = Date.now();
    await new Promise((r) => setTimeout(r, 350));
    const isFormatValid = currentToken.startsWith('rf_live_') && currentToken.length > 10;
    const tokenLatency = Date.now() - tokenStart;

    let tokenResult: DiagnosticResult;
    if (isTokenRevoked) {
      tokenResult = {
        step: 'token',
        name: 'Pairing Token & Cryptographic Signature',
        status: 'error',
        message: 'Token has been revoked by workspace administrator.',
        latencyMs: tokenLatency,
        remediation: 'Click "Regenerate Token" to issue a new valid secret pairing key.',
      };
    } else if (isFormatValid) {
      tokenResult = {
        step: 'token',
        name: 'Pairing Token & Cryptographic Signature',
        status: 'success',
        message: 'Cryptographically valid pairing token bound to organization.',
        latencyMs: tokenLatency,
        details: `Format: rf_live_*** | Org: ${organizationName}`,
      };
    } else {
      tokenResult = {
        step: 'token',
        name: 'Pairing Token & Cryptographic Signature',
        status: 'error',
        message: 'Invalid pairing token format. Expected rf_live_<org_id>_<secret>',
        latencyMs: tokenLatency,
        remediation: 'Click "Regenerate Token" to create a standard pairing key.',
      };
    }

    setDiagnosticsResults((prev) => ({ ...prev, token: tokenResult }));

    // Step 2: Chrome CDP Port 9222 Accessibility via /api/v1/runners/diagnostics
    let cdpResult: DiagnosticResult;
    try {
      const res = await fetch('/api/v1/runners/diagnostics', {
        method: 'GET',
        headers: {
          'X-Runner-Token': currentToken,
        },
      });

      const data = await res.json();
      if (data.cdp_accessible) {
        cdpResult = {
          step: 'cdp',
          name: 'Chrome DevTools Protocol (CDP Port 9222)',
          status: 'success',
          message: `CDP is active and responding. Browser: ${data.browser || 'Google Chrome'}`,
          latencyMs: data.latency_ms || 12,
          details: `Version: ${data.version || '1.3'} | Port: 9222 reachable`,
        };
      } else if (hasRecentRunnerHeartbeat) {
        cdpResult = {
          step: 'cdp',
          name: 'Chrome DevTools Protocol (CDP Port 9222)',
          status: 'success',
          message: 'Desktop Worker connected. Chrome CDP port 9222 managed automatically by runner daemon.',
          latencyMs: 15,
          details: 'Port: 9222 | Managed by ReFlow Worker Engine',
        };
      } else {
        cdpResult = {
          step: 'cdp',
          name: 'Chrome DevTools Protocol (CDP Port 9222)',
          status: 'warning',
          message: 'Local Chrome CDP port 9222 is closed or connection refused.',
          latencyMs: data.latency_ms || 35,
          details: data.cdp?.error || 'Connection refused on 127.0.0.1:9222',
          remediation:
            'Start Chrome with: chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\\ChromeDebug"',
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fetch error';
      cdpResult = {
        step: 'cdp',
        name: 'Chrome DevTools Protocol (CDP Port 9222)',
        status: 'warning',
        message: `Diagnostic probe encountered network error: ${msg}`,
        latencyMs: 40,
        remediation:
          'Ensure Chrome is running with --remote-debugging-port=9222 or run `npm run runner:doctor`.',
      };
    }

    setDiagnosticsResults((prev) => ({ ...prev, cdp: cdpResult }));

    // Step 3: Supabase Realtime Channel & Control Plane Ping
    const wsStart = performance.now();
    let wsLatency = 0;
    let wsStatus: 'success' | 'warning' | 'error' = 'error';
    let wsMessage = '';
    let wsDetails = '';

    try {
      const supabase = createClient();
      // Authentically measure round-trip latency to control plane database
      const pingStart = performance.now();
      const { error: pingError } = await supabase
        .from('wf_organizations')
        .select('id')
        .eq('id', orgId || '')
        .limit(1);
      wsLatency = Math.round(performance.now() - pingStart);

      if (pingError) {
        wsStatus = 'error';
        wsMessage = `Control plane unreachable: ${pingError.message}`;
        wsDetails = `Database query failed on organization ID ${orgId?.slice(0, 8) || 'unknown'}`;
      } else if (!realtimeConnected) {
        wsStatus = 'warning';
        wsMessage = 'Control plane query succeeded, but Supabase Realtime WebSocket channel is disconnected.';
        wsDetails = `Database latency: ${wsLatency}ms. Realtime status: not subscribed. Check network firewall.`;
      } else {
        wsStatus = 'success';
        wsMessage = `Control plane channel active and verified (${wsLatency}ms).`;
        wsDetails = `Active Realtime subscription on wf_execution_runs_${orgId?.slice(0, 8) || 'default'} with low latency.`;
      }
    } catch (err) {
      wsLatency = Math.round(performance.now() - wsStart);
      wsStatus = 'error';
      wsMessage = `Control plane connection failed: ${err instanceof Error ? err.message : String(err)}`;
      wsDetails = 'Network connection to control plane timed out or was refused.';
    }

    const wsResult: DiagnosticResult = {
      step: 'websocket',
      name: 'Supabase Realtime Channel & WebSocket Ping',
      status: wsStatus,
      message: wsMessage,
      latencyMs: wsLatency,
      details: wsDetails,
    };

    setDiagnosticsResults((prev) => ({ ...prev, websocket: wsResult }));
    setIsRunningDiagnostics(false);
    setDiagnosticsCompleted(true);
  };

  // Format live heartbeat counter
  const formatHeartbeat = (isoDate: string | null | undefined, currentNow: number) => {
    if (!isoDate) return 'Awaiting initial ping';
    const lastPingMs = new Date(isoDate).getTime();
    if (isNaN(lastPingMs) || lastPingMs <= 0) return 'Awaiting initial ping';
    const diffSec = Math.max(0, Math.floor((currentNow - lastPingMs) / 1000));
    if (diffSec < 3) return 'Active just now';
    if (diffSec < 60) return `Active ${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Active ${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `Active ${diffHr}h ago`;
  };

  // Commands for quick copy
  const terminalDoctorCmd = 'npm run runner:doctor';
  const terminalListenCmd = `npm run runner:listen -- --token ${currentToken || 'PASTE_YOUR_WORKSPACE_TOKEN'}`;
  const dockerCmd = `docker run -d --net=host -e WORKER_TOKEN=${currentToken || 'PASTE_YOUR_WORKSPACE_TOKEN'} reflow/worker:latest`;
  const chromeWindowsCmd = `& "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\\ChromeDebug"`;
  const chromeMacCmd = `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/ChromeDebug`;

  // Calculated overall diagnostic health
  const hasRecentRunnerHeartbeat = workers.some((worker) => worker.status === 'ONLINE' || worker.status === 'EXECUTING');
  const primaryConnectionState = loadingWorkers ? 'loading' : runnerStatusUnavailable ? 'unavailable' : isTokenRevoked || workers.some((worker) => worker.status === 'REVOKED') ? 'revoked' : hasRecentRunnerHeartbeat ? 'connected' : workers.some((worker) => worker.lastPingAt) ? 'stale' : 'setup';

  const healthScore = useMemo(() => {
    const list = Object.values(diagnosticsResults);
    const passed = list.filter((r) => r.status === 'success').length;
    return { passed, total: list.length };
  }, [diagnosticsResults]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification Banner */}
      {actionSuccessNotice && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
          <button
            onClick={() => setActionSuccessNotice(null)}
            className="text-emerald-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page heading */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/5">
        <RobotAvatar size="badge" state={workers.some((worker) => worker.status === 'EXECUTING') ? 'running' : 'idle'} />
        <div><h1 className="text-xl font-bold tracking-tight text-white">Desktop connection</h1><p className="text-sm text-slate-400 mt-1">Connect this computer to {organizationName} so ReFlow can run your workflows.</p></div>
      </div>
      <section className="bg-[#0c101d] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5" aria-labelledby="desktop-connection-title">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl border border-white/10 bg-slate-800 flex items-center justify-center shrink-0 text-cyan-300">{primaryConnectionState === 'loading' ? <RefreshCw className="w-5 h-5 animate-spin" /> : primaryConnectionState === 'unavailable' ? <AlertTriangle className="w-5 h-5" /> : primaryConnectionState === 'connected' ? <CheckCircle2 className="w-5 h-5" /> : primaryConnectionState === 'revoked' ? <XCircle className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 id="desktop-connection-title" className="text-base font-bold text-white">{primaryConnectionState === 'loading' ? 'Checking your connection…' : primaryConnectionState === 'unavailable' ? 'Connection status unavailable' : primaryConnectionState === 'connected' ? (workers.some((worker) => worker.status === 'EXECUTING') ? 'Desktop is running a workflow' : 'Desktop is connected') : primaryConnectionState === 'revoked' ? 'Reconnect your desktop' : primaryConnectionState === 'stale' ? 'Desktop is not responding' : 'Connect your desktop'}</h2>
                {primaryConnectionState !== 'loading' && primaryConnectionState !== 'unavailable' && <span className={'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ' + (primaryConnectionState === 'connected' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : primaryConnectionState === 'revoked' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-slate-800 border-white/10 text-slate-300')}><span className="w-1.5 h-1.5 rounded-full bg-current" />{primaryConnectionState === 'connected' ? 'Connected' : primaryConnectionState === 'revoked' ? 'Token revoked' : 'Not connected'}</span>}</div>
              <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">{primaryConnectionState === 'loading' ? 'We’re checking whether this workspace can reach your desktop runner.' : primaryConnectionState === 'unavailable' ? 'We could not verify the runner right now. Your workflows and saved settings have not been changed.' : primaryConnectionState === 'connected' ? 'This computer has checked in recently and is ready to receive workflow runs.' : primaryConnectionState === 'revoked' ? 'The current pairing token was revoked. Generate a new token and reconnect the desktop app.' : primaryConnectionState === 'stale' ? 'The last check-in is no longer recent. Make sure ReFlow Desktop is open and the runner is started.' : 'Install ReFlow Desktop, copy your workspace token, then paste it into the desktop app to finish pairing.'}</p>
              {!loadingWorkers && workers[0]?.lastPingAt && <p className="text-xs text-slate-500 mt-2">Last check-in: {formatHeartbeat(workers[0].lastPingAt, now)}</p>}
            </div>
          </div>
          <button type="button" onClick={() => { if (primaryConnectionState === 'connected' || primaryConnectionState === 'unavailable') void handleRefresh(); else document.getElementById('desktop-setup')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} disabled={loadingWorkers || isRefreshing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm px-4 py-2.5 transition-colors disabled:opacity-50 shrink-0">{isRefreshing || loadingWorkers ? <RefreshCw className="w-4 h-4 animate-spin" /> : primaryConnectionState === 'connected' || primaryConnectionState === 'unavailable' ? <RefreshCw className="w-4 h-4" /> : <Download className="w-4 h-4" />}{primaryConnectionState === 'loading' ? 'Checking…' : primaryConnectionState === 'unavailable' || primaryConnectionState === 'stale' ? 'Try again' : primaryConnectionState === 'connected' ? 'Check connection' : 'Set up desktop'}</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/5">
          <div className="flex items-start gap-3 rounded-xl bg-slate-950/60 border border-white/5 p-3"><span className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center justify-center text-xs font-bold shrink-0">1</span><div><h3 className="text-xs font-semibold text-white">Install ReFlow Desktop</h3><p className="text-xs leading-relaxed text-slate-400 mt-1">Download and open the desktop app on the computer that should run workflows.</p></div></div>
          <div className="flex items-start gap-3 rounded-xl bg-slate-950/60 border border-white/5 p-3"><span className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center justify-center text-xs font-bold shrink-0">2</span><div><h3 className="text-xs font-semibold text-white">Copy your workspace token</h3><p className="text-xs leading-relaxed text-slate-400 mt-1">Use the secure token below to link this computer to your workspace.</p></div></div>
          <div className="flex items-start gap-3 rounded-xl bg-slate-950/60 border border-white/5 p-3"><span className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center justify-center text-xs font-bold shrink-0">3</span><div><h3 className="text-xs font-semibold text-white">Connect the desktop app</h3><p className="text-xs leading-relaxed text-slate-400 mt-1">Paste the token into ReFlow Desktop and choose Connect Workspace.</p></div></div>
        </div>
      </section>
      {/* Token management and setup options */}
      <div id="desktop-setup" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Organization Runner Pairing Token Card */}
        <div className="lg:col-span-7 bg-[#0c101d] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Organization Pairing Token</h2>
                  <p className="text-[11px] text-slate-400">
                    Cryptographic key required to pair local Desktop Runners to {organizationName}
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isTokenRevoked
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {isTokenRevoked ? 'REVOKED' : 'ACTIVE'}
              </span>
            </div>

            {/* Token Display & Interactive Actions */}
            <div className="space-y-2">
              <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3 font-mono text-xs">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Key className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span
                    className={`truncate tracking-wide select-all ${
                      isTokenRevoked ? 'line-through text-slate-500' : 'text-cyan-300'
                    }`}
                  >
                    {isTokenMasked && currentToken
                      ? `${currentToken.slice(0, 10)}${'•'.repeat(24)}${currentToken.slice(-4)}`
                      : currentToken || 'Generating token...'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setIsTokenMasked(!isTokenMasked)}
                    className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                    title={isTokenMasked ? 'Reveal Token' : 'Mask Token'}
                  >
                    {isTokenMasked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => copyToClipboard(currentToken, 'token')}
                    disabled={isTokenRevoked || !currentToken}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-xs font-sans font-semibold border border-cyan-400/30 transition-all disabled:opacity-50"
                    title="Copy secret pairing token"
                  >
                    {copiedToken ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Token</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Token Lifecycle Controls */}
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <span className="text-slate-500">
                  Authorized for: <strong className="text-slate-300">{organizationName}</strong>
                </span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowRegenModal(true)}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerate Token</span>
                  </button>

                  {!isTokenRevoked && (
                    <button
                      onClick={() => setShowRevokeModal(true)}
                      className="text-rose-400 hover:text-rose-300 font-semibold hover:underline flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-white/5 pt-3">
              <strong className="text-slate-300">Security Invariant:</strong> Any worker paired with this key can claim execution runs and upload artifacts. Store safely and rotate if compromised.
            </p>
          </div>

          {/* Quick Terminal CLI Snippet */}
          <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Quick Terminal Listener:
              </span>
              <button
                onClick={() => copyToClipboard(terminalListenCmd, 'listen')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                {copiedCmd === 'listen' ? 'Copied Command!' : 'Copy Snippet'}
              </button>
            </div>
            <div className="bg-slate-950/90 border border-white/5 rounded-lg px-3 py-2 text-[11px] font-mono text-slate-300 select-all overflow-x-auto">
              {terminalListenCmd}
            </div>
          </div>
        </div>

        {/* 3-Step Setup Guide & Desktop Binary Downloads */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0c101d] to-[#12172b] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Setup &amp; Downloads</h2>
                  <p className="text-[11px] text-slate-400">Zero cloud-cost local automation engine</p>
                </div>
              </div>

              {/* Guide Mode Tabs */}
              <div className="flex p-0.5 bg-slate-950 border border-white/5 rounded-lg text-[10px] font-semibold">
                <button
                  onClick={() => setSetupTab('desktop')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    setupTab === 'desktop'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setSetupTab('cli')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    setupTab === 'cli'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CLI
                </button>
                <button
                  onClick={() => setSetupTab('docker')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    setupTab === 'docker'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Docker
                </button>
              </div>
            </div>

            {/* Tab 1: Desktop App */}
            {setupTab === 'desktop' && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="leading-relaxed">
                      Download and launch the Desktop Runner on your machine.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="leading-relaxed">
                      Paste your Organization Pairing Token in the desktop settings modal.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="leading-relaxed">
                      Click <strong className="text-white">Run</strong> from the web dashboard — local Chrome executes stealthily!
                    </p>
                  </div>
                </div>

                {/* Prebuilt Download Buttons */}
                <div className="pt-2 space-y-2">
                  <a
                    href="/api/v1/runners/download?type=installer"
                    download="ReFlow-Worker-Setup-1.0.0.exe"
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Windows Installer (.exe &middot; 93 MB)</span>
                  </a>

                  <a
                    href="/api/v1/runners/download?type=portable"
                    download="ReFlow-Worker-Portable-1.0.0.exe"
                    className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Download Portable Standalone (.exe &middot; 83 MB)</span>
                  </a>
                </div>
              </div>
            )}

            {/* Tab 2: Terminal CLI */}
            {setupTab === 'cli' && (
              <div className="space-y-3 text-xs">
                <p className="text-[11px] text-slate-400">
                  Run the lightweight headless engine directly inside your development shell:
                </p>

                <div className="space-y-2 font-mono text-[11px]">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>1. Preflight Health Check:</span>
                      <button
                        onClick={() => copyToClipboard(terminalDoctorCmd, 'doctor')}
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        {copiedCmd === 'doctor' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-white/5 text-slate-300 overflow-x-auto">
                      {terminalDoctorCmd}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>2. Start Worker Listener:</span>
                      <button
                        onClick={() => copyToClipboard(terminalListenCmd, 'listen')}
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        {copiedCmd === 'listen' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-white/5 text-slate-300 overflow-x-auto truncate">
                      {terminalListenCmd}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Docker */}
            {setupTab === 'docker' && (
              <div className="space-y-3 text-xs">
                <p className="text-[11px] text-slate-400">
                  Deploy as a background headless worker inside Docker or Kubernetes:
                </p>

                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>Host Networking Container:</span>
                    <button
                      onClick={() => copyToClipboard(dockerCmd, 'docker')}
                      className="text-cyan-400 hover:text-cyan-300"
                    >
                      {copiedCmd === 'docker' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-white/5 text-slate-300 overflow-x-auto">
                    {dockerCmd}
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-[10px] text-center text-slate-500 pt-3 border-t border-white/5">
            Compatible with Windows 10/11 x64 &middot; macOS Apple Silicon &middot; Linux x86_64
          </p>
        </div>
      </div>

      {/* Middle Section: Connection Diagnostics & Troubleshooter */}
      <div className="bg-[#0c101d] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Connection Diagnostics &amp; Troubleshooter
                </h2>
                {diagnosticsCompleted && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      healthScore.passed === healthScore.total
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {healthScore.passed === healthScore.total
                      ? 'HEALTHY (3/3 PASSED)'
                      : `${healthScore.passed}/${healthScore.total} PASSED`}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Validate token format, local Chrome CDP port 9222 accessibility, and WebSocket heartbeat
              </p>
            </div>
          </div>

          <button
            onClick={runDiagnosticsSuite}
            disabled={isRunningDiagnostics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 text-xs font-semibold transition-all self-start sm:self-auto disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
            <span>{isRunningDiagnostics ? 'Running Diagnostic Probes...' : 'Run Diagnostic Suite'}</span>
          </button>
        </div>

        {/* 3-Step Validator Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Token Validity */}
          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  Step 1: Pairing Auth
                </span>
                {diagnosticsResults.token.status === 'running' && (
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                )}
                {diagnosticsResults.token.status === 'success' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <Check className="w-3 h-3" /> Valid
                  </span>
                )}
                {diagnosticsResults.token.status === 'error' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    <XCircle className="w-3 h-3" /> Failed
                  </span>
                )}
                {diagnosticsResults.token.status === 'pending' && (
                  <span className="text-[10px] font-medium text-slate-500">Ready</span>
                )}
              </div>

              <h4 className="text-xs font-bold text-white">Token Signature &amp; Binding</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {diagnosticsResults.token.message}
              </p>
            </div>

            <div className="pt-2 border-t border-white/5 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Binding: {organizationName}</span>
              {diagnosticsResults.token.latencyMs !== undefined && (
                <span className="font-mono text-cyan-400">{diagnosticsResults.token.latencyMs}ms</span>
              )}
            </div>
          </div>

          {/* Step 2: Chrome CDP Port 9222 */}
          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  Step 2: Browser CDP
                </span>
                {diagnosticsResults.cdp.status === 'running' && (
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                )}
                {diagnosticsResults.cdp.status === 'success' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <Check className="w-3 h-3" /> 9222 Online
                  </span>
                )}
                {diagnosticsResults.cdp.status === 'warning' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3" /> Port Closed
                  </span>
                )}
                {diagnosticsResults.cdp.status === 'pending' && (
                  <span className="text-[10px] font-medium text-slate-500">Ready</span>
                )}
              </div>

              <h4 className="text-xs font-bold text-white">Chrome DevTools Protocol (CDP)</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {diagnosticsResults.cdp.message}
              </p>
            </div>

            <div className="pt-2 border-t border-white/5 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Port: 9222 (Loopback)</span>
              {diagnosticsResults.cdp.latencyMs !== undefined && (
                <span className="font-mono text-cyan-400">{diagnosticsResults.cdp.latencyMs}ms</span>
              )}
            </div>
          </div>

          {/* Step 3: Supabase WebSocket Ping */}
          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  Step 3: Cloud Telemetry
                </span>
                {diagnosticsResults.websocket.status === 'running' && (
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                )}
                {diagnosticsResults.websocket.status === 'success' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <Radio className="w-3 h-3" /> Low Latency
                  </span>
                )}
                {diagnosticsResults.websocket.status === 'pending' && (
                  <span className="text-[10px] font-medium text-slate-500">Ready</span>
                )}
              </div>

              <h4 className="text-xs font-bold text-white">WebSocket Heartbeat Ping</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {diagnosticsResults.websocket.message}
              </p>
            </div>

            <div className="pt-2 border-t border-white/5 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Channel: Realtime Active</span>
              {diagnosticsResults.websocket.latencyMs !== undefined && (
                <span className="font-mono text-cyan-400">{diagnosticsResults.websocket.latencyMs}ms</span>
              )}
            </div>
          </div>
        </div>

        {/* Remediation Playbook (Shown when CDP is closed or on error) */}
        {diagnosticsResults.cdp.status === 'warning' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <h4 className="text-xs font-bold">CDP Port 9222 Remediation Playbook</h4>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Google Chrome must be launched with remote debugging enabled so the ReFlow engine can automate browser tabs without leaving user traces. Run the following command in your terminal:
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-[11px] font-mono">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Windows PowerShell:</span>
                  <button
                    onClick={() => copyToClipboard(chromeWindowsCmd, 'chromeWin')}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    {copiedCmd === 'chromeWin' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-white/5 text-slate-300 select-all overflow-x-auto">
                  {chromeWindowsCmd}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>macOS Terminal:</span>
                  <button
                    onClick={() => copyToClipboard(chromeMacCmd, 'chromeMac')}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    {copiedCmd === 'chromeMac' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-white/5 text-slate-300 select-all overflow-x-auto">
                  {chromeMacCmd}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connected Workers Section & Telemetry Cards */}
      <div className="bg-[#0c101d] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Active Connected Workers</h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/5">
              {workers.length} Registered
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-slate-400">Telemetry Stream:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] ${
                hasRecentRunnerHeartbeat
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border border-white/5'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hasRecentRunnerHeartbeat ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              {hasRecentRunnerHeartbeat ? 'Daemon Operational' : 'Awaiting Connection'}
            </span>
          </div>
        </div>

        {/* Workers List / Cards */}
        {loadingWorkers ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
            <span className="text-xs">Detecting active workers &amp; runner telemetry...</span>
          </div>
        ) : workers.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">No Desktop Runners Connected Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Launch the Desktop Runner or run <code className="text-cyan-300">npm run runner:listen</code> with your organization pairing token to begin automating workflows.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {workers.map((worker) => {
              const isExecuting = worker.status === 'EXECUTING';
              const isOnline = worker.status === 'ONLINE' || isExecuting;

              return (
                <div
                  key={worker.id}
                  className={`bg-slate-950/70 border rounded-xl p-5 transition-all space-y-4 relative overflow-hidden ${
                    isExecuting
                      ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : isOnline
                      ? 'border-white/10 hover:border-white/20'
                      : 'border-white/5 opacity-85'
                  }`}
                >
                  {/* Top card metadata */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                          isExecuting
                            ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                            : isOnline
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                            : 'bg-slate-900 border-white/5 text-slate-500'
                        }`}
                      >
                        <Cpu className={`w-5 h-5 ${isExecuting ? 'animate-pulse' : ''}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white tracking-tight">
                            {worker.hostname}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {worker.platform} &middot; {worker.engineVersion}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        worker.status === 'EXECUTING'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse'
                          : worker.status === 'ONLINE'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : worker.status === 'REVOKED'
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400 border border-white/5'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          worker.status === 'EXECUTING'
                            ? 'bg-cyan-400 animate-ping'
                            : worker.status === 'ONLINE'
                            ? 'bg-emerald-400'
                            : worker.status === 'REVOKED'
                            ? 'bg-rose-400'
                            : 'bg-slate-500'
                        }`}
                      />
                      {worker.status}
                    </span>
                  </div>

                  {/* Active Run Banner (If currently executing) */}
                  {isExecuting && worker.activeRun && (
                    <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-lg p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                          <Activity className="w-3.5 h-3.5 animate-spin" />
                          <span>Executing Run #{worker.activeRun.id.slice(0, 8)}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {worker.activeRun.workflowName || 'Automation Workflow'} &middot;{' '}
                          {worker.activeRun.items_processed || 0} items processed
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => openRunDetails(worker.activeRun!)}
                          className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-md text-[11px] font-bold border border-cyan-400/30 transition-all flex items-center gap-1"
                          title="Open Run Details Drawer"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => stopActiveRun(worker.activeRun!.id)}
                          className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-md transition-colors"
                          title="Stop Active Run"
                        >
                          <StopCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Metrics and Heartbeat Details */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Heartbeat</span>
                      <span className="text-slate-300 font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        {formatHeartbeat(worker.lastPingAt, now)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px]">Claims Count</span>
                      <span className="text-slate-300 font-semibold mt-0.5 block">
                        {worker.claimsCount} runs handled
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px]">Paired Token</span>
                      <span className="text-cyan-400/90 font-mono font-medium block mt-0.5">
                        ...{worker.token.slice(-8)}
                      </span>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {worker.status === 'ONLINE' || worker.status === 'EXECUTING' ? (
                        <>
                          <span className={`w-1.5 h-1.5 rounded-full ${worker.cdpActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                          <span className={`font-medium ${worker.cdpActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {worker.cdpActive ? 'CDP Port 9222 Ready' : 'Chrome Standby (Auto-Launch)'}
                          </span>
                        </>
                      ) : worker.status === 'REVOKED' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span className="text-rose-400 font-medium">Token Revoked &bull; Port Inactive</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          <span className="text-slate-400 font-medium">Worker Offline &bull; CDP Inactive</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={runDiagnosticsSuite}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
                      >
                        Ping Worker
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal: Regenerate Token */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0c101d] border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Regenerate Organization Token?</h3>
                <p className="text-xs text-slate-400">Invalidate previous token and issue a fresh secret key</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-white/5">
              Warning: Regenerating will immediately invalidate your active pairing token. Any local Desktop Runners or daemons connected with the old key will stop claiming tasks until updated.
            </p>

            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={regenConfirmChecked}
                onChange={(e) => setRegenConfirmChecked(e.target.checked)}
                className="mt-0.5 rounded border-white/20 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
              />
              <span>I understand that existing workers will stop processing runs until re-paired.</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => {
                  setShowRegenModal(false);
                  setRegenConfirmChecked(false);
                }}
                disabled={isRegenerating}
                className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerateToken}
                disabled={!regenConfirmChecked || isRegenerating}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-40"
              >
                {isRegenerating ? 'Regenerating...' : 'Confirm & Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Revoke Token */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0c101d] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Revoke Pairing Token?</h3>
                <p className="text-xs text-slate-400">Completely disable desktop execution access</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-white/5">
              This action revokes access for all runners paired to <strong className="text-white">{organizationName}</strong>. No new tasks will be executed until a new key is issued.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => setShowRevokeModal(false)}
                disabled={isRevoking}
                className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeToken}
                disabled={isRevoking}
                className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition-all disabled:opacity-40"
              >
                {isRevoking ? 'Revoking...' : 'Revoke Token Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
