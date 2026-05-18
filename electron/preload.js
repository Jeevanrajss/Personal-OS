'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, typed API to both the activation window and the main app.
contextBridge.exposeInMainWorld('electronAPI', {
  // Called by activation.html to activate a registration key
  activate: (key) => ipcRenderer.invoke('activate', key),

  // Get the app version
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Trigger a manual update check (used by Settings page)
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
});
