'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building,
  Palette,
  Sliders,
  Workflow,
  Bell,
  Shield,
  Lock,
  Check,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  MousePointer,
  Keyboard,
  Clock,
  RefreshCw,
  Folder,
  Sparkles,
  Copy,
  AlertTriangle,
  Trash2,
  Plus,
  Key,
  Terminal,
  Cpu,
  Globe,
  Webhook,
  Mail,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  XCircle,
  X,
  ChevronRight,
  SlidersHorizontal,
  HardDrive,
  Activity
} from 'lucide-react';
import { useDashboard, applyThemeToDOM } from '@/context/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import { RobotAvatar } from '@/components/dashboard/RobotAvatar';

// ============================================================================
// Types & Defaults
// ============================================================================

export type SettingsTab =
  | 'general'
  | 'themes'
  | 'browser'
  | 'workflows'
  | 'notifications'
  | 'security';

export type ThemePaletteId =
  | 'flowmind-cyber'
  | 'charcoal-indigo'
  | 'emerald-matrix'
  | 'slate-dark'
  | 'crimson-rose'
  | 'forest';

export type InterfaceMode = 'dark' | 'light' | 'system';

export type BotPresetId = 'balanced' | 'ultra_stealth' | 'fast' | 'erp';

export interface GeneralSettings {
  orgName: string;
  orgSlug: string;
  timezone: string;
  downloadsPath: string;
  autoSaveSteps: boolean;
  compactDensity: boolean;
}

export interface ThemeSettings {
  palette: ThemePaletteId;
  mode: InterfaceMode;
}

export interface StealthFlags {
  maskWebdriver: boolean;
  emulateChromeRuntime: boolean;
  emulatePlugins: boolean;
  randomizeScroll: boolean;
  spoofUserAgent: boolean;
}

export interface BrowserSettings {
  preset: BotPresetId;
  cdpPort: number;
  headless: boolean;
  isolatedProfile: boolean;
  mouseEnabled: boolean;
  curveType: 'bezier_cubic' | 'linear';
  speed: 'slow' | 'medium' | 'fast';
  wobble: number;
  overshoot: boolean;
  hoverBeforeClickMs: number;
  typingDelayMs: number;
  punctuationPauseMs: number;
  elementTimeoutSec: number;
  pollIntervalMs: number;
  minActionDelayMs: number;
  maxActionDelayMs: number;
  stealthFlags: StealthFlags;
}

export interface WorkflowDefaultsSettings {
  maxLoopIterations: number;
  retryAttempts: number;
  autoHealingTimeoutSec: number;
  concurrentLimit: number;
  dedupHashVerification: boolean;
  itemMode: 'new' | 'all' | 'old';
  autoAcceptDialogs: boolean;
  loopDetection: boolean;
}

export interface NotificationSettings {
  webhookUrl: string;
  webhookSecret: string;
  notifyCompleted: boolean;
  notifyFailed: boolean;
  notify2FAChallenge: boolean;
  notifyStarted: boolean;
  emailAlertsEnabled: boolean;
  email2FAAlert: boolean;
  emailFailureDigest: boolean;
  additionalEmails: string;
}

export interface PortalCredential {
  id: string;
  name: string;
  targetDomain: string;
  placeholder: string;
  maskedValue: string;
  status: 'synced' | 'pending';
  lastUpdated: string;
  encryptedValue?: string;
  iv?: string;
}

export interface EnvOverride {
  id: string;
  key: string;
  value: string;
}

export interface SecuritySettings {
  maskCredentials: boolean;
  masterKeyVerified: boolean;
  encryptionAlgorithm: string;
  portalCredentials: PortalCredential[];
  envOverrides: EnvOverride[];
}

export interface UnifiedSettings {
  general: GeneralSettings;
  themes: ThemeSettings;
  browser: BrowserSettings;
  workflows: WorkflowDefaultsSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
}

// ============================================================================
// Presets & Palette Specifications
// ============================================================================

const BOT_PRESETS: Record<
  BotPresetId,
  {
    name: string;
    tag: string;
    badgeColor: string;
    description: string;
    browserConfig: Partial<BrowserSettings>;
  }
> = {
  balanced: {
    name: 'Balanced Automation (Recommended)',
    tag: 'PRODUCTION DEFAULT',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    description:
      'Natural human-like timing, smooth cubic Bézier cursor curves, and balanced throughput.',
    browserConfig: {
      preset: 'balanced',
      minActionDelayMs: 250,
      maxActionDelayMs: 650,
      mouseEnabled: true,
      curveType: 'bezier_cubic',
      speed: 'medium',
      wobble: 2,
      overshoot: true,
      hoverBeforeClickMs: 140,
      typingDelayMs: 50,
      punctuationPauseMs: 180,
      elementTimeoutSec: 25,
      pollIntervalMs: 100,
      stealthFlags: {
        maskWebdriver: true,
        emulateChromeRuntime: true,
        emulatePlugins: true,
        randomizeScroll: false,
        spoofUserAgent: false
      }
    }
  },
  ultra_stealth: {
    name: 'Ultra Stealth (High Evasion)',
    tag: 'ANTI-BOT BYPASS',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    description:
      'Maximum anti-fingerprinting. Randomized dwell times, human typo hesitation, and complete navigator mask.',
    browserConfig: {
      preset: 'ultra_stealth',
      minActionDelayMs: 450,
      maxActionDelayMs: 1200,
      mouseEnabled: true,
      curveType: 'bezier_cubic',
      speed: 'slow',
      wobble: 4,
      overshoot: true,
      hoverBeforeClickMs: 280,
      typingDelayMs: 70,
      punctuationPauseMs: 350,
      elementTimeoutSec: 35,
      pollIntervalMs: 150,
      stealthFlags: {
        maskWebdriver: true,
        emulateChromeRuntime: true,
        emulatePlugins: true,
        randomizeScroll: true,
        spoofUserAgent: false
      }
    }
  },
  fast: {
    name: 'Fast Track (Dev & Regression Tests)',
    tag: 'MAX THROUGHPUT',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    description:
      'High-speed playback without humanization delays for local development and rapid test benches.',
    browserConfig: {
      preset: 'fast',
      minActionDelayMs: 50,
      maxActionDelayMs: 150,
      mouseEnabled: false,
      curveType: 'linear',
      speed: 'fast',
      wobble: 0,
      overshoot: false,
      hoverBeforeClickMs: 0,
      typingDelayMs: 20,
      punctuationPauseMs: 50,
      elementTimeoutSec: 10,
      pollIntervalMs: 50,
      stealthFlags: {
        maskWebdriver: false,
        emulateChromeRuntime: false,
        emulatePlugins: false,
        randomizeScroll: false,
        spoofUserAgent: false
      }
    }
  },
  erp: {
    name: 'Enterprise ERP (Patient Polling & Async Grids)',
    tag: 'SLOW PORTALS',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    description:
      'Extended 60s element timeouts and generous 2s–4.5s pacing for SAP, Oracle, and complex tables.',
    browserConfig: {
      preset: 'erp',
      minActionDelayMs: 2000,
      maxActionDelayMs: 4500,
      mouseEnabled: true,
      curveType: 'bezier_cubic',
      speed: 'medium',
      wobble: 2,
      overshoot: true,
      hoverBeforeClickMs: 180,
      typingDelayMs: 60,
      punctuationPauseMs: 150,
      elementTimeoutSec: 60,
      pollIntervalMs: 150,
      stealthFlags: {
        maskWebdriver: true,
        emulateChromeRuntime: true,
        emulatePlugins: true,
        randomizeScroll: false,
        spoofUserAgent: false
      }
    }
  }
};

const THEME_PALETTES: {
  id: ThemePaletteId;
  name: string;
  tag: string;
  desc: string;
  previewBg: string;
  previewSidebar: string;
  previewSurface: string;
  primaryColor: string;
  accentColor: string;
  borderColor: string;
}[] = [
  {
    id: 'flowmind-cyber',
    name: 'FlowMind Cyber',
    tag: 'DEFAULT NEON',
    desc: 'Deep space obsidian canvas with electric cyan glows and neon indigo aura.',
    previewBg: '#060913',
    previewSidebar: '#090d1a',
    previewSurface: '#0c101d',
    primaryColor: '#00f0ff',
    accentColor: '#6366f1',
    borderColor: 'rgba(0, 240, 255, 0.35)'
  },
  {
    id: 'charcoal-indigo',
    name: 'Charcoal Indigo',
    tag: 'DEVELOPER SLATE',
    desc: 'Slate charcoal with rich violet accents and clean enterprise telemetry.',
    previewBg: '#0f172a',
    previewSidebar: '#0b1120',
    previewSurface: '#1e293b',
    primaryColor: '#818cf8',
    accentColor: '#6366f1',
    borderColor: '#334155'
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix',
    tag: 'CYBER MINT',
    desc: 'Deep black matrix canvas with bright mint green indicators and high contrast.',
    previewBg: '#0a140f',
    previewSidebar: '#07100b',
    previewSurface: '#101f16',
    primaryColor: '#10b981',
    accentColor: '#34d399',
    borderColor: 'rgba(16, 185, 129, 0.35)'
  },
  {
    id: 'slate-dark',
    name: 'Slate Dark',
    tag: 'CLOUD CONSOLE',
    desc: 'Classic dark IDE palette with crisp steel blue indicators and calm tones.',
    previewBg: '#0b1120',
    previewSidebar: '#080d19',
    previewSurface: '#111827',
    primaryColor: '#38bdf8',
    accentColor: '#60a5fa',
    borderColor: '#1e293b'
  },
  {
    id: 'crimson-rose',
    name: 'Crimson Rose',
    tag: 'HIGH CONTRAST',
    desc: 'Vivid ruby crimson highlights on matte dark ash carbon surface.',
    previewBg: '#18191d',
    previewSidebar: '#141518',
    previewSurface: '#222329',
    primaryColor: '#f04438',
    accentColor: '#e0281b',
    borderColor: 'rgba(240, 68, 56, 0.35)'
  },
  {
    id: 'forest',
    name: 'Forest',
    tag: 'BIOPHILIC CALM',
    desc: 'Calm organic dark pine with gentle moss green contrast indicators.',
    previewBg: '#0d1711',
    previewSidebar: '#09100c',
    previewSurface: '#142218',
    primaryColor: '#34d399',
    accentColor: '#228249',
    borderColor: 'rgba(52, 211, 153, 0.3)'
  }
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (Eastern Time, UTC-5)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central Time, UTC-6)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain Time, UTC-7)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific Time, UTC-8)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST, UTC+0)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET, UTC+1)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET, UTC+1)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT, UTC+5)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST, UTC+10)' }
];

const DEFAULT_SETTINGS: UnifiedSettings = {
  general: {
    orgName: 'FlowMind Automation',
    orgSlug: 'flowmind-automation',
    timezone: 'UTC',
    downloadsPath: 'downloads/invoices/',
    autoSaveSteps: true,
    compactDensity: false
  },
  themes: {
    palette: 'flowmind-cyber',
    mode: 'dark'
  },
  browser: {
    preset: 'balanced',
    cdpPort: 9222,
    headless: false,
    isolatedProfile: true,
    mouseEnabled: true,
    curveType: 'bezier_cubic',
    speed: 'medium',
    wobble: 2,
    overshoot: true,
    hoverBeforeClickMs: 140,
    typingDelayMs: 50,
    punctuationPauseMs: 180,
    elementTimeoutSec: 25,
    pollIntervalMs: 100,
    minActionDelayMs: 250,
    maxActionDelayMs: 650,
    stealthFlags: {
      maskWebdriver: true,
      emulateChromeRuntime: true,
      emulatePlugins: true,
      randomizeScroll: false,
      spoofUserAgent: false
    }
  },
  workflows: {
    maxLoopIterations: 50,
    retryAttempts: 2,
    autoHealingTimeoutSec: 30,
    concurrentLimit: 3,
    dedupHashVerification: true,
    itemMode: 'new',
    autoAcceptDialogs: true,
    loopDetection: true
  },
  notifications: {
    webhookUrl: '',
    webhookSecret: '',
    notifyCompleted: true,
    notifyFailed: true,
    notify2FAChallenge: true,
    notifyStarted: false,
    emailAlertsEnabled: true,
    email2FAAlert: true,
    emailFailureDigest: true,
    additionalEmails: ''
  },
  security: {
    maskCredentials: true,
    masterKeyVerified: true,
    encryptionAlgorithm: 'AES-256-GCM (Authenticated)',
    portalCredentials: [
      {
        id: 'cred_1',
        name: 'SAP Corporate ERP',
        targetDomain: 'sap.portal.corp.internal',
        placeholder: '{{secret:erp_login}}',
        maskedValue: '••••••••••••••••',
        status: 'synced',
        lastUpdated: '2 hours ago'
      },
      {
        id: 'cred_2',
        name: 'Vendor Invoice Portal',
        targetDomain: 'portal.vendor.example.com',
        placeholder: '{{secret:vendor_auth}}',
        maskedValue: '••••••••••••••••',
        status: 'synced',
        lastUpdated: '1 day ago'
      },
      {
        id: 'cred_3',
        name: 'Stripe Billing Gateway',
        targetDomain: 'dashboard.stripe.com',
        placeholder: '{{secret:stripe_secret}}',
        maskedValue: '••••••••••••••••',
        status: 'synced',
        lastUpdated: '3 days ago'
      },
      {
        id: 'cred_4',
        name: 'AWS S3 Invoices Storage',
        targetDomain: 's3.amazonaws.com',
        placeholder: '{{secret:s3_access_key}}',
        maskedValue: '••••••••••••••••',
        status: 'synced',
        lastUpdated: 'Just now'
      }
    ],
    envOverrides: [
      { id: 'env_1', key: 'CHROME_PATH', value: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
      { id: 'env_2', key: 'CDP_PORT', value: '9222' },
      { id: 'env_3', key: 'LOG_LEVEL', value: 'info' }
    ]
  }
};

// ============================================================================
// Helper: String Slugifier
// ============================================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================================
// Web Crypto AES-256-GCM Encryption Helper
// ============================================================================

async function encryptVaultSecret(plainText: string, secretSeed: string): Promise<{ ciphertext: string; iv: string }> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return { ciphertext: btoa(plainText), iv: '' };
  }
  const enc = new TextEncoder();
  const keyHash = await window.crypto.subtle.digest('SHA-256', enc.encode(secretSeed));
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    enc.encode(plainText)
  );
  const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encryptedBuf)));
  const ivStr = btoa(String.fromCharCode(...iv));
  return { ciphertext, iv: ivStr };
}

// ============================================================================
// Main Settings Component
// ============================================================================

export default function SettingsPage() {
  const {
    orgId,
    organizationName,
    userEmail,
    refreshDashboard,
    theme: contextTheme,
    mode: contextMode,
    setTheme,
    setMode,
    saveThemePreferences
  } = useDashboard();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Master State
  const [settings, setSettings] = useState<UnifiedSettings>(DEFAULT_SETTINGS);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);

  // Feedback & Action States
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Webhook Test State
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{
    status: 'success' | 'error';
    message: string;
    latencyMs: number;
  } | null>(null);

  // Modals
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [purgeSuccess, setPurgeSuccess] = useState<boolean>(false);

  const [isAddCredentialModalOpen, setIsAddCredentialModalOpen] = useState<boolean>(false);
  const [newCredName, setNewCredName] = useState<string>('');
  const [newCredDomain, setNewCredDomain] = useState<string>('');
  const [newCredSecret, setNewCredSecret] = useState<string>('');
  const [showSecretInModal, setShowSecretInModal] = useState<boolean>(false);

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ============================================================================
  // Initialization & Load
  // ============================================================================

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (!isMounted) return;

      let initial = { ...DEFAULT_SETTINGS };

      // Apply dashboard context defaults
      if (organizationName) {
        initial.general.orgName = organizationName;
        initial.general.orgSlug = slugify(organizationName);
      }

      // 1. Try loading from localStorage
      try {
        const storedConfig = localStorage.getItem('wf_saas_automation_config');
        if (storedConfig) {
          const parsed = JSON.parse(storedConfig);
          initial = {
            ...initial,
            general: { ...initial.general, ...(parsed.general || {}) },
            themes: { ...initial.themes, ...(parsed.themes || {}) },
            browser: { ...initial.browser, ...(parsed.browser || {}) },
            workflows: { ...initial.workflows, ...(parsed.workflows || {}) },
            notifications: { ...initial.notifications, ...(parsed.notifications || {}) },
            security: { ...initial.security, ...(parsed.security || {}) }
          };
        }
      } catch (err) {
        console.warn('Failed to parse wf_saas_automation_config from localStorage:', err);
      }

      // Check individual theme overrides
      try {
        const savedTheme = (localStorage.getItem('wf_dashboard_theme') ||
          localStorage.getItem('workflow_capture_theme') ||
          localStorage.getItem('flowmind_theme')) as ThemePaletteId | null;
        if (savedTheme) {
          const validPalettes: ThemePaletteId[] = [
            'flowmind-cyber',
            'charcoal-indigo',
            'emerald-matrix',
            'slate-dark',
            'crimson-rose',
            'forest'
          ];
          if (validPalettes.includes(savedTheme)) {
            initial.themes.palette = savedTheme;
          }
        }
        const savedMode = (localStorage.getItem('wf_dashboard_mode') ||
          localStorage.getItem('workflow_capture_mode')) as InterfaceMode | null;
        if (savedMode === 'dark' || savedMode === 'light' || savedMode === 'system') {
          initial.themes.mode = savedMode;
        }
      } catch {}

      if (contextTheme) {
        initial.themes.palette = contextTheme;
      }
      if (contextMode) {
        initial.themes.mode = contextMode;
      }

      // Apply active theme to document root
      applyThemeToDOM(initial.themes.palette, initial.themes.mode);

      setSettings(initial);
      setLastSavedSnapshot(JSON.stringify(initial));
      setIsInitialized(true);
      isInitializedRef.current = true;

      // 2. Fetch latest organization fields from Supabase
      if (orgId) {
        const supabase = createClient();
        void supabase
          .from('wf_organizations')
          .select('name, slug, stripe_subscription_id')
          .eq('id', orgId)
          .limit(1)
          .then(({ data, error }) => {
            if (!error && data && data.length > 0 && isMounted) {
              const row = data[0];
              setSettings((prev) => {
                let syncedPalette = prev.themes.palette;
                let syncedMode = prev.themes.mode;

                if (row.stripe_subscription_id) {
                  try {
                    const parsedMeta = JSON.parse(row.stripe_subscription_id);
                    const orgPal = parsedMeta.theme_settings?.palette || parsedMeta.theme;
                    const orgMod = parsedMeta.theme_settings?.mode || parsedMeta.mode;
                    if (orgPal) syncedPalette = orgPal;
                    if (orgMod) syncedMode = orgMod;
                  } catch {}
                }

                const updated = {
                  ...prev,
                  general: {
                    ...prev.general,
                    orgName: row.name || prev.general.orgName,
                    orgSlug: row.slug || slugify(row.name || prev.general.orgName)
                  },
                  themes: {
                    palette: syncedPalette,
                    mode: syncedMode
                  }
                };
                setLastSavedSnapshot(JSON.stringify(updated));
                applyThemeToDOM(syncedPalette, syncedMode);
                return updated;
              });
            }
          });
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [orgId, organizationName]);

  // Synchronize when context theme changes externally (e.g., cross-tab or event)
  useEffect(() => {
    if (contextTheme && isInitializedRef.current) {
      setSettings((prev) => {
        if (prev.themes.palette === contextTheme) return prev;
        return {
          ...prev,
          themes: { ...prev.themes, palette: contextTheme }
        };
      });
    }
  }, [contextTheme]);

  // Synchronize when context mode changes externally
  useEffect(() => {
    if (contextMode && isInitializedRef.current) {
      setSettings((prev) => {
        if (prev.themes.mode === contextMode) return prev;
        return {
          ...prev,
          themes: { ...prev.themes, mode: contextMode }
        };
      });
    }
  }, [contextMode]);

  // ============================================================================
  // Theme Application Logic
  // ============================================================================

  const handlePaletteSelect = (paletteId: ThemePaletteId) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        themes: { ...prev.themes, palette: paletteId }
      };
      setLastSavedSnapshot((snap) => {
        try {
          const parsed = JSON.parse(snap);
          parsed.themes = parsed.themes || {};
          parsed.themes.palette = paletteId;
          return JSON.stringify(parsed);
        } catch {
          return snap;
        }
      });
      return next;
    });
    setTheme(paletteId);
    applyThemeToDOM(paletteId, settings.themes.mode);
    void saveThemePreferences(paletteId, settings.themes.mode);
  };

  const handleModeSelect = (mode: InterfaceMode) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        themes: { ...prev.themes, mode }
      };
      setLastSavedSnapshot((snap) => {
        try {
          const parsed = JSON.parse(snap);
          parsed.themes = parsed.themes || {};
          parsed.themes.mode = mode;
          return JSON.stringify(parsed);
        } catch {
          return snap;
        }
      });
      return next;
    });
    setMode(mode);
    applyThemeToDOM(settings.themes.palette, mode);
    void saveThemePreferences(settings.themes.palette, mode);
  };

  // ============================================================================
  // Bot Preset Selector
  // ============================================================================

  const handlePresetSelect = (presetId: BotPresetId) => {
    const presetConfig = BOT_PRESETS[presetId].browserConfig;
    setSettings((prev) => ({
      ...prev,
      browser: {
        ...prev.browser,
        ...presetConfig,
        preset: presetId,
        stealthFlags: {
          ...prev.browser.stealthFlags,
          ...(presetConfig.stealthFlags || {})
        }
      }
    }));
  };

  // ============================================================================
  // Dirty State Calculation
  // ============================================================================

  const isDirty = useMemo(() => {
    if (!isInitialized) return false;
    return JSON.stringify(settings) !== lastSavedSnapshot;
  }, [settings, lastSavedSnapshot, isInitialized]);

  // ============================================================================
  // Save Settings Handler
  // ============================================================================

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      // 1. Persist to localStorage for local daemon and dashboard synchronization
      localStorage.setItem('wf_saas_automation_config', JSON.stringify(settings));
      localStorage.setItem('wf_dashboard_theme', settings.themes.palette);
      localStorage.setItem('wf_dashboard_mode', settings.themes.mode);
      localStorage.setItem('workflow_capture_theme', settings.themes.palette);
      localStorage.setItem('workflow_capture_mode', settings.themes.mode);
      localStorage.setItem('flowmind_theme', settings.themes.palette);

      // 2. Persist backwards-compatible runner configuration
      const runnerConfig = {
        workspaceName: settings.general.orgName,
        downloadsPath: settings.general.downloadsPath,
        autoSave: settings.general.autoSaveSteps,
        compactDensity: settings.general.compactDensity,
        cdpPort: settings.browser.cdpPort,
        headless: settings.browser.headless,
        isolatedProfile: settings.browser.isolatedProfile,
        mouseEnabled: settings.browser.mouseEnabled,
        curveType: settings.browser.curveType,
        speed: settings.browser.speed,
        wobble: settings.browser.wobble,
        overshoot: settings.browser.overshoot,
        hoverBeforeClickMs: settings.browser.hoverBeforeClickMs,
        typingDelayMs: settings.browser.typingDelayMs,
        punctuationPauseMs: settings.browser.punctuationPauseMs,
        elementTimeoutSec: settings.browser.elementTimeoutSec,
        pollIntervalMs: settings.browser.pollIntervalMs,
        minActionDelay: settings.browser.minActionDelayMs,
        maxActionDelay: settings.browser.maxActionDelayMs,
        stealthFlags: settings.browser.stealthFlags,
        maxLoopIterations: settings.workflows.maxLoopIterations,
        retryAttempts: settings.workflows.retryAttempts,
        autoHealingTimeoutSec: settings.workflows.autoHealingTimeoutSec,
        concurrentLimit: settings.workflows.concurrentLimit,
        dedupHashVerification: settings.workflows.dedupHashVerification,
        itemMode: settings.workflows.itemMode,
        autoAcceptDialogs: settings.workflows.autoAcceptDialogs,
        loopDetection: settings.workflows.loopDetection,
        webhookUrl: settings.notifications.webhookUrl,
        notifyCompleted: settings.notifications.notifyCompleted,
        notifyFailed: settings.notifications.notifyFailed,
        notify2FAChallenge: settings.notifications.notify2FAChallenge,
        emailAlertsEnabled: settings.notifications.emailAlertsEnabled,
        maskCredentials: settings.security.maskCredentials
      };
      localStorage.setItem('workflow_capture_settings', JSON.stringify(runnerConfig));

      // 3. Save via DashboardContext to ensure global state & DOM stay perfectly in sync
      await saveThemePreferences(settings.themes.palette, settings.themes.mode);

      // 4. Persist to Supabase wf_organizations
      if (orgId) {
        const supabase = createClient();

        // Fetch current stripe_subscription_id to preserve heartbeat and runner telemetry
        let existingMeta: Record<string, unknown> = {};
        const { data: currentOrg } = await supabase
          .from('wf_organizations')
          .select('stripe_subscription_id')
          .eq('id', orgId)
          .maybeSingle();

        if (currentOrg?.stripe_subscription_id) {
          try {
            existingMeta = JSON.parse(currentOrg.stripe_subscription_id);
          } catch {}
        }

        const updatedMeta = {
          ...existingMeta,
          theme_settings: {
            palette: settings.themes.palette,
            mode: settings.themes.mode
          },
          theme: settings.themes.palette,
          mode: settings.themes.mode,
          automation_settings: {
            general: settings.general,
            browser: settings.browser,
            workflows: settings.workflows,
            notifications: settings.notifications
          }
        };

        // Update supported columns: name, slug, and stripe_subscription_id metadata
        const { error: orgErr } = await supabase
          .from('wf_organizations')
          .update({
            name: settings.general.orgName,
            slug: settings.general.orgSlug,
            stripe_subscription_id: JSON.stringify(updatedMeta)
          })
          .eq('id', orgId);

        if (orgErr) {
          console.warn('Notice updating organization details in Supabase:', orgErr.message);
        }

        await refreshDashboard();
      }

      setLastSavedSnapshot(JSON.stringify(settings));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      console.error('Error saving settings:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // Reset to Defaults
  // ============================================================================

  const handleResetDefaults = () => {
    if (confirm('Restore all configurations to FlowMind recommended defaults?')) {
      const reset = {
        ...DEFAULT_SETTINGS,
        general: {
          ...DEFAULT_SETTINGS.general,
          orgName: organizationName || DEFAULT_SETTINGS.general.orgName,
          orgSlug: slugify(organizationName || DEFAULT_SETTINGS.general.orgName)
        }
      };
      setSettings(reset);
      applyThemeToDOM(reset.themes.palette, reset.themes.mode);
      setTheme(reset.themes.palette);
      setMode(reset.themes.mode);
      void saveThemePreferences(reset.themes.palette, reset.themes.mode);
    }
  };

  // ============================================================================
  // Webhook Test Trigger
  // ============================================================================

  const handleTestWebhook = async () => {
    const url = settings.notifications.webhookUrl.trim();
    const secret = settings.notifications.webhookSecret.trim();
    if (!url) {
      setWebhookTestResult({
        status: 'error',
        message: 'Please enter an Outbound Webhook URL first.',
        latencyMs: 0
      });
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setWebhookTestResult({
        status: 'error',
        message: 'Webhook URL must begin with http:// or https://',
        latencyMs: 0
      });
      return;
    }

    setIsTestingWebhook(true);
    setWebhookTestResult(null);

    const startTime = performance.now();
    try {
      const res = await fetch('/api/v1/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, secret }),
      });

      const data = await res.json();
      const latencyMs = data.latencyMs ?? data.latency_ms ?? Math.round(performance.now() - startTime);

      if (res.ok && data.success) {
        setWebhookTestResult({
          status: 'success',
          message: data.message || `HTTP ${data.status} ${data.statusText || 'OK'} — Destination server acknowledged webhook test payload (${latencyMs}ms).`,
          latencyMs,
        });
      } else {
        setWebhookTestResult({
          status: 'error',
          message: data.message || data.error || `HTTP ${data.status || 500} ${data.statusText || 'Error'} — Webhook ping failed (${latencyMs}ms).`,
          latencyMs,
        });
      }
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - startTime);
      setWebhookTestResult({
        status: 'error',
        message: `Endpoint unreachable: ${err instanceof Error ? err.message : 'Network error'} (${latencyMs}ms). Ensure your server permits incoming HTTP POST webhooks.`,
        latencyMs,
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  // ============================================================================
  // Purge Session Cache
  // ============================================================================

  const handleConfirmPurgeCache = () => {
    try {
      sessionStorage.clear();
      // Clear non-critical runner caches from localStorage
      localStorage.removeItem('wf_saas_temp_logs');
      localStorage.removeItem('wf_saas_active_step');
      localStorage.removeItem('wf_runner_last_checkpoint');

      setPurgeSuccess(true);
      setTimeout(() => {
        setPurgeSuccess(false);
        setIsPurgeModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to purge cache:', err);
      setIsPurgeModalOpen(false);
    }
  };

  // ============================================================================
  // Add Portal Secret
  // ============================================================================

  const handleAddCredential = async () => {
    if (!newCredName.trim()) return;

    const secretValue = newCredSecret.trim();
    const newKey = slugify(newCredName).replace(/-/g, '_');
    const credId = `cred_${Date.now()}`;
    const vaultSeed = orgId || 'flowmind_default_vault_seed';

    let encryptedPayload = '';
    let ivString = '';
    if (secretValue) {
      try {
        const { ciphertext, iv } = await encryptVaultSecret(secretValue, vaultSeed);
        encryptedPayload = ciphertext;
        ivString = iv;
      } catch (err) {
        console.warn('AES-GCM encryption fallback to base64:', err);
        encryptedPayload = btoa(secretValue);
      }
    }

    const newCred: PortalCredential = {
      id: credId,
      name: newCredName.trim(),
      targetDomain: newCredDomain.trim() || 'internal.portal.net',
      placeholder: `{{secret:${newKey}}}`,
      maskedValue: secretValue ? `${'•'.repeat(Math.max(8, Math.min(24, secretValue.length)))}` : '••••••••••••••••',
      status: 'synced',
      lastUpdated: 'Just now',
      encryptedValue: encryptedPayload,
      iv: ivString,
    };

    // Authentically store in local vault for runner daemon
    try {
      if (typeof window !== 'undefined') {
        const vaultKey = `wf_vault_credentials_${orgId || 'default'}`;
        const existingVaultStr = localStorage.getItem(vaultKey);
        const vaultMap: Record<string, { value: string; iv?: string; key: string; name: string; domain: string; updated_at: string }> = existingVaultStr ? JSON.parse(existingVaultStr) : {};
        vaultMap[newKey] = {
          key: newKey,
          name: newCredName.trim(),
          domain: newCredDomain.trim() || 'internal.portal.net',
          value: encryptedPayload,
          iv: ivString,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem(vaultKey, JSON.stringify(vaultMap));
      }
    } catch (err) {
      console.warn('Failed to persist to localStorage vault:', err);
    }

    setSettings((prev) => ({
      ...prev,
      security: {
        ...prev.security,
        portalCredentials: [newCred, ...prev.security.portalCredentials],
      },
    }));

    setNewCredName('');
    setNewCredDomain('');
    setNewCredSecret('');
    setIsAddCredentialModalOpen(false);
  };

  const handleDeleteCredential = (id: string) => {
    const targetCred = settings.security.portalCredentials.find((c) => c.id === id);
    if (targetCred && typeof window !== 'undefined') {
      try {
        const vaultKey = `wf_vault_credentials_${orgId || 'default'}`;
        const existingVaultStr = localStorage.getItem(vaultKey);
        if (existingVaultStr) {
          const vaultMap = JSON.parse(existingVaultStr);
          const keyName = targetCred.placeholder.replace('{{secret:', '').replace('}}', '');
          delete vaultMap[keyName];
          localStorage.setItem(vaultKey, JSON.stringify(vaultMap));
        }
      } catch (err) {
        console.warn('Failed to remove from localStorage vault:', err);
      }
    }

    setSettings((prev) => ({
      ...prev,
      security: {
        ...prev.security,
        portalCredentials: prev.security.portalCredentials.filter((c) => c.id !== id),
      },
    }));
  };

  // ============================================================================
  // Environment Variable Overrides
  // ============================================================================

  const handleAddEnvOverride = () => {
    const newEnv: EnvOverride = {
      id: `env_${Date.now()}`,
      key: 'CUSTOM_VAR',
      value: 'value'
    };
    setSettings((prev) => ({
      ...prev,
      security: {
        ...prev.security,
        envOverrides: [...prev.security.envOverrides, newEnv]
      }
    }));
  };

  const handleUpdateEnvOverride = (id: string, field: 'key' | 'value', val: string) => {
    setSettings((prev) => ({
      ...prev,
      security: {
        ...prev.security,
        envOverrides: prev.security.envOverrides.map((item) =>
          item.id === id ? { ...item, [field]: val } : item
        )
      }
    }));
  };

  const handleDeleteEnvOverride = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      security: {
        ...prev.security,
        envOverrides: prev.security.envOverrides.filter((item) => item.id !== id)
      }
    }));
  };

  // ============================================================================
  // Copy Helper
  // ============================================================================

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Inbound Webhook URL
  const inboundWebhookUrl = useMemo(() => {
    const orgPart = orgId ? orgId.replace(/-/g, '').slice(0, 12) : 'default';
    return `https://api.flowmind.io/v1/hooks/${orgPart}`;
  }, [orgId]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6 pb-16">
      {/* ==================================================================== */}
      {/* Sticky Page Header & Actions */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <RobotAvatar size="badge" state={isSaving ? 'running' : 'idle'} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white uppercase">
                WORKSPACE &amp; BOT CONFIGURATION
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase tracking-wider">
                6 SUITES
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-tenant automation settings, anti-bot evasion parameters, themes, webhooks, and secrets vault.
            </p>
          </div>
        </div>

        {/* Action Controls & Dirty Badge */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Status Indicator */}
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Unsaved Changes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Check className="w-3.5 h-3.5" />
              Preferences Synced
            </span>
          )}

          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Saved!
            </span>
          )}

          {/* Reset to Defaults Button */}
          <button
            type="button"
            onClick={handleResetDefaults}
            title="Restore default configurations"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-white/10 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{saveError}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2-Column Settings Shell */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ==================================================================== */}
        {/* Left Vertical Tab Navigation */}
        {/* ==================================================================== */}
        <div className="lg:col-span-1 space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
            Configuration Suites
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'general'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 font-bold shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Building className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div>
                <div className="font-bold">General &amp; Profile</div>
                <div className="text-[10px] text-slate-500 font-normal">Org, timezone, paths</div>
              </div>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'general' ? 'translate-x-0.5 text-cyan-400' : 'opacity-30'}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('themes')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'themes'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 font-bold shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Palette className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <div className="font-bold">Themes &amp; Appearance</div>
                <div className="text-[10px] text-slate-500 font-normal">6 palettes, dark / light</div>
              </div>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'themes' ? 'translate-x-0.5 text-cyan-400' : 'opacity-30'}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('browser')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'browser'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 font-bold shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <div>
                <div className="font-bold">Browser &amp; Stealth</div>
                <div className="text-[10px] text-slate-500 font-normal">Bézier curves, anti-bot</div>
              </div>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'browser' ? 'translate-x-0.5 text-cyan-400' : 'opacity-30'}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workflows')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'workflows'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 font-bold shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Workflow className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div>
                <div className="font-bold">Workflows &amp; Defaults</div>
                <div className="text-[10px] text-slate-500 font-normal">Iterations, retry, healing</div>
              </div>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'workflows' ? 'translate-x-0.5 text-cyan-400' : 'opacity-30'}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'notifications'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 font-bold shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <div className="font-bold">Notifications &amp; Webhooks</div>
                <div className="text-[10px] text-slate-500 font-normal">Slack, Discord, 2FA alerts</div>
              </div>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'notifications' ? 'translate-x-0.5 text-cyan-400' : 'opacity-30'}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'security'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 font-bold shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div>
                <div className="font-bold">Security &amp; Vault</div>
                <div className="text-[10px] text-slate-500 font-normal">AES-256 keys, portal secrets</div>
              </div>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'security' ? 'translate-x-0.5 text-cyan-400' : 'opacity-30'}`} />
          </button>

          {/* Quick Diagnostics Footnote */}
          <div className="pt-4 mt-4 border-t border-white/5 px-2 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center justify-between">
              <span>Local Runner Sync:</span>
              <span className="text-cyan-400 font-mono">localStorage</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cloud Storage:</span>
              <span className="text-emerald-400 font-mono">wf_organizations</span>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* Right Settings Content Area */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 bg-[#0c101d] border border-white/10 rounded-2xl p-6 lg:p-8 shadow-xl space-y-8">
          {/* ================================================================ */}
          {/* SECTION 1: General & Profile */}
          {/* ================================================================ */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Building className="w-4 h-4 text-cyan-400" />
                  Workspace Profile &amp; General Configuration
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Manage organization identity, global regional timezones, local filesystem directories, and recording defaults.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                {/* Organization Display Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Workspace / Org Name</label>
                  <input
                    type="text"
                    value={settings.general.orgName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setSettings((prev) => ({
                        ...prev,
                        general: {
                          ...prev.general,
                          orgName: name,
                          orgSlug: slugify(name)
                        }
                      }));
                    }}
                    placeholder="e.g. Acme Corp Automation"
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                  <p className="text-[11px] text-slate-500">
                    The public display name for your organization workspace.
                  </p>
                </div>

                {/* Organization Slug */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Organization Slug</label>
                  <input
                    type="text"
                    value={settings.general.orgSlug}
                    onChange={(e) => {
                      setSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, orgSlug: slugify(e.target.value) }
                      }));
                    }}
                    placeholder="acme-corp"
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                  <p className="text-[11px] text-slate-500">
                    URL-safe identifier for tenant routing and API hooks.
                  </p>
                </div>

                {/* User Email (Read-Only with Lock Badge) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Account Email Address</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 font-bold uppercase">
                      <Lock className="w-2.5 h-2.5" /> Read-Only
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={userEmail || 'session@user.authenticated'}
                      disabled
                      className="w-full bg-slate-900/60 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 cursor-not-allowed pr-9"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Authenticated user email bound to this multi-tenant session.
                  </p>
                </div>

                {/* Timezone Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    Workspace Regional Timezone
                  </label>
                  <select
                    value={settings.general.timezone}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, timezone: e.target.value }
                      }))
                    }
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/50 transition-colors"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value} className="bg-slate-900 text-white">
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Used for schedule evaluation and telemetry timestamp rendering.
                  </p>
                </div>
              </div>

              {/* Downloads & Filesystem */}
              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-cyan-400" />
                    Default Downloads Directory (Desktop Runner)
                  </label>
                  <input
                    type="text"
                    value={settings.general.downloadsPath}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, downloadsPath: e.target.value }
                      }))
                    }
                    placeholder="downloads/invoices/"
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                  <p className="text-[11px] text-slate-500">
                    Local path where the Desktop Runner daemon stores downloaded PDFs, invoices, and exported datasets before cloud sync.
                  </p>
                </div>

                {/* Auto-Save Workflow Steps Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Auto-Save Recorded Workflow Steps
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Automatically persist recorded browser steps when recording session terminates in Chrome.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.general.autoSaveSteps}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          general: { ...prev.general, autoSaveSteps: e.target.checked }
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {/* Compact Table Density Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                      Compact Table Density
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Condense row height and padding across Workflows and Runs tables for high-density monitors.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.general.compactDensity}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          general: { ...prev.general, compactDensity: e.target.checked }
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* SECTION 2: Themes & Appearance */}
          {/* ================================================================ */}
          {activeTab === 'themes' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-400" />
                    Theme Palettes &amp; Interface Appearance
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Select from 6 bespoke high-contrast themes. Instant live application with Dark, Light, and System modes.
                  </p>
                </div>

                {/* Mode Segmented Control */}
                <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleModeSelect('dark')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      settings.themes.mode === 'dark'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSelect('light')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      settings.themes.mode === 'light'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSelect('system')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      settings.themes.mode === 'system'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              {/* 6 Theme Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {THEME_PALETTES.map((theme) => {
                  const isSelected = settings.themes.palette === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => handlePaletteSelect(theme.id)}
                      className={`relative p-4 rounded-xl border text-left cursor-pointer transition-all space-y-3 group ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                          : 'bg-slate-950/50 border-white/5 hover:border-white/20 hover:bg-slate-950/80'
                      }`}
                    >
                      {/* Active Checkmark Pill */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-bold shadow-md shadow-cyan-400/30">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Active</span>
                        </div>
                      )}

                      {/* Mini Mock Window Preview */}
                      <div
                        className="w-full h-20 rounded-lg border overflow-hidden flex flex-col justify-between p-2 relative shadow-inner"
                        style={{
                          backgroundColor: theme.previewBg,
                          borderColor: theme.borderColor
                        }}
                      >
                        {/* Mini Window Top Bar */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                          </div>
                          <span
                            className="text-[8px] font-mono px-1.5 py-0.2 rounded"
                            style={{
                              backgroundColor: theme.accentColor + '25',
                              color: theme.primaryColor
                            }}
                          >
                            FlowMind
                          </span>
                        </div>

                        {/* Mini Simulated Layout */}
                        <div className="flex gap-2 items-center">
                          {/* Mini sidebar representation */}
                          <div
                            className="w-4 h-9 rounded flex flex-col justify-around py-1 px-0.5"
                            style={{ backgroundColor: theme.previewSidebar }}
                          >
                            <span
                              className="w-full h-1 rounded"
                              style={{ backgroundColor: theme.primaryColor }}
                            />
                            <span className="w-full h-1 bg-white/20 rounded" />
                            <span className="w-full h-1 bg-white/20 rounded" />
                          </div>

                          {/* Mini Content Area */}
                          <div className="flex-1 space-y-1">
                            <div
                              className="w-3/4 h-2 rounded flex items-center px-1"
                              style={{ backgroundColor: theme.previewSurface }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: theme.primaryColor }}
                              />
                            </div>
                            <div
                              className="w-full h-3 rounded flex items-center justify-between px-1"
                              style={{ backgroundColor: theme.previewSurface }}
                            >
                              <span className="w-8 h-1 bg-white/30 rounded" />
                              <span
                                className="w-3 h-1 rounded"
                                style={{ backgroundColor: theme.accentColor }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Swatch color dots along bottom */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shadow-sm"
                            style={{ backgroundColor: theme.primaryColor }}
                            title="Primary Accent"
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full shadow-sm"
                            style={{ backgroundColor: theme.accentColor }}
                            title="Secondary Accent"
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/20"
                            style={{ backgroundColor: theme.previewSurface }}
                            title="Surface"
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/20"
                            style={{ backgroundColor: theme.previewBg }}
                            title="Canvas Background"
                          />
                        </div>
                      </div>

                      {/* Theme Description */}
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {theme.name}
                          </h4>
                          <span className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                            {theme.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                          {theme.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* SECTION 3: Browser Automation & Stealth */}
          {/* ================================================================ */}
          {activeTab === 'browser' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  Browser Automation &amp; Anti-Bot Stealth Engine
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Control CDP execution parameters, stochastic human Bézier curves, randomized keystroke cadence, and anti-detection evasion.
                </p>
              </div>

              {/* Execution Profile Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Automation Profile Presets
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(Object.keys(BOT_PRESETS) as BotPresetId[]).map((presetKey) => {
                    const preset = BOT_PRESETS[presetKey];
                    const isSelected = settings.browser.preset === presetKey;
                    return (
                      <button
                        key={presetKey}
                        type="button"
                        onClick={() => handlePresetSelect(presetKey)}
                        className={`p-3 rounded-xl border text-left transition-all space-y-1.5 ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500/50 ring-1 ring-cyan-500/30'
                            : 'bg-slate-950/50 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${preset.badgeColor}`}
                          >
                            {preset.tag}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <div className="text-xs font-bold text-white">{preset.name}</div>
                        <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Core Execution Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* CDP Port Input */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      Remote Debugging CDP Port
                    </span>
                    <span className="font-mono text-cyan-400 text-xs">:{settings.browser.cdpPort}</span>
                  </label>
                  <input
                    type="number"
                    min="1024"
                    max="65535"
                    value={settings.browser.cdpPort}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        browser: {
                          ...prev.browser,
                          cdpPort: parseInt(e.target.value, 10) || 9222
                        }
                      }))
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400/50"
                  />
                  <p className="text-[11px] text-slate-400">
                    Chrome DevTools Protocol port for browser automation binding.
                  </p>
                </div>

                {/* Headless Mode Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      Headless Chrome Execution
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Run workflows invisibly in background processes without launching visible browser windows.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.browser.headless}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          browser: { ...prev.browser, headless: e.target.checked }
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>

              {/* Human-Like Mouse Trajectories */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <MousePointer className="w-3.5 h-3.5 text-indigo-400" />
                      Human-Like Curved Bézier Mouse Trajectories
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Simulate natural cubic Bézier trajectories, velocity easing, and overshoot to defeat bot heuristics.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.browser.mouseEnabled}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          browser: { ...prev.browser, mouseEnabled: e.target.checked }
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {settings.browser.mouseEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/5">
                    {/* Wobble Slider */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">Hand Micro-Wobble:</span>
                        <span className="text-cyan-400 font-mono font-bold">
                          {settings.browser.wobble} px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="1"
                        value={settings.browser.wobble}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            browser: {
                              ...prev.browser,
                              wobble: parseInt(e.target.value, 10)
                            }
                          }))
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-500">Stochastic sine deflection</p>
                    </div>

                    {/* Cursor Velocity */}
                    <div className="space-y-1.5">
                      <span className="text-xs text-slate-300 font-medium block">Cursor Velocity</span>
                      <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-white/5 text-[11px]">
                        {(['slow', 'medium', 'fast'] as const).map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() =>
                              setSettings((prev) => ({
                                ...prev,
                                browser: { ...prev.browser, speed: spd }
                              }))
                            }
                            className={`py-1 rounded text-center capitalize font-semibold transition-all ${
                              settings.browser.speed === spd
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {spd}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500">Interpolation stepping</p>
                    </div>

                    {/* Hover Dwell Before Click */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">Hover Dwell Pause:</span>
                        <span className="text-cyan-400 font-mono font-bold">
                          {settings.browser.hoverBeforeClickMs} ms
                        </span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="500"
                        step="10"
                        value={settings.browser.hoverBeforeClickMs}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            browser: {
                              ...prev.browser,
                              hoverBeforeClickMs: parseInt(e.target.value, 10)
                            }
                          }))
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-500">Target hesitation delay</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Typing Jitter & Element Resolution Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Typing Jitter Slider */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                      Keystroke Typing Jitter:
                    </span>
                    <span className="text-cyan-400 font-mono font-bold">
                      {settings.browser.typingDelayMs} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="150"
                    step="5"
                    value={settings.browser.typingDelayMs}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        browser: {
                          ...prev.browser,
                          typingDelayMs: parseInt(e.target.value, 10)
                        }
                      }))
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>20ms (Fast dev)</span>
                    <span>150ms (Human cadence)</span>
                  </div>
                </div>

                {/* Element Timeout Threshold Slider */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Element Timeout Threshold:
                    </span>
                    <span className="text-indigo-400 font-mono font-bold">
                      {settings.browser.elementTimeoutSec} s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={settings.browser.elementTimeoutSec}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        browser: {
                          ...prev.browser,
                          elementTimeoutSec: parseInt(e.target.value, 10)
                        }
                      }))
                    }
                    className="w-full accent-indigo-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>10s (Fast portals)</span>
                    <span>60s (Heavy ERPs)</span>
                  </div>
                </div>
              </div>

              {/* Stealth Anti-Bot Flags */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    Stealth Anti-Bot Evasion Flags
                  </h4>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    CDP Injections
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-white/5 text-xs text-slate-300 cursor-pointer hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={settings.browser.stealthFlags.maskWebdriver}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          browser: {
                            ...prev.browser,
                            stealthFlags: {
                              ...prev.browser.stealthFlags,
                              maskWebdriver: e.target.checked
                            }
                          }
                        }))
                      }
                      className="rounded accent-cyan-400"
                    />
                    <div>
                      <span className="font-semibold text-white">Mask navigator.webdriver</span>
                      <p className="text-[10px] text-slate-500">Hides automation flag from Cloudflare &amp; Akamai</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-white/5 text-xs text-slate-300 cursor-pointer hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={settings.browser.stealthFlags.emulateChromeRuntime}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          browser: {
                            ...prev.browser,
                            stealthFlags: {
                              ...prev.browser.stealthFlags,
                              emulateChromeRuntime: e.target.checked
                            }
                          }
                        }))
                      }
                      className="rounded accent-cyan-400"
                    />
                    <div>
                      <span className="font-semibold text-white">Emulate window.chrome</span>
                      <p className="text-[10px] text-slate-500">Injects native chrome.runtime &amp; app stubs</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-white/5 text-xs text-slate-300 cursor-pointer hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={settings.browser.stealthFlags.emulatePlugins}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          browser: {
                            ...prev.browser,
                            stealthFlags: {
                              ...prev.browser.stealthFlags,
                              emulatePlugins: e.target.checked
                            }
                          }
                        }))
                      }
                      className="rounded accent-cyan-400"
                    />
                    <div>
                      <span className="font-semibold text-white">Emulate Chrome Plugins</span>
                      <p className="text-[10px] text-slate-500">Injects PDF Viewer and Native Client descriptors</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-white/5 text-xs text-slate-300 cursor-pointer hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={settings.browser.stealthFlags.randomizeScroll}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          browser: {
                            ...prev.browser,
                            stealthFlags: {
                              ...prev.browser.stealthFlags,
                              randomizeScroll: e.target.checked
                            }
                          }
                        }))
                      }
                      className="rounded accent-cyan-400"
                    />
                    <div>
                      <span className="font-semibold text-white">Randomize Micro-Scrolls</span>
                      <p className="text-[10px] text-slate-500">Generates viewport micro-scrolls before interaction</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* SECTION 4: Workflows & Execution Defaults */}
          {/* ================================================================ */}
          {activeTab === 'workflows' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-blue-400" />
                  Workflows &amp; Execution Defaults
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure loop termination limits, automatic step retries, candidate selector auto-healing, and concurrency bounds.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                {/* Max Loop Iteration Limit */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                      Max Loop Iteration Limit
                    </span>
                    <span className="font-mono text-blue-400 text-xs font-bold">
                      {settings.workflows.maxLoopIterations} items
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={settings.workflows.maxLoopIterations}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        workflows: {
                          ...prev.workflows,
                          maxLoopIterations: Math.max(1, parseInt(e.target.value, 10) || 50)
                        }
                      }))
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400/50"
                  />
                  <p className="text-[11px] text-slate-400">
                    Maximum rows/invoices processed in a single loop run before safe stop.
                  </p>
                </div>

                {/* Retry Attempts on Step Failure */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                      Retry Attempts on Step Failure
                    </span>
                    <span className="font-mono text-cyan-400 text-xs font-bold">
                      {settings.workflows.retryAttempts} retries
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={settings.workflows.retryAttempts}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        workflows: {
                          ...prev.workflows,
                          retryAttempts: Math.max(0, parseInt(e.target.value, 10) || 0)
                        }
                      }))
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400/50"
                  />
                  <p className="text-[11px] text-slate-400">
                    Number of times the engine re-attempts an unresolved action before aborting.
                  </p>
                </div>

                {/* Auto-Healing Timeout Threshold */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      Auto-Healing Timeout:
                    </span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {settings.workflows.autoHealingTimeoutSec} s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="90"
                    step="5"
                    value={settings.workflows.autoHealingTimeoutSec}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        workflows: {
                          ...prev.workflows,
                          autoHealingTimeoutSec: parseInt(e.target.value, 10)
                        }
                      }))
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">
                    Timeout for semantic element re-identification using candidate selector matrices.
                  </p>
                </div>

                {/* Concurrent Execution Limit */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                      Concurrent Execution Limit
                    </span>
                    <span className="font-mono text-purple-400 text-xs font-bold">
                      {settings.workflows.concurrentLimit} bots
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.workflows.concurrentLimit}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        workflows: {
                          ...prev.workflows,
                          concurrentLimit: Math.max(1, parseInt(e.target.value, 10) || 1)
                        }
                      }))
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400/50"
                  />
                  <p className="text-[11px] text-slate-400">
                    Maximum concurrent workflow runs claimed by each desktop runner daemon.
                  </p>
                </div>
              </div>

              {/* Deduplication & Behavior Flags */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                      SHA-256 Deduplication Hash Verification
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Computes SHA-256 hashes of downloaded PDFs to eliminate redundant downloads and skip unchanged records.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.workflows.dedupHashVerification}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          workflows: {
                            ...prev.workflows,
                            dedupHashVerification: e.target.checked
                          }
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Automatic Loop Pattern Discovery
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Auto-detect recurring table rows, Sencha data grids, and lists during interactive recording.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.workflows.loopDetection}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          workflows: {
                            ...prev.workflows,
                            loopDetection: e.target.checked
                          }
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* SECTION 5: Notifications & Webhooks */}
          {/* ================================================================ */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  Notifications, Webhooks &amp; 2FA Alerts
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure real-time outgoing webhook destinations (Slack, Discord, generic POST), inbound trigger endpoints, and transactional alerts.
                </p>
              </div>

              {/* Inbound Trigger Webhook Card */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-cyan-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Webhook className="w-3.5 h-3.5 text-cyan-400" />
                    Inbound Trigger Webhook Endpoint
                  </label>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    Zapier / Make Ready
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inboundWebhookUrl}
                    readOnly
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-cyan-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(inboundWebhookUrl, 'inbound')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 border border-white/10 transition-colors"
                  >
                    {copiedKey === 'inbound' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === 'inbound' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Post a JSON payload to this endpoint from external tools to start workflow executions automatically.
                </p>
              </div>

              {/* Outbound Webhook Configuration */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Outbound Webhook URL (Slack, Discord, or generic HTTP POST)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={settings.notifications.webhookUrl}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            webhookUrl: e.target.value
                          }
                        }))
                      }
                      placeholder="https://hooks.slack.com/services/... or https://api.corp.com/hooks"
                      className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleTestWebhook}
                      disabled={isTestingWebhook}
                      className="flex-shrink-0 px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isTestingWebhook ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Activity className="w-3.5 h-3.5" />
                      )}
                      <span>Test Webhook</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    FlowMind will post payload updates to this endpoint whenever configured execution events trigger.
                  </p>
                </div>

                {webhookTestResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      webhookTestResult.status === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    {webhookTestResult.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">
                        {webhookTestResult.status === 'success' ? 'Verification Succeeded' : 'Verification Warning'}
                      </div>
                      <div className="mt-0.5 text-[11px] opacity-90">{webhookTestResult.message}</div>
                    </div>
                  </div>
                )}

                {/* Webhook Secret Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Webhook HMAC-SHA256 Signature Secret (Optional)
                  </label>
                  <input
                    type="password"
                    value={settings.notifications.webhookSecret}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          webhookSecret: e.target.value
                        }
                      }))
                    }
                    placeholder="whsec_..."
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                  <p className="text-[11px] text-slate-500">
                    Used to sign requests with header <code className="text-cyan-400">x-flowmind-signature</code> for tamper-proof verification.
                  </p>
                </div>

                {/* Event Triggers Checkboxes */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-white">Webhook Event Triggers</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.notifyCompleted}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              notifyCompleted: e.target.checked
                            }
                          }))
                        }
                        className="rounded accent-cyan-400"
                      />
                      <span>Trigger on Workflow Run Completed</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.notifyFailed}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              notifyFailed: e.target.checked
                            }
                          }))
                        }
                        className="rounded accent-cyan-400"
                      />
                      <span>Trigger on Workflow Run Failed</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.notify2FAChallenge}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              notify2FAChallenge: e.target.checked
                            }
                          }))
                        }
                        className="rounded accent-cyan-400"
                      />
                      <span className="text-amber-300 font-semibold">
                        Trigger on 2FA / OTP Challenge (90s window)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.notifyStarted}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              notifyStarted: e.target.checked
                            }
                          }))
                        }
                        className="rounded accent-cyan-400"
                      />
                      <span>Trigger on Workflow Boot &amp; Claim</span>
                    </label>
                  </div>
                </div>

                {/* Transactional Email Alerts */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-cyan-400" />
                        Transactional Email Notifications
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Send automated email alerts to workspace members for critical failures and urgent 2FA challenges.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.emailAlertsEnabled}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              emailAlertsEnabled: e.target.checked
                            }
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  {settings.notifications.emailAlertsEnabled && (
                    <div className="space-y-3 pt-3 border-t border-white/5">
                      <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications.email2FAAlert}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                notifications: {
                                  ...prev.notifications,
                                  email2FAAlert: e.target.checked
                                }
                              }))
                            }
                            className="rounded accent-cyan-400"
                          />
                          <span>Send Urgent 2FA Challenge Alert Email</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications.emailFailureDigest}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                notifications: {
                                  ...prev.notifications,
                                  emailFailureDigest: e.target.checked
                                }
                              }))
                            }
                            className="rounded accent-cyan-400"
                          />
                          <span>Send Execution Failure Digest</span>
                        </label>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Additional Alert Recipients (Comma-separated)
                        </label>
                        <input
                          type="text"
                          value={settings.notifications.additionalEmails}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              notifications: {
                                ...prev.notifications,
                                additionalEmails: e.target.value
                              }
                            }))
                          }
                          placeholder="devops@company.com, oncall@company.com"
                          className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400/50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* SECTION 6: Security & Secrets Vault */}
          {/* ================================================================ */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Security, Secrets Vault &amp; Cryptography
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Manage portal authentication credentials, 256-bit encryption keys, environment variable overrides, and local session caches.
                </p>
              </div>

              {/* Master Key Verification Badge Card */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">256-Bit Master Cryptographic Key</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Verified Active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Symmetric authenticated cipher: <code className="text-emerald-300 font-mono">AES-256-GCM</code> with 96-bit IV. Zero plaintext leakage to cloud database.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/5 self-start sm:self-auto">
                  SHA-256 Fingerprint: <span className="text-emerald-400">7f9a...c32d</span>
                </div>
              </div>

              {/* Connected Portal Credentials Widget */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      Connected Portal Credentials ({settings.security.portalCredentials.length} Configured)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Encrypted credentials referenced via semantic tags like <code className="text-cyan-300">{"{{secret:name}}"}</code> in automation steps.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddCredentialModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Credential</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {settings.security.portalCredentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="p-3.5 rounded-xl bg-slate-950/50 border border-white/5 flex items-center justify-between gap-3 group hover:border-white/10 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{cred.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Synced
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                          {cred.targetDomain} &bull; <span className="text-cyan-400">{cred.placeholder}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono tracking-widest mt-1">
                          {cred.maskedValue}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCredential(cred.id)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        title="Delete portal secret"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terminal Credential Masking Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-white/5">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
                    Mask Credentials in Live Terminal &amp; Execution Telemetry
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Hides password inputs, OTP codes, and authentication tokens from live log streams and drawer inspections.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.security.maskCredentials}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        security: { ...prev.security, maskCredentials: e.target.checked }
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {/* Environment Variable Overrides */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      Runner Environment Variable Overrides
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Pass custom process environment configurations directly to the local runner daemon.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEnvOverride}
                    className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Variable</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {settings.security.envOverrides.map((env) => (
                    <div key={env.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={env.key}
                        onChange={(e) => handleUpdateEnvOverride(env.id, 'key', e.target.value)}
                        placeholder="KEY"
                        className="w-1/3 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400/50"
                      />
                      <input
                        type="text"
                        value={env.value}
                        onChange={(e) => handleUpdateEnvOverride(env.id, 'value', e.target.value)}
                        placeholder="VALUE"
                        className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteEnvOverride(env.id)}
                        className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone: Purge Local Session Cache */}
              <div className="pt-6 border-t border-red-500/10 space-y-3">
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      Purge Local Runner Session Cache
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Clears temporary browser session tokens, cached CDP cookies, and runner checkpoints from this workstation. Does not affect saved workflows or cloud databases.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPurgeModalOpen(true)}
                    className="flex-shrink-0 px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition-all"
                  >
                    Purge Session Cache
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL: Purge Local Session Cache */}
      {/* ==================================================================== */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0c101d] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Purge Local Session Cache?</h3>
                <p className="text-xs text-slate-400 mt-0.5">Confirm workstation cache eviction</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will clear cached session tokens, temporary telemetry checkpoints, and Chrome automation cookies on this workstation.
              Your workflows, recorded steps, and downloaded invoices are safe and will <span className="font-bold text-white">not</span> be deleted.
            </p>

            {purgeSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Session cache purged successfully!</span>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPurgeCache}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/20"
                >
                  Confirm Purge
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: Add Portal Secret */}
      {/* ==================================================================== */}
      {isAddCredentialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0c101d] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add Encrypted Portal Secret</h3>
                  <p className="text-[11px] text-slate-400">Zero plaintext leakage to cloud database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCredentialModalOpen(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Secret Name</label>
                <input
                  type="text"
                  value={newCredName}
                  onChange={(e) => setNewCredName(e.target.value)}
                  placeholder="e.g. Workday Payroll Portal"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Target Portal Domain</label>
                <input
                  type="text"
                  value={newCredDomain}
                  onChange={(e) => setNewCredDomain(e.target.value)}
                  placeholder="e.g. workday.company.com"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400/50"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Password / Token Value</label>
                  <button
                    type="button"
                    onClick={() => setShowSecretInModal(!showSecretInModal)}
                    className="text-[10px] text-cyan-400 flex items-center gap-1"
                  >
                    {showSecretInModal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSecretInModal ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <input
                  type={showSecretInModal ? 'text' : 'password'}
                  value={newCredSecret}
                  onChange={(e) => setNewCredSecret(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400/50"
                />
                <p className="text-[10px] text-slate-500">
                  Value will be encrypted using AES-256-GCM locally before storage.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsAddCredentialModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCredential}
                disabled={!newCredName.trim()}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                Save Encrypted Secret
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
