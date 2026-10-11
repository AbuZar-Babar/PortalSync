'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  LogOut,
  Building,
  User,
  ChevronDown,
  Cpu,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface HeaderProps {
  organizationName?: string;
  userEmail?: string | null;
  isRunnerOnline?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({
  organizationName = 'My Organization',
  userEmail = null,
  isRunnerOnline = false,
  onRefresh,
  isRefreshing = false
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await fetch('/auth/signout', { method: 'POST' }).catch(() => {});
    } finally {
      window.location.href = '/';
    }
  };

  // Derive section title from pathname
  const getSectionTitle = () => {
    if (!pathname) return 'Overview';
    if (pathname === '/dashboard') return 'Overview';
    if (pathname.startsWith('/dashboard/workflows')) return 'Workflows';
    if (pathname.startsWith('/dashboard/runs')) return 'Executions & Activity';
    if (pathname.startsWith('/dashboard/artifacts')) return 'Outputs & Invoices';
    if (pathname.startsWith('/dashboard/runners')) return 'Workers & Runners';
    if (pathname.startsWith('/dashboard/settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <header className="h-14 bg-[var(--header-bg,#0a0e1a)]/95 backdrop-blur-md border-b border-[var(--border-color,rgba(255,255,255,0.05))] px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 font-semibold tracking-wide flex items-center gap-1.5">
          <span className="text-cyan-400">●</span> Workflow Agent
        </span>
        <span className="text-slate-600 font-medium">/</span>
        <span className="text-white font-bold tracking-tight">
          {getSectionTitle()}
        </span>
      </div>

      {/* Right: Worker Status, Refresh, User Org Dropdown */}
      <div className="flex items-center gap-3">
        {/* Worker Status Indicator Pill */}
        <Link
          href="/dashboard/runners"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            isRunnerOnline
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/15 shadow-[0_0_10px_rgba(0,240,255,0.1)]'
              : 'bg-slate-800/60 border-white/10 text-slate-400 hover:bg-slate-800'
          }`}
          title={isRunnerOnline ? 'Desktop Worker Online & Ready to Execute' : 'Click to connect a Desktop Worker'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isRunnerOnline
                ? 'bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-pulse'
                : 'bg-slate-500'
            }`}
          />
          <span className="hidden sm:inline">
            {isRunnerOnline ? 'Worker Online' : 'No Worker Connected'}
          </span>
        </Link>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 border border-white/5 transition-colors"
            title="Refresh dashboard data"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        )}

        {/* User / Org Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 py-1 px-2.5 rounded-lg border border-white/5 hover:border-white/10 bg-slate-900/60 hover:bg-slate-800/80 transition-all text-xs font-medium text-slate-200"
            aria-label="User account menu"
            aria-expanded={isDropdownOpen}
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
              {organizationName ? organizationName[0].toUpperCase() : 'O'}
            </div>
            <span className="font-semibold text-white max-w-[120px] truncate hidden md:inline">
              {organizationName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dropdown Popover */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[var(--surface-bg,#0f172a)] border border-[var(--border-color,rgba(255,255,255,0.1))] rounded-xl shadow-2xl p-1.5 z-50 text-xs">
              <div className="px-3 py-2 border-b border-white/5">
                <p className="text-[11px] font-medium text-slate-400">Signed in as</p>
                <p className="font-semibold text-white truncate">{userEmail || 'User'}</p>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                  <Building className="w-3 h-3 text-cyan-400" />
                  <span className="truncate">{organizationName}</span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>Workspace Settings</span>
                </Link>
                <Link
                  href="/dashboard/runners"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Cpu className="w-3.5 h-3.5 text-slate-400" />
                  <span>Desktop Workers</span>
                </Link>
                <Link
                  href="/"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span>Public Landing Page</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-white/5">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
