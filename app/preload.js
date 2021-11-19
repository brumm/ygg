const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('app', {
  resize: (...args) => ipcRenderer.invoke('resize', ...args),
  hide: (...args) => ipcRenderer.invoke('hide', ...args),
})
