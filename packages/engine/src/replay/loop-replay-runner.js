/**
 * ReFlow - Intelligent Replay & Batch Execution Runner
 * 
 * Executes standard sequential workflows and generalized loops over table rows,
 * list items, or grids. Manages auto-navigation to target URLs, CDP file download
 * interception, per-item state restoration, and error isolation.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ReplayEngine = require('./replay-engine');
const LoopDetector = require('../shared/loop-detector');
const ItemDiscovery = require('../shared/item-discovery');
const ActionGeneralizer = require('../shared/action-generalizer');
const logger = require('../utils/logger');
const { db } = require('../database/db');
const { decryptSecret } = require('../auth/secret-util');
const { resolveTargetUrl, extractWorkflowStartUrl } = require('../utils/url-helper');
const {
  normalizeItemFilter,
  validateItemFilter,
  evaluateItemFilter: sharedEvaluateItemFilter,
  evaluateFilterPreview,
  extractAvailableFields
} = require('../shared/item-filter');
const { ConditionEvaluator } = require('../shared/condition-evaluator');
const { PageInspector } = require('../shared/page-inspector');
const { IntentCompiler } = require('../engine/intent-compiler');
const { SemanticResolver } = require('./semantic-resolver');
const DownloadManager = require('./download-manager');
const PaginationManager = require('./pagination-manager');
const ResultValidator = require('./result-validator');
const FilterEngine = require('../shared/filter-engine');
const { detectLoginSequence, isSessionAuthenticated, isLoginAction } = require('../shared/auth-detector');
const ArtifactDownloadManager = require('./loop/artifact-download-manager');
const GridSelectionAdapter = require('./loop/grid-selection-adapter');
const ItemExecutionHandler = require('./loop/item-execution-handler');
const LoopStateCoordinator = require('./loop/loop-state-coordinator');

class LoopReplayRunner {
  constructor(options = {}) {
    this.cdpPort = options.cdpPort || 9222;
    this.runId = options.runId || `run_${Date.now()}`;
    this.workflowId = options.workflowId || null;
    this.workflowName = options.workflowName || 'workflow';
    this.forceRedownload = options.forceRedownload === true;
    this.itemMode = ['new', 'old', 'all'].includes(options.itemMode) ? options.itemMode : 'new';
    this.maxItems = Number.isInteger(options.maxItems) && options.maxItems > 0 ? options.maxItems : null;

    this.runsDir = path.resolve(process.cwd(), 'recordings', 'runs', this.runId);
    this.downloadsDir = path.join(this.runsDir, 'downloads');
    this.replayEngine = new ReplayEngine({ cdpPort: this.cdpPort });
    this.maxItemRetries = Number.isInteger(options.maxItemRetries) ? Math.max(0, options.maxItemRetries) : 1;
    this.resumeFromCheckpoint = options.resumeFromCheckpoint === true;
    this.isAborted = false;

    // Filter and limit configuration
    const rawFilter = options.itemFilter !== undefined
      ? options.itemFilter
      : (options.rowFilter || (options.filterValue ? { column: options.filterColumn || 'Type', value: options.filterValue } : null));
    const filterValidation = validateItemFilter(rawFilter);

    // Support relational, date, and extended operators via ConditionEvaluator
    const normalizedConditions = ConditionEvaluator.normalizeConditions(rawFilter);
    const EXTENDED_OPS = new Set([
      'contains', 'includes', 'equals', 'eq', '==', '===', 'not_equals', 'neq', '!=',
      'starts_with', 'ends_with', 'in', 'one_of', 'not_in',
      'greater_than', 'gt', '>', 'after', 'date_after', 'date_gt',
      'greater_than_or_equal', 'gte', '>=', 'on_or_after', 'date_on_or_after', 'date_gte',
      'less_than', 'lt', '<', 'before', 'date_before', 'date_lt',
      'less_than_or_equal', 'lte', '<=', 'on_or_before', 'date_on_or_before', 'date_lte',
      'date_between', 'between_dates', 'last_n_days'
    ]);
    const isSupportedByConditionEvaluator = Boolean(
      rawFilter &&
      normalizedConditions.rules.length > 0 &&
      normalizedConditions.rules.every(r => r.field && EXTENDED_OPS.has(String(r.operator || '').toLowerCase().trim()))
    );

    const isOperatorError = filterValidation.error && filterValidation.error.includes('Unsupported filter operator');
    if (filterValidation.valid) {
      this.itemFilter = filterValidation.filter;
      this.filterValidationError = null;
    } else if (isOperatorError && isSupportedByConditionEvaluator) {
      this.itemFilter = rawFilter;
      this.filterValidationError = null;
    } else {
      this.itemFilter = options.itemFilter || null;
      this.filterValidationError = filterValidation.error;
    }

    let validatedLimit = null;
    let limitError = null;
    if (options.loopLimit !== undefined && options.loopLimit !== null) {
      if (typeof options.loopLimit === 'number' && Number.isInteger(options.loopLimit) && options.loopLimit > 0) {
        validatedLimit = options.loopLimit;
      } else if (typeof options.loopLimit === 'string' && /^\d+$/.test(options.loopLimit.trim()) && parseInt(options.loopLimit.trim(), 10) > 0) {
        validatedLimit = parseInt(options.loopLimit.trim(), 10);
      } else {
        limitError = 'Invalid loopLimit: must be a positive integer';
      }
    }
    this.loopLimit = validatedLimit;
    this.loopLimitError = limitError;
    this.rowFilter = options.rowFilter || this.itemFilter || options.itemFilter || null;
    this.itemFilter = this.itemFilter || this.rowFilter || null;
    this.loopStepIndex = Number.isInteger(options.loopStepIndex) ? options.loopStepIndex : null;
    this.isLoop = options.isLoop === true || options.mode === 'loop';
    this.mode = options.mode || (this.isLoop ? 'loop' : 'single');

    // Structured downloads hierarchy: downloads/<workflow-slug>/<YYYY-MM-DD>/
    const rawSlug = (this.workflowName || this.workflowId || 'workflow').toLowerCase();
    this.workflowSlug = rawSlug.replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'workflow';
    this.dateStr = new Date().toISOString().split('T')[0];
    this.workflowDownloadsBaseDir = path.resolve(process.cwd(), 'downloads', this.workflowSlug);
    this.structuredDownloadsDir = options.structuredDownloadsDir ? path.resolve(options.structuredDownloadsDir) : path.resolve(this.workflowDownloadsBaseDir, this.dateStr);

    // Primary Run/ hierarchy: Run/<YYYY-MM-DD_HH-mm-ss>/<portalDomain>/<Category>/
    const targetUrl = options.targetUrl || options.portalUrl || this.workflow?.targetUrl || this.workflow?.startUrl || '';
    let extractedDomain = options.portalDomain || '';
    if (!extractedDomain && targetUrl) {
      try {
        const u = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
        extractedDomain = u.hostname;
      } catch {
        extractedDomain = targetUrl.replace(/https?:\/\//, '').split('/')[0];
      }
    }
    this.portalDomain = extractedDomain || 'customerportal.usoil.com';

    // Dedicated per-execution downloads isolation: downloads/<workflow-slug>/<execution-id>/
    // + Structured Run/ hierarchy: Run/<YYYY-MM-DD_HH-mm-ss>/<portalDomain>/<Category>/
    this.downloadManager = new DownloadManager({
      workflowSlug: this.workflowSlug,
      executionId: this.runId,
      workflowId: this.workflowId,
      portalDomain: this.portalDomain,
      portalUrl: targetUrl,
      runTimestamp: options?.runTimestamp,
      startedAt: options?.startedAt
    });
    this.runTimestamp = this.downloadManager.runTimestamp;
    this.runDomainDir = this.downloadManager.runDomainDir;
    this.executionDownloadsDir = this.downloadManager.getDirectory();
    this.paginationManager = new PaginationManager({ maxPages: options.maxPages || 25 });
    this.resultValidator = new ResultValidator({
      executionId: this.runId,
      workflowId: this.workflowId,
      workflowName: this.workflowName
    });

    this.artifactDownloadManager = new ArtifactDownloadManager({
      runId: this.runId,
      workflowId: this.workflowId,
      workflowName: this.workflowName,
      userId: options.userId,
      forceRedownload: this.forceRedownload,
      runsDir: this.runsDir,
      targetUrl: targetUrl,
      portalDomain: this.portalDomain,
      runTimestamp: this.runTimestamp,
      startedAt: options?.startedAt
    });

    this.gridSelectionAdapter = new GridSelectionAdapter({
      replayEngine: this.replayEngine
    });

    this.loopStateCoordinator = new LoopStateCoordinator({
      runId: this.runId,
      workflowId: this.workflowId,
      workflowName: this.workflowName,
      runsDir: this.runsDir,
      resumeFromCheckpoint: this.resumeFromCheckpoint,
      itemMode: this.itemMode,
      maxItems: this.maxItems,
      maxItemRetries: this.maxItemRetries,
      itemFilter: this.itemFilter,
      rowFilter: this.rowFilter,
      loopLimit: this.loopLimit
    });

    this.itemExecutionHandler = new ItemExecutionHandler({
      maxItemRetries: this.maxItemRetries,
      gridAdapter: this.gridSelectionAdapter,
      downloadManager: this.artifactDownloadManager,
      stateCoordinator: this.loopStateCoordinator,
      replayEngine: this.replayEngine,
      getIsAborted: () => this.isAborted
    });
  }

  /**
   * Abort/stop the current execution immediately
   * @param {boolean} [closePage=false] - Whether to close the active browser tab
   */
  async stop(closePage = false) {
    this.isAborted = true;
    logger.warn(`[Runner] Stop signal triggered for run: ${this.runId}`);
    if (this.replayEngine && typeof this.replayEngine.abort === 'function') {
      await this.replayEngine.abort().catch(() => { });
    }
    if (closePage && this.replayEngine?.page) {
      try {
        if (!this.replayEngine.page.isClosed()) {
          await this.replayEngine.page.close().catch(() => { });
        }
      } catch { }
    }
  }

  /**
   * Start executing a workflow (dispatches to executeLoop or executeStandard)
   * @param {object} workflow - Stored workflow object
   * @param {object} options - Execution options ({ onProgress, loopStepIndex, isLoop, mode })
   */
  async start(workflow, options = {}) {
    if (!workflow) return { success: false, error: 'No workflow provided' };
    const steps = workflow.steps ||
      (workflow.workflow_definition && (workflow.workflow_definition.steps || workflow.workflow_definition.actions)) ||
      (workflow.recordingData && workflow.recordingData.actions) ||
      workflow.actions ||
      [];
    const stepsHasLoop = steps.some(s => s && (s.role === 'LOOP' || s.isLoop || s.loopMode === 'sequential_iteration'));
    const isLoopMode = Boolean(
      workflow.isLoop ||
      workflow.workflow_definition?.isLoop ||
      workflow.workflow_definition?.mode === 'loop' ||
      options.isLoop ||
      options.mode === 'loop' ||
      this.isLoop ||
      this.mode === 'loop' ||
      stepsHasLoop
    );
    if (isLoopMode) {
      const stepIdx = options.loopStepIndex ??
        workflow.loopStepIndex ??
        workflow.workflow_definition?.loopStepIndex ??
        this.loopStepIndex;
      return this.executeLoop(workflow, stepIdx, options.onProgress);
    }
    return this.executeStandard(workflow, options.onProgress);
  }

  _syncSubManagers() {
    if (this.artifactDownloadManager) {
      this.artifactDownloadManager.workflowId = this.workflowId;
      this.artifactDownloadManager.workflowName = this.workflowName;
      this.artifactDownloadManager.workflowSlug = this.workflowSlug;
      this.artifactDownloadManager.workflowDownloadsBaseDir = this.workflowDownloadsBaseDir;
      this.artifactDownloadManager.structuredDownloadsDir = this.structuredDownloadsDir;
      this.artifactDownloadManager.downloadsDir = this.downloadsDir;
      this.artifactDownloadManager.runsDir = this.runsDir;
      this.artifactDownloadManager.forceRedownload = this.forceRedownload;
      if (this.portalDomain) {
        this.artifactDownloadManager.setPortalDomain(this.portalDomain);
      }
      if (this._activeItemContext) {
        this.artifactDownloadManager._activeItemContext = this._activeItemContext;
      }
    }
    if (this.loopStateCoordinator) {
      this.loopStateCoordinator.workflowId = this.workflowId;
      this.loopStateCoordinator.workflowName = this.workflowName;
      this.loopStateCoordinator.runsDir = this.runsDir;
      this.loopStateCoordinator.resumeFromCheckpoint = this.resumeFromCheckpoint;
      this.loopStateCoordinator.itemFilter = this.itemFilter;
      this.loopStateCoordinator.rowFilter = this.rowFilter;
      this.loopStateCoordinator.loopLimit = this.loopLimit;
      this.loopStateCoordinator.itemMode = this.itemMode;
    }
  }
  initDirectories() {
    this._syncSubManagers();
    if (!fs.existsSync(this.downloadsDir)) {
      fs.mkdirSync(this.downloadsDir, { recursive: true });
    }
    if (!fs.existsSync(this.structuredDownloadsDir)) {
      fs.mkdirSync(this.structuredDownloadsDir, { recursive: true });
    }
    if (this.downloadManager) {
      this.downloadManager._initDirectory();
    }
  }

  /**
   * Post-processes a downloaded file:
   * 1. Validates existence and completion.
   * 2. Calculates SHA256 checksum.
   * 3. Moves/copies file into structured folder: downloads/<workflow-slug>/<YYYY-MM-DD>/<filename>
   * 4. Persists metadata record in db.json ('downloads' collection)
   * 5. Appends record to workflow downloads manifest: downloads/<workflow-slug>/manifest.json
   */
  processAndStoreDownload(sourcePath, itemKey = null, itemLabel = null, itemFields = {}) {
    this._syncSubManagers();
    if (this._activeItemContext && !this.artifactDownloadManager._activeItemContext) {
      this.artifactDownloadManager._activeItemContext = this._activeItemContext;
    }
    return this.artifactDownloadManager.processAndStoreDownload(sourcePath, itemKey, itemLabel, itemFields);
  }

  syncWorkflowDownloadsManifest(downloadRecord) {
    return this.artifactDownloadManager.syncWorkflowDownloadsManifest(downloadRecord);
  }

  checkIfAlreadyDownloaded(itemKey, invoiceNumber = null, itemFields = {}, contentHash = null) {
    this._syncSubManagers();
    return this.artifactDownloadManager.checkIfAlreadyDownloaded(itemKey, invoiceNumber, itemFields, contentHash);
  }

  async isCollectionPresent(page, discovery) {
    return this.gridSelectionAdapter.isCollectionPresent(page, discovery);
  }

  async clearGridSelections(page, discovery) {
    return this.gridSelectionAdapter.clearGridSelections(page, discovery);
  }

  async enforceGridRowSingleSelection(page, discovery, targetIndex) {
    return this.gridSelectionAdapter.enforceGridRowSingleSelection(page, discovery, targetIndex);
  }

  async extractItemIdentifier(page, discovery, index, isDropdown = false) {
    return this.itemExecutionHandler.extractItemIdentifier(page, discovery, index, isDropdown);
  }

  static async extractDiscoveredItems(page, discovery) {
    return ItemExecutionHandler.extractDiscoveredItems(page, discovery);
  }

  async evaluateItemFilter(page, discovery, index, filterInput = undefined) {
    return this.itemExecutionHandler.evaluateItemFilter(page, discovery, index, filterInput);
  }

  async detectAndFilterItems(page, discovery, isDropdown, rowFilter) {
    return this.itemExecutionHandler.detectAndFilterItems(page, discovery, isDropdown, rowFilter);
  }

  async waitForDownload(previousSnapshot = [], timeoutMs = 10000) {
    return this.artifactDownloadManager.waitForDownload(previousSnapshot, timeoutMs);
  }

  snapshotDownloadedFiles() {
    return this.artifactDownloadManager.snapshotDownloadedFiles();
  }

  writeLoopCheckpoint(manifest, currentItemIndex = null, currentActionOffset = null, currentPage = 1, currentPageItemIndex = null, activeItem = null) {
    this._syncSubManagers();
    return this.loopStateCoordinator.writeLoopCheckpoint(manifest, currentItemIndex, currentActionOffset, currentPage, currentPageItemIndex, activeItem);
  }

  loadLoopCheckpoint(workflow) {
    this._syncSubManagers();
    return this.loopStateCoordinator.loadLoopCheckpoint(workflow);
  }

  async configureDownloadInterception(page) {
    return this.artifactDownloadManager.configureDownloadInterception(page);
  }

  /**
   * Helper to check if any modal or blocking overlay is currently visible on the page
   */
  async _hasModalOrOverlay(page) {
    if (!page || typeof page.evaluate !== 'function') return false;
    try {
      return await page.evaluate(() => {
        const overlaySelectors = [
          '[role="dialog"]',
          '[role="alertdialog"]',
          'dialog[open]',
          '[aria-modal="true"]',
          '.modal.show',
          '.modal.in',
          '.cdk-overlay-backdrop',
          '.cdk-overlay-pane',
          '.mat-mdc-dialog-container',
          '.mat-dialog-container',
          '.dx-dialog',
          '.dx-overlay-content',
          '.swal2-container',
          '.swal2-shown',
          '.ant-modal-mask',
          '.ant-modal-wrap',
          '.MuiBackdrop-root',
          '.MuiDialog-root',
          '.chakra-modal__content',
          '.chakra-modal__overlay'
        ];
        return overlaySelectors.some(sel => {
          const els = Array.from(document.querySelectorAll(sel));
          return els.some(el => {
            if (el.offsetParent === null && el.tagName.toLowerCase() !== 'body') return false;
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          });
        });
      });
    } catch {
      return false;
    }
  }

  /**
   * Navigate browser to the workflow's designated target/start URL
   */
  async navigateToWorkflowTarget(page, workflow) {
    const resolved = extractWorkflowStartUrl(workflow);
    if (!resolved) {
      logger.info('[Runner] No target URL specified for workflow. Executing on active tab.');
      return;
    }

    try {
      await page.bringToFront().catch(() => { });
    } catch { }

    // Proactively clear any open alert/confirmation dialogs on start
    if (typeof this.replayEngine?.interruptionHandler?.clearLingeringDialogs === 'function') {
      await this.replayEngine.interruptionHandler.clearLingeringDialogs(page).catch(() => {});
    }

    let currentUrl = '';
    try {
      currentUrl = typeof page.url === 'function' ? page.url() : '';
    } catch {}

    let shouldNavigate = false;

    if (!currentUrl || currentUrl === 'about:blank' || currentUrl.startsWith('chrome://')) {
      shouldNavigate = true;
    } else {
      try {
        const currentParsed = new URL(currentUrl);
        const targetParsed = new URL(resolved);

        if (currentParsed.origin !== targetParsed.origin) {
          shouldNavigate = true;
        } else {
          // Same origin handling
          const isTargetLogin = /\/login\b|\/signin\b|\/auth\b/i.test(resolved) || /#(.*)\/(login|signin)/i.test(resolved);
          const isCurrentLogin = /\/login\b|\/signin\b|\/auth\b/i.test(currentUrl) || /#(.*)\/(login|signin)/i.test(currentUrl);

          if (isTargetLogin && !isCurrentLogin) {
            // Target is explicitly login, but current page is already logged in past the login screen
            shouldNavigate = false;
            logger.info(`[Runner] Session already active at "${currentUrl}". Preserving active session instead of navigating back to login URL: ${resolved}`);
          } else {
            // Compare normalized paths, search queries, and hashes
            const normCurrent = (currentParsed.pathname.replace(/\/+$/, '') || '/') + (currentParsed.search || '') + (currentParsed.hash.replace(/\/+$/, '') || '');
            const normTarget = (targetParsed.pathname.replace(/\/+$/, '') || '/') + (targetParsed.search || '') + (targetParsed.hash.replace(/\/+$/, '') || '');

            if (normCurrent !== normTarget) {
              // Current page is on a different sub-path, query, or hash (e.g., deep export screen, inner report view from prior run)
              shouldNavigate = true;
              logger.info(`[Runner] Current page path "${normCurrent}" differs from workflow target startUrl "${normTarget}". Enforcing clean navigation.`);
            } else {
              // Exact URL match: check if a lingering modal overlay from a prior run is blocking access
              const hasOverlay = await this._hasModalOrOverlay(page);
              if (hasOverlay) {
                logger.info('[Runner] Active modal/overlay detected from prior run. Clearing overlays and forcing fresh navigation...');
                const handler = this.replayEngine?.interruptionHandler;
                if (handler) {
                  const dismissFn = typeof handler.clearBlockingOverlays === 'function'
                    ? handler.clearBlockingOverlays
                    : (typeof handler.dismissBlockingOverlays === 'function' ? handler.dismissBlockingOverlays : null);
                  if (dismissFn) await dismissFn.call(handler, page).catch(() => {});
                }
                shouldNavigate = true;
              } else {
                shouldNavigate = false;
              }
            }
          }
        }
      } catch {
        shouldNavigate = currentUrl !== resolved;
      }
    }

    if (shouldNavigate) {
      logger.info(`[Runner] Navigating tab from "${currentUrl}" to workflow target URL: ${resolved}`);
      try {
        await page.goto(resolved, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (this.replayEngine && typeof this.replayEngine._applyStealthEvasion === 'function') {
          await this.replayEngine._applyStealthEvasion();
        }
        await new Promise(r => setTimeout(r, 600));
      } catch (navErr) {
        logger.warn(`[Runner] Auto-navigation note: ${navErr.message}`);
      }
    } else {
      logger.info(`[Runner] Tab already at target URL: ${currentUrl}`);
    }

    // Clean up any open alert/confirmation dialogs and modal overlays so Step 1 has clean access to DOM elements
    const postHandler = this.replayEngine?.interruptionHandler;
    if (postHandler) {
      if (typeof postHandler.clearLingeringDialogs === 'function') {
        await postHandler.clearLingeringDialogs(page).catch(() => {});
      }
      const postDismissFn = typeof postHandler.clearBlockingOverlays === 'function'
        ? postHandler.clearBlockingOverlays
        : (typeof postHandler.dismissBlockingOverlays === 'function' ? postHandler.dismissBlockingOverlays : null);
      if (postDismissFn) {
        await postDismissFn.call(postHandler, page).catch(() => {});
      }
    }
  }

  /**
   * Find a likely pagination "next" control on the current page.
   * The resolver is intentionally conservative: it requires semantic next-page
   * signals and rejects disabled/hidden controls. A workflow may provide an
   * explicit selector through workflow.pagination.nextSelector.
   */
  async findNextPageTarget(page, workflow = {}) {
    return this.gridSelectionAdapter.findNextPageTarget(page, workflow);
  }

  async getCollectionFingerprint(page, collection) {
    return this.gridSelectionAdapter.getCollectionFingerprint(page, collection);
  }

  async advanceToNextPage(page, workflow = {}) {
    return this.gridSelectionAdapter.advanceToNextPage(page, workflow, this.replayEngine);
  }

  isDropdownOptionCollection(collection, items = []) {
    return this.gridSelectionAdapter.isDropdownOptionCollection(collection, items);
  }

  async ensureDropdownOpen(page, triggerStep = null) {
    return this.gridSelectionAdapter.ensureDropdownOpen(page, triggerStep, this.replayEngine);
  }

  async executeDropdownOptionSingleSelect(page, targetIndex, targetText = '') {
    return this.gridSelectionAdapter.executeDropdownOptionSingleSelect(page, targetIndex, targetText);
  }

  /**
   * Execute a standard sequential workflow (all steps in order)
   * @param {object} workflow - Stored workflow object with steps array
   * @param {function} onProgress - Progress callback for live updates
   */
  async executeStandard(workflow, onProgress = () => { }) {
    if (workflow) {
      const targetUrl = workflow.targetUrl || workflow.startUrl || (workflow.steps && workflow.steps[0] && workflow.steps[0].url) || '';
      if (targetUrl && (!this.portalDomain || this.portalDomain === 'customerportal.usoil.com')) {
        let extractedDomain = '';
        try {
          const u = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
          extractedDomain = u.hostname;
        } catch {
          extractedDomain = targetUrl.replace(/https?:\/\//, '').split('/')[0];
        }
        if (extractedDomain) {
          this.portalDomain = extractedDomain;
          if (this.downloadManager) {
            this.downloadManager.portalDomain = extractedDomain;
            this.downloadManager.runDomainDir = path.resolve(this.downloadManager.runTimestampDir, extractedDomain);
            if (!fs.existsSync(this.downloadManager.runDomainDir)) {
              fs.mkdirSync(this.downloadManager.runDomainDir, { recursive: true });
            }
          }
        }
      }
    }
    this.initDirectories();
    const steps = workflow.steps || (workflow.recordingData && workflow.recordingData.actions) || workflow.actions || [];
    const manifest = {
      runId: this.runId,
      workflowId: workflow.id,
      mode: 'STANDARD',
      startTime: new Date().toISOString(),
      status: 'RUNNING',
      itemsTotal: steps.length,
      itemsSucceeded: 0,
      itemsFailed: 0,
      itemsSkipped: 0,
      results: [],
      downloadedFiles: []
    };
    this.manifest = manifest;

    logger.info(`[Runner] Starting standard execution run ${this.runId} for workflow "${workflow.name}" (${steps.length} steps)`);
    onProgress({ status: 'STARTING', manifest });

    try {
      // Set active recording on replayEngine for context-aware execution before connecting
      this.replayEngine.recording = workflow.recordingData || {
        actions: steps,
        targetUrl: workflow.targetUrl || workflow.startUrl,
        metadata: { startUrl: workflow.targetUrl || workflow.startUrl }
      };

      const browser = await this.replayEngine.connect();
      if (this.replayEngine.tabManager) {
        await this.replayEngine.tabManager.cleanupAuxiliaryTabs().catch(() => {});
      }
      const page = this.replayEngine.tabManager?.getPrimaryPage() || this.replayEngine.page || (await browser.pages())[0];
      this.replayEngine.page = page;

      // Set up the secret resolver using the workflow's userId
      this.replayEngine.secretResolver = async (secretId) => {
        const secret = db.findOne('secrets', s => s.id === secretId && s.userId === workflow.userId);
        if (secret && secret.encryptedData) {
          try {
            return decryptSecret(secret.encryptedData);
          } catch (e) {
            logger.warn(`Failed to decrypt secret [${secretId}]: ${e.message}`);
          }
        }
        logger.warn(`Secret [${secretId}] not found or could not be decrypted.`);
        return `{{secret:${secretId}}}`;
      };

      // Setup CDP download interception
      await this.configureDownloadInterception(page);

      // Auto-navigate to target URL before steps execution
      await this.navigateToWorkflowTarget(page, workflow);

      // Conditional Login Skip: If the portal is already authenticated, skip initial login steps
      let startIndex = 0;
      const loginSeq = detectLoginSequence(steps);
      if (loginSeq.hasLoginSequence) {
        const isAuth = await isSessionAuthenticated(page, loginSeq);
        if (isAuth) {
          logger.info(`[Runner] Active session detected at "${page.url()}". Skipping ${loginSeq.loginActionCount} login step(s) (Steps 1-${loginSeq.firstPostLoginIndex}) and resuming at Step #${loginSeq.firstPostLoginIndex + 1}.`);
          for (let s = loginSeq.startIndex; s <= loginSeq.endIndex; s++) {
            const skipStep = steps[s];
            const skipResult = {
              stepIndex: s + 1,
              type: skipStep.type || skipStep.action || 'CLICK',
              status: 'SKIPPED',
              reason: 'SESSION_ALREADY_AUTHENTICATED',
              name: skipStep.name || skipStep.elementName || `Step #${s + 1}`,
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString()
            };
            manifest.itemsSkipped++;
            manifest.results.push(skipResult);
            this.manifest = manifest;
            onProgress({ status: 'STEP_COMPLETE', stepResult: skipResult, manifest });
          }
          startIndex = loginSeq.firstPostLoginIndex;
        }
      }

      // Execute each step in order
      for (let i = startIndex; i < steps.length; i++) {
        if (this.isAborted) {
          logger.warn(`[Runner] Abort signal active before step #${i + 1}. Stopping execution.`);
          manifest.status = 'STOPPED';
          break;
        }

        const step = steps[i];
        const stepType = step.type || step.action || 'CLICK';

        // Natural pacing delay: wait if the user waited during recording (e.g. for grid data to load)
        if (i > 0 && step.timeDeltaMs && step.timeDeltaMs > 0) {
          const paceDelay = Math.min(step.timeDeltaMs, 15000);
          if (paceDelay > 600) {
            logger.info(`[Runner] Pacing step #${i + 1}: waiting ${paceDelay}ms for page/grid to settle...`);
            const end = Date.now() + paceDelay;
            while (Date.now() < end) {
              if (this.isAborted) break;
              await new Promise(r => setTimeout(r, 100));
            }
          }
        }

        if (this.isAborted) {
          logger.warn(`[Runner] Abort signal active after pacing for step #${i + 1}. Stopping execution.`);
          manifest.status = 'STOPPED';
          break;
        }

        logger.info(`[Runner] Executing step ${i + 1}/${steps.length} [${stepType}]...`);
        const beforeStepFiles = this.snapshotDownloadedFiles();
        const stepResult = {
          stepIndex: i + 1,
          type: stepType,
          status: 'PENDING',
          startTime: new Date().toISOString()
        };

        try {
          await this.replayEngine.executeAction(step, i);
          stepResult.status = 'SUCCESS';
          manifest.itemsSucceeded++;

          if (stepType === 'CLICK' && this.downloadsDir) {
            const isDownloadAction = Boolean(
              (step.target?.candidates?.some(c => c.value && /download|export|save|pdf|print/i.test(c.value))) ||
              (step.target?.fingerprint?.attributes?.title && /download|export|save|pdf|print/i.test(step.target.fingerprint.attributes.title)) ||
              (step.target?.fingerprint?.text && /download|export|save|pdf|print/i.test(step.target.fingerprint.text))
            );
            const downloadWaitMs = isDownloadAction ? 12000 : 1200;
            const downloaded = await this.waitForDownload(beforeStepFiles, downloadWaitMs);
            if (downloaded.length) {
              stepResult.downloadedFiles = downloaded.map(dl => {
                return this.processAndStoreDownload(dl.path, step.selector || `step_${i + 1}`, `Step #${i + 1}`) || dl;
              });
            }
          }
        } catch (stepErr) {
          if (this.isAborted) {
            stepResult.status = 'STOPPED';
            stepResult.error = 'Execution stopped by user';
            manifest.status = 'STOPPED';
            manifest.results.push(stepResult);
            break;
          }
          logger.error(`[Runner] Step #${i + 1} failed: ${stepErr.message}`);
          stepResult.status = 'FAILED';
          stepResult.error = stepErr.message;
          manifest.itemsFailed++;
        }

        stepResult.endTime = new Date().toISOString();
        manifest.results.push(stepResult);
        this.manifest = manifest;

        // Ensure auxiliary tabs are closed and primary tab remains active in Chrome
        if (this.replayEngine?.tabManager) {
          await this.replayEngine.tabManager.cleanupAuxiliaryTabs();
          await this.replayEngine.tabManager.ensurePrimaryTabActive(this.replayEngine);
        }
        try {
          fs.writeFileSync(path.join(this.runsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
        } catch { }
        onProgress({ status: 'STEP_COMPLETE', stepResult, manifest });
      }

      // Gather and organize downloaded files into structured folder
      if (fs.existsSync(this.downloadsDir)) {
        const files = fs.readdirSync(this.downloadsDir)
          .filter(file => !file.endsWith('.crdownload') && !file.endsWith('.tmp'));
        manifest.downloadedFiles = files.map(file => {
          const rawPath = path.join(this.downloadsDir, file);
          const stored = this.processAndStoreDownload(rawPath, file, file);
          return stored || {
            filename: file,
            path: rawPath,
            sizeBytes: fs.statSync(rawPath).size
          };
        });
      }

      manifest.status = this.isAborted ? 'STOPPED' : 'COMPLETED';
      manifest.endTime = new Date().toISOString();
      logger.success(`\n[Runner] Standard execution run ${this.runId} ${manifest.status}! Succeeded: ${manifest.itemsSucceeded}/${steps.length}`);

    } catch (err) {
      manifest.status = this.isAborted ? 'STOPPED' : 'FAILED';
      manifest.error = err.message;
      manifest.endTime = new Date().toISOString();
      if (this.isAborted) {
        logger.warn(`[Runner] Execution run ${this.runId} stopped by user.`);
      } else {
        logger.error(`[Runner] Fatal execution failure: ${err.message}`);
      }
    } finally {
      manifest.endTime = manifest.endTime || new Date().toISOString();
      if (this.isAborted) {
        manifest.status = 'STOPPED';
      }
      try {
        fs.writeFileSync(path.join(this.runsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      } catch { }
      if (this._replayTargetCreatedListener && this.replayEngine?.browser) {
        try {
          this.replayEngine.browser.off('targetcreated', this._replayTargetCreatedListener);
        } catch { }
        this._replayTargetCreatedListener = null;
      }
      if (this.replayEngine) {
        await this.replayEngine.disconnect().catch(() => { });
      }
      onProgress({ status: manifest.status, manifest });
    }

    return manifest;
  }

  /**
   * Execute a parameterized loop workflow
   * @param {object} workflow - Stored workflow object with steps array
   * @param {number} loopStepIndex - Index of the action to iterate over
   * @param {function} onProgress - Progress callback for live updates
   */
  async executeLoop(workflow, loopStepIndex = null, onProgress = () => { }) {
    this._limitReached = false;
    if (workflow) {
      if (!this.workflowId) this.workflowId = workflow.id || workflow.metadata?.recordingId;
      if (!this.workflowName || this.workflowName === 'workflow') this.workflowName = workflow.name || workflow.metadata?.name || workflow.id || 'workflow';
      const rawSlug = (this.workflowName || this.workflowId || 'workflow').toLowerCase();
      this.workflowSlug = rawSlug.replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'workflow';
      this.workflowDownloadsBaseDir = path.resolve(process.cwd(), 'downloads', this.workflowSlug);
      this.structuredDownloadsDir = path.resolve(this.workflowDownloadsBaseDir, this.dateStr);

      const targetUrl = workflow.targetUrl || workflow.startUrl || (workflow.steps && workflow.steps[0] && workflow.steps[0].url) || '';
      if (targetUrl && (!this.portalDomain || this.portalDomain === 'customerportal.usoil.com')) {
        let extractedDomain = '';
        try {
          const u = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
          extractedDomain = u.hostname;
        } catch {
          extractedDomain = targetUrl.replace(/https?:\/\//, '').split('/')[0];
        }
        if (extractedDomain) {
          this.portalDomain = extractedDomain;
          if (this.downloadManager) {
            this.downloadManager.portalDomain = extractedDomain;
            this.downloadManager.runDomainDir = path.resolve(this.downloadManager.runTimestampDir, extractedDomain);
            if (!fs.existsSync(this.downloadManager.runDomainDir)) {
              fs.mkdirSync(this.downloadManager.runDomainDir, { recursive: true });
            }
          }
        }
      }
    }
    if (!this.itemFilter && (workflow?.itemFilter || workflow?.filter_rules?.itemFilter || workflow?.workflow_definition?.itemFilter)) {
      const rawFilter = workflow.itemFilter || workflow?.filter_rules?.itemFilter || workflow?.workflow_definition?.itemFilter;
      const filterValidation = validateItemFilter(rawFilter);
      if (filterValidation && filterValidation.valid) {
        this.itemFilter = filterValidation.filter;
      } else {
        const normalizedConditions = ConditionEvaluator.normalizeConditions(rawFilter);
        const EXTENDED_OPS = new Set([
          'contains', 'includes', 'equals', 'eq', '==', '===', 'not_equals', 'neq', '!=',
          'starts_with', 'ends_with', 'in', 'one_of', 'not_in',
          'greater_than', 'gt', '>', 'after', 'date_after', 'date_gt',
          'greater_than_or_equal', 'gte', '>=', 'on_or_after', 'date_on_or_after', 'date_gte',
          'less_than', 'lt', '<', 'before', 'date_before', 'date_lt',
          'less_than_or_equal', 'lte', '<=', 'on_or_before', 'date_on_or_before', 'date_lte',
          'date_between', 'between_dates', 'last_n_days'
        ]);
        const isSupportedByConditionEvaluator = Boolean(
          rawFilter &&
          normalizedConditions.rules.length > 0 &&
          normalizedConditions.rules.every(r => r.field && EXTENDED_OPS.has(String(r.operator || '').toLowerCase().trim()))
        );
        this.itemFilter = isSupportedByConditionEvaluator ? rawFilter : null;
      }
      this.rowFilter = this.itemFilter;
    }
    if (!this.loopLimit && (workflow?.loopLimit || workflow?.workflow_definition?.loopLimit)) {
      this.loopLimit = workflow.loopLimit || workflow.workflow_definition?.loopLimit;
    }
    this.initDirectories();
    const manifest = {
      runId: this.runId,
      workflowId: workflow.id,
      mode: 'LOOP',
      startTime: new Date().toISOString(),
      status: 'RUNNING',
      itemsTotal: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      itemsSkipped: 0,
      matchingCount: 0,
      selectedCount: 0,
      skippedFilterCount: 0,
      skippedLimitCount: 0,
      skippedDuplicateCount: 0,
      matching: 0,
      selected: 0,
      skippedFilter: 0,
      skippedLimit: 0,
      skippedDuplicate: 0,
      itemFilter: this.itemFilter,
      loopLimit: this.loopLimit,
      results: [],
      downloadedFiles: []
    };

    const checkpoint = this.loadLoopCheckpoint(workflow);
    if (checkpoint) {
      manifest.results = Array.isArray(checkpoint.results) ? checkpoint.results : [];
      manifest.itemsSucceeded = Number.isInteger(checkpoint.itemsSucceeded)
        ? checkpoint.itemsSucceeded
        : manifest.results.filter(result => result.status === 'SUCCESS').length;
      manifest.itemsFailed = Number.isInteger(checkpoint.itemsFailed)
        ? checkpoint.itemsFailed
        : manifest.results.filter(result => result.status === 'FAILED').length;
      manifest.skippedFilterCount = Number.isInteger(checkpoint.skippedFilterCount)
        ? checkpoint.skippedFilterCount
        : manifest.results.filter(result => result.status === 'SKIPPED_FILTER').length;
      manifest.skippedLimitCount = Number.isInteger(checkpoint.skippedLimitCount)
        ? checkpoint.skippedLimitCount
        : manifest.results.filter(result => result.status === 'SKIPPED_LIMIT').length;
      manifest.skippedDuplicateCount = Number.isInteger(checkpoint.skippedDuplicateCount)
        ? checkpoint.skippedDuplicateCount
        : manifest.results.filter(result => result.status === 'SKIPPED_DUPLICATE').length;
      manifest.itemsSkipped = Number.isInteger(checkpoint.itemsSkipped)
        ? checkpoint.itemsSkipped
        : (manifest.skippedFilterCount + manifest.skippedLimitCount + manifest.skippedDuplicateCount);
      manifest.matchingCount = Number.isInteger(checkpoint.matchingCount)
        ? checkpoint.matchingCount
        : manifest.results.filter(result => result.status !== 'SKIPPED_FILTER').length;
      manifest.selectedCount = Number.isInteger(checkpoint.selectedCount)
        ? checkpoint.selectedCount
        : manifest.results.filter(result => result.status !== 'SKIPPED_FILTER' && result.status !== 'SKIPPED_LIMIT').length;
      manifest.matching = manifest.matchingCount;
      manifest.selected = manifest.selectedCount;
      manifest.skippedFilter = manifest.skippedFilterCount;
      manifest.skippedLimit = manifest.skippedLimitCount;
      manifest.skippedDuplicate = manifest.skippedDuplicateCount;
      manifest.downloadedFiles = Array.isArray(checkpoint.downloadedFiles)
        ? checkpoint.downloadedFiles
        : [];
      manifest.pagesProcessed = Number.isInteger(checkpoint.pagesProcessed)
        ? checkpoint.pagesProcessed
        : 1;
      manifest.itemsTotal = Number.isInteger(checkpoint.itemsTotal)
        ? checkpoint.itemsTotal
        : 0;
      manifest.activeItem = checkpoint.activeItem || null;
    }
    this.manifest = manifest;
    this._lastCursor = checkpoint ? {
      currentItemIndex: checkpoint.currentItemIndex ?? null,
      currentActionOffset: checkpoint.currentActionOffset ?? null,
      currentPage: checkpoint.currentPage ?? 1,
      currentPageItemIndex: checkpoint.currentPageItemIndex ?? null,
      activeItem: checkpoint.activeItem ?? null
    } : null;

    logger.info(`[Loop Runner] Starting execution run ${this.runId} for workflow "${workflow.name}"`);
    onProgress({ status: checkpoint ? 'RESUMING' : 'STARTING', manifest, checkpoint });

    let currentPage = 1;

    try {
      if (this.replayEngine) {
        this.replayEngine.isPaused = false;
        this.replayEngine.isAborted = false;
      }
      // Set active recording on replayEngine for context-aware execution before connecting
      this.replayEngine.recording = workflow.recordingData || {
        actions: workflow.steps || [],
        targetUrl: workflow.targetUrl || workflow.startUrl,
        metadata: { startUrl: workflow.targetUrl || workflow.startUrl }
      };

      const browser = await this.replayEngine.connect();
      if (this.replayEngine.tabManager) {
        await this.replayEngine.tabManager.cleanupAuxiliaryTabs().catch(() => {});
      }
      const page = this.replayEngine.tabManager?.getPrimaryPage() || this.replayEngine.page || (await browser.pages())[0];
      this.replayEngine.page = page;
      const initialPages = await browser.pages().catch(() => []);
      const initialPageUrls = new Set(initialPages.map(p => p.url()));

      // Set up the secret resolver using the workflow's userId
      this.replayEngine.secretResolver = async (secretId) => {
        const secret = db.findOne('secrets', s => s.id === secretId && s.userId === workflow.userId);
        if (secret && secret.encryptedData) {
          try {
            return decryptSecret(secret.encryptedData);
          } catch (e) {
            logger.warn(`Failed to decrypt secret [${secretId}]: ${e.message}`);
          }
        }
        logger.warn(`Secret [${secretId}] not found or could not be decrypted. Falling back to placeholder.`);
        return `{{secret:${secretId}}}`;
      };

      // Setup CDP download interception
      await this.configureDownloadInterception(page);

      // Auto-navigate to workflow target URL before executing setup / loop steps
      await this.navigateToWorkflowTarget(page, workflow);

      // Ensure the same selector resolver used by normal replay is available to
      // ItemDiscovery before it tries to resolve the recorded target.
      await this.replayEngine._ensureSelectorResolverInFrame(page.mainFrame());

      // 1. Partition steps into Setup vs Loop Steps
      const steps = workflow.steps ||
        (workflow.workflow_definition && (workflow.workflow_definition.steps || workflow.workflow_definition.actions)) ||
        (workflow.recordingData && workflow.recordingData.actions) ||
        workflow.actions ||
        [];

      // Determine effective loopStepIndex:
      let effectiveLoopStepIndex = Number.isInteger(loopStepIndex) ? loopStepIndex : null;
      if (effectiveLoopStepIndex !== null) {
        const reqStep = steps[effectiveLoopStepIndex];
        const isNav = reqStep && LoopDetector.isNavigationOrChrome(
          reqStep.target?.candidates?.find(c => c && c.strategy === 'css-path')?.value || '',
          reqStep.target?.fingerprint || reqStep.fingerprint || {}
        );
        if (isNav) {
          const autoIdx = LoopDetector.findLoopCandidateIndex(steps);
          if (autoIdx >= 0) effectiveLoopStepIndex = autoIdx;
        }
      } else {
        if (Number.isInteger(workflow.loopStepIndex) && workflow.loopStepIndex >= 0) {
          effectiveLoopStepIndex = workflow.loopStepIndex;
        } else if (Number.isInteger(workflow.workflow_definition?.loopStepIndex) && workflow.workflow_definition.loopStepIndex >= 0) {
          effectiveLoopStepIndex = workflow.workflow_definition.loopStepIndex;
        } else if (Number.isInteger(workflow.settings?.loopStepIndex) && workflow.settings.loopStepIndex >= 0) {
          effectiveLoopStepIndex = workflow.settings.loopStepIndex;
        } else if (Number.isInteger(this.loopStepIndex) && this.loopStepIndex >= 0) {
          effectiveLoopStepIndex = this.loopStepIndex;
        } else {
          const autoIdx = LoopDetector.findLoopCandidateIndex(steps);
          if (autoIdx >= 0) {
            effectiveLoopStepIndex = autoIdx;
          } else {
            effectiveLoopStepIndex = 0;
          }
        }
      }

      const partition = LoopDetector.partitionWorkflow(steps, effectiveLoopStepIndex);
      const targetStep = partition.loopSteps[0];
      if (!targetStep) {
        logger.warn(`[Loop Runner] No loop target action found at index ${effectiveLoopStepIndex}. Falling back to standard execution.`);
        return await this.executeStandard(workflow, onProgress);
      }
      const analysis = LoopDetector.analyzeStep(targetStep);

      manifest.loopStepIndex = effectiveLoopStepIndex;

      logger.info(`[Loop Runner] Loop starts at step index ${effectiveLoopStepIndex} (Setup: ${partition.setupSteps.length} step(s), Loop: ${partition.loopSteps.length} action(s))`);
      logger.info(`[Loop Runner] Detected pattern: ${analysis.patternType} (Container: ${analysis.containerSelector})`);

      // Capture the current page URL for state restoration. This must be updated
      // per pagination page so retries on page 2+ do not accidentally return to page 1.
      let currentPageUrl = page.url();

      // If target step is an option/dropdown, ensure dropdown is open before ItemDiscovery
      const isDropdownCandidate = analysis.patternType === 'dropdown-option' ||
        targetStep.fingerprint?.parentTag === 'mat-option' ||
        targetStep.fingerprint?.tagName === 'mat-option' ||
        (targetStep.target?.candidates && targetStep.target.candidates.some(c => c && /mat-option|role=["']option["']/i.test(c.value)));

      if (isDropdownCandidate) {
        const triggerStep = partition.setupSteps.length > 0 ? partition.setupSteps[partition.setupSteps.length - 1] : null;
        await this.ensureDropdownOpen(page, triggerStep);
        await new Promise(r => setTimeout(r, 400));
      }

      // Check if the target collection is ALREADY open and visible in DOM before running setup steps
      let discovery = await ItemDiscovery.discover(page, targetStep.target || targetStep.fingerprint, {
        minItems: 2,
        minScore: 0.55
      }).catch(() => ({ success: false }));

      const alreadyOpen = Boolean(discovery && discovery.success && discovery.itemCount >= 2);

      if (alreadyOpen) {
        logger.info(`[Loop Runner] Target collection already open and visible in DOM (${discovery.itemCount} items). Skipping setup steps.`);
      } else if (partition.setupSteps.length > 0) {
        // Execute Setup Steps (e.g. Login & Navigate)
        logger.info(`[Loop Runner] Executing ${partition.setupSteps.length} setup step(s)...`);
        const setupLoginSeq = detectLoginSequence(partition.setupSteps);
        const isSessionAuth = setupLoginSeq.hasLoginSequence
          ? await isSessionAuthenticated(page, setupLoginSeq)
          : false;

        for (let i = 0; i < partition.setupSteps.length; i++) {
          const step = partition.setupSteps[i];
          if (isSessionAuth && i <= setupLoginSeq.endIndex) {
            logger.info(`[Loop Runner] Skipping setup login step #${i + 1} (${step.name || step.elementName || 'Login step'}) - session already authenticated.`);
            continue;
          }
          await this.replayEngine.executeAction(step, i);
        }

        if (isDropdownCandidate) {
          const triggerStep = partition.setupSteps.length > 0 ? partition.setupSteps[partition.setupSteps.length - 1] : null;
          await this.ensureDropdownOpen(page, triggerStep);
          await new Promise(r => setTimeout(r, 400));
        }

        discovery = await ItemDiscovery.discover(page, targetStep.target || targetStep.fingerprint, {
          minItems: 2,
          minScore: 0.55
        });

        if (!discovery.success || discovery.itemCount < 1) {
          discovery = await ItemDiscovery.discover(page, targetStep.target || targetStep.fingerprint, {
            minItems: 1,
            minScore: 0.45
          }).catch(() => discovery);
        }
      }

      // If primary target step did not discover collection, search all other loop steps
      if (!discovery || !discovery.success || discovery.itemCount < 1) {
        for (let sIdx = 1; sIdx < partition.loopSteps.length; sIdx++) {
          const candidateStep = partition.loopSteps[sIdx];
          const candDisc = await ItemDiscovery.discover(page, candidateStep.target || candidateStep.fingerprint, {
            minItems: 1,
            minScore: 0.40
          }).catch(() => null);
          if (candDisc && candDisc.success && candDisc.itemCount >= 1) {
            logger.info(`[Loop Runner] Discovered collection on loop step #${effectiveLoopStepIndex + sIdx + 1} (${candDisc.itemCount} items)`);
            discovery = candDisc;
            break;
          }
        }
      }

      // If still not discovered, use PageInspector to autonomously locate table collections on the active page
      if (!discovery || !discovery.success || discovery.itemCount < 1) {
        try {
          const inspection = await PageInspector.inspectPage(page).catch(() => null);
          if (inspection && Array.isArray(inspection.collections) && inspection.collections.length > 0) {
            const primaryCol = inspection.collections[0];
            const rowCount = primaryCol.rowCount || (Array.isArray(primaryCol.items) ? primaryCol.items.length : 0);
            if (rowCount >= 1) {
              logger.info(`[Loop Runner] PageInspector identified data table collection: "${primaryCol.entityName || 'Table'}" with ${rowCount} items.`);
              discovery = {
                success: true,
                itemCount: rowCount,
                confidence: 0.85,
                collection: {
                  itemTag: primaryCol.itemTag || 'tr',
                  containerSelector: primaryCol.containerSelector || 'table',
                  ancestorSelector: primaryCol.ancestorSelector || 'table',
                  columns: primaryCol.columns || []
                },
                items: (primaryCol.items || []).map((row, rIdx) => ({
                  index: rIdx,
                  label: row.Text || `Row #${rIdx + 1}`,
                  text: row.Text || row._rawText || '',
                  fields: row
                }))
              };
            }
          }
        } catch (inspErr) {
          logger.warn(`[Loop Runner] PageInspector fallback inspection note: ${inspErr.message}`);
        }
      }

      // If no DOM table exists but the workflow was explicitly set to loop, execute sequential step iteration loop
      const isExplicitLoopWorkflow = Boolean(
        this.isLoop ||
        this.mode === 'loop' ||
        workflow.isLoop === true ||
        workflow.workflow_definition?.isLoop === true ||
        workflow.workflow_definition?.mode === 'loop' ||
        steps.some(s => s && (s.role === 'LOOP' || s.isLoop || s.loopMode === 'sequential_iteration'))
      );

      if ((!discovery || !discovery.success || discovery.itemCount < 1) && isExplicitLoopWorkflow) {
        const loopLimitVal = Number.isInteger(this.loopLimit) && this.loopLimit > 0
          ? this.loopLimit
          : (Number.isInteger(workflow.loopLimit) && workflow.loopLimit > 0
              ? workflow.loopLimit
              : (Number.isInteger(workflow.workflow_definition?.loopLimit) && workflow.workflow_definition.loopLimit > 0
                  ? workflow.workflow_definition.loopLimit
                  : 3));

        logger.info(`[Loop Runner] No table DOM collection detected; executing sequential step loop for ${loopLimitVal} iteration(s)...`);
        manifest.mode = 'STEP_LOOP';
        manifest.itemsTotal = loopLimitVal;
        manifest.matchingCount = loopLimitVal;
        manifest.matching = loopLimitVal;
        manifest.selectedCount = loopLimitVal;
        manifest.selected = loopLimitVal;
        manifest.pagesProcessed = 1;

        for (let iter = 0; iter < loopLimitVal; iter++) {
          if (this.isAborted || (this.replayEngine && this.replayEngine.isAborted)) break;
          logger.info(`[Loop Runner] Executing iteration ${iter + 1}/${loopLimitVal}...`);

          for (let sIdx = 0; sIdx < partition.loopSteps.length; sIdx++) {
            if (this.isAborted || (this.replayEngine && this.replayEngine.isAborted)) break;
            const loopStep = partition.loopSteps[sIdx];
            const actionWithLoopIndex = {
              ...loopStep,
              value: typeof loopStep.value === 'string' && loopStep.value.includes('{{loop:index}}')
                ? loopStep.value.replace(/\{\{loop:index\}\}/g, String(iter))
                : loopStep.value
            };
            await this.replayEngine.executeAction(actionWithLoopIndex, effectiveLoopStepIndex + sIdx);
          }

          const iterResult = {
            index: iter + 1,
            itemIndex: iter,
            label: `Iteration #${iter + 1}`,
            status: 'SUCCESS',
            timestamp: new Date().toISOString()
          };
          manifest.results.push(iterResult);
          manifest.itemsSucceeded = (manifest.itemsSucceeded || 0) + 1;
          onProgress({ status: 'ITEM_PROCESSED', itemResult: iterResult, manifest });
        }

        manifest.status = 'COMPLETED';
        manifest.endTime = new Date().toISOString();
        this.writeLoopCheckpoint(manifest, null, null, 1, null, null);
        try {
          fs.writeFileSync(path.join(this.runsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
        } catch {}
        onProgress({ status: manifest.status, manifest });
        return manifest;
      }

      if (!discovery || !discovery.success || discovery.itemCount < 1) {
        logger.warn(`[Loop Runner] Item discovery did not detect matching items: ${(discovery && discovery.reason) || 'zero items found'}. Falling back to standard execution.`);
        return await this.executeStandard(workflow, onProgress);
      }

      if (!checkpoint) {
        manifest.itemsTotal = discovery.itemCount;
        manifest.pagesProcessed = 1;
      }

      const isDropdown = this.isDropdownOptionCollection(discovery.collection, discovery.items);
      const triggerStep = partition.setupSteps.length > 0
        ? partition.setupSteps[partition.setupSteps.length - 1]
        : null;

      // ItemDiscovery already extracts fields while preserving the exact
      // discovered item identity/order used by getItemHandle().
      // Do not rebuild the collection from the DOM here: doing so can shift
      // row indices (headers/hidden rows) and overwrite correct fields.
      let itemsWithFields = Array.isArray(discovery.items)
        ? discovery.items
        : [];

      if (this.filterValidationError) {
        throw new Error(`Filter configuration error: ${this.filterValidationError}`);
      }
      if (this.loopLimitError) {
        throw new Error(`Filter configuration error: ${this.loopLimitError}`);
      }

      const effectiveFilter = this.itemFilter || this.rowFilter || null;
      const condRules = ConditionEvaluator.normalizeConditions(effectiveFilter).rules;
      const isRelationalOrExtended = condRules.some(r => {
        const op = String(r.operator || '').toLowerCase().trim();
        return ['<=', '>=', '<', '>', 'before', 'after', 'starts_with', 'ends_with', 'in', 'not_in', '!=', 'not_equals', 'date_before', 'date_after', 'date_on_or_after', 'date_on_or_before', 'date_between', 'between_dates', 'last_n_days', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'date_gt', 'date_lt', 'date_gte', 'date_lte', 'on_or_after', 'on_or_before'].includes(op);
      });

      let preview;
      if (isRelationalOrExtended) {
        let matchingCount = 0;
        let selectedCount = 0;
        let skippedFilterCount = 0;
        let skippedLimitCount = 0;
        const selectedPreview = [];
        const skippedFilterPreview = [];
        const limit = this.loopLimit;
        const errors = [];

        // Check if any rule targets a completely non-existent field across all items
        if (itemsWithFields.length > 0) {
          for (const rule of condRules) {
            const field = rule.field;
            const fieldFound = itemsWithFields.some(item => {
              const rec = Object.assign({}, item, item?.fields || {});
              const val = ConditionEvaluator.extractFieldValue(rec, field);
              return val !== undefined && val !== null;
            });
            if (!fieldFound) {
              errors.push(`Configured field "${field}" is not available on item`);
            }
          }
        }

        for (let i = 0; i < itemsWithFields.length; i++) {
          const item = itemsWithFields[i];
          const itemRecord = Object.assign({}, item, item?.fields || {});
          const evalRes = ConditionEvaluator.evaluate(itemRecord, effectiveFilter);
          if (evalRes.matches) {
            matchingCount++;
            if (limit === null || selectedCount < limit) {
              selectedCount++;
              if (selectedPreview.length < 10) selectedPreview.push({ index: i + 1, label: item.label || `Item #${i+1}`, status: 'SELECTED' });
            } else {
              skippedLimitCount++;
            }
          } else {
            skippedFilterCount++;
            if (skippedFilterPreview.length < 10) skippedFilterPreview.push({ index: i + 1, label: item.label || `Item #${i+1}`, status: 'SKIPPED_FILTER', reason: evalRes.reason });
          }
        }
        preview = {
          totalCount: itemsWithFields.length,
          matchingCount,
          selectedCount,
          skippedFilterCount,
          skippedLimitCount,
          selectedPreview,
          skippedFilterPreview,
          errors
        };
      } else {
        preview = evaluateFilterPreview(effectiveFilter, itemsWithFields, {
          loopLimit: this.loopLimit,
          previewLimit: itemsWithFields.length
        });
      }

      if (preview.errors && preview.errors.length > 0) {
        const errMsg = `Filter configuration error: ${preview.errors.join('; ')}`;
        logger.error(`[Loop Runner] ${errMsg}`);
        throw new Error(errMsg);
      }

      if (itemsWithFields.length > 0 && preview.selectedCount === 0) {
        logger.info(`[Loop Runner] Filter criteria selected 0 of ${discovery.itemCount} item(s). No items to execute.`);
        manifest.itemsTotal = discovery.itemCount;
        manifest.matchingCount = preview.matchingCount;
        manifest.matching = preview.matchingCount;
        manifest.selectedCount = 0;
        manifest.selected = 0;
        manifest.skippedFilterCount = preview.skippedFilterCount;
        manifest.skippedFilter = preview.skippedFilterCount;
        manifest.skippedLimitCount = preview.skippedLimitCount;
        manifest.skippedLimit = preview.skippedLimitCount;
        manifest.skippedDuplicateCount = 0;
        manifest.skippedDuplicate = 0;
        manifest.itemsSkipped = preview.skippedFilterCount + preview.skippedLimitCount;

        for (let i = 0; i < discovery.itemCount; i++) {
          const itemIdentifier = await this.extractItemIdentifier(page, discovery, i, isDropdown);
          const itemFields = itemsWithFields[i]?.fields || {};
          const filterCheck = isRelationalOrExtended
            ? ConditionEvaluator.evaluate(itemFields, effectiveFilter)
            : sharedEvaluateItemFilter(effectiveFilter, itemFields);
          const skippedResult = {
            index: i + 1,
            itemIndex: i,
            page: currentPage,
            label: itemIdentifier.itemLabel,
            itemKey: itemIdentifier.itemKey,
            status: 'SKIPPED_FILTER',
            skippedReason: filterCheck.reason,
            timestamp: new Date().toISOString()
          };
          manifest.results.push(skippedResult);
          onProgress({ status: 'ITEM_SKIPPED', itemResult: skippedResult, manifest });
        }

        manifest.status = 'COMPLETED';
        manifest.endTime = new Date().toISOString();
        this.writeLoopCheckpoint(manifest, null, null, currentPage, null, null);
        try {
          fs.writeFileSync(path.join(this.runsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
        } catch {}
        onProgress({ status: manifest.status, manifest });
        return manifest;
      }

      // Convert recorded actions: items inside collection become item-relative,
      // subsequent page actions (e.g. backdrop, Run Report, Export to Excel) are page-scoped.
      const generalizedActions = ActionGeneralizer.generalizeActions(partition.loopSteps, discovery.collection);

      logger.info(`[Loop Runner] Discovered ${discovery.itemCount} repeated item(s) with confidence ${Math.round(discovery.confidence * 100)}% (Dropdown Mode: ${isDropdown})`);
      logger.info(`[Loop Runner] Generalized ${generalizedActions.length} loop action(s) (${generalizedActions.filter(a => a.scope === 'item').length} item-scoped, ${generalizedActions.filter(a => a.scope === 'page').length} page-scoped).`);
      onProgress({ status: 'PROCESSING_ITEMS', manifest, discovery, generalizedActions });

      // 4. Process the current page, then optionally advance through pagination.
      // Pagination is opt-in through workflow.pagination.enabled to avoid clicking
      // unrelated "Next" controls on portals that do not use paging.
      const paginationEnabled = workflow.pagination?.enabled === true;
      const maxPages = Number.isInteger(workflow.pagination?.maxPages)
        ? Math.max(1, workflow.pagination.maxPages)
        : 100;
      currentPage = 1;
      const resumePage = checkpoint && Number.isInteger(checkpoint.currentPage)
        ? checkpoint.currentPage
        : 1;
      const resumePageItemIndex = checkpoint && Number.isInteger(checkpoint.currentPageItemIndex)
        ? checkpoint.currentPageItemIndex
        : 0;
      const resumeActionOffset = checkpoint && Number.isInteger(checkpoint.currentActionOffset)
        ? checkpoint.currentActionOffset
        : 0;
      const resumeItemIndex = checkpoint && Number.isInteger(checkpoint.currentItemIndex)
        ? checkpoint.currentItemIndex
        : null;

      while (true) {
        currentPageUrl = page.url();

        if (currentPage < resumePage) {
          const beforeResumeFingerprint = await this.getCollectionFingerprint(page, discovery.collection);
          const advancedToResumePage = await this.advanceToNextPage(page, workflow);
          if (!advancedToResumePage) {
            throw new Error(`Could not reach checkpoint page #${resumePage}`);
          }

          const nextDiscovery = await ItemDiscovery.discover(
            page,
            targetStep.target || targetStep.fingerprint,
            { minItems: 1, minScore: 0.55 }
          );
          if (!nextDiscovery.success || nextDiscovery.itemCount < 1) {
            throw new Error(`Could not rediscover item collection while resuming page #${currentPage + 1}`);
          }

          const afterResumeFingerprint = await this.getCollectionFingerprint(page, nextDiscovery.collection);
          if (
            beforeResumeFingerprint &&
            afterResumeFingerprint &&
            beforeResumeFingerprint === afterResumeFingerprint
          ) {
            throw new Error(`Pagination did not advance while resuming page #${currentPage + 1}`);
          }

          discovery = nextDiscovery;
          itemsWithFields = Array.isArray(discovery.items) ? discovery.items : [];
          currentPage++;
          manifest.pagesProcessed = currentPage;
          manifest.itemsTotal += discovery.itemCount;
          currentPageUrl = page.url();
          continue;
        }

        // 1. Efficiently identify and filter available items on current page
        const evaluatedItems = await this.detectAndFilterItems(page, discovery, isDropdown, this.itemFilter || this.rowFilter);

        const matchingItems = evaluatedItems.filter(it => it.matches);
        const skippedItems = evaluatedItems.filter(it => !it.matches);

        manifest.matchingCount = (manifest.matchingCount || 0) + matchingItems.length;
        manifest.matching = manifest.matchingCount;

        // Record all filtered-out items in manifest and progress immediately
        for (const skipped of skippedItems) {
          const skippedIndex = resumeItemIndex != null && currentPage === resumePage && skipped.index === resumePageItemIndex
            ? resumeItemIndex
            : manifest.results.reduce((max, result) => Math.max(max, Number(result.index) || 0), 0) + 1;
          const skippedResult = {
            index: skippedIndex,
            itemIndex: skipped.index,
            page: currentPage,
            label: skipped.itemIdentifier.itemLabel,
            itemKey: skipped.itemIdentifier.itemKey,
            status: 'SKIPPED_FILTER',
            skippedReason: skipped.reason,
            timestamp: new Date().toISOString()
          };
          manifest.results.push(skippedResult);
          manifest.skippedFilterCount = (manifest.skippedFilterCount || 0) + 1;
          manifest.skippedFilter = manifest.skippedFilterCount;
          manifest.itemsSkipped = (manifest.itemsSkipped || 0) + 1;
        }

        if (this.rowFilter || isDropdown) {
          logger.info(`[Loop Runner] Filter evaluation: ${matchingItems.length}/${evaluatedItems.length} matching item(s) (${skippedItems.length} filtered out). Iterating properly through matching items.`);
        }

        // 2. Iterate properly through ONLY matching items
        for (let m = 0; m < matchingItems.length; m++) {
          const targetItem = matchingItems[m];
          const i = targetItem.index;
          const itemIdentifier = targetItem.itemIdentifier;

          if (this.isAborted) {
            logger.warn(`[Loop Runner] Abort signal active before item #${i + 1}. Stopping loop.`);
            manifest.status = 'STOPPED';
            this.writeLoopCheckpoint(manifest, null, 0, currentPage, i, null);
            break;
          }

          if (checkpoint && currentPage === resumePage && i < resumePageItemIndex) {
            continue;
          }

          logger.info(`\n[Loop Runner] --- Processing item [${m + 1}/${matchingItems.length}] (DOM index ${i + 1}: "${itemIdentifier.itemLabel}") ---`);

          // 1b. Stop when the requested loop limit / maxItems is reached
          const effectiveLimit = this.loopLimit || this.maxItems;
          if (effectiveLimit) {
            const doneCount = (manifest.selectedCount || 0);
            if (doneCount >= effectiveLimit) {
              const limitReason = `Beyond loop limit (${effectiveLimit})`;
              logger.info(`[Loop Runner] 🛑 Skipping item #${i + 1} ("${itemIdentifier.itemLabel}") - ${limitReason}`);
              this._limitReached = true;
              const skippedIndex = resumeItemIndex != null && currentPage === resumePage && i === resumePageItemIndex
                ? resumeItemIndex
                : manifest.results.reduce((max, result) => Math.max(max, Number(result.index) || 0), 0) + 1;

              const skippedResult = {
                index: skippedIndex,
                itemIndex: i,
                page: currentPage,
                label: itemIdentifier.itemLabel,
                itemKey: itemIdentifier.itemKey,
                status: 'SKIPPED_LIMIT',
                skippedReason: limitReason,
                timestamp: new Date().toISOString()
              };

              manifest.results.push(skippedResult);
              manifest.skippedLimitCount = (manifest.skippedLimitCount || 0) + 1;
              manifest.skippedLimit = manifest.skippedLimitCount;
              manifest.itemsSkipped = (manifest.itemsSkipped || 0) + 1;
              this.manifest = manifest;
              this.writeLoopCheckpoint(manifest, null, 0, currentPage, i + 1, null);
              onProgress({ status: 'ITEM_SKIPPED', itemResult: skippedResult, manifest });
              continue;
            }
          }

          // Item matched filter and is selected for execution!
          manifest.selectedCount = (manifest.selectedCount || 0) + 1;
          manifest.selected = manifest.selectedCount;

          // 2. Hybrid Deduplication Check: UI Identifier + DB Metadata + Physical Disk File
          const dedupe = this.checkIfAlreadyDownloaded(itemIdentifier.itemKey, itemIdentifier.invoiceNumber, targetItem.fields || {});

          // "old only" mode: skip items that were never downloaded before and not past due
          if (this.itemMode === 'old' && !dedupe.isDuplicate && !dedupe.isOldData) {
            const skippedIndex = manifest.results.reduce((max, result) => Math.max(max, Number(result.index) || 0), 0) + 1;
            const skippedResult = {
              index: skippedIndex,
              itemIndex: i,
              page: currentPage,
              label: itemIdentifier.itemLabel,
              itemKey: itemIdentifier.itemKey,
              status: 'SKIPPED_FILTER',
              skippedReason: 'New item (run mode is "old only")',
              timestamp: new Date().toISOString()
            };
            manifest.results.push(skippedResult);
            manifest.itemsSkipped = (manifest.itemsSkipped || 0) + 1;
            this.manifest = manifest;
            this.writeLoopCheckpoint(manifest, null, 0, currentPage, i + 1, null);
            onProgress({ status: 'ITEM_SKIPPED', itemResult: skippedResult, manifest });
            continue;
          }

          // "new only" mode (default): skip items already downloaded
          if (dedupe.isDuplicate && this.itemMode === 'new' && !this.forceRedownload) {
            logger.info(`[Loop Runner] Skipping item #${i + 1} ("${itemIdentifier.itemLabel}") - already downloaded: "${dedupe.record?.filename || 'existing'}" (${dedupe.record?.filePath || 'folder'})`);
            const skippedIndex = resumeItemIndex != null && currentPage === resumePage && i === resumePageItemIndex
              ? resumeItemIndex
              : manifest.results.reduce((max, result) => Math.max(max, Number(result.index) || 0), 0) + 1;

            const skippedResult = {
              index: skippedIndex,
              itemIndex: i,
              page: currentPage,
              label: itemIdentifier.itemLabel,
              itemKey: itemIdentifier.itemKey,
              status: 'SKIPPED_DUPLICATE',
              skippedReason: dedupe.inFolder ? `Already in download folder: ${dedupe.record?.filename || 'file'}` : `Already downloaded: ${dedupe.record?.filename || 'file'}`,
              existingFile: dedupe.record?.filePath || null,
              downloadedFiles: dedupe.record?.filePath ? [{
                filename: dedupe.record.filename,
                path: path.resolve(process.cwd(), dedupe.record.filePath),
                relativePath: dedupe.record.filePath,
                sizeBytes: dedupe.record.fileSizeBytes || 0,
                skipped: true
              }] : [],
              timestamp: new Date().toISOString()
            };

            manifest.results.push(skippedResult);
            manifest.skippedDuplicateCount = (manifest.skippedDuplicateCount || 0) + 1;
            manifest.skippedDuplicate = manifest.skippedDuplicateCount;
            manifest.itemsSkipped = (manifest.itemsSkipped || 0) + 1;
            this.manifest = manifest;
            this.writeLoopCheckpoint(manifest, null, 0, currentPage, i + 1, null);
            try {
              fs.writeFileSync(path.join(this.runsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
            } catch { }
            onProgress({ status: 'ITEM_SKIPPED', itemResult: skippedResult, manifest });
            continue;
          }

          this._syncSubManagers();
          const attemptOutcome = await this.itemExecutionHandler.executeItemAttempt({
            page,
            discovery,
            i,
            targetItem,
            itemIdentifier,
            generalizedActions,
            effectiveLoopStepIndex,
            isDropdown,
            triggerStep,
            partition,
            currentPageUrl,
            initialPageUrls,
            currentPage,
            manifest,
            checkpoint,
            resumePage,
            resumePageItemIndex,
            resumeActionOffset,
            resumeItemIndex,
            onProgress,
            runner: this
          });
          if (attemptOutcome && attemptOutcome.stopped) {
            break;
          }
        }

        if (!paginationEnabled || currentPage >= maxPages || this._limitReached) {
          break;
        }
        const beforePageFingerprint = await this.getCollectionFingerprint(page, discovery.collection);
        const advanced = await this.advanceToNextPage(page, workflow);
        if (!advanced) {
          logger.info('[Loop Runner] No next page control found. Pagination complete.');
          break;
        }

        const previousItemCount = discovery.itemCount;
        const nextDiscovery = await ItemDiscovery.discover(
          page,
          targetStep.target || targetStep.fingerprint,
          { minItems: 1, minScore: 0.55 }
        );

        if (!nextDiscovery.success || nextDiscovery.itemCount < 1) {
          logger.info('[Loop Runner] Next page did not expose a discoverable item collection. Pagination complete.');
          break;
        }

        const afterPageFingerprint = await this.getCollectionFingerprint(page, nextDiscovery.collection);
        if (beforePageFingerprint && afterPageFingerprint && beforePageFingerprint === afterPageFingerprint) {
          logger.info('[Loop Runner] Next control did not change the discovered collection. Pagination complete.');
          break;
        }

        discovery = nextDiscovery;
        itemsWithFields = Array.isArray(discovery.items) ? discovery.items : [];
        manifest.itemsTotal += discovery.itemCount;
        manifest.pagesProcessed = currentPage + 1;
        currentPage++;
        currentPageUrl = page.url();
        this.writeLoopCheckpoint(manifest, null, null, currentPage, null, null);
        logger.info('[Loop Runner] Advanced to page #' + currentPage + ' with ' + discovery.itemCount + ' item(s).');
        onProgress({ status: 'PAGE_COMPLETE', page: currentPage, manifest, discovery });

        if (discovery.itemCount === previousItemCount && currentPage >= maxPages) {
          break;
        }
      }

      // 5. Gather and organize all downloaded files into structured folder
      if (fs.existsSync(this.downloadsDir)) {
        const files = fs.readdirSync(this.downloadsDir)
          .filter(file => !file.endsWith('.crdownload') && !file.endsWith('.tmp'));
        manifest.downloadedFiles = files.map(file => {
          const rawPath = path.join(this.downloadsDir, file);
          const fallbackContext = this._activeItemContext || null;
          const stored = this.processAndStoreDownload(
            rawPath,
            fallbackContext?.itemKey || null,
            fallbackContext?.itemLabel || null,
            fallbackContext?.fields || {}
          );
          try { fs.unlinkSync(rawPath); } catch {}
          return stored || {
            filename: file,
            path: rawPath,
            sizeBytes: fs.existsSync(rawPath) ? fs.statSync(rawPath).size : 0
          };
        });
      }

      manifest.status = this.isAborted ? 'STOPPED' : (manifest.itemsFailed > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED');
      manifest.endTime = new Date().toISOString();
      if (!this.isAborted) {
        this.writeLoopCheckpoint(manifest, null, null, currentPage, null, null);
      }
      logger.success(`\n[Loop Runner] Run ${this.runId} ${manifest.status}! Succeeded: ${manifest.itemsSucceeded}, Failed: ${manifest.itemsFailed}`);

    } catch (err) {
      manifest.status = this.isAborted ? 'STOPPED' : 'FAILED';
      manifest.error = err.message;
      manifest.endTime = new Date().toISOString();
      if (this.isAborted) {
        logger.warn(`[Loop Runner] Loop run ${this.runId} stopped by user.`);
      } else {
        logger.error(`[Loop Runner] Fatal run failure: ${err.message}`);
      }
    } finally {
      manifest.endTime = manifest.endTime || new Date().toISOString();
      if (this.isAborted) {
        manifest.status = 'STOPPED';
      }

      try {
        if (this.isAborted && this._lastCursor) {
          this.writeLoopCheckpoint(
            manifest,
            this._lastCursor.currentItemIndex,
            this._lastCursor.currentActionOffset,
            this._lastCursor.currentPage || currentPage,
            this._lastCursor.currentPageItemIndex,
            this._lastCursor.activeItem
          );
        } else if (manifest.status === 'COMPLETED' || manifest.status === 'COMPLETED_WITH_ERRORS') {
          this.writeLoopCheckpoint(manifest, null, null, currentPage, null, null);
        }
      } catch (cpErr) {
        logger.warn(`[Loop Runner] Warning writing final checkpoint: ${cpErr.message}`);
      }

      try {
        fs.writeFileSync(path.join(this.runsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      } catch (mfErr) {
        logger.warn(`[Loop Runner] Warning writing final manifest: ${mfErr.message}`);
      }

      if (this._replayTargetCreatedListener && this.replayEngine?.browser) {
        try {
          this.replayEngine.browser.off('targetcreated', this._replayTargetCreatedListener);
        } catch { }
        this._replayTargetCreatedListener = null;
      }

      if (this.replayEngine) {
        await this.replayEngine.disconnect().catch(() => { });
      }

      onProgress({ status: manifest.status, manifest });
    }

    return manifest;
  }
}

module.exports = LoopReplayRunner;
