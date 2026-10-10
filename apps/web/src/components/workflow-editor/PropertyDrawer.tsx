'use client';

import React, { useState } from 'react';
import {
  StepNodeData,
  StepActionType,
  ACTION_DEFINITIONS,
} from './CustomNodes';
import {
  X,
  Trash2,
  Save,
  ShieldCheck,
  Clock,
  Code,
  Sliders,
  Layers,
  Database,
  Cloud,
} from 'lucide-react';

interface PropertyDrawerProps {
  nodeId: string | number | null;
  nodeData: StepNodeData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string | number, updatedData: StepNodeData) => void;
  onDelete: (nodeId: string | number) => void;
}

export default function PropertyDrawer({
  nodeId,
  nodeData,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: PropertyDrawerProps) {
  const [draft, setDraft] = useState<StepNodeData | null>(nodeData ? { ...nodeData } : null);
  const [candidatesText, setCandidatesText] = useState<string>(
    (nodeData?.candidates || []).join('\n')
  );

  if (!isOpen || !draft || nodeId === null) {
    return null;
  }

  const handleActionChange = (newAction: StepActionType) => {
    const def = ACTION_DEFINITIONS[newAction] || ACTION_DEFINITIONS.CLICK;
    setDraft((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        action: newAction,
        role: def.role,
        timeout_ms: prev.timeout_ms || def.defaultTimeout,
        is_idempotent: newAction === 'CLICK' ? prev.is_idempotent ?? true : false,
      };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || nodeId === null) return;

    const parsedCandidates = candidatesText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const updated: StepNodeData = {
      ...draft,
      candidates: parsedCandidates,
      timeout_ms: Number(draft.timeout_ms) || 5000,
    };

    onUpdate(nodeId, updated);
  };

  const handleDelete = () => {
    if (nodeId !== null && confirm(`Delete step "${draft.name || draft.action}"?`)) {
      onDelete(nodeId);
      onClose();
    }
  };

  const actionDef = ACTION_DEFINITIONS[draft.action] || ACTION_DEFINITIONS.CLICK;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-in-out text-slate-200"
      aria-label="Step Property Drawer"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4 bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Step Inspector</h3>
            <p className="text-xs text-slate-400">
              Step #{draft.stepIndex !== undefined ? draft.stepIndex + 1 : 1} &middot; Node {nodeId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition"
            title="Delete this step"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title="Close Drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Drawer Body Form */}
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Step Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Step Name / Description
          </label>
          <input
            type="text"
            value={draft.name || ''}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. Click Submit Button"
            className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>

        {/* Action Type & Execution Role */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Action Type
            </label>
            <select
              value={draft.action}
              onChange={(e) => handleActionChange(e.target.value as StepActionType)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-2 text-xs font-semibold text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
            >
              {Object.keys(ACTION_DEFINITIONS).map((actKey) => {
                const act = ACTION_DEFINITIONS[actKey as StepActionType];
                return (
                  <option key={actKey} value={actKey} className="bg-slate-900 text-slate-200">
                    {act.label}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Execution Role
            </label>
            <select
              value={draft.role || 'SETUP'}
              onChange={(e) => setDraft({ ...draft, role: e.target.value as 'SETUP' | 'LOOP' })}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-2 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
            >
              <option value="SETUP">Run Once (Setup)</option>
              <option value="LOOP">Repeats in Loop</option>
            </select>
          </div>
        </div>

        {/* Primary Target Selector */}
        {actionDef.hasTarget && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Code className="h-3.5 w-3.5 text-sky-400" />
                Target Selector
              </label>
              <span className="text-[10px] text-slate-500 font-mono">CSS / XPath</span>
            </div>
            <input
              type="text"
              value={draft.target || ''}
              onChange={(e) => setDraft({ ...draft, target: e.target.value })}
              placeholder="#main-btn, button.submit, or //button"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs font-mono text-sky-300 placeholder-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition"
            />
          </div>
        )}

        {/* Candidate Selectors List */}
        {actionDef.hasTarget && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                Candidate Selectors
              </label>
              <span className="text-[10px] text-slate-500">One per line</span>
            </div>
            <textarea
              rows={3}
              value={candidatesText}
              onChange={(e) => setCandidatesText(e.target.value)}
              placeholder="button.primary&#10;form input[type='submit']&#10;[data-testid='btn-save']"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs font-mono text-slate-300 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition resize-y"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Fallback selectors used if the primary target cannot be located.
            </p>
          </div>
        )}

        {/* Action Value */}
        {actionDef.hasValue && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              {draft.action === 'WAIT'
                ? 'Wait Time (Milliseconds)'
                : draft.action === 'NAVIGATE'
                ? 'Target URL'
                : draft.action === 'SELECT'
                ? 'Select Option Value'
                : 'Action Value / Input'}
            </label>
            <input
              type="text"
              value={draft.value || ''}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
              placeholder={actionDef.valuePlaceholder || 'Value...'}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs font-mono text-emerald-300 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
        )}

        {/* Timeout ms */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              Timeout (Milliseconds)
            </label>
            <span className="text-[10px] text-slate-500">Default: {actionDef.defaultTimeout}ms</span>
          </div>
          <input
            type="number"
            min={500}
            max={120000}
            step={500}
            value={draft.timeout_ms || actionDef.defaultTimeout}
            onChange={(e) => setDraft({ ...draft, timeout_ms: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs font-mono text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
          />
        </div>

        {/* Checkbox Idempotent Flag */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3.5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(draft.is_idempotent)}
              onChange={(e) => setDraft({ ...draft, is_idempotent: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
            />
            <div className="flex-1">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                State-Aware Checkbox Idempotency
              </span>
              <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                Pre-checks the DOM element state before clicking. Guarantees checkboxes remain in the intended state without accidental un-checking.
              </p>
            </div>
          </label>
        </div>

        {/* Extra Settings for Item Extraction */}
        {draft.action === 'EXTRACT' && (
          <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-300">
              <Database className="h-3.5 w-3.5" />
              Extraction Schema
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Column Name</label>
              <input
                type="text"
                value={draft.extract_column || ''}
                onChange={(e) => setDraft({ ...draft, extract_column: e.target.value })}
                placeholder="e.g. invoice_number"
                className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-teal-200"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Target Property</label>
              <input
                type="text"
                value={draft.extract_attribute || 'textContent'}
                onChange={(e) => setDraft({ ...draft, extract_attribute: e.target.value })}
                placeholder="textContent, value, href"
                className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300"
              />
            </div>
          </div>
        )}

        {/* Extra Settings for File Download */}
        {draft.action === 'DOWNLOAD' && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
              <Cloud className="h-3.5 w-3.5" />
              Hybrid Storage Options
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Local Download Folder</label>
              <input
                type="text"
                value={draft.download_dir || ''}
                onChange={(e) => setDraft({ ...draft, download_dir: e.target.value })}
                placeholder="~/Downloads/PortalSync"
                className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={Boolean(draft.upload_to_cloud ?? true)}
                onChange={(e) => setDraft({ ...draft, upload_to_cloud: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500"
              />
              <span className="text-xs text-slate-300">Sync copy to Supabase Storage</span>
            </label>
          </div>
        )}
      </form>

      {/* Drawer Footer Actions */}
      <div className="border-t border-slate-800 bg-slate-900/80 px-5 py-3 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 transition cursor-pointer"
        >
          <Save className="h-3.5 w-3.5" />
          Update Step
        </button>
      </div>
    </aside>
  );
}
