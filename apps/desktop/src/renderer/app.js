document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const btnMinimize = document.getElementById('btnMinimize');
  const btnClose = document.getElementById('btnClose');
  const btnToggleRunner = document.getElementById('btnToggleRunner');
  const toggleBtnText = document.getElementById('toggleBtnText');
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');
  const liveRunBadge = document.getElementById('liveRunBadge');
  const btnModeVisible = document.getElementById('btnModeVisible');
  const btnModeHeadless = document.getElementById('btnModeHeadless');
  const cdpStatus = document.getElementById('cdpStatus');
  const cloudStatus = document.getElementById('cloudStatus');
  const cloudUrlDisplay = document.getElementById('cloudUrlDisplay');
  const btnOpenFolder = document.getElementById('btnOpenFolder');
  const btnOpenWeb = document.getElementById('btnOpenWeb');
  const btnSettings = document.getElementById('btnSettings');
  const activeRunBanner = document.getElementById('activeRunBanner');
  const activeWorkflowName = document.getElementById('activeWorkflowName');
  const activeRunMetrics = document.getElementById('activeRunMetrics');
  const recentRunsList = document.getElementById('recentRunsList');

  // Recorder elements
  const btnRecordWorkflow = document.getElementById('btnRecordWorkflow');
  const recordWorkflowText = document.getElementById('recordWorkflowText');
  const recorderLiveBadge = document.getElementById('recorderLiveBadge');
  const recorderActionCount = document.getElementById('recorderActionCount');

  // Modal elements
  const settingsModal = document.getElementById('settingsModal');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const settingsForm = document.getElementById('settingsForm');
  const inputToken = document.getElementById('inputToken');
  const inputCloudUrl = document.getElementById('inputCloudUrl');
  const inputTargetFolder = document.getElementById('inputTargetFolder');
  const btnTestConnection = document.getElementById('btnTestConnection');
  const testConnectionResult = document.getElementById('testConnectionResult');

  // State
  let currentConfig = await window.portalsync.getConfig();
  let currentStatus = await window.portalsync.getStatus();

  // Initialize UI with config
  updateConfigUI(currentConfig);
  updateStatusUI(currentStatus);

  try {
    const initialRecStatus = await window.portalsync.getRecordingStatus();
    updateRecorderUI(initialRecStatus);
  } catch (e) {
    console.warn('Initial recording status probe notice:', e);
  }

  // Window Controls
  btnMinimize.addEventListener('click', () => window.portalsync.minimizeWindow());
  btnClose.addEventListener('click', () => window.portalsync.closeWindow());

  // Runner Toggle
  btnToggleRunner.addEventListener('click', async () => {
    btnToggleRunner.disabled = true;
    try {
      if (currentStatus.status === 'active') {
        const next = await window.portalsync.stopRunner();
        updateStatusUI(next);
      } else {
        if (!currentConfig.runnerToken) {
          openSettings();
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

  // Browser Mode Selector
  btnModeVisible.addEventListener('click', () => setBrowserMode('visible'));
  btnModeHeadless.addEventListener('click', () => setBrowserMode('headless'));

  async function setBrowserMode(mode) {
    currentConfig.browserMode = mode;
    await window.portalsync.saveConfig({ browserMode: mode });
    updateConfigUI(currentConfig);
  }

  // Quick Action Buttons
  btnOpenFolder.addEventListener('click', () => {
    window.portalsync.openFolder(currentConfig.targetFolder);
  });

  btnOpenWeb.addEventListener('click', () => {
    window.portalsync.openExternal(`${currentConfig.cloudUrl || 'http://localhost:3000'}/dashboard`);
  });

  // Settings Modal Handlers
  btnSettings.addEventListener('click', openSettings);
  btnCloseSettings.addEventListener('click', closeSettings);

  function openSettings() {
    inputToken.value = currentConfig.runnerToken || '';
    inputCloudUrl.value = currentConfig.cloudUrl || 'http://localhost:3000';
    inputTargetFolder.value = currentConfig.targetFolder || '';
    testConnectionResult.classList.add('hidden');
    settingsModal.classList.remove('hidden');
  }

  function closeSettings() {
    settingsModal.classList.add('hidden');
  }

  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updated = {
      runnerToken: inputToken.value.trim(),
      cloudUrl: inputCloudUrl.value.trim() || 'http://localhost:3000',
      targetFolder: inputTargetFolder.value.trim(),
    };

    currentConfig = await window.portalsync.saveConfig(updated);
    updateConfigUI(currentConfig);
    closeSettings();
  });

  btnTestConnection.addEventListener('click', async () => {
    btnTestConnection.disabled = true;
    btnTestConnection.innerText = 'Testing...';
    testConnectionResult.classList.add('hidden');

    try {
      const token = inputToken.value.trim().replace(/[\.\s]+$/, '');
      const cloudUrl = inputCloudUrl.value.trim() || 'https://web-fawn-ten-55.vercel.app';

      // Save before test
      await window.portalsync.saveConfig({
        runnerToken: token,
        cloudUrl: cloudUrl,
      });

      const res = await window.portalsync.testConnection({
        runnerToken: token,
        cloudUrl: cloudUrl,
      });
      if (res && res.connected) {
        showTestResult(`✓ Connected to ${res.url} (${res.pendingRunsCount ?? 0} pending runs)`, true);
      } else {
        showTestResult(`✕ Connection Failed: ${res?.error || 'Unknown error'}`, false);
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

  // Real-time Status listener from Main Process
  window.portalsync.onStatusUpdate((state) => {
    currentStatus = state;
    updateStatusUI(state);
  });

  // Real-time Recorder listener from Main Process
  if (typeof window.portalsync.onRecordingUpdate === 'function') {
    window.portalsync.onRecordingUpdate((recState) => {
      updateRecorderUI(recState);
    });
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
    cloudUrlDisplay.innerText = cfg.cloudUrl || 'http://localhost:3000';
    if (cfg.browserMode === 'headless') {
      btnModeHeadless.classList.add('active');
      btnModeVisible.classList.remove('active');
    } else {
      btnModeVisible.classList.add('active');
      btnModeHeadless.classList.remove('active');
    }
  }

  function updateStatusUI(state) {
    // Dot & Label
    statusDot.className = `dot dot-${state.status}`;
    switch (state.status) {
      case 'active':
        statusLabel.innerText = 'Runner Active (Listening)';
        btnToggleRunner.className = 'big-toggle-btn btn-stop';
        toggleBtnText.innerText = 'Stop Runner';
        liveRunBadge.classList.toggle('hidden', !state.activeRun);
        break;
      case 'starting':
        statusLabel.innerText = 'Starting Chrome & Engine...';
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
