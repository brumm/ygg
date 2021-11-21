const { ipcMain, BrowserWindow, screen } = require('electron')

ipcMain.handle('resize', async (event, { width, height }) => {
  const [window] = BrowserWindow.getAllWindows()
  const [currentWidth, currentHeight] = window.getSize()

  width = width || currentWidth
  height = height || currentHeight

  window.setSize(width, height)
  centerWindowHorizontallyOnDisplayWithCursor(window)
})

ipcMain.handle('hide', async (event) => {
  const [window] = BrowserWindow.getAllWindows()
  window.hide()
})

const centerWindowHorizontallyOnDisplayWithCursor = (win) => {
  const point = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(point)
  const bounds = win.getBounds()

  const x = display.bounds.x + display.size.width / 2 - bounds.width / 2
  const y = bounds.y
  win.setPosition(x, y)
}
