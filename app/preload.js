const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('app', {
  resize: (...args) => ipcRenderer.invoke('resize', ...args),
  hide: (...args) => ipcRenderer.invoke('hide', ...args),
  onShow: (fn) => {
    const listener = (event, message) => fn(message)
    ipcRenderer.on('show', listener)
    return () => {
      ipcRenderer.removeListener('show', listener)
    }
  },
})
