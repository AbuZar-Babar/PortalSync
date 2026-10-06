const { app, BrowserWindow, Tray, Menu, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');
const configManager = require('./config-manager');
const runnerController = require('./runner-controller');
const chromeSpawner = require('./chrome-spawner');
const notifier = require('./notifier');
const httpBridge = require('./http-bridge');

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 660,
    resizable: false,
    maximizable: false,
    frame: false,
    backgroundColor: '#020617', // slate-950
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('close', (event) => {
    const config = configManager.get();
    if (!isQuitting && config.minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  runnerController.onStatusChange((state) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('status-update', state);
    }
    updateTrayMenu();
  });

  notifier.setFocusCallback((type) => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createTray() {
  // Create simple 16x16 tray icon image or canvas
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2Nk+M/wnwEHQEr8j4+Pj4E4FWM0DBgGwwDk4X98GBsbm8gQx2GIBhhwYgIA4/cL6tFw7uAAAAAElFTkSuQmCC',
      'base64'
    )
  );

  tray = new Tray(icon);
  tray.setToolTip('PortalSync Desktop Runner');
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;

  const state = runnerController.getState();
  const isRunning = state.status === 'active';

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'PortalSync Runner',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: isRunning ? 'Stop Runner' : 'Start Runner',
      click: async () => {
        try {
          if (isRunning) {
            await runnerController.stop();
          } else {
            await runnerController.start();
          }
        } catch (err) {
          console.error('Tray toggle error:', err);
        }
      },
    },
    {
      label: 'Open Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Open Cloud Console (Web)',
      click: () => {
        const config = configManager.get();
        shell.openExternal(`${config.cloudUrl || 'http://localhost:3000'}/dashboard`);
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// App lifecycle
app.whenReady().then(async () => {
  createWindow();
  createTray();

  try {
    await httpBridge.start();
  } catch (err) {
    console.error('[Main] Failed to start HTTP bridge on port 49152:', err.message);
  }

  httpBridge.onStatusChange((state) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('recorder-update', state);
    }
  });

  // Auto-start runner if token is configured
  const initialConfig = configManager.get();
  if (initialConfig.runnerToken && initialConfig.autoStartRunner !== false) {
    runnerController.start().catch((err) => {
      console.warn('[Main] Auto-start runner notice:', err.message);
    });
  }

  // Handle IPC calls
  ipcMain.handle('get-config', () => configManager.get());
  ipcMain.handle('save-config', async (event, config) => {
    const updated = configManager.save(config);
    if (updated.runnerToken && updated.autoStartRunner !== false && runnerController.getState().status === 'idle') {
      runnerController.start().catch((err) => {
        console.warn('[Main] Runner auto-start on save error:', err.message);
      });
    }
    return updated;
  });
  ipcMain.handle('get-status', () => runnerController.getState());
  ipcMain.handle('start-runner', () => runnerController.start());
  ipcMain.handle('stop-runner', () => runnerController.stop());
  ipcMain.handle('stop-active-run', () => runnerController.stopActiveRun());

  // Workflow Recording IPC handlers
  ipcMain.handle('start-recording', (event, options) => httpBridge.startRecording(options));
  ipcMain.handle('stop-recording', () => httpBridge.stopRecording());
  ipcMain.handle('get-recording-status', () => httpBridge.getStatus());

  ipcMain.handle('test-connection', async (event, customConfig) => {
    const current = configManager.get();
    const config = { ...current, ...(customConfig || {}) };
    const { CloudClient } = require(path.resolve(__dirname, '../../../../packages/engine/src/runner/cloud-client'));
    const client = new CloudClient({
      baseUrl: config.cloudUrl || 'https://web-fawn-ten-55.vercel.app',
      token: config.runnerToken,
    });
    return await client.testConnection();
  });

  ipcMain.handle('open-external', (event, url) => shell.openExternal(url));
  ipcMain.handle('open-folder', (event, folderPath) => {
    const target = folderPath || configManager.get().targetFolder;
    shell.openPath(target);
  });

  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-close', () => {
    const config = configManager.get();
    if (config.minimizeToTray) {
      if (mainWindow) mainWindow.hide();
    } else {
      isQuitting = true;
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  httpBridge.stop().catch(() => {});
  runnerController.stop().catch(() => {});
  chromeSpawner.stopSpawned();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    const config = configManager.get();
    if (!config.minimizeToTray) {
      app.quit();
    }
  }
});
