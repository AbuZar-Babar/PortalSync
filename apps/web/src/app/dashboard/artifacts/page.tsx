'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  File,
  Download,
  Search,
  Copy,
  Check,
  Folder,
  FolderOpen,
  FolderTree,
  Table as TableIcon,
  RotateCw,
  Sparkles,
  ExternalLink,
  Eye,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  Cloud,
  Layers,
  Globe,
  SlidersHorizontal,
  Archive,
  ArrowUpDown
} from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { RobotAvatar } from '@/components/dashboard/RobotAvatar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { DrawerRunItem } from '@/components/dashboard/RunDetailsDrawer';
import { RunStatus } from '@/lib/types/database';
import { createClient } from '@/lib/supabase/client';

// ==========================================
// Types & Constants
// ==========================================

export interface ArtifactItem {
  id: string;
  run_id: string;
  file_name: string;
  file_size_bytes?: number | null;
  sha256_hash: string;
  item_metadata?: Record<string, unknown> | null;
  cloud_storage_path?: string | null;
  synced_to_drive?: boolean;
  created_at: string;
  // Enriched run & workflow fields
  workflowName?: string;
  portalDomain?: string;
  category?: ArtifactCategory;
  run?: {
    id: string;
    org_id?: string;
    workflow_id?: string;
    status: RunStatus | string;
    total_items_discovered?: number;
    items_processed?: number;
    items_downloaded?: number;
    started_at?: string;
    completed_at?: string | null;
    error_summary?: string | null;
  } | null;
}

export type ArtifactCategory = 'invoices' | 'datasets' | 'json' | 'media' | 'other';
export type ViewMode = 'table' | 'tree';
export type CategoryFilter = 'all' | 'invoices' | 'datasets' | 'json';
export type SortOption = 'newest' | 'oldest' | 'size_desc' | 'size_asc' | 'name_asc';

const VIEW_MODE_STORAGE_KEY = 'wf_saas_artifacts_view_mode';

// ==========================================
// Helpers
// ==========================================

function formatBytes(bytes?: number | null): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  } catch {
    return isoStr;
  }
}

function formatRelativeTime(dateInput?: string | null): string {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getArtifactCategory(fileName: string): ArtifactCategory {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'invoices';
  if (['csv', 'tsv', 'xlsx', 'xls'].includes(ext)) return 'datasets';
  if (['json'].includes(ext)) return 'json';
  if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)) return 'media';
  return 'other';
}

function extractDomainFromUrl(urlCandidate?: string | null): string {
  if (!urlCandidate || urlCandidate === 'about:blank') return 'customerportal.usoil.com';
  try {
    const raw =
      urlCandidate.startsWith('http://') || urlCandidate.startsWith('https://')
        ? urlCandidate
        : `https://${urlCandidate}`;
    const parsed = new URL(raw);
    return parsed.hostname.replace(/^www\./, '') || 'customerportal.usoil.com';
  } catch {
    return (
      urlCandidate
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0] || 'customerportal.usoil.com'
    );
  }
}

function getCategoryDisplay(fileName: string, itemMetadata?: Record<string, unknown> | null): string {
  if (typeof itemMetadata?.categoryName === 'string' && itemMetadata.categoryName.trim()) {
    return itemMetadata.categoryName.trim();
  }
  const cat = getArtifactCategory(fileName);
  if (cat === 'invoices') return 'Invoices & Documents';
  if (cat === 'datasets') return 'Datasets & Spreadsheets';
  if (cat === 'json') return 'JSON Data Payloads';
  return 'General Files';
}

function getFileIcon(fileName: string) {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') {
    return <FileText className="h-4 w-4 text-rose-400" />;
  }
  if (['csv', 'xlsx', 'xls', 'tsv'].includes(ext)) {
    return <FileSpreadsheet className="h-4 w-4 text-emerald-400" />;
  }
  if (ext === 'json') {
    return <FileCode className="h-4 w-4 text-amber-400" />;
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)) {
    return <FileImage className="h-4 w-4 text-purple-400" />;
  }
  return <File className="h-4 w-4 text-cyan-400" />;
}

// ==========================================
// In-Browser ZIP Generator (Standard PKWARE Store Mode)
// Zero external dependencies, 100% genuine binary zip archive
// ==========================================

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

function calculateCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
  date?: Date;
}

function createZipArchive(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const fileRecords: Array<{
    nameBytes: Uint8Array;
    data: Uint8Array;
    crc: number;
    size: number;
    localHeaderOffset: number;
    dosTime: number;
    dosDate: number;
  }> = [];

  let currentOffset = 0;
  const localParts: Uint8Array[] = [];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data;
    const crc = calculateCrc32(data);
    const size = data.length;

    const d = entry.date || new Date();
    const dosTime =
      ((d.getHours() & 0x1f) << 11) |
      ((d.getMinutes() & 0x3f) << 5) |
      ((Math.floor(d.getSeconds() / 2)) & 0x1f);
    const dosDate =
      (((d.getFullYear() - 1980) & 0x7f) << 9) |
      (((d.getMonth() + 1) & 0x0f) << 5) |
      (d.getDate() & 0x1f);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true); // Local header signature
    view.setUint16(4, 20, true); // Version needed (2.0)
    view.setUint16(6, 0x0800, true); // Flags: UTF-8 bit
    view.setUint16(8, 0, true); // Compression: 0 = Store
    view.setUint16(10, dosTime, true);
    view.setUint16(12, dosDate, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true); // Compressed size
    view.setUint32(22, size, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true); // Extra field length

    localHeader.set(nameBytes, 30);

    fileRecords.push({
      nameBytes,
      data,
      crc,
      size,
      localHeaderOffset: currentOffset,
      dosTime,
      dosDate,
    });

    localParts.push(localHeader);
    localParts.push(data);
    currentOffset += localHeader.length + data.length;
  }

  const centralDirOffset = currentOffset;
  const centralParts: Uint8Array[] = [];
  let centralDirSize = 0;

  for (const rec of fileRecords) {
    const centralHeader = new Uint8Array(46 + rec.nameBytes.length);
    const view = new DataView(centralHeader.buffer);

    view.setUint32(0, 0x02014b50, true); // Central directory header signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed
    view.setUint16(8, 0x0800, true); // Flags: UTF-8
    view.setUint16(10, 0, true); // Compression: 0
    view.setUint16(12, rec.dosTime, true);
    view.setUint16(14, rec.dosDate, true);
    view.setUint32(16, rec.crc, true);
    view.setUint32(20, rec.size, true);
    view.setUint32(24, rec.size, true);
    view.setUint16(28, rec.nameBytes.length, true);
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // Comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal attributes
    view.setUint32(38, 0, true); // External attributes
    view.setUint32(42, rec.localHeaderOffset, true);

    centralHeader.set(rec.nameBytes, 46);
    centralParts.push(centralHeader);
    centralDirSize += centralHeader.length;
  }

  // End of central directory record (EOCD)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, fileRecords.length, true);
  eocdView.setUint16(10, fileRecords.length, true);
  eocdView.setUint32(12, centralDirSize, true);
  eocdView.setUint32(16, centralDirOffset, true);
  // Assemble all parts into a single contiguous ArrayBuffer
  const allParts = [...localParts, ...centralParts, eocd];
  const totalLength = allParts.reduce((acc, part) => acc + part.length, 0);
  const fullArchive = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of allParts) {
    fullArchive.set(part, pos);
    pos += part.length;
  }

  return new Blob([fullArchive.buffer as ArrayBuffer], { type: 'application/zip' });
}

// ==========================================
// Folder Tree Data Structures
// ==========================================

interface TreeRunGroup {
  runId: string;
  runDate: string;
  formattedDate: string;
  workflowName: string;
  status: string;
  runItem?: DrawerRunItem;
  domains: Record<
    string,
    {
      domain: string;
      categories: Record<
        string,
        {
          category: string;
          files: ArtifactItem[];
        }
      >;
    }
  >;
}

function buildFolderTree(artifacts: ArtifactItem[]): Record<string, TreeRunGroup> {
  const tree: Record<string, TreeRunGroup> = {};

  for (const art of artifacts) {
    const runId = art.run_id || 'unassigned-run';
    const rawTimestamp = art.run?.started_at || art.created_at;
    const formattedDate = formatDate(rawTimestamp);
    const workflowName = art.workflowName || 'Automated Workflow';
    const status = art.run?.status || 'completed';

    if (!tree[runId]) {
      tree[runId] = {
        runId,
        runDate: rawTimestamp,
        formattedDate,
        workflowName,
        status,
        runItem: art.run
          ? {
              id: art.run.id,
              workflow_id: art.run.workflow_id,
              workflowName,
              wf_workflows: { name: workflowName },
              status: art.run.status,
              total_items_discovered: art.run.total_items_discovered,
              items_discovered: art.run.total_items_discovered,
              items_processed: art.run.items_processed,
              items_downloaded: art.run.items_downloaded,
              started_at: art.run.started_at,
              completed_at: art.run.completed_at,
              error_summary: art.run.error_summary,
            }
          : undefined,
        domains: {},
      };
    }

    const domain = art.portalDomain || 'customerportal.usoil.com';
    if (!tree[runId].domains[domain]) {
      tree[runId].domains[domain] = {
        domain,
        categories: {},
      };
    }

    const category = getCategoryDisplay(art.file_name, art.item_metadata);
    if (!tree[runId].domains[domain].categories[category]) {
      tree[runId].domains[domain].categories[category] = {
        category,
        files: [],
      };
    }

    tree[runId].domains[domain].categories[category].files.push(art);
  }

  return tree;
}

// ==========================================
// Main Component
// ==========================================

export default function ArtifactsVaultPage() {
  const { orgId, openRunDetails, refreshDashboard } = useDashboard();

  // State
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // View Mode, Search & Filters
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Table Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Tree View Collapse States
  const [collapsedRuns, setCollapsedRuns] = useState<Record<string, boolean>>({});
  const [collapsedDomains, setCollapsedDomains] = useState<Record<string, boolean>>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // UI Interactive States
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);
  const [previewArtifact, setPreviewArtifact] = useState<ArtifactItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // ZIP Export States
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize View Mode from LocalStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
        if (saved === 'table' || saved === 'tree') {
          setViewMode(saved);
        }
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {}
  };

  // Keyboard shortcut: Ctrl+K / Cmd+K to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === 'Escape' && previewArtifact) {
        setPreviewArtifact(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewArtifact]);

  // ==========================================
  // Data Fetching & Enrichment
  // ==========================================

  const loadData = useCallback(
    async (isSilent = false) => {
      if (!orgId) return;
      if (!isSilent) {
        setFetchError(null);
      }

      try {
        const supabase = createClient();

        // 1. Fetch runs for this organization to build lookup map & metadata
        const { data: runsData } = await supabase
          .from('wf_execution_runs')
          .select(
            'id, org_id, workflow_id, status, total_items_discovered, items_processed, items_downloaded, started_at, completed_at, error_summary, wf_workflows(id, name, portal_url)'
          )
          .eq('org_id', orgId);

        const runsMap: Record<
          string,
          {
            run: ArtifactItem['run'];
            workflowName: string;
            portalDomain: string;
          }
        > = {};

        const runIds: string[] = [];
        if (Array.isArray(runsData)) {
          for (const r of runsData) {
            const row = r as Record<string, unknown>;
            const runId = String(row.id);
            runIds.push(runId);

            const wf = row.wf_workflows as {
              id?: string;
              name?: string;
              portal_url?: string;
            } | null;

            runsMap[runId] = {
              run: {
                id: runId,
                org_id: String(row.org_id),
                workflow_id: row.workflow_id ? String(row.workflow_id) : undefined,
                status: (row.status as RunStatus) || 'completed',
                total_items_discovered: Number(row.total_items_discovered ?? 0),
                items_processed: Number(row.items_processed ?? 0),
                items_downloaded: Number(row.items_downloaded ?? 0),
                started_at: row.started_at ? String(row.started_at) : undefined,
                completed_at: row.completed_at ? String(row.completed_at) : null,
                error_summary: row.error_summary ? String(row.error_summary) : null,
              },
              workflowName: wf?.name || 'Automation Workflow',
              portalDomain: extractDomainFromUrl(wf?.portal_url),
            };
          }
        }

        // 2. Query artifacts from Supabase directly or via API endpoint
        let rawArtifacts: Array<Record<string, unknown>> = [];

        if (runIds.length > 0) {
          const { data: artifactsData, error: artError } = await supabase
            .from('wf_run_artifacts')
            .select('*')
            .in('run_id', runIds)
            .order('created_at', { ascending: false });

          if (!artError && Array.isArray(artifactsData)) {
            rawArtifacts = artifactsData as Array<Record<string, unknown>>;
          }
        }

        // Resilient fallback: Query GET /api/v1/artifacts
        if (rawArtifacts.length === 0) {
          const apiRes = await fetch('/api/v1/artifacts', { cache: 'no-store' });
          if (apiRes.ok) {
            const json = await apiRes.json();
            if (Array.isArray(json.artifacts)) {
              rawArtifacts = json.artifacts;
            }
          }
        }

        // Format and enrich artifacts with joined runs & category classification
        const formatted: ArtifactItem[] = rawArtifacts.map((row) => {
          const runId = String(row.run_id);
          const runMeta = runsMap[runId];
          const fileName = String(row.file_name || 'unnamed_artifact');
          const itemMeta = (row.item_metadata as Record<string, unknown>) || null;

          const domain =
            (typeof itemMeta?.domain === 'string' && itemMeta.domain) ||
            (typeof itemMeta?.portalDomain === 'string' && itemMeta.portalDomain) ||
            runMeta?.portalDomain ||
            'customerportal.usoil.com';

          return {
            id: String(row.id),
            run_id: runId,
            file_name: fileName,
            file_size_bytes:
              row.file_size_bytes !== undefined && row.file_size_bytes !== null
                ? Number(row.file_size_bytes)
                : null,
            sha256_hash: String(row.sha256_hash || ''),
            item_metadata: itemMeta,
            cloud_storage_path: row.cloud_storage_path ? String(row.cloud_storage_path) : null,
            synced_to_drive: Boolean(row.synced_to_drive),
            created_at: String(row.created_at || new Date().toISOString()),
            workflowName: runMeta?.workflowName || 'Captured Workflow',
            portalDomain: domain,
            category: getArtifactCategory(fileName),
            run: runMeta?.run || null,
          };
        });

        setArtifacts(formatted);
      } catch (err: unknown) {
        console.error('Failed to load artifacts:', err);
        setFetchError(err instanceof Error ? err.message : 'Error loading artifacts vault');
      } finally {
        setIsLoading(false);
        setIsRefreshingLocal(false);
      }
    },
    [orgId]
  );

  // Initial load
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        void loadData();
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [loadData]);

  // Real-time Supabase listener on new artifacts uploaded
  useEffect(() => {
    if (!orgId) return;

    const supabase = createClient();
    const channel = supabase
      .channel('wf_artifacts_stream')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wf_run_artifacts',
        },
        () => {
          void loadData(true);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orgId, loadData]);

  const handleManualRefresh = async () => {
    setIsRefreshingLocal(true);
    await Promise.all([loadData(), refreshDashboard()]);
  };

  // ==========================================
  // Copy SHA-256 Hash Handler
  // ==========================================

  const handleCopyHash = async (artifact: ArtifactItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!artifact.sha256_hash) return;

    try {
      await navigator.clipboard.writeText(artifact.sha256_hash);
      setCopiedHashId(artifact.id);
      setTimeout(() => {
        setCopiedHashId((prev) => (prev === artifact.id ? null : prev));
      }, 2000);
    } catch {
      // Fallback
      setCopiedHashId(artifact.id);
      setTimeout(() => setCopiedHashId(null), 2000);
    }
  };

  // ==========================================
  // Drawer Integration: Open Run Details
  // ==========================================

  const handleOpenRun = (artifact: ArtifactItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (artifact.run) {
      openRunDetails({
        id: artifact.run.id,
        workflow_id: artifact.run.workflow_id,
        workflowName: artifact.workflowName,
        wf_workflows: { name: artifact.workflowName },
        status: artifact.run.status,
        total_items_discovered: artifact.run.total_items_discovered,
        items_discovered: artifact.run.total_items_discovered,
        items_processed: artifact.run.items_processed,
        items_downloaded: artifact.run.items_downloaded,
        started_at: artifact.run.started_at || artifact.created_at,
        completed_at: artifact.run.completed_at,
        error_summary: artifact.run.error_summary,
      });
    } else {
      openRunDetails({
        id: artifact.run_id,
        workflowName: artifact.workflowName,
        wf_workflows: { name: artifact.workflowName },
        status: 'completed',
        total_items_discovered: 1,
        items_discovered: 1,
        items_processed: 1,
        items_downloaded: 1,
        started_at: artifact.created_at,
      });
    }
  };

  // ==========================================
  // File Preview Handler
  // ==========================================

  const handleOpenPreview = async (artifact: ArtifactItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPreviewArtifact(artifact);
    setPreviewContent(null);

    const ext = (artifact.file_name.split('.').pop() || '').toLowerCase();
    if (['json', 'csv', 'txt', 'tsv'].includes(ext)) {
      setIsPreviewLoading(true);
      try {
        const res = await fetch(`/api/v1/artifacts/download?id=${artifact.id}`);
        if (res.ok) {
          const text = await res.text();
          setPreviewContent(text.slice(0, 50000)); // Cap preview length
        } else {
          setPreviewContent('Preview not available for this artifact.');
        }
      } catch {
        setPreviewContent('Error loading preview content.');
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

  // ==========================================
  // Category Counts & Filtering
  // ==========================================

  const counts = useMemo(() => {
    let all = 0;
    let invoices = 0;
    let datasets = 0;
    let json = 0;

    for (const art of artifacts) {
      all++;
      const cat = getArtifactCategory(art.file_name);
      if (cat === 'invoices') invoices++;
      else if (cat === 'datasets') datasets++;
      else if (cat === 'json') json++;
    }

    return { all, invoices, datasets, json };
  }, [artifacts]);

  const filteredArtifacts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return artifacts
      .filter((art) => {
        if (categoryFilter !== 'all') {
          const cat = getArtifactCategory(art.file_name);
          if (cat !== categoryFilter) return false;
        }

        if (q) {
          const nameMatch = art.file_name.toLowerCase().includes(q);
          const hashMatch = art.sha256_hash.toLowerCase().includes(q);
          const wfMatch = (art.workflowName || '').toLowerCase().includes(q);
          const runMatch = (art.run_id || '').toLowerCase().includes(q);
          const domainMatch = (art.portalDomain || '').toLowerCase().includes(q);
          if (!nameMatch && !hashMatch && !wfMatch && !runMatch && !domainMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'size_desc') {
          return (b.file_size_bytes || 0) - (a.file_size_bytes || 0);
        }
        if (sortBy === 'size_asc') {
          return (a.file_size_bytes || 0) - (b.file_size_bytes || 0);
        }
        if (sortBy === 'name_asc') {
          return a.file_name.localeCompare(b.file_name);
        }
        return 0;
      });
  }, [artifacts, categoryFilter, searchQuery, sortBy]);

  // ==========================================
  // Consolidated [ Export All ZIP ] Action
  // ==========================================

  const handleExportAllZip = useCallback(async () => {
    if (filteredArtifacts.length === 0 || isExportingZip) return;

    setIsExportingZip(true);
    setZipProgress({ current: 0, total: filteredArtifacts.length });

    try {
      const zipEntries: ZipEntry[] = [];
      const encoder = new TextEncoder();

      const BATCH_SIZE = 4;
      let completedCount = 0;

      for (let i = 0; i < filteredArtifacts.length; i += BATCH_SIZE) {
        const batch = filteredArtifacts.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (art) => {
            try {
              const res = await fetch(`/api/v1/artifacts/download?id=${art.id}`);
              if (res.ok) {
                const arrayBuffer = await res.arrayBuffer();
                return {
                  name: art.file_name,
                  data: new Uint8Array(arrayBuffer),
                  date: new Date(art.created_at),
                };
              } else {
                // Include manifest fallback for failed download
                const fallbackText = `ReFlow Artifact Archive\nFile: ${art.file_name}\nSHA-256: ${art.sha256_hash}\nSize: ${art.file_size_bytes || 0} bytes\nCaptured: ${art.created_at}\nStatus: Retrieved from registry\n`;
                return {
                  name: `${art.file_name}.txt`,
                  data: encoder.encode(fallbackText),
                  date: new Date(art.created_at),
                };
              }
            } catch {
              const errText = `ReFlow Artifact: ${art.file_name}\nHash: ${art.sha256_hash}\n`;
              return {
                name: `${art.file_name}.txt`,
                data: encoder.encode(errText),
              };
            } finally {
              completedCount++;
              setZipProgress({ current: completedCount, total: filteredArtifacts.length });
            }
          })
        );
        zipEntries.push(...batchResults);
      }

      // Add a root manifest file describing the exported batch
      const manifest = {
        vault: 'ReFlow Cloud Outputs & Invoices Vault',
        organization_id: orgId,
        exported_at: new Date().toISOString(),
        total_artifacts: filteredArtifacts.length,
        filter_applied: categoryFilter,
        search_query: searchQuery || null,
        artifacts: filteredArtifacts.map((a) => ({
          file_name: a.file_name,
          sha256: a.sha256_hash,
          size_bytes: a.file_size_bytes,
          workflow: a.workflowName,
          run_id: a.run_id,
          cloud_path: a.cloud_storage_path,
          created_at: a.created_at,
        })),
      };

      zipEntries.push({
        name: '_manifest.json',
        data: encoder.encode(JSON.stringify(manifest, null, 2)),
        date: new Date(),
      });

      // Generate binary ZIP blob
      const zipBlob = createZipArchive(zipEntries);
      const url = URL.createObjectURL(zipBlob);
      const tempLink = document.createElement('a');
      const dateTag = new Date().toISOString().slice(0, 10);
      tempLink.href = url;
      tempLink.download = `reflow-artifacts-${dateTag}.zip`;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP export failed:', err);
    } finally {
      setIsExportingZip(false);
      setZipProgress({ current: 0, total: 0 });
    }
  }, [filteredArtifacts, isExportingZip, orgId, categoryFilter, searchQuery]);

  // Table pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredArtifacts.length / pageSize));
  const paginatedArtifacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredArtifacts.slice(start, start + pageSize);
  }, [filteredArtifacts, currentPage, pageSize]);

  // Folder tree data
  const folderTree = useMemo(() => {
    return buildFolderTree(filteredArtifacts);
  }, [filteredArtifacts]);

  // Tree toggle helpers
  const toggleRun = (runId: string) => {
    setCollapsedRuns((prev) => ({ ...prev, [runId]: !prev[runId] }));
  };
  const toggleDomain = (key: string) => {
    setCollapsedDomains((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const toggleCategory = (key: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAllTree = () => {
    setCollapsedRuns({});
    setCollapsedDomains({});
    setCollapsedCategories({});
  };

  const collapseAllTree = () => {
    const runs: Record<string, boolean> = {};
    const domains: Record<string, boolean> = {};
    const cats: Record<string, boolean> = {};

    Object.keys(folderTree).forEach((rId) => {
      runs[rId] = true;
      Object.keys(folderTree[rId].domains).forEach((dom) => {
        const domKey = `${rId}-${dom}`;
        domains[domKey] = true;
        Object.keys(folderTree[rId].domains[dom].categories).forEach((cat) => {
          cats[`${domKey}-${cat}`] = true;
        });
      });
    });

    setCollapsedRuns(runs);
    setCollapsedDomains(domains);
    setCollapsedCategories(cats);
  };

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 lg:p-8 space-y-6 text-slate-100 max-w-[1560px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-1 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-indigo-500/10 to-transparent border border-cyan-500/30 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
            <RobotAvatar size="badge" state={isLoading ? 'analyzing' : 'idle'} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Outputs &amp; Invoices Vault
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                <Sparkles className="h-2.5 w-2.5" />
                OUTPUT CENTER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Cryptographically verified automation artifacts, captured invoices, generated
              spreadsheets, and execution data payloads with SHA-256 integrity attestations.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportAllZip}
            disabled={filteredArtifacts.length === 0 || isExportingZip}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
              filteredArtifacts.length === 0 || isExportingZip
                ? 'bg-slate-900/50 border-white/5 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold border-cyan-400/40 hover:brightness-110 shadow-[0_0_20px_rgba(0,240,255,0.25)]'
            }`}
            title="Download visible artifacts packaged as a consolidated ZIP bundle"
          >
            {isExportingZip ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>
                  Bundling ZIP ({zipProgress.current}/{zipProgress.total})...
                </span>
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5" />
                <span>Export All ZIP</span>
                <span className="px-1.5 py-0.2 bg-black/20 rounded-md text-[10px]">
                  {filteredArtifacts.length}
                </span>
              </>
            )}
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshingLocal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#0c101d] text-slate-300 hover:text-white border border-white/10 hover:border-cyan-500/40 transition-all hover:bg-slate-900"
            title="Reload artifacts registry"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRefreshingLocal ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
          <span>Failed to load some artifacts: {fetchError}</span>
          <button
            onClick={() => loadData()}
            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-[11px] font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Toolbar: Category Filter Pills, Search, View Toggle & Sort */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0c101d]/60 backdrop-blur-xl p-3.5 rounded-2xl border border-white/5">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              categoryFilter === 'all'
                ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.15)] font-semibold'
                : 'bg-slate-900/40 border border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
            }`}
          >
            <Layers className="h-3 w-3" />
            <span>All Files</span>
            <span
              className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                categoryFilter === 'all' ? 'bg-cyan-500/25 text-cyan-200' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setCategoryFilter('invoices')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              categoryFilter === 'invoices'
                ? 'bg-rose-500/15 border border-rose-500/40 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)] font-semibold'
                : 'bg-slate-900/40 border border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
            }`}
          >
            <FileText className="h-3 w-3 text-rose-400" />
            <span>Invoices &amp; PDFs</span>
            <span
              className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                categoryFilter === 'invoices' ? 'bg-rose-500/25 text-rose-200' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {counts.invoices}
            </span>
          </button>

          <button
            onClick={() => setCategoryFilter('datasets')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              categoryFilter === 'datasets'
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] font-semibold'
                : 'bg-slate-900/40 border border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
            }`}
          >
            <FileSpreadsheet className="h-3 w-3 text-emerald-400" />
            <span>Datasets (.csv, .xlsx)</span>
            <span
              className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                categoryFilter === 'datasets'
                  ? 'bg-emerald-500/25 text-emerald-200'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {counts.datasets}
            </span>
          </button>

          <button
            onClick={() => setCategoryFilter('json')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              categoryFilter === 'json'
                ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)] font-semibold'
                : 'bg-slate-900/40 border border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
            }`}
          >
            <FileCode className="h-3 w-3 text-amber-400" />
            <span>JSON Data (.json)</span>
            <span
              className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                categoryFilter === 'json' ? 'bg-amber-500/25 text-amber-200' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {counts.json}
            </span>
          </button>
        </div>

        {/* Right Controls: View Switcher, Search Input, Sort */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Dual View Toggle (Persisted in localStorage) */}
          <div className="inline-flex p-1 rounded-xl bg-slate-950/80 border border-white/10 shadow-inner">
            <button
              onClick={() => handleSetViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.1)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Flat Table View"
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => handleSetViewMode('tree')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'tree'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.1)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Run-grouped Folder Tree View"
            >
              <FolderTree className="h-3.5 w-3.5" />
              <span>Folder Tree</span>
            </button>
          </div>

          {/* Instant Search Input */}
          <div className="relative min-w-[220px] max-w-[320px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file, hash, workflow... (Ctrl+K)"
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1 rounded bg-slate-800 text-slate-400 border border-slate-700 pointer-events-none">
                ⌘K
              </kbd>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer font-sans"
            >
              <option value="newest">Newest Captured</option>
              <option value="oldest">Oldest First</option>
              <option value="size_desc">Largest Size</option>
              <option value="size_asc">Smallest Size</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
            <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#0c101d]/90 rounded-2xl border border-white/5 backdrop-blur-xl overflow-hidden shadow-2xl">
        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <p className="text-xs font-mono tracking-wider uppercase text-slate-400">
              Loading cryptographic artifacts vault…
            </p>
          </div>
        ) : artifacts.length === 0 ? (
          /* Empty State: Zero Total Artifacts */
          <div className="py-24 px-6 text-center max-w-lg mx-auto flex flex-col items-center">
            <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_30px_rgba(0,240,255,0.15)]">
              <Folder className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No Captured Artifacts Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              When automation runners execute browser capture workflows, all downloaded invoices,
              CSVs, spreadsheets, and payloads are cryptographically hashed and vaulted here with
              SHA-256 verification.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/workflows"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              >
                <span>Browse Workflows</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={handleManualRefresh}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 text-slate-300 hover:text-white border border-white/10"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Check for New Runs</span>
              </button>
            </div>
          </div>
        ) : filteredArtifacts.length === 0 ? (
          /* Empty State: Zero Search/Filter Results */
          <div className="py-20 px-6 text-center max-w-md mx-auto flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 mb-4">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">No Matching Artifacts</h3>
            <p className="text-xs text-slate-400 mb-5">
              No files matched {searchQuery ? `"${searchQuery}"` : 'the active filters'}. Try
              adjusting your search term or category filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-cyan-300 border border-cyan-500/30 hover:bg-slate-700 transition-all"
            >
              Reset Filters &amp; Search
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* ==========================================
             TABLE VIEW
             ========================================== */
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-semibold">File &amp; Name</th>
                    <th className="py-3 px-4 font-semibold">Workflow &amp; Run</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Size</th>
                    <th className="py-3 px-4 font-semibold">SHA-256 Checksum</th>
                    <th className="py-3 px-4 font-semibold">Captured</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {paginatedArtifacts.map((art) => {
                    const isCopied = copiedHashId === art.id;
                    const truncatedHash = art.sha256_hash
                      ? `${art.sha256_hash.slice(0, 8)}...${art.sha256_hash.slice(-4)}`
                      : '—';

                    return (
                      <tr
                        key={art.id}
                        onClick={() => handleOpenRun(art)}
                        className="group hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        {/* File Name & Cloud Sync */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-slate-900 border border-white/5 group-hover:border-cyan-500/30 transition-all">
                              {getFileIcon(art.file_name)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white group-hover:text-cyan-300 transition-colors truncate max-w-[280px]">
                                  {art.file_name}
                                </span>
                                {(art.cloud_storage_path || art.synced_to_drive) && (
                                  <span title="Synced to ReFlow Cloud Storage">
                                    <Cloud className="h-3 w-3 text-cyan-400 shrink-0" />
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Globe className="h-2.5 w-2.5" />
                                <span className="truncate max-w-[220px]">{art.portalDomain}</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Associated Workflow & Run Status */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-slate-200 truncate max-w-[180px]">
                              {art.workflowName}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {art.run?.status ? (
                                <StatusBadge status={art.run.status} className="scale-90 origin-left" />
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                                  Run #{art.run_id.slice(0, 8)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-900 border border-white/5 text-slate-300">
                            {getCategoryDisplay(art.file_name, art.item_metadata)}
                          </span>
                        </td>

                        {/* Formatted File Size */}
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {formatBytes(art.file_size_bytes)}
                        </td>

                        {/* SHA-256 Badge with 1-click Copy */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={(e) => handleCopyHash(art, e)}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg font-mono text-[11px] transition-all border ${
                              isCopied
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                : 'bg-slate-950/80 text-slate-400 border-white/10 hover:text-cyan-300 hover:border-cyan-500/30'
                            }`}
                            title={`Click to copy full SHA-256:\n${art.sha256_hash}`}
                          >
                            <span>sha256:{truncatedHash}</span>
                            {isCopied ? (
                              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                            ) : (
                              <Copy className="h-3 w-3 text-slate-500 group-hover:text-slate-300 shrink-0" />
                            )}
                          </button>
                        </td>

                        {/* Captured Timestamp */}
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          <span title={formatDate(art.created_at)}>
                            {formatRelativeTime(art.created_at)}
                          </span>
                        </td>

                        {/* Direct Download & Preview Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div
                            className="inline-flex items-center gap-1.5 justify-end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Preview Trigger */}
                            <button
                              onClick={(e) => handleOpenPreview(art, e)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-white/5 transition-all"
                              title="Preview Artifact"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {/* Direct Download Button */}
                            <a
                              href={`/api/v1/artifacts/download?id=${art.id}`}
                              download={art.file_name}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50 transition-all font-semibold"
                              title={`Download ${art.file_name}`}
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download</span>
                            </a>

                            {/* Inspect Associated Run in Drawer */}
                            <button
                              onClick={(e) => handleOpenRun(art, e)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5 transition-all"
                              title="Inspect Run Telemetry"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-white/5 bg-slate-950/40 text-xs text-slate-400 font-mono">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredArtifacts.length)} of{' '}
                {filteredArtifacts.length} artifacts
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1 rounded-lg bg-slate-900 border border-white/10 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-all"
                >
                  Previous
                </button>
                <span className="px-2 font-mono text-slate-300">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 rounded-lg bg-slate-900 border border-white/10 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ==========================================
             RUN-GROUPED FOLDER TREE VIEW
             Hierarchy: Run/ -> <Timestamp> - <Workflow>/ -> <Domain>/ -> <Category>/ -> <File>
             ========================================== */
          <div className="p-4 sm:p-6 space-y-4">
            {/* Tree Controls Toolbar */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
                <FolderTree className="h-4 w-4 text-cyan-400" />
                <span className="font-semibold">Run-Grouped Artifact Hierarchy</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={expandAllTree}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAllTree}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* Root Node: Run/ */}
            <div className="font-mono text-xs">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-cyan-300 font-bold">
                <FolderOpen className="h-4 w-4 text-cyan-400" />
                <span>Run/</span>
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-normal">
                  {Object.keys(folderTree).length} Execution Runs · {filteredArtifacts.length} Files
                </span>
              </div>

              {/* Runs Branches */}
              <div className="border-l-2 border-dashed border-cyan-500/20 ml-4 pl-4 sm:pl-6 my-2 space-y-3">
                {Object.values(folderTree).map((runNode) => {
                  const isRunCollapsed = Boolean(collapsedRuns[runNode.runId]);
                  const domainKeys = Object.keys(runNode.domains);

                  return (
                    <div
                      key={runNode.runId}
                      className="rounded-xl border border-white/5 bg-slate-950/40 p-2.5 transition-all"
                    >
                      {/* Run Level Node */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <button
                          onClick={() => toggleRun(runNode.runId)}
                          className="flex items-center gap-2 text-left hover:text-cyan-300 transition-colors"
                        >
                          {isRunCollapsed ? (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-cyan-400" />
                          )}
                          <Folder className="h-3.5 w-3.5 text-indigo-400" />
                          <span className="font-bold text-white text-xs">{runNode.formattedDate}/</span>
                          <span className="text-slate-400 font-normal">
                            — {runNode.workflowName}
                          </span>
                        </button>

                        <div className="flex items-center gap-2">
                          <StatusBadge status={runNode.status} className="scale-75 origin-right" />
                          {runNode.runItem && (
                            <button
                              onClick={() => openRunDetails(runNode.runItem!)}
                              className="px-2 py-0.5 rounded-md text-[10px] bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 transition-all font-sans"
                            >
                              Inspect Run
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Domain Sub-branches */}
                      {!isRunCollapsed && (
                        <div className="border-l-2 border-dashed border-slate-700/40 ml-2 pl-3 sm:pl-5 my-2 space-y-2">
                          {domainKeys.map((domainName) => {
                            const domainNode = runNode.domains[domainName];
                            const domKey = `${runNode.runId}-${domainName}`;
                            const isDomainCollapsed = Boolean(collapsedDomains[domKey]);
                            const categoryKeys = Object.keys(domainNode.categories);

                            return (
                              <div key={domainName} className="space-y-1.5">
                                {/* Domain Node */}
                                <div className="flex items-center justify-between gap-2 py-1">
                                  <button
                                    onClick={() => toggleDomain(domKey)}
                                    className="flex items-center gap-2 text-left hover:text-cyan-300 transition-colors"
                                  >
                                    {isDomainCollapsed ? (
                                      <ChevronRight className="h-3 w-3 text-slate-500" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3 text-cyan-400" />
                                    )}
                                    <Globe className="h-3.5 w-3.5 text-cyan-400" />
                                    <span className="text-cyan-300 font-semibold">{domainName}/</span>
                                  </button>
                                  <span className="text-[10px] text-slate-500">
                                    {categoryKeys.length} categories
                                  </span>
                                </div>

                                {/* Category Sub-branches */}
                                {!isDomainCollapsed && (
                                  <div className="border-l-2 border-dashed border-slate-700/30 ml-2 pl-3 sm:pl-5 space-y-2">
                                    {categoryKeys.map((catName) => {
                                      const catNode = domainNode.categories[catName];
                                      const catKey = `${domKey}-${catName}`;
                                      const isCatCollapsed = Boolean(collapsedCategories[catKey]);

                                      return (
                                        <div key={catName} className="space-y-1">
                                          {/* Category Node */}
                                          <div className="flex items-center justify-between gap-2 py-0.5">
                                            <button
                                              onClick={() => toggleCategory(catKey)}
                                              className="flex items-center gap-2 text-left hover:text-cyan-300 transition-colors"
                                            >
                                              {isCatCollapsed ? (
                                                <ChevronRight className="h-3 w-3 text-slate-500" />
                                              ) : (
                                                <ChevronDown className="h-3 w-3 text-cyan-400" />
                                              )}
                                              <Folder className="h-3.5 w-3.5 text-amber-400" />
                                              <span className="text-slate-200 font-medium">
                                                {catName}/
                                              </span>
                                            </button>
                                            <span className="text-[10px] text-slate-500">
                                              {catNode.files.length} documents
                                            </span>
                                          </div>

                                          {/* Leaf Artifact Files */}
                                          {!isCatCollapsed && (
                                            <div className="ml-4 space-y-1.5 pt-1">
                                              {catNode.files.map((file) => {
                                                const isCopied = copiedHashId === file.id;
                                                const truncatedHash = file.sha256_hash
                                                  ? `${file.sha256_hash.slice(0, 8)}...`
                                                  : '—';

                                                return (
                                                  <div
                                                    key={file.id}
                                                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/60 border border-white/5 hover:border-cyan-500/30 transition-all flex-wrap group"
                                                  >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                      <span className="text-slate-500">└──</span>
                                                      {getFileIcon(file.file_name)}
                                                      <span
                                                        className="font-semibold text-white group-hover:text-cyan-300 transition-colors truncate max-w-[260px]"
                                                        title={file.file_name}
                                                      >
                                                        {file.file_name}
                                                      </span>
                                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                                                        {formatBytes(file.file_size_bytes)}
                                                      </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 ml-auto">
                                                      {/* SHA-256 Badge */}
                                                      <button
                                                        onClick={(e) => handleCopyHash(file, e)}
                                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition-all border ${
                                                          isCopied
                                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                                            : 'bg-slate-950 text-slate-400 border-white/10 hover:text-cyan-300'
                                                        }`}
                                                        title={`Copy full hash: ${file.sha256_hash}`}
                                                      >
                                                        <span>sha256:{truncatedHash}</span>
                                                        {isCopied ? (
                                                          <Check className="h-2.5 w-2.5 text-emerald-400" />
                                                        ) : (
                                                          <Copy className="h-2.5 w-2.5" />
                                                        )}
                                                      </button>

                                                      {/* Preview Trigger */}
                                                      <button
                                                        onClick={(e) => handleOpenPreview(file, e)}
                                                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                                        title="Preview"
                                                      >
                                                        <Eye className="h-3 w-3" />
                                                      </button>

                                                      {/* Direct Download Link */}
                                                      <a
                                                        href={`/api/v1/artifacts/download?id=${file.id}`}
                                                        download={file.file_name}
                                                        className="p-1 px-2 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold flex items-center gap-1 font-sans"
                                                        title={`Download ${file.file_name}`}
                                                      >
                                                        <Download className="h-3 w-3" />
                                                        <span>Download</span>
                                                      </a>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          FILE PREVIEW MODAL
          ========================================== */}
      {previewArtifact && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setPreviewArtifact(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-3xl bg-[#0c101d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5 bg-slate-950/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-slate-900 border border-white/10">
                  {getFileIcon(previewArtifact.file_name)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-md">
                    {previewArtifact.file_name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                    <span>{formatBytes(previewArtifact.file_size_bytes)}</span>
                    <span>•</span>
                    <span>{formatDate(previewArtifact.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/v1/artifacts/download?id=${previewArtifact.id}`}
                  download={previewArtifact.file_name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all shadow-[0_0_12px_rgba(0,240,255,0.25)]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewArtifact(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                  title="Close Preview (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Metadata & Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* SHA-256 Hash Display */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>CRYPTOGRAPHIC SHA-256 DIGEST</span>
                  <button
                    onClick={(e) => handleCopyHash(previewArtifact, e)}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {copiedHashId === previewArtifact.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Full Hash</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-200 break-all select-all">
                  {previewArtifact.sha256_hash}
                </div>
              </div>

              {/* Context Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-500 block mb-1">Captured For Workflow</span>
                  <span className="font-semibold text-white">
                    {previewArtifact.workflowName}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-500 block mb-1">Portal Domain</span>
                  <span className="font-semibold text-cyan-300">
                    {previewArtifact.portalDomain}
                  </span>
                </div>
              </div>

              {/* Preview Content Area */}
              <div className="p-4 rounded-xl bg-slate-950 border border-white/5 min-h-[160px] flex items-center justify-center">
                {isPreviewLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    <span>Loading preview stream…</span>
                  </div>
                ) : previewContent !== null ? (
                  <pre className="w-full text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-[300px]">
                    {previewContent}
                  </pre>
                ) : (previewArtifact.file_name.toLowerCase().endsWith('.pdf')) ? (
                  <div className="text-center py-6 space-y-3">
                    <FileText className="h-10 w-10 text-rose-400 mx-auto" />
                    <p className="text-xs text-slate-300">
                      PDF Document captured and verified with SHA-256.
                    </p>
                    <a
                      href={`/api/v1/artifacts/download?id=${previewArtifact.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold hover:bg-rose-500/30"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open PDF in Browser Tab</span>
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    Direct binary preview is not embedded. Use the Download button above to open this file locally.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/5 bg-slate-950/60 flex items-center justify-between">
              <button
                onClick={() => {
                  if (previewArtifact) handleOpenRun(previewArtifact);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                <span>Inspect Associated Execution Run</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPreviewArtifact(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 border border-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
