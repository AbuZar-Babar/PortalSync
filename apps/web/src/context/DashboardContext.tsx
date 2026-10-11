'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DrawerRunItem } from '@/components/dashboard/RunDetailsDrawer';

export type ThemePaletteId =
  | 'flowmind-cyber'
  | 'charcoal-indigo'
  | 'emerald-matrix'
  | 'slate-dark'
  | 'crimson-rose'
  | 'forest';

export type InterfaceMode = 'dark' | 'light' | 'system';

export const VALID_THEME_PALETTES: ThemePaletteId[] = [
  'flowmind-cyber',
  'charcoal-indigo',
  'emerald-matrix',
  'slate-dark',
  'crimson-rose',
  'forest',
];

export function applyThemeToDOM(palette: ThemePaletteId, mode: InterfaceMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  let resolvedMode = mode;
  if (mode === 'system') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    resolvedMode = prefersDark ? 'dark' : 'light';
  }

  root.setAttribute('data-theme', palette);
  root.setAttribute('data-palette', palette);
  root.setAttribute('data-mode', resolvedMode);
  root.setAttribute('data-theme-mode', mode);

  VALID_THEME_PALETTES.forEach((p) => root.classList.remove(`theme-${p}`));
  root.classList.add(`theme-${palette}`);

  if (resolvedMode === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
  }

  try {
    localStorage.setItem('wf_dashboard_theme', palette);
    localStorage.setItem('wf_dashboard_mode', mode);
    localStorage.setItem('workflow_capture_theme', palette);
    localStorage.setItem('workflow_capture_mode', mode);
    localStorage.setItem('flowmind_theme', palette);
    localStorage.setItem('workflow_capture_palette', palette);
  } catch {}

  try {
    window.dispatchEvent(
      new CustomEvent('workflow-capture-theme-change', {
        detail: { theme: palette, palette, mode, resolvedMode }
      })
    );
  } catch {}
}

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
  theme: ThemePaletteId;
  mode: InterfaceMode;
  setTheme: (theme: ThemePaletteId) => void;
  setMode: (mode: InterfaceMode) => void;
  saveThemePreferences: (theme: ThemePaletteId, mode: InterfaceMode) => Promise<void>;
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

  // Theme & Appearance State
  const [theme, setThemeState] = useState<ThemePaletteId>('flowmind-cyber');
  const [mode, setModeState] = useState<InterfaceMode>('dark');

  // Global Run Details Drawer state
  const [selectedRun, setSelectedRun] = useState<DrawerRunItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Synchronize initial theme & mode from localStorage and system preferences
  useEffect(() => {
    let initialTheme: ThemePaletteId = 'flowmind-cyber';
    let initialMode: InterfaceMode = 'dark';
    try {
      const storedTheme = (localStorage.getItem('wf_dashboard_theme') ||
        localStorage.getItem('workflow_capture_theme')) as ThemePaletteId | null;
      if (storedTheme && VALID_THEME_PALETTES.includes(storedTheme)) {
        initialTheme = storedTheme;
      }
      const storedMode = (localStorage.getItem('wf_dashboard_mode') ||
        localStorage.getItem('workflow_capture_mode')) as InterfaceMode | null;
      if (storedMode && ['dark', 'light', 'system'].includes(storedMode)) {
        initialMode = storedMode;
      }
    } catch {}

    setThemeState(initialTheme);
    setModeState(initialMode);
    applyThemeToDOM(initialTheme, initialMode);

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMql = () => {
      setModeState((curMode) => {
        if (curMode === 'system') {
          setThemeState((curTheme) => {
            applyThemeToDOM(curTheme, 'system');
            return curTheme;
          });
        }
        return curMode;
      });
    };
    mql.addEventListener('change', handleMql);

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme?: ThemePaletteId; mode?: InterfaceMode }>;
      if (customEvent.detail) {
        if (customEvent.detail.theme && VALID_THEME_PALETTES.includes(customEvent.detail.theme)) {
          setThemeState(customEvent.detail.theme);
        }
        if (customEvent.detail.mode && ['dark', 'light', 'system'].includes(customEvent.detail.mode)) {
          setModeState(customEvent.detail.mode);
        }
      }
    };
    window.addEventListener('workflow-capture-theme-change', handleCustomChange);

    return () => {
      mql.removeEventListener('change', handleMql);
      window.removeEventListener('workflow-capture-theme-change', handleCustomChange);
    };
  }, []);

  const fetchDashboardContext = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email || null);

      // Fetch user's organization memberships
      const { data: members, error: memberError } = await supabase
        .from('wf_organization_members')
        .select('org_id, role, wf_organizations(name, slug, stripe_subscription_id)')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error fetching org membership:', memberError);
      }

      if (!members || members.length === 0) {
        router.push('/onboarding');
        return;
      }

      // 1. Determine active organization: saved preference -> org with active runner -> first membership
      const savedOrgId = typeof window !== 'undefined' ? localStorage.getItem('wf_active_org_id') : null;
      let activeMember = savedOrgId ? members.find((m) => m.org_id === savedOrgId) : null;

      if (!activeMember) {
        activeMember = members.find((m) => {
          const org = m.wf_organizations as { stripe_subscription_id?: string | null } | null;
          if (org?.stripe_subscription_id) {
            try {
              const meta = JSON.parse(org.stripe_subscription_id);
              if (meta.last_ping_at) {
                const diff = (Date.now() - new Date(meta.last_ping_at).getTime()) / 1000;
                return diff < 120;
              }
            } catch {}
          }
          return false;
        });
      }

      if (!activeMember) {
        activeMember = members[0];
      }

      const activeOrgId = activeMember.org_id;
      const orgRecord = activeMember.wf_organizations as { name?: string; slug?: string; stripe_subscription_id?: string | null } | null;
      setOrgId(activeOrgId);
      setOrganizationName(orgRecord?.name || 'My Organization');
      if (typeof window !== 'undefined') {
        localStorage.setItem('wf_active_org_id', activeOrgId);
      }

      if (orgRecord?.stripe_subscription_id) {
        try {
          const parsed = JSON.parse(orgRecord.stripe_subscription_id);
          const orgPalette = (parsed.theme_settings?.palette || parsed.theme) as ThemePaletteId | undefined;
          const orgMode = (parsed.theme_settings?.mode || parsed.mode) as InterfaceMode | undefined;
          if (orgPalette && VALID_THEME_PALETTES.includes(orgPalette)) {
            setThemeState(orgPalette);
            const resolvedMode = (orgMode && ['dark', 'light', 'system'].includes(orgMode)) ? orgMode : 'dark';
            setModeState(resolvedMode);
            applyThemeToDOM(orgPalette, resolvedMode);
          }
        } catch {}
      }

      const defaultToken = `ps_live_${activeOrgId.replace(/-/g, '').slice(0, 16)}`;
      setRunnerToken(defaultToken);

      // Check online status via /api/v1/runners (authenticated by token) or organization metadata
      let online = false;
      try {
        const res = await fetch(`/api/v1/runners?org_id=${activeOrgId}`, {
          cache: 'no-store',
          headers: {
            'x-runner-token': defaultToken,
            'Authorization': `Bearer ${defaultToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          online = !!data.is_online;
        } else if (orgRecord?.stripe_subscription_id) {
          const parsed = JSON.parse(orgRecord.stripe_subscription_id);
          if (parsed.last_ping_at) {
            const diffSeconds = (Date.now() - new Date(parsed.last_ping_at).getTime()) / 1000;
            online = diffSeconds < 60;
          }
        }
      } catch {
        if (orgRecord?.stripe_subscription_id) {
          try {
            const parsed = JSON.parse(orgRecord.stripe_subscription_id);
            if (parsed.last_ping_at) {
              const diffSeconds = (Date.now() - new Date(parsed.last_ping_at).getTime()) / 1000;
              online = diffSeconds < 60;
            }
          } catch {}
        }
      }
      setIsRunnerOnline(online);
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

    if (!orgId) {
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    const supabase = createClient();
    const resolvedToken = runnerToken || `ps_live_${orgId.replace(/-/g, '').slice(0, 16)}`;

    // Heartbeat poller for runner status every 5 seconds with direct DB fallback
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/runners?org_id=${orgId}`, {
          cache: 'no-store',
          headers: {
            'x-runner-token': resolvedToken,
            'Authorization': `Bearer ${resolvedToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setIsRunnerOnline(!!data.is_online);
          }
        } else {
          // Direct Supabase query fallback
          const { data: directOrg } = await supabase
            .from('wf_organizations')
            .select('stripe_subscription_id')
            .eq('id', orgId)
            .maybeSingle();

          if (directOrg?.stripe_subscription_id && isMounted) {
            try {
              const meta = JSON.parse(directOrg.stripe_subscription_id);
              if (meta.last_ping_at) {
                const diff = (Date.now() - new Date(meta.last_ping_at).getTime()) / 1000;
                setIsRunnerOnline(diff < 60);
              }
            } catch {}
          }
        }
      } catch {}
    }, 5000);

    // Supabase Realtime subscription to organization telemetry updates
    const orgChannel = supabase
      .channel(`wf_org_heartbeat_sync_${orgId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wf_organizations',
          filter: `id=eq.${orgId}`,
        },
        (payload) => {
          if (!isMounted) return;
          const updated = payload.new as { stripe_subscription_id?: string | null } | undefined;
          if (updated?.stripe_subscription_id) {
            try {
              const meta = JSON.parse(updated.stripe_subscription_id);
              if (meta.last_ping_at) {
                const diff = (Date.now() - new Date(meta.last_ping_at).getTime()) / 1000;
                setIsRunnerOnline(diff < 60);
              }
            } catch {}
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearInterval(interval);
      void supabase.removeChannel(orgChannel);
    };
  }, [fetchDashboardContext, orgId, runnerToken]);

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

  const setTheme = useCallback((newTheme: ThemePaletteId) => {
    if (!VALID_THEME_PALETTES.includes(newTheme)) return;
    setThemeState(newTheme);
    applyThemeToDOM(newTheme, mode);
  }, [mode]);

  const setMode = useCallback((newMode: InterfaceMode) => {
    setModeState(newMode);
    applyThemeToDOM(theme, newMode);
  }, [theme]);

  const saveThemePreferences = useCallback(
    async (newTheme: ThemePaletteId, newMode: InterfaceMode) => {
      if (!VALID_THEME_PALETTES.includes(newTheme)) return;
      setThemeState(newTheme);
      setModeState(newMode);
      applyThemeToDOM(newTheme, newMode);

      if (orgId) {
        try {
          const supabase = createClient();
          const { data: directOrg } = await supabase
            .from('wf_organizations')
            .select('stripe_subscription_id')
            .eq('id', orgId)
            .maybeSingle();

          let existingMeta: Record<string, unknown> = {};
          if (directOrg?.stripe_subscription_id) {
            try {
              existingMeta = JSON.parse(directOrg.stripe_subscription_id);
            } catch {}
          }

          const updatedMeta = {
            ...existingMeta,
            theme_settings: { palette: newTheme, mode: newMode },
            theme: newTheme,
            mode: newMode,
          };

          await supabase
            .from('wf_organizations')
            .update({
              stripe_subscription_id: JSON.stringify(updatedMeta),
            })
            .eq('id', orgId);
        } catch (err) {
          console.warn('Failed to sync theme preference to Supabase:', err);
        }
      }
    },
    [orgId]
  );

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
        stopActiveRun,
        theme,
        mode,
        setTheme,
        setMode,
        saveThemePreferences
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
