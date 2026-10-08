document.addEventListener('DOMContentLoaded', async () => {
  // Navigation Tabs & Views
  const tabBtnDashboard = document.getElementById('tabBtnDashboard');
  const tabBtnPreferences = document.getElementById('tabBtnPreferences');
  const btnBackToDashboard = document.getElementById('btnBackToDashboard');
  const viewDashboard = document.getElementById('viewDashboard');
  const viewPreferences = document.getElementById('viewPreferences');

  // Window Controls
  const btnMinimize = document.getElementById('btnMinimize');
  const btnClose = document.getElementById('btnClose');

  // Dashboard Controls
  const btnToggleRunner = document.getElementById('btnToggleRunner');
  const toggleBtnText = document.getElementById('toggleBtnText');
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');
  const liveRunBadge = document.getElementById('liveRunBadge');
  const btnModeVisible = document.getElementById('btnModeVisible');
  const btnModeHeadless = document.getElementById('btnModeHeadless');
  const btnSaveModePref = document.getElementById('btnSaveModePref');
  const saveModeBtnText = document.getElementById('saveModeBtnText');
  const modeSavedFeedback = document.getElementById('modeSavedFeedback');
  const modeSavedFeedbackText = document.getElementById('modeSavedFeedbackText');

  // Recorder Elements
  const btnRecordWorkflow = document.getElementById('btnRecordWorkflow');
  const recordWorkflowText = document.getElementById('recordWorkflowText');
  const recorderLiveBadge = document.getElementById('recorderLiveBadge');
  const recorderActionCount = document.getElementById('recorderActionCount');

  // Telemetry & Feed Elements
  const cdpStatus = document.getElementById('cdpStatus');
  const cloudStatus = document.getElementById('cloudStatus');
  const cloudUrlDisplay = document.getElementById('cloudUrlDisplay');
  const btnOpenFolder = document.getElementById('btnOpenFolder');
  const btnOpenWeb = document.getElementById('btnOpenWeb');
  const btnSettings = document.getElementById('btnSettings');
  const activeRunBanner = document.getElementById('activeRunBanner');
  const activeWorkflowName = document.getElementById('activeWorkflowName');
  const activeRunMetrics = document.getElementById('activeRunMetrics');
  const btnStopActiveRun = document.getElementById('btnStopActiveRun');
  const recentRunsList = document.getElementById('recentRunsList');

  // Preferences Page Elements
  const preferencesForm = document.getElementById('preferencesForm');
  const prefCardVisible = document.getElementById('prefCardVisible');
  const prefCardHeadless = document.getElementById('prefCardHeadless');
  const prefAutoStartRunner = document.getElementById('prefAutoStartRunner');
  const prefMinimizeToTray = document.getElementById('prefMinimizeToTray');
  const inputCloudUrl = document.getElementById('inputCloudUrl');
  const inputToken = document.getElementById('inputToken');
  const btnToggleTokenVisibility = document.getElementById('btnToggleTokenVisibility');
  const btnTestConnection = document.getElementById('btnTestConnection');
  const testConnectionResult = document.getElementById('testConnectionResult');
  const inputTargetFolder = document.getElementById('inputTargetFolder');
  const btnBrowseFolder = document.getElementById('btnBrowseFolder');
  const btnResetDefaults = document.getElementById('btnResetDefaults');
  const preferencesSaveResult = document.getElementById('preferencesSaveResult');

  // State
  let currentConfig = await window.portalsync.getConfig();
  let currentStatus = await window.portalsync.getStatus();
  let selectedMode = currentConfig.browserMode || 'visible';

  // Initialize UI
  updateConfigUI(currentConfig);
  updateStatusUI(currentStatus);
  checkEngineStatus();

  try {
    const initialRecStatus = await window.portalsync.getRecordingStatus();
    updateRecorderUI(initialRecStatus);
  } catch (e) {
    console.warn('Initial recording status probe notice:', e);
  }

  // -------------------------------------------------------------
  // TAB NAVIGATION
  // -------------------------------------------------------------
  function showTab(tabName) {
    if (tabName === 'dashboard') {
      tabBtnDashboard.classList.add('active');
      tabBtnPreferences.classList.remove('active');
      viewDashboard.classList.remove('hidden');
      viewDashboard.classList.add('active');
      viewPreferences.classList.add('hidden');
      viewPreferences.classList.remove('active');
    } else {
      tabBtnPreferences.classList.add('active');
      tabBtnDashboard.classList.remove('active');
      viewPreferences.classList.remove('hidden');
      viewPreferences.classList.add('active');
      viewDashboard.classList.add('hidden');
      viewDashboard.classList.remove('active');
      populatePreferencesForm();
    }
  }

  tabBtnDashboard.addEventListener('click', () => showTab('dashboard'));
  tabBtnPreferences.addEventListener('click', () => showTab('preferences'));
  btnBackToDashboard.addEventListener('click', () => showTab('dashboard'));
  btnSettings.addEventListener('click', () => showTab('preferences'));

  // Window Controls
  btnMinimize.addEventListener('click', () => window.portalsync.minimizeWindow());
  btnClose.addEventListener('click', () => window.portalsync.closeWindow());

  // -------------------------------------------------------------
  // BROWSER MODE SELECTION & SAVE PREFERENCE
  // -------------------------------------------------------------
  btnModeVisible.addEventListener('click', () => applyModeSelection('visible', true));
  btnModeHeadless.addEventListener('click', () => applyModeSelection('headless', true));

  if (btnSaveModePref) {
    btnSaveModePref.addEventListener('click', async () => {
      await saveBrowserModePreference(selectedMode);
    });
  }

  function applyModeSelection(mode, autoPersist = false) {
    selectedMode = mode;
    if (mode === 'headless') {
      btnModeHeadless.classList.add('active');
      btnModeVisible.classList.remove('active');
      if (prefCardHeadless && prefCardVisible) {
        prefCardHeadless.classList.add('selected');
        prefCardVisible.classList.remove('selected');
      }
    } else {
      btnModeVisible.classList.add('active');
      btnModeHeadless.classList.remove('active');
      if (prefCardVisible && prefCardHeadless) {
        prefCardVisible.classList.add('selected');
        prefCardHeadless.classList.remove('selected');
      }
    }

    if (autoPersist) {
      saveBrowserModePreference(mode);
    }
  }

  async function saveBrowserModePreference(mode) {
    try {
      currentConfig.browserMode = mode;
      currentConfig = await window.portalsync.saveConfig({ browserMode: mode });

      // Visual feedback on the button
      if (btnSaveModePref) {
        btnSaveModePref.classList.add('saved');
        saveModeBtnText.innerText = '✓ Saved!';
        setTimeout(() => {
          btnSaveModePref.classList.remove('saved');
          saveModeBtnText.innerText = 'Save Preference';
        }, 1800);
      }

      // Feedback toast
      if (modeSavedFeedback && modeSavedFeedbackText) {
        const readable = mode === 'headless' ? 'Headless (Background)' : 'Visible (2FA)';
        modeSavedFeedbackText.innerText = `Saved preference: ${readable}`;
        modeSavedFeedback.classList.remove('hidden');
        setTimeout(() => {
          modeSavedFeedback.classList.add('hidden');
        }, 3000);
      }
    } catch (err) {
      alert(`Could not save mode preference: ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // PREFERENCES FORM HANDLERS
  // -------------------------------------------------------------
  function populatePreferencesForm() {
    inputCloudUrl.value = currentConfig.cloudUrl || 'https://web-fawn-ten-55.vercel.app';
    inputToken.value = currentConfig.runnerToken || '';
    inputTargetFolder.value = currentConfig.targetFolder || '';
    prefAutoStartRunner.checked = currentConfig.autoStartRunner !== false;
    prefMinimizeToTray.checked = currentConfig.minimizeToTray !== false;

    applyModeSelection(currentConfig.browserMode || 'visible', false);

    if (testConnectionResult) testConnectionResult.classList.add('hidden');
    if (preferencesSaveResult) preferencesSaveResult.classList.add('hidden');
  }

  if (prefCardVisible && prefCardHeadless) {
    prefCardVisible.addEventListener('click', () => applyModeSelection('visible', false));
    prefCardHeadless.addEventListener('click', () => applyModeSelection('headless', false));
  }

  if (btnToggleTokenVisibility) {
    btnToggleTokenVisibility.addEventListener('click', () => {
      if (inputToken.type === 'password') {
        inputToken.type = 'text';
        btnToggleTokenVisibility.innerText = '🔒';
      } else {
        inputToken.type = 'password';
        btnToggleTokenVisibility.innerText = '👁️';
      }
    });
  }

  if (btnBrowseFolder) {
    btnBrowseFolder.addEventListener('click', async () => {
      try {
        const folder = await window.portalsync.selectFolder();
        if (folder) {
          inputTargetFolder.value = folder;
        }
      } catch (err) {
        console.warn('Folder selection notice:', err);
      }
    });
  }

  preferencesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updated = {
      browserMode: selectedMode,
      runnerToken: inputToken.value.trim(),
      cloudUrl: inputCloudUrl.value.trim() || 'https://web-fawn-ten-55.vercel.app',
      targetFolder: inputTargetFolder.value.trim(),
      autoStartRunner: prefAutoStartRunner.checked,
      minimizeToTray: prefMinimizeToTray.checked,
    };

    try {
      currentConfig = await window.portalsync.saveConfig(updated);
      updateConfigUI(currentConfig);

      if (preferencesSaveResult) {
        preferencesSaveResult.innerText = '✓ All preferences saved successfully!';
        preferencesSaveResult.classList.remove('hidden');
        setTimeout(() => {
          preferencesSaveResult.classList.add('hidden');
        }, 3000);
      }
    } catch (err) {
      alert(`Error saving preferences: ${err.message}`);
    }
  });

  if (btnResetDefaults) {
    btnResetDefaults.addEventListener('click', () => {
      if (confirm('Reset preferences to default settings?')) {
        inputCloudUrl.value = 'https://web-fawn-ten-55.vercel.app';
        inputTargetFolder.value = '';
        prefAutoStartRunner.checked = true;
        prefMinimizeToTray.checked = true;
        applyModeSelection('visible', false);
      }
    });
  }

  // Test Cloud Connection
  btnTestConnection.addEventListener('click', async () => {
    btnTestConnection.disabled = true;
    btnTestConnection.innerText = 'Testing...';
    testConnectionResult.classList.add('hidden');

    try {
      const token = inputToken.value.trim().replace(/[\.\s]+$/, '');
      const cloudUrl = inputCloudUrl.value.trim() || 'https://web-fawn-ten-55.vercel.app';

      // Persist prior to test
      await window.portalsync.saveConfig({
        runnerToken: token,
        cloudUrl: cloudUrl,
      });

      const res = await window.portalsync.testConnection({
        runnerToken: token,
        cloudUrl: cloudUrl,
      });

      if (res && res.connected) {
        showTestResult(`✓ Connected (${res.pendingRunsCount ?? 0} pending run(s))`, true);
      } else {
        showTestResult(`✕ Connection Failed: ${res?.error || 'Unreachable endpoint'}`, false);
      }
    } catch (err) {
      showTestResult(`✕ Error: ${err.message}`, false);
    } finally {
      btnTestConnection.disabled = false;
      btnTestConnection.innerText = 'Test Connection';
    }
  });

  function showTestResult(msg, isSuccess) {
    testConnectionResult.innerText = msg;
    testConnectionResult.className = `test-result ${isSuccess ? 'test-success' : 'test-fail'}`;
    testConnectionResult.classList.remove('hidden');
  }

  // -------------------------------------------------------------
  // RUNNER ACTIONS & FEEDBACK
  // -------------------------------------------------------------
  btnToggleRunner.addEventListener('click', async () => {
    btnToggleRunner.disabled = true;
    try {
      if (currentStatus.status === 'active') {
        const next = await window.portalsync.stopRunner();
        updateStatusUI(next);
      } else {
        if (!currentConfig.runnerToken) {
          showTab('preferences');
          showTestResult('Please enter and save your Runner Token first.', false);
          btnToggleRunner.disabled = false;
          return;
        }
        const next = await window.portalsync.startRunner();
        updateStatusUI(next);
      }
    } catch (err) {
      alert(`Error toggling runner: ${err.message}`);
    } finally {
      btnToggleRunner.disabled = false;
    }
  });

  if (btnStopActiveRun) {
    btnStopActiveRun.addEventListener('click', async () => {
      btnStopActiveRun.disabled = true;
      btnStopActiveRun.innerText = 'Stopping...';
      try {
        await window.portalsync.stopActiveRun();
      } catch (err) {
        alert(`Error stopping run: ${err.message}`);
      } finally {
        btnStopActiveRun.disabled = false;
        btnStopActiveRun.innerText = '■ Stop';
      }
    });
  }

  // Workflow Recorder Toggle
  if (btnRecordWorkflow) {
    btnRecordWorkflow.addEventListener('click', async () => {
      btnRecordWorkflow.disabled = true;
      try {
        const status = await window.portalsync.getRecordingStatus();
        if (status.isRecording) {
          const res = await window.portalsync.stopRecording();
          updateRecorderUI(res);
        } else {
          const defaultUrl = 'https://google.com';
          const inputUrl = prompt('Enter starting URL for workflow capture:', defaultUrl);
          if (inputUrl === null) {
            btnRecordWorkflow.disabled = false;
            return;
          }
          const targetUrl = inputUrl.trim() || defaultUrl;
          const res = await window.portalsync.startRecording({
            url: targetUrl,
            name: `portal-workflow-${Date.now()}`
          });
          updateRecorderUI(res);
        }
      } catch (err) {
        alert(`Recording error: ${err.message}`);
      } finally {
        btnRecordWorkflow.disabled = false;
      }
    });
  }

  // Quick Action Buttons
  btnOpenFolder.addEventListener('click', () => {
    window.portalsync.openFolder(currentConfig.targetFolder);
  });

  btnOpenWeb.addEventListener('click', () => {
    window.portalsync.openExternal(`${currentConfig.cloudUrl || 'https://web-fawn-ten-55.vercel.app'}/dashboard`);
  });

  // -------------------------------------------------------------
  // REAL-TIME EVENT LISTENERS
  // -------------------------------------------------------------
  window.portalsync.onStatusUpdate((state) => {
    currentStatus = state;
    updateStatusUI(state);
    checkEngineStatus();
  });

  if (typeof window.portalsync.onRecordingUpdate === 'function') {
    window.portalsync.onRecordingUpdate((recState) => {
      updateRecorderUI(recState);
    });
  }

  // Periodic engine CDP status probe
  async function checkEngineStatus() {
    try {
      if (typeof window.portalsync.checkCdpStatus === 'function') {
        const cdp = await window.portalsync.checkCdpStatus();
        if (cdp && cdp.open) {
          cdpStatus.innerText = 'Active (Port 9222)';
          cdpStatus.className = 'status-pill status-ready';
        } else {
          cdpStatus.innerText = 'Standby (On Demand)';
          cdpStatus.className = 'status-pill status-ready';
        }
      }
    } catch {}
  }

  function updateRecorderUI(recState) {
    if (!btnRecordWorkflow || !recState) return;
    const count = typeof recState.actionCount === 'number'
      ? recState.actionCount
      : (Array.isArray(recState.actions) ? recState.actions.length : 0);
    if (recState.isRecording) {
      btnRecordWorkflow.className = 'record-workflow-btn recording';
      recordWorkflowText.innerText = `Stop Recording (${count} steps)`;
      recorderLiveBadge.classList.remove('hidden');
      recorderActionCount.innerText = `${count} steps`;
    } else {
      btnRecordWorkflow.className = 'record-workflow-btn';
      recordWorkflowText.innerText = 'Record Workflow';
      recorderLiveBadge.classList.add('hidden');
    }
  }

  // UI Updaters
  function updateConfigUI(cfg) {
    cloudUrlDisplay.innerText = cfg.cloudUrl || 'https://web-fawn-ten-55.vercel.app';
    applyModeSelection(cfg.browserMode || 'visible', false);
  }

  function updateStatusUI(state) {
    statusDot.className = `dot dot-${state.status}`;
    switch (state.status) {
      case 'active':
        statusLabel.innerText = 'Runner Active (Listening)';
        btnToggleRunner.className = 'big-toggle-btn btn-stop';
        toggleBtnText.innerText = 'Stop Runner';
        liveRunBadge.classList.toggle('hidden', !state.activeRun);
        break;
      case 'starting':
        statusLabel.innerText = 'Starting Engine...';
        btnToggleRunner.className = 'big-toggle-btn btn-start';
        toggleBtnText.innerText = 'Starting...';
        liveRunBadge.classList.add('hidden');
        break;
      case 'stopping':
        statusLabel.innerText = 'Stopping Runner...';
        toggleBtnText.innerText = 'Stopping...';
        liveRunBadge.classList.add('hidden');
        break;
      case 'error':
        statusLabel.innerText = state.lastError ? `Error: ${state.lastError.slice(0, 30)}...` : 'Runner Error';
        btnToggleRunner.className = 'big-toggle-btn btn-start';
        toggleBtnText.innerText = 'Start Runner';
        liveRunBadge.classList.add('hidden');
        break;
      default:
        statusLabel.innerText = 'Runner Paused';
        btnToggleRunner.className = 'big-toggle-btn btn-start';
        toggleBtnText.innerText = 'Start Runner';
        liveRunBadge.classList.add('hidden');
        break;
    }

    // Active Run Banner
    if (state.activeRun) {
      activeRunBanner.classList.remove('hidden');
      activeWorkflowName.innerText = state.activeRun.workflowId || 'Portal Automation';
      activeRunMetrics.innerText = `Downloaded: ${state.activeRun.itemsDownloaded || 0} PDFs`;
    } else {
      activeRunBanner.classList.add('hidden');
    }

    // Recent Runs List
    renderRunsList(state.recentRuns || []);
  }

  function renderRunsList(runs) {
    if (!runs || runs.length === 0) {
      recentRunsList.innerHTML = '<div class="empty-feed">No runs executed yet. Start runner to listen for portal downloads.</div>';
      return;
    }

    recentRunsList.innerHTML = runs
      .map((r) => {
        const isSuccess = r.status === 'completed';
        const color = isSuccess ? 'var(--accent-green)' : 'var(--accent-rose)';
        const icon = isSuccess ? '✓' : '✕';
        return `
          <div class="run-row">
            <div>
              <div class="run-wf-name">${r.workflowName || 'Portal Automation'}</div>
              <div class="run-time">${r.completedAt ? new Date(r.completedAt).toLocaleTimeString() : 'Just now'}</div>
            </div>
            <div style="color: ${color}; font-size: 11px; font-weight: 600;">
              ${icon} ${isSuccess ? `${r.itemsDownloaded} PDFs` : 'Failed'}
            </div>
          </div>
        `;
      })
      .join('');
  }
});
