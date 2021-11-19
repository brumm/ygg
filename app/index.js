console.clear()

const path = require('path')
const { app, BrowserWindow, globalShortcut, screen } = require('electron')

require('./commands')

let window

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
//
;(async () => {
  await app.whenReady()

  globalShortcut.register('Cmd+Space', () => {
    if (window.isVisible()) {
      window.hide()
    } else {
      centerWindowOnDisplayWithCursor(window)
      window.show()
    }
  })

  window = new BrowserWindow({
    width: 352,
    height: 496,
    alwaysOnTop: true,
    show: false,
    frame: false,
    minimizable: false,
    maximizable: false,
    resizable: false,
    closable: false,
    acceptFirstMouse: true,
    backgroundColor: '#1f2937',
    webPreferences: {
      preload: path.join(__dirname, './preload.js'),
    },
  })

  // win.webContents.openDevTools()

  window.on('ready-to-show', () => {
    centerWindowOnDisplayWithCursor(window)
    window.show()
  })

  window.loadURL('http://localhost:3000')
})()

const centerWindowOnDisplayWithCursor = (win) => {
  const point = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(point)
  const bounds = win.getBounds()

  const x = display.bounds.x + display.size.width / 2 - bounds.width / 2
  const y = display.bounds.y + display.size.height / 2 - bounds.height / 2
  const foo = Math.floor(y * 0.9)

  win.setPosition(x, foo)
}
