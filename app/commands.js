const { ipcMain, BrowserWindow } = require('electron')

ipcMain.handle('resize', async (event, { width, height }) => {
  const [window] = BrowserWindow.getAllWindows()
  const [currentWidth, currentHeight] = window.getSize()

  width = width || currentWidth
  height = height || currentHeight

  window.setSize(width, height)
})

ipcMain.handle('hide', async (event) => {
  const [window] = BrowserWindow.getAllWindows()
  window.hide()
})
