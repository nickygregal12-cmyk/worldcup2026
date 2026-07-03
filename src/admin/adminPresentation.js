export function humaniseAdminValue(value) {
  return String(value ?? '')
    .replaceAll('_', ' ')
    .replace(/^./, character => character.toUpperCase())
}

export function formatAdminTimestamp(value, options = {}) {
  if (!value) return options.emptyLabel ?? 'Not recorded'
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: options.dateStyle ?? 'medium',
    timeStyle: options.timeStyle ?? 'short',
    timeZone: options.timeZone,
  }).format(new Date(value))
}

export function formatAdminDate(value, options = {}) {
  if (!value) return options.emptyLabel ?? 'Not scheduled'
  const [year, month, day] = String(value).split('-').map(Number)
  if (!year || !month || !day) return options.emptyLabel ?? 'Not scheduled'
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: options.dateStyle ?? 'medium',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatFixtureKickoff(match) {
  if (!match?.kickoffAt) return 'Kick-off not confirmed'
  return formatAdminTimestamp(match.kickoffAt, {
    timeZone: match.venueTimezone ?? undefined,
  })
}
