const { ipcMain, BrowserWindow, screen } = require('electron')
const { centerWindowOnDisplayWithCursor } = require('./utils')

ipcMain.handle('resize', async (event, { width, height }) => {
  const [window] = BrowserWindow.getAllWindows()
  const [currentWidth, currentHeight] = window.getSize()

  width = width || currentWidth
  height = height || currentHeight

  window.setSize(width, height)
  centerWindowOnDisplayWithCursor(window, true)
})

ipcMain.handle('hide', async (event) => {
  const [window] = BrowserWindow.getAllWindows()
  window.hide()
})
