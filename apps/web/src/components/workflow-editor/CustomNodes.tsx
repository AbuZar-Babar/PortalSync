export type StepActionType =
  | 'CLICK'
  | 'TYPE'
  | 'SELECT'
  | 'NAVIGATE'
  | 'WAIT'
  | 'LOOP_START'
  | 'EXTRACT'
  | 'DOWNLOAD';

export interface StepNodeData {
  id?: string | number;
  stepIndex: number;
  name: string;
  action: StepActionType;
  target: string;
  candidates?: string[];
  value?: string;
  timeout_ms?: number;
  is_idempotent?: boolean;
  role?: 'SETUP' | 'LOOP';
  extract_column?: string;
  extract_attribute?: string;
  download_dir?: string;
  upload_to_cloud?: boolean;
  [key: string]: unknown;
}

export interface ActionDefinition {
  type: StepActionType;
  label: string;
  defaultName: string;
  badgeClass: string;
  iconSvg: string;
  defaultTimeout: number;
  hasTarget: boolean;
  hasValue: boolean;
  valuePlaceholder?: string;
  role: 'SETUP' | 'LOOP';
}

export const ACTION_DEFINITIONS: Record<StepActionType, ActionDefinition> = {
  CLICK: {
    type: 'CLICK',
    label: 'Click',
    defaultName: 'Click Element',
    badgeClass: 'click',
    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4.1 12 6"/><path d="m5.1 8-2.9-.8"/><path d="m6 12-1.9 2"/><path d="M7.2 2.2 8 5.1"/><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"/></svg>`,
    defaultTimeout: 5000,
    hasTarget: true,
    hasValue: false,
    role: 'SETUP',
  },
  TYPE: {
    type: 'TYPE',
    label: 'Type Text',
    defaultName: 'Type Into Field',
    badgeClass: 'type',
    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/><path d="M7 16h10"/></svg>`,
    defaultTimeout: 5000,
    hasTarget: true,
    hasValue: true,
    valuePlaceholder: 'Text to type...',
    role: 'SETUP',
  },
  SELECT: {
    type: 'SELECT',
    label: 'Select Option',
    defaultName: 'Select Option',
    badgeClass: 'select',
    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>`,
    defaultTimeout: 5000,
    hasTarget: true,
    hasValue: true,
    valuePlaceholder: 'Option value or {{loop:index}}',
    role: 'SETUP',
  },
  NAVIGATE: {
    type: 'NAVIGATE',
    label: 'Navigate',
    defaultName: 'Open Portal Page',
    badgeClass: 'navigate',
    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
    defaultTimeout: 15000,
    hasTarget: false,
    hasValue: true,
    valuePlaceholder: 'https://example.com/portal',
    role: 'SETUP',
  },
  WAIT: {
    type: 'WAIT',
    label: 'Wait',
    defaultName: 'Wait Timer / Idle',
    badgeClass: 'wait',
    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    defaultTimeout: 3000,
    hasTarget: false,
    hasValue: true,
    valuePlaceholder: '3000 (ms)',
    role: 'SETUP',
  },
  LOOP_START: {
    type: 'LOOP_START',
    label: 'Loop Start',
    defaultName: 'Loop Record Iterator',
    badgeClass: 'loop_start',
    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>`,
    defaultTimeout: 10000,
    hasTarget: true,
    hasValue: true,
    valuePlaceholder: 'Selector pattern or max iterations',
    role: 'LOOP',
  },
  EXTRACT: {
    type: 'EXTRACT',
    label: 'Item Extraction',
    defaultName: 'Extract Data Field',
    badgeClass: 'extract',
    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>`,
    defaultTimeout: 5000,
    hasTarget: true,
    hasValue: true,
    valuePlaceholder: 'Column name: invoice_number',
    role: 'LOOP',
  },
  DOWNLOAD: {
    type: 'DOWNLOAD',
    label: 'File Download',
    defaultName: 'Download File / Export',
    badgeClass: 'download',
    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
    defaultTimeout: 30000,
    hasTarget: true,
    hasValue: true,
    valuePlaceholder: 'Download button selector / path',
    role: 'LOOP',
  },
};

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function truncateSelector(selector: string, maxLen = 34): string {
  if (!selector) return '(none)';
  if (selector.length <= maxLen) return selector;
  return selector.slice(0, maxLen - 3) + '...';
}

export function createDefaultStepData(action: StepActionType, index: number): StepNodeData {
  const def = ACTION_DEFINITIONS[action] || ACTION_DEFINITIONS.CLICK;
  return {
    stepIndex: index,
    name: `${def.defaultName} #${index + 1}`,
    action,
    target: def.hasTarget ? '#submit-button' : '',
    candidates: def.hasTarget ? ['button.primary', 'input[type="submit"]'] : [],
    value: def.hasValue ? (action === 'WAIT' ? '3000' : '') : '',
    timeout_ms: def.defaultTimeout,
    is_idempotent: action === 'CLICK',
    role: def.role,
    extract_column: action === 'EXTRACT' ? 'record_id' : '',
    extract_attribute: action === 'EXTRACT' ? 'textContent' : '',
    download_dir: action === 'DOWNLOAD' ? '~/Downloads/PortalSync' : '',
    upload_to_cloud: action === 'DOWNLOAD' ? true : false,
  };
}

/**
 * Generates the Quixotic Slate / Emerald node card HTML for Drawflow canvas
 */
export function renderNodeHtml(data: StepNodeData): string {
  const action = (data.action || 'CLICK').toUpperCase() as StepActionType;
  const def = ACTION_DEFINITIONS[action] || ACTION_DEFINITIONS.CLICK;

  const stepNumber = data.stepIndex !== undefined ? data.stepIndex + 1 : 1;
  const friendlyName = data.name || def.defaultName;
  const targetStr = data.target ? truncateSelector(String(data.target)) : '';
  const valueStr = data.value ? String(data.value) : '';
  const isLoop = data.role === 'LOOP' || action === 'LOOP_START';

  let selectorRow = '';
  if (def.hasTarget && targetStr) {
    selectorRow = `
      <div class="df-selector-pill" title="${escapeHtml(data.target)}">
        <span class="df-selector-label">Target:</span>
        <span class="df-selector-val">${escapeHtml(targetStr)}</span>
      </div>
    `;
  }

  let valueRow = '';
  if (def.hasValue && valueStr) {
    const label = action === 'WAIT' ? 'Wait:' : action === 'NAVIGATE' ? 'URL:' : 'Value:';
    valueRow = `
      <div class="df-value-pill" title="${escapeHtml(valueStr)}">
        <span class="df-value-label">${label}</span>
        <span class="df-value-text">${escapeHtml(valueStr)}</span>
      </div>
    `;
  }

  const idempotentBadge = data.is_idempotent
    ? `<span class="df-idempotent-pill" title="Pre-verifies checkbox state before action">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
        Idempotent
      </span>`
    : '';

  const timeoutBadge = `<span class="df-timeout-pill">${data.timeout_ms || def.defaultTimeout}ms</span>`;

  return `
    <div class="df-node-card-inner ${isLoop ? 'is-loop' : ''}">
      <div class="df-node-header">
        <div class="df-action-badge ${def.badgeClass}">
          <span>${def.iconSvg}</span>
          <span>${escapeHtml(def.label)}</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="df-step-number">#${stepNumber}</span>
          <button type="button" class="df-btn-delete-node" data-node-action="delete" title="Delete Step #${stepNumber}" aria-label="Delete step">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="df-node-hero">
        <span class="df-node-title" title="${escapeHtml(friendlyName)}">${escapeHtml(friendlyName)}</span>
        <span class="df-node-desc">${isLoop ? 'Repeats for each record' : 'Executes once in workflow'}</span>
      </div>

      <div class="df-node-body">
        ${selectorRow}
        ${valueRow}
        <div class="df-badge-row">
          ${idempotentBadge}
          ${timeoutBadge}
        </div>
      </div>
    </div>
  `;
}
