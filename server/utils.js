export const makeId = () => Math.random().toString(32).slice(2)

export const wrapAround = (value, bounds) =>
  ((value % bounds) + bounds) % bounds
