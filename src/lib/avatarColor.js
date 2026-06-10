// Deterministic pastel colour from a name — makes league tables scannable
// Same person always gets the same colour
export function avatarColor(name = '?') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return {
    bg: `hsl(${hue}, 60%, 86%)`,
    fg: `hsl(${hue}, 50%, 28%)`,
  }
}
