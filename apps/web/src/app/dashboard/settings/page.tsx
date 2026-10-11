'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  User,
  Sliders,
  Eye,
  MousePointer,
  Keyboard,
  Clock,
  Save,
  Check,
  Palette,
  Shield,
  Bell,
  RefreshCw,
  Folder,
  Sparkles
} from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import { RobotAvatar } from '@/components/dashboard/RobotAvatar';

export default function SettingsPage() {
  const { orgId, organizationName, userEmail, refreshDashboard } = useDashboard();
  const [activeTab, setActiveTab] = useState<'general' | 'automation' | 'appearance'>('general');

  // Form states
  const [orgName, setOrgName] = useState(organizationName || '');
  const [downloadsDir, setDownloadsDir] = useState('downloads/invoices/');
  const [autoSaveSteps, setAutoSaveSteps] = useState(true);

  // Automation / Stealth
  const [headlessMode, setHeadlessMode] = useState(false);
  const [humanMouseCurves, setHumanMouseCurves] = useState(true);
  const [typingDelayMs, setTypingDelayMs] = useState(50);
  const [elementTimeoutSec, setElementTimeoutSec] = useState(25);

  // Appearance
  const [selectedTheme, setSelectedTheme] = useState('flowmind-dark');

  // Save states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setOrgName(organizationName);
    try {
      const savedConfig = localStorage.getItem('wf_saas_automation_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.headlessMode !== undefined) setHeadlessMode(parsed.headlessMode);
        if (parsed.humanMouseCurves !== undefined) setHumanMouseCurves(parsed.humanMouseCurves);
        if (parsed.typingDelayMs) setTypingDelayMs(parsed.typingDelayMs);
        if (parsed.elementTimeoutSec) setElementTimeoutSec(parsed.elementTimeoutSec);
        if (parsed.downloadsDir) setDownloadsDir(parsed.downloadsDir);
        if (parsed.autoSaveSteps !== undefined) setAutoSaveSteps(parsed.autoSaveSteps);
        if (parsed.selectedTheme) setSelectedTheme(parsed.selectedTheme);
      }
    } catch {}
  }, [organizationName]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Save preferences to localStorage for instant local worker synchronization
      const config = {
        headlessMode,
        humanMouseCurves,
        typingDelayMs,
        elementTimeoutSec,
        downloadsDir,
        autoSaveSteps,
        selectedTheme
      };
      localStorage.setItem('wf_saas_automation_config', JSON.stringify(config));

      // 2. Update Organization Name in Supabase if changed
      if (orgId && orgName && orgName !== organizationName) {
        const supabase = createClient();
        await supabase
          .from('wf_organizations')
          .update({ name: orgName })
          .eq('id', orgId);
        await refreshDashboard();
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <RobotAvatar size="badge" state="idle" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">WORKSPACE &amp; AUTOMATION SETTINGS</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase tracking-wider">
                CONFIGURATION
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize bot stealth, browser automation parameters, and organization defaults.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 animate-fade-in">
              <Check className="w-4 h-4" />
              Settings Saved
            </span>
          )}
          <button
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

      {/* 2-Column Settings Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Tabs Navigation */}
        <div className="lg:col-span-1 space-y-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'general'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Building className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>General &amp; Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('automation')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'automation'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Sliders className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>Automation &amp; Stealth</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'appearance'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Palette className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>Theme &amp; Appearance</span>
          </button>
        </div>

        {/* Right Settings Content Area */}
        <div className="lg:col-span-3 bg-[#0c101d] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
          {/* TAB 1: General & Profile */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Organization Profile</h3>
                <p className="text-xs text-slate-400 mt-0.5">Workspace identity and global default settings</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Organization Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/50"
                    placeholder="My Company"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Account Email</label>
                  <input
                    type="text"
                    value={userEmail || ''}
                    disabled
                    className="w-full bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-cyan-400" />
                    Default Downloads Directory
                  </label>
                  <input
                    type="text"
                    value={downloadsDir}
                    onChange={(e) => setDownloadsDir(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400/50"
                  />
                  <p className="text-[11px] text-slate-500">
                    Local path where the Desktop Runner saves downloaded invoices and exports before cloud sync.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white">Auto-Save Workflow Steps</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Automatically persist recorded actions when Chrome recording terminates.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSaveSteps}
                      onChange={(e) => setAutoSaveSteps(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Automation & Stealth */}
          {activeTab === 'automation' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Automation Engine &amp; Anti-Detection</h3>
                <p className="text-xs text-slate-400 mt-0.5">Control execution speed, mouse trajectories, and headless parameters</p>
              </div>

              <div className="space-y-4">
                {/* Headless Mode Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      Headless Browser Execution
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Run workflows invisibly in background processes without launching a visible Chrome window.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={headlessMode}
                      onChange={(e) => setHeadlessMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {/* Human Mouse Simulation Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <MousePointer className="w-3.5 h-3.5 text-indigo-400" />
                      Human-Like Curved Mouse Trajectories
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Simulate natural human Bézier curve cursor motions and velocity acceleration to bypass bot heuristics.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={humanMouseCurves}
                      onChange={(e) => setHumanMouseCurves(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {/* Typing Speed Delay Slider */}
                <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                      Randomized Keystroke Delay: <span className="text-cyan-400">{typingDelayMs}ms</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">30ms (Fast) - 150ms (Stealth)</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="150"
                    step="5"
                    value={typingDelayMs}
                    onChange={(e) => setTypingDelayMs(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Element Timeout Threshold Slider */}
                <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Maximum Element Resolution Timeout: <span className="text-indigo-400">{elementTimeoutSec}s</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Adaptive wait up to 60s for slow ERPs</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={elementTimeoutSec}
                    onChange={(e) => setElementTimeoutSec(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Theme & Appearance */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Theme &amp; Interface Palette</h3>
                <p className="text-xs text-slate-400 mt-0.5">Select your preferred color accents and dashboard styling</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedTheme('flowmind-dark')}
                  className={`p-4 rounded-xl border text-left transition-all space-y-2 ${
                    selectedTheme === 'flowmind-dark'
                      ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-950/50 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="w-full h-8 rounded-lg bg-gradient-to-r from-[#060913] via-slate-900 to-cyan-900 border border-cyan-500/30 flex items-center px-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">FlowMind Cyber (Default)</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Deep black canvas with electric cyan glows</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTheme('slate-navy')}
                  className={`p-4 rounded-xl border text-left transition-all space-y-2 ${
                    selectedTheme === 'slate-navy'
                      ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-950/50 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="w-full h-8 rounded-lg bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-indigo-500/30 flex items-center px-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Charcoal Indigo</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Slate charcoal with rich violet accents</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTheme('mint-sage')}
                  className={`p-4 rounded-xl border text-left transition-all space-y-2 ${
                    selectedTheme === 'mint-sage'
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950/50 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="w-full h-8 rounded-lg bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 border border-emerald-500/30 flex items-center px-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Emerald Matrix</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Clean obsidian with mint green indicators</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
