'use client';
import React, { useState, useEffect, useMemo } from 'react';
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
  CheckSquare,
  ListFilter,
  Repeat,
} from 'lucide-react';

interface PropertyDrawerProps {
  nodeId: string | number | null;
  nodeData: StepNodeData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string | number, updatedData: StepNodeData) => void;
  onDelete: (nodeId: string | number) => void;
}

/**
 * Extracts available select/dropdown options from metadata or DOM fingerprints
 */
export function extractAvailableOptions(nodeData: StepNodeData): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];

  // 1. Explicit options saved on step or meta
  const rawOptions = nodeData.options || (nodeData.meta as Record<string, unknown> | undefined)?.options;
  if (Array.isArray(rawOptions) && rawOptions.length > 0) {
    return rawOptions.map((opt) => (typeof opt === 'string' ? { value: opt, label: opt } : opt));
  }

  // 2. Extracted from fingerprint text
  const fp = (nodeData.rawTarget?.fingerprint || (nodeData.target as unknown as Record<string, unknown>)?.fingerprint) as Record<string, unknown> | undefined;
  if (fp && typeof fp.text === 'string' && (fp.tagName === 'select' || fp.role === 'combobox' || fp.role === 'listbox' || nodeData.action === 'SELECT')) {
    const raw = fp.text.trim();
    const lines = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (lines.length > 1) {
      return lines.map((t) => ({ value: t.toLowerCase().replace(/[^a-z0-9]+/g, '_'), label: t }));
    }
    const parts = raw.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts.map((t) => ({ value: t.toLowerCase().replace(/[^a-z0-9]+/g, '_'), label: t }));
    }
  }

  // 3. Fallback to current step value
  if (nodeData.value) {
    options.push({ value: String(nodeData.value), label: String(nodeData.value) });
  }

  return options;
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

  // Sync draft when selected nodeData changes
  useEffect(() => {
    if (nodeData) {
      setDraft({ ...nodeData });
      setCandidatesText((nodeData.candidates || []).join('\n'));
    }
  }, [nodeId, nodeData]);

  const availableOptions = useMemo(() => {
    if (!draft) return [];
    return extractAvailableOptions(draft);
  }, [draft]);

  if (!isOpen) return null;
  if (!draft || nodeId === null) {
    return (
      <aside className="flex h-full w-full flex-col bg-[#0F172A] text-slate-200" aria-label="Step settings">
        <div className="border-b border-slate-800 px-4 py-5">
          <h3 className="text-sm font-semibold text-slate-100">Step settings</h3>
          <p className="mt-1 text-xs text-slate-500">Choose a step to configure it.</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/70 text-slate-400"><Sliders className="h-5 w-5" /></div>
          <p className="mt-3 text-sm font-medium text-slate-200">Nothing selected</p>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">Select a node on the canvas or a step in the sidebar to edit its settings.</p>
        </div>
        <div className="border-t border-slate-800 px-4 py-3 text-[11px] leading-5 text-slate-500"><span className="text-cyan-400">Tip:</span> Keep each step focused on one action.</div>
      </aside>
    );
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
        fieldName: newAction === 'EXTRACT_TEXT' ? (prev.fieldName || 'Extracted_Value') : prev.fieldName,
        columnName: newAction === 'EXTRACT_TEXT' ? (prev.columnName || 'Extracted_Value') : prev.columnName,
      };
    });
  };

  const isCheckboxStep = Boolean(
    draft.isCheckbox === true ||
    draft.desiredState !== undefined ||
    draft.checked !== undefined ||
    (draft.rawTarget && (draft.rawTarget as Record<string, unknown>)?.isCheckbox) ||
    (draft.rawTarget && ((draft.rawTarget as Record<string, unknown>)?.fingerprint as Record<string, unknown>)?.type === 'checkbox') ||
    (draft.rawTarget && ((draft.rawTarget as Record<string, unknown>)?.fingerprint as Record<string, unknown>)?.tagName === 'mat-pseudo-checkbox') ||
    (draft.name && draft.name.toLowerCase().includes('checkbox')) ||
    (draft.action === 'CLICK' && draft.is_idempotent)
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || nodeId === null) return;

    const parsedCandidates = candidatesText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const isCb = Boolean(draft.isCheckbox ?? isCheckboxStep);
    const finalDesiredState = draft.desiredState !== undefined
      ? draft.desiredState
      : (draft.checked !== undefined ? draft.checked : true);

    const updated: StepNodeData = {
      ...draft,
      candidates: parsedCandidates,
      timeout_ms: Number(draft.timeout_ms) || 5000,
      isCheckbox: isCb,
      ...(isCb ? {
        desiredState: finalDesiredState,
        checked: finalDesiredState,
        isUncheck: finalDesiredState === false,
        is_idempotent: true,
      } : {}),
      isLoop: draft.role === 'LOOP' || draft.isLoop === true || draft.action === 'EXTRACT_TABLE' || draft.action === 'EXTRACT_TEXT',
      fieldName: draft.fieldName,
      columnName: draft.columnName || draft.fieldName,
      sampleValue: draft.sampleValue,
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
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0F172A] text-slate-200"
      aria-label="Step settings"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4 bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Step settings</h3>
            <p className="text-xs text-slate-500">Step {draft.stepIndex !== undefined ? draft.stepIndex + 1 : 1}</p>
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
      <form onSubmit={handleSave} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-5">
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
              onChange={(e) => {
                const newRole = e.target.value as 'SETUP' | 'LOOP';
                const nextDraft: StepNodeData = {
                  ...draft,
                  role: newRole,
                  isLoop: newRole === 'LOOP',
                  loopMode: newRole === 'LOOP' ? 'sequential_iteration' : undefined,
                };
                setDraft(nextDraft);
                if (nodeId !== null) {
                  onUpdate(nodeId, nextDraft);
                }
              }}
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

        <details className="group rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium text-slate-200 marker:hidden">
            <span className="flex items-center gap-2"><Sliders className="h-4 w-4 text-slate-400" />Advanced settings</span>
            <span className="text-slate-500 transition group-open:rotate-90">›</span>
          </summary>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">Selectors, timeouts, and action-specific options.</p>
          <div className="mt-4 space-y-5">
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

        {/* Available Options & Loop Selection for Select / Dropdown */}
        {(draft.action === 'SELECT' || availableOptions.length > 0) && (
          <div className="rounded-lg border border-indigo-500/25 bg-indigo-500/5 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <ListFilter className="h-3.5 w-3.5" />
                Available Options
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {availableOptions.length} Discovered
              </span>
            </div>
            <select
              value={draft.role === 'LOOP' || draft.value === '{{loop:index}}' ? '__dynamic_loop__' : (draft.value || '')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__dynamic_loop__') {
                  setDraft({
                    ...draft,
                    role: 'LOOP',
                    isLoop: true,
                    loopMode: 'sequential_iteration',
                    value: '{{loop:index}}',
                  });
                } else {
                  setDraft({
                    ...draft,
                    value: val,
                    role: draft.role === 'LOOP' ? 'SETUP' : draft.role,
                    isLoop: false,
                    loopMode: undefined,
                  });
                }
              }}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs font-medium text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            >
              {availableOptions.map((opt, idx) => (
                <option key={idx} value={opt.value}>
                  {idx + 1}. {opt.label}
                </option>
              ))}
              <option value="__dynamic_loop__" className="text-amber-400 font-bold bg-slate-950">
                ↻ Repeats for each record (Iterate sequentially)
              </option>
            </select>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Select a fixed choice or choose to repeat for each record across batch execution runs.
            </p>
          </div>
        )}

        {/* Checkbox Target State: Idempotent action explanation */}
        {(draft.action === 'CLICK' || isCheckboxStep) && (
          <div className="rounded-lg border border-sky-500/25 bg-sky-500/5 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" />
                Checkbox Target State
              </span>
              <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-500/20">
                Safe to retry
              </span>
            </div>
            <select
              value={draft.desiredState === false ? 'false' : 'true'}
              onChange={(e) => {
                const shouldBeChecked = e.target.value === 'true';
                setDraft({
                  ...draft,
                  isCheckbox: true,
                  desiredState: shouldBeChecked,
                  checked: shouldBeChecked,
                  isUncheck: !shouldBeChecked,
                  is_idempotent: true,
                });
              }}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs font-semibold text-sky-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition"
            >
              <option value="true">Ensure checked (ON)</option>
              <option value="false">Ensure unchecked (OFF)</option>
            </select>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pre-checks the DOM element state before clicking. Guarantees checkboxes remain in the intended state without accidental un-checking.
            </p>
          </div>
        )}

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
                Skip clicking if element is already in the target state.
              </p>
            </div>
          </label>
        </div>


        {/* Extra Settings for EXTRACT_TEXT / CAPTURE_FIELD */}
        {(draft.action === 'EXTRACT_TEXT' || (draft.action as string) === 'CAPTURE_FIELD') && (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" />
                Excel Column Header (fieldName)
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/20">
                CSV Export
              </span>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Column Name in Exported Sheet
              </label>
              <input
                type="text"
                value={draft.fieldName || draft.columnName || draft.value || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft({
                    ...draft,
                    fieldName: val,
                    columnName: val,
                    value: val,
                  });
                }}
                placeholder="e.g. Invoice_Number, Total_Amount, Due_Date"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono font-semibold text-emerald-300 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
              <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                This name will be used as the column header in the generated Excel CSV spreadsheet.
              </p>
            </div>

            {draft.sampleValue && (
              <div className="rounded border border-emerald-500/20 bg-emerald-950/40 p-2.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/80 mb-1">
                  Sample Value Captured
                </div>
                <div className="text-xs font-mono text-slate-200 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 break-all">
                  {String(draft.sampleValue)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Extra Settings for Item Extraction */}
        {draft.action === 'EXTRACT' && (
          <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-300">
              <Database className="h-3.5 w-3.5" />
              Extraction Schema
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-slate-400">Column Name</label>
                <span className="text-[10px] text-teal-400/80">Recommended fields available</span>
              </div>
              <input
                type="text"
                list="extract_column_recommendations"
                value={draft.extract_column || ''}
                onChange={(e) => setDraft({ ...draft, extract_column: e.target.value })}
                placeholder="e.g. invoice_number"
                className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-teal-200"
              />
              <datalist id="extract_column_recommendations">
                {['invoice_number', 'invoice_date', 'due_date', 'total_amount', 'status', 'customer_name', 'vendor_name', 'description', 'tax_amount', 'balance_due'].map(col => (
                  <option key={col} value={col} />
                ))}
              </datalist>
              <div className="mt-2 flex flex-wrap gap-1">
                {['invoice_number', 'due_date', 'total_amount', 'status'].map(rec => (
                  <button
                    key={rec}
                    type="button"
                    onClick={() => setDraft({ ...draft, extract_column: rec })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition ${
                      draft.extract_column === rec
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    +{rec}
                  </button>
                ))}
              </div>
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
                placeholder="~/Downloads/ReFlow"
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
          </div>
        </details>
      </form>

      {/* Drawer Footer Actions */}
      <div className="border-t border-slate-800 bg-[#0F172A] px-4 py-3 flex items-center justify-end gap-2">
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
          Save changes
        </button>
      </div>
    </aside>
  );
}
