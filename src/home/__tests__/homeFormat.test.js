import { describe, expect, it } from 'vitest'
import { formatKickoffDateTime } from '../homeFormat.js'

describe('formatKickoffDateTime (shared kickoff formatter — Match Centre fixture hero)', () => {
  it('renders the raw kickoff ISO as a formatted date-time, never the raw string', () => {
    // The Match Centre fixture hero used to print this ISO verbatim to players (rider A).
    const formatted = formatKickoffDateTime('2028-06-09T19:00:00+00:00')
    expect(formatted).not.toContain('T19:00:00')
    // 19:00 UTC in June is 20:00 Europe/London (BST) — ground truth "8:00pm".
    expect(formatted).toBe('Fri, 9 June 2028 · 8:00pm')
  })

  it('keeps the caller fallback when there is no kickoff value', () => {
    expect(formatKickoffDateTime(null, 'Kick-off time to be confirmed')).toBe('Kick-off time to be confirmed')
  })
})
