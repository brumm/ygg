const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('app', {
  resize: (...args) => ipcRenderer.invoke('resize', ...args),
  hide: (...args) => ipcRenderer.invoke('hide', ...args),
  onHide: (fn) => {
    const listener = (event, message) => fn(message)
    ipcRenderer.on('hide', listener)
    return () => {
      ipcRenderer.removeListener('hide', listener)
    }
  },
})
