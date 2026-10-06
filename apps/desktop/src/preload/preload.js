const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('portalsync', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getStatus: () => ipcRenderer.invoke('get-status'),
  startRunner: () => ipcRenderer.invoke('start-runner'),
  stopRunner: () => ipcRenderer.invoke('stop-runner'),
  testConnection: () => ipcRenderer.invoke('test-connection'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (event, data) => callback(data));
  },
});
