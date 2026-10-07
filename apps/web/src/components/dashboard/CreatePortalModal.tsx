'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  X, 
  Layers, 
  FileCode, 
  Upload, 
  Check, 
  AlertCircle, 
  Folder, 
  Cloud, 
  Globe, 
  Clock, 
  Loader2,
  FileCheck2,
  Info,
  Video,
  Circle,
  CheckCircle2,
  RotateCcw,
  MousePointerClick
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Workflow, CapturedAction, WorkflowRecipe } from '@/lib/types/database';

interface CreatePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  onWorkflowCreated: (newWorkflow: Workflow) => void;
}

type TabType = 'quick' | 'import' | 'record';
type RecordingPhase = 'idle' | 'starting' | 'recording' | 'preview' | 'saving';

export function CreatePortalModal({
  isOpen,
  onClose,
  orgId,
  onWorkflowCreated,
}: CreatePortalModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('quick');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Tab 1: Quick Setup State
  const [quickName, setQuickName] = useState('');
  const [quickUrl, setQuickUrl] = useState('');
  const [quickSchedule, setQuickSchedule] = useState<'manual' | 'hourly' | 'daily' | 'weekly'>('daily');
  const [quickTargetFolder, setQuickTargetFolder] = useState('C:\\PortalSync\\Invoices');
  const [quickUploadToCloud, setQuickUploadToCloud] = useState(true);

  // Tab 2: JSON Import State
  const [jsonText, setJsonText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 3: Desktop Recording State
  const [agentConnected, setAgentConnected] = useState<boolean | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [recordName, setRecordName] = useState('');
  const [recordUrl, setRecordUrl] = useState('');
  const [recordSchedule, setRecordSchedule] = useState<'manual' | 'hourly' | 'daily' | 'weekly'>('daily');
  const [recordTargetFolder, setRecordTargetFolder] = useState('C:\\PortalSync\\Invoices');
  const [recordUploadToCloud, setRecordUploadToCloud] = useState(true);
  
  const [recordingPhase, setRecordingPhase] = useState<RecordingPhase>('idle');
  const [recordedActions, setRecordedActions] = useState<CapturedAction[]>([]);
  const [actionCount, setActionCount] = useState<number>(0);
  const [capturedRecipe, setCapturedRecipe] = useState<WorkflowRecipe | null>(null);

  // Health check callback for manual button trigger
  const checkDesktopHealth = async () => {
    try {
      setCheckingConnection(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('http://127.0.0.1:49152/health', {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setAgentConnected(data.status === 'ok');
      } else {
        setAgentConnected(false);
      }
    } catch {
      setAgentConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  // Auto-detect desktop recording status or completed recordings whenever record tab is opened
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    const probe = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('http://127.0.0.1:49152/health', {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeoutId);
        if (isSubscribed) {
          if (res.ok) {
            const data = await res.json();
            setAgentConnected(data.status === 'ok');

            // If a recording was completed or in progress on the desktop daemon, auto-sync and show preview!
            if (data.isRecording || data.completedRecording || (data.actionCount && data.actionCount > 0)) {
              try {
                const statusRes = await fetch('http://127.0.0.1:49152/record/status');
                if (statusRes.ok) {
                  const statusData = await statusRes.json();
                  if (statusData.actions && statusData.actions.length > 0) {
                    setRecordedActions(statusData.actions);
                    setActionCount(statusData.actions.length);
                    if (statusData.name && !recordName) setRecordName(statusData.name);
                    if (statusData.url && !recordUrl) setRecordUrl(statusData.url);
                    if (statusData.recipe) setCapturedRecipe(statusData.recipe);

                    if (statusData.completedRecording || (!statusData.isRecording && statusData.actions.length > 0)) {
                      setRecordingPhase('preview');
                      setActiveTab('record');
                    } else if (statusData.isRecording) {
                      setRecordingPhase('recording');
                      setActiveTab('record');
                    }
                  }
                }
              } catch {}
            }
          } else {
            setAgentConnected(false);
          }
        }
      } catch {
        if (isSubscribed) {
          setAgentConnected(false);
        }
      }
    };

    probe();
    const interval = setInterval(probe, 3000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [isOpen, recordName, recordUrl]);

  // Live polling of /record/status during active recording
  useEffect(() => {
    if (recordingPhase !== 'recording') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('http://127.0.0.1:49152/record/status');
        if (!res.ok) return;

        const data = await res.json();
        if (typeof data.actionCount === 'number') {
          setActionCount(data.actionCount);
        }
        if (Array.isArray(data.actions)) {
          setRecordedActions(data.actions);
          setActionCount(data.actions.length);
        }

        // If user finished in Chrome floating banner or bridge signaled completion
        if (data.completedRecording || (!data.isRecording && data.actions && data.actions.length > 0)) {
          setCapturedRecipe(data.recipe || {
            metadata: {
              name: recordName || data.name || 'Recorded Workflow',
              startUrl: recordUrl || data.url || 'https://vendor-portal.com',
            },
            actions: data.actions || [],
          });
          if (data.name && !recordName) setRecordName(data.name);
          if (data.url && !recordUrl) setRecordUrl(data.url);
          setRecordingPhase('preview');
        }
      } catch (err) {
        console.warn('Status poll warning:', err);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [recordingPhase, recordName, recordUrl]);

  // Clean handleClose: if actively recording or reviewing steps, do NOT wipe out user's recorded steps
  const handleClose = useCallback(() => {
    setFormError(null);
    setSubmitting(false);
    // Don't kill active recording or wipe preview if user just clicked backdrop or close
    onClose();
  }, [onClose]);

  // Explicit cancel/reset recording session button handler
  const handleResetRecordingState = useCallback(() => {
    if (recordingPhase === 'recording') {
      fetch('http://127.0.0.1:49152/record/stop', { method: 'POST' }).catch(() => {});
    }
    setRecordedActions([]);
    setActionCount(0);
    setCapturedRecipe(null);
    setRecordingPhase('idle');
  }, [recordingPhase]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Derive parsed metadata and parse errors during render via useMemo
  const { parsedMetadata, jsonParseError } = useMemo(() => {
    const trimmed = jsonText.trim();
    if (!trimmed) {
      return { parsedMetadata: null, jsonParseError: null };
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== 'object' || parsed === null) {
        return {
          parsedMetadata: null,
          jsonParseError: 'JSON root must be an object.',
        };
      }

      const meta = (parsed as { metadata?: Record<string, unknown> }).metadata || {};
      const parsedRecord = parsed as Record<string, unknown>;
      const name = (meta.name as string) || (parsedRecord.name as string) || 'Imported Workflow';
      const portal_url =
        (meta.startUrl as string) ||
        (parsedRecord.portal_url as string) ||
        (parsedRecord.startUrl as string) ||
        '';

      const actions = Array.isArray(parsedRecord.actions)
        ? parsedRecord.actions
        : Array.isArray(parsedRecord.steps)
        ? parsedRecord.steps
        : [];

      const isLoop = Boolean(meta.isLoop ?? parsedRecord.isLoop ?? false);
      const mode = (meta.mode as string) || (isLoop ? 'LOOP' : 'STANDARD');
      const version = (meta.version as string) || (parsedRecord.schema_version as string) || '1.0.0';

      return {
        parsedMetadata: {
          name,
          portal_url,
          stepCount: actions.length,
          isLoop,
          mode,
          version,
        },
        jsonParseError: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON format';
      return {
        parsedMetadata: null,
        jsonParseError: `Syntax Error: ${msg}`,
      };
    }
  }, [jsonText]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content || '');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setJsonText(content || '');
      };
      reader.readAsText(file);
    } else {
      setFormError('Please drop a valid .json file.');
    }
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!quickName.trim()) {
      setFormError('Portal name is required.');
      return;
    }

    if (!quickUrl.trim()) {
      setFormError('Target portal URL is required.');
      return;
    }

    let normalizedUrl = quickUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: quickName.trim(),
        portal_url: normalizedUrl,
        workflow_definition: {
          schedule: quickSchedule,
          target_folder: quickTargetFolder,
          upload_to_cloud: quickUploadToCloud,
          steps: [
            {
              type: 'navigate',
              url: normalizedUrl,
              description: 'Open vendor portal URL',
            },
          ],
        },
        filter_rules: {},
        upload_to_cloud: quickUploadToCloud,
        target_folder: quickTargetFolder,
      };

      // Try API route first
      const res = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        onWorkflowCreated(data.workflow);
        handleClose();
        return;
      }

      // Fallback: direct Supabase insert
      const supabase = createClient();
      const { data: wf, error: insertError } = await supabase
        .from('wf_workflows')
        .insert({
          org_id: orgId,
          name: quickName.trim(),
          portal_url: normalizedUrl,
          schema_version: '1.0.0',
          workflow_definition: payload.workflow_definition,
          filter_rules: {},
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      onWorkflowCreated(wf as unknown as Workflow);
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create portal';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!parsedMetadata) {
      setFormError('Please provide valid workflow JSON before importing.');
      return;
    }

    if (!parsedMetadata.portal_url) {
      setFormError('Recorded workflow must contain a startUrl or portal_url.');
      return;
    }

    setSubmitting(true);
    try {
      const rawJson = JSON.parse(jsonText);
      const payload = {
        name: parsedMetadata.name,
        portal_url: parsedMetadata.portal_url,
        workflow_definition: {
          ...rawJson,
          upload_to_cloud: quickUploadToCloud,
          target_folder: quickTargetFolder,
        },
        filter_rules: {},
        upload_to_cloud: quickUploadToCloud,
        target_folder: quickTargetFolder,
      };

      const res = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        onWorkflowCreated(data.workflow);
        handleClose();
        return;
      }

      // Fallback: direct Supabase insert
      const supabase = createClient();
      const { data: wf, error: insertError } = await supabase
        .from('wf_workflows')
        .insert({
          org_id: orgId,
          name: parsedMetadata.name,
          portal_url: parsedMetadata.portal_url,
          schema_version: parsedMetadata.version || '1.0.0',
          workflow_definition: payload.workflow_definition,
          filter_rules: {},
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      onWorkflowCreated(wf as unknown as Workflow);
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import workflow JSON';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Tab 3: Desktop Recording Handlers
  const handleStartRecording = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);

    if (!recordName.trim()) {
      setFormError('Portal name is required.');
      return;
    }
    if (!recordUrl.trim()) {
      setFormError('Starting portal URL is required.');
      return;
    }

    let normalizedUrl = recordUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    setRecordingPhase('starting');
    try {
      const res = await fetch('http://127.0.0.1:49152/record/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recordName.trim(),
          url: normalizedUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start recording');
      }

      setRecordedActions([]);
      setActionCount(0);
      setCapturedRecipe(null);
      setRecordingPhase('recording');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not reach desktop recording agent';
      setFormError(msg);
      setRecordingPhase('idle');
    }
  };

  const handleStopRecording = async () => {
    try {
      const res = await fetch('http://127.0.0.1:49152/record/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        const recipe = data.recipe || (data.summary ? {
          metadata: { name: recordName, startUrl: recordUrl },
          actions: recordedActions,
        } : null);

        if (recipe) {
          setCapturedRecipe(recipe);
          if (Array.isArray(recipe.actions)) {
            setRecordedActions(recipe.actions);
            setActionCount(recipe.actions.length);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to stop recording cleanly:', err);
    } finally {
      setRecordingPhase('preview');
    }
  };

  const handleCancelRecording = async () => {
    try {
      await fetch('http://127.0.0.1:49152/record/stop', { method: 'POST' });
    } catch {}
    setRecordedActions([]);
    setActionCount(0);
    setCapturedRecipe(null);
    setRecordingPhase('idle');
  };

  const handleSaveRecordedPortal = async () => {
    setRecordingPhase('saving');
    setFormError(null);

    let normalizedUrl = recordUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const finalRecipe = capturedRecipe || {
      metadata: {
        name: recordName.trim(),
        startUrl: normalizedUrl,
        version: '1.0.0',
        isLoop: false,
        mode: 'STANDARD',
      },
      actions: recordedActions,
      steps: recordedActions,
    };

    const payload = {
      name: recordName.trim(),
      portal_url: normalizedUrl,
      workflow_definition: {
        ...finalRecipe,
        schedule: recordSchedule,
        target_folder: recordTargetFolder,
        upload_to_cloud: recordUploadToCloud,
        steps: recordedActions.length > 0 ? recordedActions : [
          { type: 'navigate', url: normalizedUrl, description: 'Open vendor portal URL' },
        ],
      },
      filter_rules: {},
      upload_to_cloud: recordUploadToCloud,
      target_folder: recordTargetFolder,
    };

    try {
      const res = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        onWorkflowCreated(data.workflow);
        handleClose();
        return;
      }

      // Direct Supabase fallback
      const supabase = createClient();
      const { data: wf, error: insertError } = await supabase
        .from('wf_workflows')
        .insert({
          org_id: orgId,
          name: recordName.trim(),
          portal_url: normalizedUrl,
          schema_version: finalRecipe.metadata?.version || '1.0.0',
          workflow_definition: payload.workflow_definition,
          filter_rules: {},
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

      onWorkflowCreated(wf as unknown as Workflow);
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save workflow';
      setFormError(msg);
      setRecordingPhase('preview');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (recordingPhase === 'recording') return; // Do not dismiss while recording
          handleClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl transition-all"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-semibold text-white">
                Create New Portal Workflow
              </h2>
              <p className="text-xs text-slate-400">
                Configure automated browser capture, import JSON, or record steps directly on this PC
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 px-6 pt-3 bg-slate-950/40">
          <button
            type="button"
            onClick={() => {
              setActiveTab('quick');
              setFormError(null);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'quick'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            Quick Setup Form
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('import');
              setFormError(null);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="h-4 w-4" />
            Import Recorded JSON
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('record');
              setFormError(null);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'record'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="h-4 w-4" />
            Record Steps on This PC
          </button>
        </div>

        {/* Form Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {formError && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {activeTab === 'quick' && (
            <form onSubmit={handleQuickSubmit} className="space-y-4">
              {/* Portal Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Portal / Vendor Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="e.g. US Oil (iRely Portal) or Pacific Gas & Electric"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              {/* Target URL */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target Portal URL <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="url"
                    required
                    value={quickUrl}
                    onChange={(e) => setQuickUrl(e.target.value)}
                    placeholder="https://customerportal.vendor.com/invoices"
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              {/* Schedule and Trigger dropdown */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Schedule / Execution Trigger
                </label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <select
                    value={quickSchedule}
                    onChange={(e) => setQuickSchedule(e.target.value as 'manual' | 'hourly' | 'daily' | 'weekly')}
                    className="w-full appearance-none rounded-xl border border-slate-700/80 bg-slate-950/70 pl-10 pr-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                  >
                    <option value="daily">Daily Automatic Sync (9:00 AM Local)</option>
                    <option value="hourly">Hourly Polling</option>
                    <option value="weekly">Weekly Sync (Mondays)</option>
                    <option value="manual">Manual / On-Demand Only</option>
                  </select>
                </div>
              </div>

              {/* Local Download Path */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Local Download Path (Target Folder)
                </label>
                <div className="relative">
                  <Folder className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={quickTargetFolder}
                    onChange={(e) => setQuickTargetFolder(e.target.value)}
                    placeholder="C:\PortalSync\Invoices or /Users/name/Invoices"
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pl-10 pr-3.5 py-2.5 text-sm font-mono text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Desktop Runner daemon saves downloaded PDF invoices directly to this folder on the runner host.
                </p>
              </div>

              {/* Hybrid Storage Toggle */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                      <Cloud className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white">Hybrid Cloud Storage Sync</span>
                      <p className="text-[11px] text-slate-400">
                        Automatically register SHA-256 hashes and mirror downloaded files into Supabase Storage
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={quickUploadToCloud}
                    onChange={(e) => setQuickUploadToCloud(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                  />
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 transition cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving Portal...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Save Portal Workflow
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'import' && (
            <form onSubmit={handleImportSubmit} className="space-y-4">
              {/* Drag and Drop Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 mb-3">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-xs font-semibold text-white">
                  Drop Chrome recorder JSON file here, or{' '}
                  <span className="text-blue-400 underline">browse</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Supports PortalSync Chrome Extension & Engine recorder export schemas
                </div>
              </div>

              {/* Paste JSON Textarea */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Or Paste Recorded Workflow JSON Directly:
                </label>
                <textarea
                  rows={6}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder={`{\n  "metadata": {\n    "name": "US Oil Portal Export",\n    "startUrl": "https://customerportal.usoil.com/#/home",\n    "isLoop": false\n  },\n  "actions": [ ... ]\n}`}
                  className="w-full font-mono text-xs rounded-xl border border-slate-700/80 bg-slate-950/70 p-3 text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              {jsonParseError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{jsonParseError}</span>
                </div>
              )}

              {/* Metadata Preview Card */}
              {parsedMetadata && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <FileCheck2 className="h-4 w-4" />
                    <span>Workflow Schema Validated</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Workflow Name:</span>
                      <span className="font-semibold text-white">{parsedMetadata.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Start URL:</span>
                      <span className="font-mono text-slate-200 truncate block">
                        {parsedMetadata.portal_url || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Recorded Actions:</span>
                      <span className="font-semibold text-white">{parsedMetadata.stepCount} steps</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Execution Mode:</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {parsedMetadata.mode}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Hybrid storage config for imported workflow */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                  <Info className="h-3.5 w-3.5 text-blue-400" />
                  <span>Execution Preferences</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Local Download Folder</label>
                    <input
                      type="text"
                      value={quickTargetFolder}
                      onChange={(e) => setQuickTargetFolder(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-mono text-white"
                    />
                  </div>
                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quickUploadToCloud}
                        onChange={(e) => setQuickUploadToCloud(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 cursor-pointer"
                      />
                      <span>Sync to Cloud Storage</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !parsedMetadata}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 transition cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing Workflow...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" /> Import & Save Workflow
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'record' && (
            <div className="space-y-4">
              {/* Agent Connection Indicator */}
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center gap-2.5">
                  {agentConnected === true ? (
                    <>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-semibold text-emerald-400">
                        🟢 Desktop Agent Connected
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">(127.0.0.1:49152)</span>
                    </>
                  ) : (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-500"></span>
                      <span className="text-xs font-semibold text-slate-400">
                        ⚪ Desktop Agent Offline
                      </span>
                      <span className="text-[11px] text-slate-500">
                        (Launch Desktop App on this PC)
                      </span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={checkDesktopHealth}
                  disabled={checkingConnection}
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 underline cursor-pointer disabled:opacity-50"
                >
                  {checkingConnection ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                    </>
                  ) : (
                    'Check Connection'
                  )}
                </button>
              </div>

              {/* Phase 1: Pre-Recording Configuration */}
              {recordingPhase === 'idle' && (
                <form onSubmit={handleStartRecording} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Portal / Workflow Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={recordName}
                      onChange={(e) => setRecordName(e.target.value)}
                      placeholder="e.g. US Oil Invoice Capture"
                      className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Starting Portal URL <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                      <input
                        type="url"
                        required
                        value={recordUrl}
                        onChange={(e) => setRecordUrl(e.target.value)}
                        placeholder="https://customerportal.vendor.com"
                        className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Schedule</label>
                      <div className="relative">
                        <Clock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                        <select
                          value={recordSchedule}
                          onChange={(e) => setRecordSchedule(e.target.value as 'manual' | 'hourly' | 'daily' | 'weekly')}
                          className="w-full appearance-none rounded-xl border border-slate-700/80 bg-slate-950/70 pl-10 pr-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none transition cursor-pointer"
                        >
                          <option value="daily">Daily Sync (9:00 AM)</option>
                          <option value="hourly">Hourly Polling</option>
                          <option value="weekly">Weekly Sync</option>
                          <option value="manual">Manual Only</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Local Destination Folder</label>
                      <div className="relative">
                        <Folder className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          value={recordTargetFolder}
                          onChange={(e) => setRecordTargetFolder(e.target.value)}
                          className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pl-10 pr-3.5 py-2.5 text-xs font-mono text-white focus:border-blue-500 focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                          <Cloud className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-white">Hybrid Cloud Storage Sync</span>
                          <p className="text-[11px] text-slate-400">
                            Mirror captured workflow runs and artifacts into cloud storage
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={recordUploadToCloud}
                        onChange={(e) => setRecordUploadToCloud(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button type="button" onClick={handleClose} className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!agentConnected || !recordName.trim() || !recordUrl.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition disabled:opacity-40 cursor-pointer"
                    >
                      <Circle className="h-3 w-3 fill-current text-white animate-pulse" /> Start Recording on This PC
                    </button>
                  </div>
                </form>
              )}

              {/* Phase 2: Active Recording */}
              {(recordingPhase === 'starting' || recordingPhase === 'recording') && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/10 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                      </span>
                      <span>Recording Active in Chrome</span>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
                      ⚡ {actionCount} {actionCount === 1 ? 'Action' : 'Actions'} Captured
                    </div>
                  </div>

                  <p className="text-xs text-slate-300">
                    Chrome has been launched on port 9222. Interact with <strong className="text-white">{recordUrl}</strong> to record your workflow. Clicks, inputs, and navigations are captured automatically.
                  </p>

                  {/* Live Mini Action Stream */}
                  {recordedActions.length > 0 && (
                    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 max-h-36 overflow-y-auto space-y-1.5 text-xs">
                      {recordedActions.slice(-4).map((a, i) => (
                        <div key={i} className="flex items-center gap-2 text-slate-300">
                          <MousePointerClick className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                          <span className="font-semibold text-rose-300 text-[11px]">{a.type}</span>
                          <span className="truncate">{a.elementName || a.name || 'Element'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={handleCancelRecording}
                      className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition cursor-pointer"
                    >
                      <Check className="h-4 w-4" /> Finish Recording & Review Steps
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 3: Step Preview & Confirmation */}
              {(recordingPhase === 'preview' || recordingPhase === 'saving') && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Step Preview & Confirm</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {recordedActions.length} Recorded Steps
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <div><span className="text-slate-400 text-[11px]">Workflow Name:</span> <strong className="text-white block">{recordName}</strong></div>
                      <div><span className="text-slate-400 text-[11px]">Start URL:</span> <span className="font-mono truncate block text-slate-200">{recordUrl}</span></div>
                    </div>
                  </div>

                  {/* Scrollable list of recorded steps */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-2 max-h-52 overflow-y-auto">
                    {recordedActions.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">No actions were captured during this session.</p>
                    ) : (
                      recordedActions.map((action, idx) => (
                        <div key={action.id || idx} className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 p-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              action.type === 'CLICK' ? 'bg-blue-500/20 text-blue-300' :
                              action.type === 'INPUT' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700/40 text-slate-300'
                            }`}>
                              {action.type}
                            </span>
                            <span className="truncate text-slate-200 font-medium">{action.elementName || action.name || 'Element'}</span>
                          </div>
                          {action.value && (
                            <span className="text-[11px] font-mono text-slate-400 truncate max-w-[150px]">
                              val: {String(action.value)}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setRecordingPhase('idle')}
                      disabled={recordingPhase === 'saving'}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Re-Record
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRecordedPortal}
                      disabled={recordingPhase === 'saving'}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition disabled:opacity-50 cursor-pointer"
                    >
                      {recordingPhase === 'saving' ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving Workflow...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" /> Save Portal Workflow
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
