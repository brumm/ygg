const { screen } = require('electron')

module.exports.centerWindowOnDisplayWithCursor = (
  window,
  onlyHorizontal = false,
) => {
  const point = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(point)
  const bounds = window.getBounds()

  const x = display.bounds.x + display.size.width / 2 - bounds.width / 2
  const y = display.bounds.y + display.size.height / 2 - 465 / 2
  const shiftedY = Math.floor(y * 0.9)

  window.setPosition(x, onlyHorizontal ? bounds.y : shiftedY)
}
