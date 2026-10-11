'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DrawerRunItem } from '@/components/dashboard/RunDetailsDrawer';

interface DashboardContextType {
  orgId: string | null;
  organizationName: string;
  userEmail: string | null;
  isRunnerOnline: boolean;
  runnerToken: string | null;
  loading: boolean;
  isRefreshing: boolean;
  refreshDashboard: () => Promise<void>;
  openRunDetails: (run: DrawerRunItem) => void;
  closeRunDetails: () => void;
  selectedRun: DrawerRunItem | null;
  isDrawerOpen: boolean;
  stopActiveRun: (runId: string) => Promise<boolean>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('My Organization');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isRunnerOnline, setIsRunnerOnline] = useState<boolean>(false);
  const [runnerToken, setRunnerToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Global Run Details Drawer state
  const [selectedRun, setSelectedRun] = useState<DrawerRunItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchDashboardContext = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email || null);

      // Fetch user's organization membership
      const { data: members, error: memberError } = await supabase
        .from('wf_organization_members')
        .select('org_id, role, wf_organizations(name, slug)')
        .eq('user_id', user.id)
        .limit(1);

      if (memberError) {
        console.error('Error fetching org membership:', memberError);
      }

      if (!members || members.length === 0) {
        router.push('/onboarding');
        return;
      }

      const activeOrgId = members[0].org_id;
      const orgRecord = members[0].wf_organizations as { name?: string; slug?: string } | null;
      setOrgId(activeOrgId);
      setOrganizationName(orgRecord?.name || 'My Organization');

      // Fetch or initialize runner token for the organization
      const { data: tokens } = await supabase
        .from('wf_runner_tokens')
        .select('token, last_ping_at')
        .eq('org_id', activeOrgId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (tokens && tokens.length > 0) {
        setRunnerToken(tokens[0].token);
        if (tokens[0].last_ping_at) {
          const lastPing = new Date(tokens[0].last_ping_at).getTime();
          const diffSeconds = (Date.now() - lastPing) / 1000;
          setIsRunnerOnline(diffSeconds < 45);
        } else {
          setIsRunnerOnline(false);
        }
      } else {
        // Fallback default token pattern
        setRunnerToken(`ps_live_${activeOrgId.replace(/-/g, '').slice(0, 16)}`);
        setIsRunnerOnline(false);
      }
    } catch (err) {
      console.error('Dashboard context error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        void fetchDashboardContext();
      }
    }, 0);

    // Heartbeat poller for runner status every 15 seconds
    const interval = setInterval(async () => {
      if (!orgId) return;
      try {
        const supabase = createClient();
        const { data: tokens } = await supabase
          .from('wf_runner_tokens')
          .select('last_ping_at')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (tokens && tokens[0]?.last_ping_at) {
          const lastPing = new Date(tokens[0].last_ping_at).getTime();
          const diffSeconds = (Date.now() - lastPing) / 1000;
          setIsRunnerOnline(diffSeconds < 45);
        } else {
          setIsRunnerOnline(false);
        }
      } catch {}
    }, 15000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchDashboardContext, orgId]);

  const refreshDashboard = async () => {
    setIsRefreshing(true);
    await fetchDashboardContext();
  };

  const openRunDetails = (run: DrawerRunItem) => {
    setSelectedRun(run);
    setIsDrawerOpen(true);
  };

  const closeRunDetails = () => {
    setIsDrawerOpen(false);
  };

  const stopActiveRun = async (runId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/runs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId, status: 'cancelled' })
      });
      if (res.ok) {
        if (selectedRun && selectedRun.id === runId) {
          setSelectedRun({ ...selectedRun, status: 'cancelled' });
        }
        await refreshDashboard();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        orgId,
        organizationName,
        userEmail,
        isRunnerOnline,
        runnerToken,
        loading,
        isRefreshing,
        refreshDashboard,
        openRunDetails,
        closeRunDetails,
        selectedRun,
        isDrawerOpen,
        stopActiveRun
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
