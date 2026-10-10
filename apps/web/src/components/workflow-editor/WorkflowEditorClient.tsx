'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

export function EditorLoadingState() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#060913] text-slate-100 select-none">
      <div className="relative flex items-center justify-center">
        <div className="h-16 w-16 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
        <Loader2 className="absolute h-6 w-6 text-emerald-400 animate-pulse" />
      </div>
      <h2 className="mt-5 text-sm font-bold uppercase tracking-widest text-slate-300">
        FlowMind Canvas
      </h2>
      <p className="mt-1 text-xs text-slate-500 font-medium">
        Initializing visual workflow graph…
      </p>
    </div>
  );
}

const VisualWorkflowEditor = dynamic(
  () => import('@/components/workflow-editor/VisualWorkflowEditor'),
  {
    ssr: false,
    loading: () => <EditorLoadingState />,
  }
);

interface WorkflowEditorClientProps {
  workflowId: string;
}

export default function WorkflowEditorClient({ workflowId }: WorkflowEditorClientProps) {
  return <VisualWorkflowEditor workflowId={workflowId} />;
}
