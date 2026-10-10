import React from 'react';
import WorkflowEditorClient from '@/components/workflow-editor/WorkflowEditorClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkflowEditPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#060913]">
      <WorkflowEditorClient workflowId={id} />
    </div>
  );
}
