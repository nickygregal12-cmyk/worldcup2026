export function createLatestRequestGuard() {
  let generation = 0

  return Object.freeze({
    begin() {
      generation += 1
      return generation
    },
    cancel() {
      generation += 1
    },
    isCurrent(token) {
      return token === generation
    },
  })
}
