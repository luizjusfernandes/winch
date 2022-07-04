const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    setup: () => ipcRenderer.send('setup'),
    requestConfig: () => ipcRenderer.invoke('requestConfig'),
    save: (config) => ipcRenderer.invoke('save', config),
    close: () => ipcRenderer.send('close'),
    connect: () => ipcRenderer.invoke('connect'),
    disconnect: () => ipcRenderer.invoke('disconnect'),
    sendSpeed: (speed) => ipcRenderer.send('sendSpeed', speed),
    handleError: (callback) => ipcRenderer.on('writeError', callback)
});