export const ADMIN_SCHEDULE_STATUS = Object.freeze([
  'provisional',
  'official_date_venue',
  'official_datetime',
])

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

function dateTimeParts(value, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value)
  return Object.fromEntries(parts.map(part => [part.type, part.value]))
}

function zoneOffsetMilliseconds(utcMilliseconds, timeZone) {
  const value = new Date(utcMilliseconds)
  const parts = dateTimeParts(value, timeZone)
  const representedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return representedAsUtc - Math.floor(utcMilliseconds / 1000) * 1000
}

export function venueLocalInputToIso(localValue, timeZone) {
  if (!localValue) return null
  if (!LOCAL_DATE_TIME_PATTERN.test(localValue) || !timeZone) return null
  const [datePart, timePart] = localValue.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  const representedAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0)
  let instant = representedAsUtc - zoneOffsetMilliseconds(representedAsUtc, timeZone)
  instant = representedAsUtc - zoneOffsetMilliseconds(instant, timeZone)
  const result = new Date(instant)
  const parts = dateTimeParts(result, timeZone)
  const roundTrip = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
  return roundTrip === localValue ? result.toISOString() : null
}

export function isoToVenueLocalInput(value, timeZone) {
  if (!value || !timeZone) return ''
  const parts = dateTimeParts(new Date(value), timeZone)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function normaliseAdminVenue(row) {
  return Object.freeze({
    venueId: row.venue_id,
    venueName: row.venue_name,
    venueCity: row.venue_city,
    countryCode: row.country_code,
    venueTimezone: row.venue_timezone,
    capacity: row.capacity === null || row.capacity === undefined ? null : Number(row.capacity),
    isProvisional: Boolean(row.is_provisional),
    displayOrder: row.display_order === null || row.display_order === undefined ? null : Number(row.display_order),
  })
}

export function normaliseAdminVenues(rows = []) {
  return Object.freeze(rows.map(row => normaliseAdminVenue(row)))
}

export function createAdminFixtureDraft(match, venues = []) {
  const venue = venues.find(candidate => candidate.venueId === match?.venueId)
  const timeZone = venue?.venueTimezone ?? match?.venueTimezone ?? null
  return {
    scheduledDate: match?.scheduledDate ?? '',
    kickoffLocal: isoToVenueLocalInput(match?.kickoffAt, timeZone),
    venueId: match?.venueId ?? '',
    scheduleStatus: match?.scheduleStatus ?? 'provisional',
    note: '',
  }
}


export function adminFixtureDraftHasChanges(match, draft, venues = []) {
  if (!match || !draft) return false
  const venue = venues.find(candidate => candidate.venueId === (String(draft.venueId ?? '').trim() || null)) ?? null
  const kickoffAt = draft.kickoffLocal && venue?.venueTimezone
    ? venueLocalInputToIso(String(draft.kickoffLocal).trim(), venue.venueTimezone)
    : null
  return (
    (String(draft.scheduledDate ?? '').trim() || null) !== (match.scheduledDate ?? null)
    || (String(draft.venueId ?? '').trim() || null) !== (match.venueId ?? null)
    || String(draft.scheduleStatus ?? '') !== String(match.scheduleStatus ?? 'provisional')
    || kickoffAt !== (match.kickoffAt ?? null)
  )
}

export function fixtureEditBlockReason(match) {
  if (!match) return 'Choose a fixture before editing.'
  if (!['scheduled', 'postponed'].includes(match.matchStatus)) {
    return 'Only scheduled or postponed matches can have fixture details changed.'
  }
  if (match.resultStatus !== 'pending' || match.resultRevision !== 0) {
    return 'Fixture details cannot change after result processing has started.'
  }
  return null
}

export function validateAdminFixtureDraft(match, draft, venues = []) {
  const errors = []
  const note = String(draft?.note ?? '').trim().replace(/\s+/g, ' ')
  const scheduledDate = String(draft?.scheduledDate ?? '').trim() || null
  const venueId = String(draft?.venueId ?? '').trim() || null
  const kickoffLocal = String(draft?.kickoffLocal ?? '').trim() || null
  const scheduleStatus = String(draft?.scheduleStatus ?? '')
  const venue = venues.find(candidate => candidate.venueId === venueId) ?? null
  const blockReason = fixtureEditBlockReason(match)

  if (blockReason) errors.push(blockReason)
  if (!ADMIN_SCHEDULE_STATUS.includes(scheduleStatus)) errors.push('Choose a valid schedule status.')
  if (scheduledDate && !DATE_PATTERN.test(scheduledDate)) errors.push('Choose a valid scheduled date.')
  if (note.length < 5 || note.length > 500) errors.push('The audit note must be between 5 and 500 characters.')

  if (['official_date_venue', 'official_datetime'].includes(scheduleStatus)) {
    if (!scheduledDate) errors.push('An official fixture needs a scheduled date.')
    if (!venueId) errors.push('An official fixture needs a tournament venue.')
  }
  if (scheduleStatus === 'official_datetime' && !kickoffLocal) {
    errors.push('Official datetime status needs a confirmed kick-off.')
  }
  if (kickoffLocal && (!scheduledDate || !venueId)) {
    errors.push('A confirmed kick-off needs a scheduled date and tournament venue.')
  }
  if (venueId && !venue) errors.push('Choose an active tournament venue.')

  let kickoffAt = null
  if (kickoffLocal && venue?.venueTimezone) {
    kickoffAt = venueLocalInputToIso(kickoffLocal, venue.venueTimezone)
    if (!kickoffAt) errors.push('The kick-off is not a valid local time for the selected venue.')
    if (kickoffLocal.slice(0, 10) !== scheduledDate) {
      errors.push('The kick-off venue-local date must match the scheduled date.')
    }
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    note,
    values: Object.freeze({
      scheduledDate,
      kickoffAt,
      venueId,
      scheduleStatus,
    }),
  })
}

export function buildAdminFixturePayload(match, draft, venues = []) {
  const validation = validateAdminFixtureDraft(match, draft, venues)
  if (!validation.valid) throw new Error(validation.errors.join(' '))
  return Object.freeze({
    expectedFixtureRevision: match.fixtureRevision,
    note: validation.note,
    ...validation.values,
  })
}
