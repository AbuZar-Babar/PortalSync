'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Workflow,
  Activity,
  FileText,
  Cpu,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { RobotAvatar } from './RobotAvatar';

interface SidebarProps {
  isRunnerOnline?: boolean;
}

export function Sidebar({ isRunnerOnline = false }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      try {
        const saved = localStorage.getItem('wf_saas_sidebar_collapsed');
        if (saved === '1') {
          setIsCollapsed(true);
        }
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    try {
      localStorage.setItem('wf_saas_sidebar_collapsed', nextState ? '1' : '0');
    } catch {}
  };

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard',
      icon: LayoutGrid,
      exact: true,
      tooltip: 'Overview & Stats'
    },
    {
      label: 'Workflows',
      href: '/dashboard/workflows',
      icon: Workflow,
      exact: false,
      tooltip: 'Workflows Library'
    },
    {
      label: 'Executions',
      href: '/dashboard/runs',
      icon: Activity,
      exact: false,
      tooltip: 'Run History & Telemetry'
    },
    {
      label: 'Outputs',
      href: '/dashboard/artifacts',
      icon: FileText,
      exact: false,
      tooltip: 'Invoices & Downloaded Files'
    },
    {
      label: 'Workers',
      href: '/dashboard/runners',
      icon: Cpu,
      exact: false,
      tooltip: 'Connected Runners & Tokens'
    },
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      exact: false,
      tooltip: 'Automation Preferences'
    }
  ];

  const isActive = (itemHref: string, exact: boolean) => {
    if (!pathname) return false;
    if (exact) {
      return pathname === itemHref;
    }
    return pathname.startsWith(itemHref);
  };

  return (
    <aside
      className={`relative flex flex-col justify-between h-screen sticky top-0 bg-[var(--sidebar-bg,#0c101d)] border-r border-[var(--border-color,rgba(255,255,255,0.05))] transition-all duration-300 ease-in-out z-30 select-none flex-shrink-0 ${
        isCollapsed ? 'w-[72px] px-2.5 py-4' : 'w-[230px] px-3.5 py-4'
      }`}
      aria-label="Sidebar navigation"
    >
      {/* Top Section */}
      <div className="flex flex-col gap-4">
        {/* Brand Header */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-white/5 transition-colors group"
          title="Workflow Agent SaaS"
        >
          <RobotAvatar size={isCollapsed ? 'mini' : 'badge'} state={isRunnerOnline ? 'running' : 'idle'} />
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                  Workflow Agent
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/80">
                Cloud SaaS
              </span>
            </div>
          )}
        </Link>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 mt-1" aria-label="Main Navigation">
          {navItems.map((item) => {
            const active = mounted && isActive(item.href, item.exact);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.tooltip : undefined}
                className={`relative flex items-center gap-3 h-10 px-3 rounded-lg text-xs font-semibold transition-all duration-150 group ${
                  active
                    ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 text-cyan-300 border border-cyan-500/30 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                style={active ? { boxShadow: '0 0 12px var(--glow-color, rgba(0,240,255,0.15))' } : undefined}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                    active ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {!isCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {/* Collapsed Tooltip Floating Bubble */}
                {isCollapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0f172a] text-slate-200 text-[11px] font-semibold rounded-md border border-white/10 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-1 pt-3 border-t border-white/5">
        {/* Sign Out Button */}
        <button
          onClick={async () => {
            try {
              const { createClient } = await import('@/lib/supabase/client');
              const supabase = createClient();
              await supabase.auth.signOut();
              await fetch('/auth/signout', { method: 'POST' }).catch(() => {});
            } finally {
              window.location.href = '/';
            }
          }}
          title={isCollapsed ? 'Sign Out' : undefined}
          className={`flex items-center gap-3 h-9 px-3 rounded-lg text-xs font-medium text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition-colors ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>

        {/* Sidebar Collapse Toggle Button */}
        <button
          onClick={toggleCollapse}
          className={`flex items-center gap-3 h-9 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 flex-shrink-0 text-slate-400" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 flex-shrink-0 text-slate-400" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
