'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Info
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Workflow } from '@/lib/types/database';

interface CreatePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  onWorkflowCreated: (newWorkflow: Workflow) => void;
}

export function CreatePortalModal({
  isOpen,
  onClose,
  orgId,
  onWorkflowCreated,
}: CreatePortalModalProps) {
  const [activeTab, setActiveTab] = useState<'quick' | 'import'>('quick');
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

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const handleClose = () => {
    setFormError(null);
    setSubmitting(false);
    onClose();
  };

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
        onClick={handleClose}
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
                Configure automated browser capture or import a recorded session
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
        </div>

        {/* Form Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {formError && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {activeTab === 'quick' ? (
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
          ) : (
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
        </div>
      </div>
    </div>
  );
}
