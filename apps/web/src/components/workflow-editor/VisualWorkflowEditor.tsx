'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Drawflow, { DrawflowNode, DrawflowConnection } from 'drawflow';
import './drawflow-theme.css';
import {
  StepActionType,
  StepNodeData,
  renderNodeHtml,
  createDefaultStepData,
} from './CustomNodes';
import PropertyDrawer from './PropertyDrawer';
import {
  ArrowLeft,
  Play,
  Save,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  MousePointer,
  Keyboard,
  ListFilter,
  Compass,
  Clock,
  Repeat,
  Database,
  Download,
  Loader2,
} from 'lucide-react';

interface VisualWorkflowEditorProps {
  workflowId: string;
}

interface LoadedStepCandidate {
  value?: string;
}

interface LoadedStepRecord {
  name?: string;
  action?: string;
  type?: string;
  target?: string | { selector?: string; candidates?: LoadedStepCandidate[] };
  candidates?: string[];
  value?: string | number;
  timeout_ms?: number;
  is_idempotent?: boolean;
  role?: 'SETUP' | 'LOOP';
  extract_column?: string;
  column?: string;
  extract_attribute?: string;
  attribute?: string;
  download_dir?: string;
  upload_to_cloud?: boolean;
}

interface LoadedWorkflowRecord {
  id?: string;
  name?: string;
  portal_url?: string;
  workflow_definition?: {
    drawflow?: unknown;
    steps?: LoadedStepRecord[];
    [key: string]: unknown;
  };
}

export default function VisualWorkflowEditor({ workflowId }: VisualWorkflowEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Drawflow | null>(null);

  const [workflowName, setWorkflowName] = useState<string>('Workflow Canvas');
  const [portalUrl, setPortalUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [runMessage, setRunMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Property Drawer State
  const [selectedNodeId, setSelectedNodeId] = useState<string | number | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<StepNodeData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Ref to track selectedNodeId for event listener cleanup without re-attaching
  const selectedNodeIdRef = useRef<string | number | null>(selectedNodeId);
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  // Palette State
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  // Update step numbers sequentially in the DOM
  const refreshStepVisuals = useCallback(() => {
    if (!editorRef.current) return;
    try {
      const exportData = editorRef.current.export();
      const nodes = exportData.drawflow.Home?.data || {};
      const nodeKeys = Object.keys(nodes);

      nodeKeys.forEach((key, index) => {
        const node = nodes[key];
        const domNode = document.getElementById(`node-${key}`);
        if (domNode && node && node.data) {
          const stepNumElem = domNode.querySelector('.df-step-number');
          if (stepNumElem) {
            stepNumElem.textContent = `#${index + 1}`;
          }
        }
      });
    } catch (err) {
      console.warn('refreshStepVisuals error:', err);
    }
  }, []);

  // Topological compiler to order nodes into execution steps
  const compileTopologicalSteps = useCallback(() => {
    if (!editorRef.current) return { steps: [], hasLoop: false, loopStepIndex: -1 };

    const exported = editorRef.current.export();
    const nodes: Record<string, DrawflowNode> = (exported.drawflow.Home?.data || {}) as Record<string, DrawflowNode>;
    const nodeEntries = Object.entries(nodes);

    if (nodeEntries.length === 0) {
      return { steps: [], hasLoop: false, loopStepIndex: -1 };
    }

    // Identify entry nodes (0 input connections)
    const entryNodes = nodeEntries.filter(([, n]) => {
      const inputConns = n.inputs?.input_1?.connections || [];
      return inputConns.length === 0;
    });

    const orderedNodes: Array<{ id: string; data: StepNodeData; pos_x: number }> = [];
    const visited = new Set<string>();

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const n = nodes[nodeId];
      if (!n) return;

      orderedNodes.push({ id: nodeId, data: n.data as StepNodeData, pos_x: n.pos_x });

      const outputConns: DrawflowConnection[] = (n.outputs?.output_1?.connections || []) as DrawflowConnection[];
      outputConns.forEach((conn: DrawflowConnection) => {
        if (conn.node && !visited.has(String(conn.node))) {
          traverse(String(conn.node));
        }
      });
    };

    if (entryNodes.length > 0) {
      // Sort entry nodes left to right
      entryNodes.sort((a, b) => a[1].pos_x - b[1].pos_x);
      entryNodes.forEach(([id]) => traverse(id));
    }

    // Append any unconnected nodes sorted by pos_x
    nodeEntries
      .filter(([id]) => !visited.has(id))
      .sort((a, b) => a[1].pos_x - b[1].pos_x)
      .forEach(([id]) => traverse(id));

    let firstLoopIdx = -1;
    const compiledSteps = orderedNodes.map((item, idx) => {
      const d = item.data || {};
      const action = (d.action || 'CLICK').toUpperCase() as StepActionType;
      const isLoop = d.role === 'LOOP' || action === 'LOOP_START';

      if (isLoop && firstLoopIdx === -1) {
        firstLoopIdx = idx;
      }

      return {
        index: idx,
        name: d.name || `Step #${idx + 1}`,
        action,
        type: action,
        target: d.target || '',
        candidates: Array.isArray(d.candidates) ? d.candidates : [],
        value: d.value || '',
        timeout_ms: Number(d.timeout_ms) || 5000,
        is_idempotent: Boolean(d.is_idempotent),
        role: d.role || (action === 'LOOP_START' ? 'LOOP' : 'SETUP'),
        isLoop,
        ...(d.extract_column ? { extract_column: d.extract_column, extract_attribute: d.extract_attribute } : {}),
        ...(d.download_dir ? { download_dir: d.download_dir, upload_to_cloud: d.upload_to_cloud } : {}),
      };
    });

    return {
      steps: compiledSteps,
      hasLoop: firstLoopIdx >= 0,
      loopStepIndex: firstLoopIdx,
    };
  }, []);

  // Save workflow to Supabase via PATCH API
  const handleSaveToCloud = async () => {
    if (!editorRef.current || isSaving) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const exportedGraph = editorRef.current.export();
      const { steps, hasLoop, loopStepIndex } = compileTopologicalSteps();

      const payload = {
        workflow_id: workflowId,
        name: workflowName,
        portal_url: portalUrl || 'https://example.com',
        workflow_definition: {
          drawflow: exportedGraph,
          steps,
          actions: steps,
          start_url: portalUrl,
          isLoop: hasLoop,
          loopStepIndex,
        },
      };

      const res = await fetch(`/api/v1/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Fallback to /api/v1/workflows if [id] route is not available
        const fallbackRes = await fetch(`/api/v1/workflows`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!fallbackRes.ok) {
          const errData = await fallbackRes.json();
          throw new Error(errData.error || 'Failed to save workflow');
        }
      }

      setIsDirty(false);
      setSaveMessage({ text: 'Workflow saved to cloud!', type: 'success' });
      setTimeout(() => setSaveMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving workflow';
      setSaveMessage({ text: msg, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Run Now dispatcher
  const handleRunNow = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setRunMessage(null);

    try {
      // Auto-save before running if dirty
      if (isDirty) {
        await handleSaveToCloud();
      }

      const res = await fetch('/api/v1/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: workflowId,
          status: 'pending',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger run');
      }

      setRunMessage({
        text: `Run dispatched! Status: pending (Run ID: ${data.run?.id?.slice(0, 8) || 'active'})`,
        type: 'success',
      });
      setTimeout(() => setRunMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error dispatching execution';
      setRunMessage({ text: msg, type: 'error' });
    } finally {
      setIsRunning(false);
    }
  };

  // Add a new step node from palette
  const handleAddStep = (actionType: StepActionType) => {
    if (!editorRef.current) return;

    const exportData = editorRef.current.export();
    const existingNodes: Record<string, DrawflowNode> = (exportData.drawflow.Home?.data || {}) as Record<string, DrawflowNode>;
    const nodeCount = Object.keys(existingNodes).length;

    // Find the rightmost node to position and auto-connect
    let maxPosX = 60;
    let lastNodeId: string | null = null;
    Object.entries(existingNodes).forEach(([id, node]) => {
      if (node.pos_x > maxPosX) {
        maxPosX = node.pos_x;
        lastNodeId = id;
      }
    });

    const newPosX = nodeCount === 0 ? 100 : maxPosX + 380;
    const newPosY = 180 + (nodeCount % 2) * 40;

    const stepData = createDefaultStepData(actionType, nodeCount);
    const html = renderNodeHtml(stepData);

    const newNodeId = editorRef.current.addNode(
      'step',
      1, // 1 input port
      1, // 1 output port
      newPosX,
      newPosY,
      'step-node',
      stepData,
      html
    );

    // Auto-connect to previous node
    if (lastNodeId) {
      try {
        editorRef.current.addConnection(lastNodeId, newNodeId, 'output_1', 'input_1');
      } catch (err) {
        console.warn('Auto connection error:', err);
      }
    }

    setIsPaletteOpen(false);
    markDirty();
    refreshStepVisuals();

    // Select the new node immediately in property drawer
    setSelectedNodeId(newNodeId);
    setSelectedNodeData(stepData);
    setIsDrawerOpen(true);
  };

  // Update step from PropertyDrawer
  const handleUpdateStep = (nodeId: string | number, updatedData: StepNodeData) => {
    if (!editorRef.current) return;

    editorRef.current.updateNodeDataFromId(nodeId, updatedData);

    // Re-render inner HTML in the canvas
    const domNode = document.getElementById(`node-${nodeId}`);
    if (domNode) {
      const contentElem = domNode.querySelector('.drawflow_content_node');
      if (contentElem) {
        contentElem.innerHTML = renderNodeHtml(updatedData);
      }
    }

    setSelectedNodeData(updatedData);
    markDirty();
    refreshStepVisuals();
  };

  // Delete node
  const handleDeleteNode = (nodeId: string | number) => {
    if (!editorRef.current) return;
    editorRef.current.removeNodeId(`node-${nodeId}`);
    if (selectedNodeId === nodeId) {
      setIsDrawerOpen(false);
      setSelectedNodeId(null);
      setSelectedNodeData(null);
    }
    markDirty();
    refreshStepVisuals();
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (editorRef.current) {
      editorRef.current.zoom_in();
      setZoomLevel(Math.round(editorRef.current.zoom * 100));
    }
  };

  const handleZoomOut = () => {
    if (editorRef.current) {
      editorRef.current.zoom_out();
      setZoomLevel(Math.round(editorRef.current.zoom * 100));
    }
  };

  const handleZoomReset = () => {
    if (editorRef.current) {
      editorRef.current.zoom_reset();
      setZoomLevel(100);
    }
  };

  // Initialize Drawflow canvas and load workflow
  useEffect(() => {
    if (!containerRef.current) return;

    const editor = new Drawflow(containerRef.current);
    editor.reroute = true;
    editor.reroute_fix_curvature = true;
    editor.curvature = 0.5;
    editor.reroute_curvature_start_end = 0.5;
    editor.reroute_curvature = 0.5;
    editor.start();

    editorRef.current = editor;

    // Node selection events
    editor.on('nodeSelected', (rawId: unknown) => {
      const id = String(rawId);
      const exportData = editor.export();
      const node = exportData.drawflow.Home?.data[id];
      if (node) {
        setSelectedNodeId(id);
        setSelectedNodeData(node.data as StepNodeData);
        setIsDrawerOpen(true);
      }
    });

    editor.on('nodeCreated', () => markDirty());
    editor.on('nodeRemoved', () => markDirty());
    editor.on('connectionCreated', () => markDirty());
    editor.on('connectionRemoved', () => markDirty());

    // Delegated click handler on container for node delete button
    const container = containerRef.current;
    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const deleteBtn = target.closest('[data-node-action="delete"]');
      if (deleteBtn) {
        e.stopPropagation();
        const parentNode = target.closest('.drawflow-node');
        if (parentNode && parentNode.id) {
          const rawId = parentNode.id.replace('node-', '');
          if (confirm('Delete this step?')) {
            editor.removeNodeId(parentNode.id);
            const currentSelected = selectedNodeIdRef.current;
            if (currentSelected === rawId || currentSelected === Number(rawId)) {
              setIsDrawerOpen(false);
              setSelectedNodeId(null);
              setSelectedNodeData(null);
            }
            markDirty();
            refreshStepVisuals();
          }
        }
      }
    };
    container.addEventListener('click', handleContainerClick);

    // Fetch and load existing workflow
    const loadWorkflow = async () => {
      setIsLoading(true);
      try {
        let wfData: LoadedWorkflowRecord | null = null;

        // Try single workflow endpoint first
        const resSingle = await fetch(`/api/v1/workflows/${workflowId}`);
        if (resSingle.ok) {
          const json = await resSingle.json();
          wfData = json.workflow;
        } else {
          // Fallback to ?id= query param
          const resQuery = await fetch(`/api/v1/workflows?id=${encodeURIComponent(workflowId)}`);
          if (resQuery.ok) {
            const json = await resQuery.json();
            wfData = json.workflow || (json.workflows && json.workflows[0]);
          }
        }

        if (wfData) {
          setWorkflowName(wfData.name || 'Untitled Workflow');
          setPortalUrl(wfData.portal_url || '');

          const def = wfData.workflow_definition || {};

          // Graph loading logic
          if (def.drawflow && typeof def.drawflow === 'object' && 'drawflow' in def.drawflow) {
            // Case 1: Existing visual Drawflow graph saved
            editor.import(def.drawflow);
            refreshStepVisuals();
          } else if (Array.isArray(def.steps) && def.steps.length > 0) {
            // Case 2: Synthesize Drawflow nodes from steps array
            const steps: LoadedStepRecord[] = def.steps;
            let prevNodeId: number | null = null;

            steps.forEach((step, idx) => {
              const act = (step.action || step.type || 'CLICK').toUpperCase() as StepActionType;
              const posX = 100 + idx * 380;
              const posY = 180 + (idx % 2) * 40;

              const targetSelector =
                typeof step.target === 'string'
                  ? step.target
                  : step.target?.selector || '';

              const candidateList: string[] = Array.isArray(step.candidates)
                ? step.candidates
                : typeof step.target === 'object' && step.target !== null && Array.isArray(step.target.candidates)
                ? step.target.candidates
                    .map((c: LoadedStepCandidate) => (typeof c === 'string' ? c : c.value || ''))
                    .filter((v: string) => v.length > 0)
                : [];

              const stepData: StepNodeData = {
                stepIndex: idx,
                name: step.name || `${act} Step #${idx + 1}`,
                action: act,
                target: targetSelector,
                candidates: candidateList,
                value: String(step.value ?? ''),
                timeout_ms: step.timeout_ms || 5000,
                is_idempotent: Boolean(step.is_idempotent),
                role: step.role || (act === 'LOOP_START' ? 'LOOP' : 'SETUP'),
                extract_column: step.extract_column || step.column || '',
                extract_attribute: step.extract_attribute || step.attribute || '',
                download_dir: step.download_dir || '',
                upload_to_cloud: Boolean(step.upload_to_cloud),
              };

              const html = renderNodeHtml(stepData);
              const nodeId = editor.addNode('step', 1, 1, posX, posY, 'step-node', stepData, html);

              if (prevNodeId !== null) {
                editor.addConnection(prevNodeId, nodeId, 'output_1', 'input_1');
              }
              prevNodeId = nodeId;
            });

            refreshStepVisuals();
          }
        }
      } catch (err) {
        console.error('Error loading workflow:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflow();

    return () => {
      container.removeEventListener('click', handleContainerClick);
    };
  }, [workflowId, markDirty, refreshStepVisuals]);

  // Window beforeunload prompt when dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#060913] text-slate-100 antialiased select-none">
      {/* ===================================================================
          Top Navigation Bar
          =================================================================== */}
      <header className="z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 md:px-6 backdrop-blur-md">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/dashboard"
            onClick={(e) => {
              if (isDirty && !confirm('You have unsaved changes. Leave without saving?')) {
                e.preventDefault();
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => {
                  setWorkflowName(e.target.value);
                  markDirty();
                }}
                placeholder="Workflow Name"
                className="bg-transparent font-bold text-sm md:text-base text-white hover:border-b hover:border-slate-700 focus:border-b focus:border-emerald-500 focus:outline-none transition max-w-[240px] md:max-w-md truncate"
              />
              {isDirty && (
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />
              )}
            </div>

            {portalUrl && (
              <span className="text-[11px] text-slate-500 font-mono truncate max-w-[200px] md:max-w-xs">
                {portalUrl}
              </span>
            )}
          </div>
        </div>

        {/* Center: Canvas Zoom Controls */}
        <div className="hidden lg:flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-1 py-1 text-slate-400">
          <button
            onClick={handleZoomOut}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-800 hover:text-white transition"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="px-2 text-xs font-mono font-medium text-slate-300 min-w-[48px] text-center">
            {zoomLevel}%
          </span>
          <button
            onClick={handleZoomIn}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-800 hover:text-white transition"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-slate-800 mx-0.5" />
          <button
            onClick={handleZoomReset}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-800 hover:text-white transition"
            title="Reset Zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Add Step Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setIsPaletteOpen(!isPaletteOpen)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Step
            </button>

            {/* Dropdown Menu */}
            {isPaletteOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 text-xs"
                onClick={() => setIsPaletteOpen(false)}
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Standard Actions
                </div>
                <button
                  onClick={() => handleAddStep('CLICK')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <MousePointer className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Click Element</span>
                </button>
                <button
                  onClick={() => handleAddStep('TYPE')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Keyboard className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Type Text</span>
                </button>
                <button
                  onClick={() => handleAddStep('SELECT')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <ListFilter className="h-3.5 w-3.5 text-purple-400" />
                  <span>Select Option</span>
                </button>
                <button
                  onClick={() => handleAddStep('NAVIGATE')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Compass className="h-3.5 w-3.5 text-sky-400" />
                  <span>Navigate URL</span>
                </button>
                <button
                  onClick={() => handleAddStep('WAIT')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Wait Timer</span>
                </button>

                <div className="my-1 border-t border-slate-800" />
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Automation & Loops
                </div>
                <button
                  onClick={() => handleAddStep('LOOP_START')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Repeat className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Loop Start</span>
                </button>
                <button
                  onClick={() => handleAddStep('EXTRACT')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Database className="h-3.5 w-3.5 text-teal-400" />
                  <span>Item Extraction</span>
                </button>
                <button
                  onClick={() => handleAddStep('DOWNLOAD')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  <span>File Download</span>
                </button>
              </div>
            )}
          </div>

          {/* Save to Cloud Button */}
          <button
            onClick={handleSaveToCloud}
            disabled={isSaving}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isDirty
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500'
                : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {isSaving ? 'Saving…' : isDirty ? 'Save to Cloud *' : 'Saved'}
          </button>

          {/* Run Now Button */}
          <button
            onClick={handleRunNow}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/50 hover:brightness-110 transition cursor-pointer"
          >
            {isRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            Run Now
          </button>
        </div>
      </header>

      {/* Floating Status Notification Banners */}
      {saveMessage && (
        <div
          className={`absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold shadow-xl backdrop-blur-md transition ${
            saveMessage.type === 'success'
              ? 'border border-emerald-500/30 bg-emerald-950/80 text-emerald-300'
              : 'border border-red-500/30 bg-red-950/80 text-red-300'
          }`}
        >
          {saveMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>{saveMessage.text}</span>
        </div>
      )}

      {runMessage && (
        <div
          className={`absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold shadow-xl backdrop-blur-md transition ${
            runMessage.type === 'success'
              ? 'border border-emerald-500/30 bg-emerald-950/80 text-emerald-300'
              : 'border border-red-500/30 bg-red-950/80 text-red-300'
          }`}
        >
          <Play className="h-4 w-4 fill-current" />
          <span>{runMessage.text}</span>
        </div>
      )}

      {/* ===================================================================
          Main Editor Canvas Area
          =================================================================== */}
      <main className="relative flex-1 w-full h-full overflow-hidden bg-[#060913]">
        {isLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#060913]/90 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
            <p className="mt-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Loading Workflow Canvas…
            </p>
          </div>
        )}

        {/* Drawflow DOM Container */}
        <div
          ref={containerRef}
          id="drawflow"
          className="parent-drawflow workflow-editor-canvas"
        />

        {/* Property Slide-Over Drawer */}
        <PropertyDrawer
          key={selectedNodeId !== null ? String(selectedNodeId) : 'none'}
          nodeId={selectedNodeId}
          nodeData={selectedNodeData}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onUpdate={handleUpdateStep}
          onDelete={handleDeleteNode}
        />
      </main>
    </div>
  );
}
