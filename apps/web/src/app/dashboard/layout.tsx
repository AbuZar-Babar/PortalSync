'use client';

import React from 'react';
import { DashboardProvider, useDashboard } from '@/context/DashboardContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { RunDetailsDrawer } from '@/components/dashboard/RunDetailsDrawer';
import { RobotAvatar } from '@/components/dashboard/RobotAvatar';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const {
    organizationName,
    userEmail,
    isRunnerOnline,
    loading,
    isRefreshing,
    refreshDashboard,
    selectedRun,
    isDrawerOpen,
    closeRunDetails,
    stopActiveRun
  } = useDashboard();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--canvas-bg,#060913)] flex flex-col items-center justify-center gap-4 text-slate-300">
        <RobotAvatar size="medium" state="running" />
        <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Connecting to Workflow Agent Cloud...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-flowmind-canvas text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Persistent Left Sidebar */}
      <Sidebar isRunnerOnline={isRunnerOnline} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          organizationName={organizationName}
          userEmail={userEmail}
          isRunnerOnline={isRunnerOnline}
          onRefresh={refreshDashboard}
          isRefreshing={isRefreshing}
        />

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto bg-flowmind-canvas p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Global Slide-over Run Details Drawer */}
      <RunDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={closeRunDetails}
        run={selectedRun}
        onStopRun={stopActiveRun}
      />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
