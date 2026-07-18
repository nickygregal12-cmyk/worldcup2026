// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import GroupsPredictor from '../GroupsPredictor.jsx'
import { clearClockOverride, setClockOverride } from '../../lib/clock.js'
import { GROUPS_VIEW_STORAGE_KEY } from '../useGroupsLanding.js'

// Stage GODMODE-1 sim-clock coverage: the joker lock (match-started) must read
// the sim-aware getNow(), so a scrubbed simulated instant governs it exactly as
// it governs the global prediction lock. Regression guard for the gap where the
// journey read raw new Date() and ignored the simulator.

const GROUP_CODES = ['A', 'B', 'C', 'D', 'E', 'F']
const NAMES = {
  A: ['Wales', 'Germany', 'Spain', 'Italy'],
  B: ['England', 'France', 'Denmark', 'Austria'],
  C: ['Netherlands', 'Croatia', 'Poland', 'Serbia'],
  D: ['Northern Ireland', 'Portugal', 'Belgium', 'Czechia'],
  E: ['Republic of Ireland', 'Norway', 'Sweden', 'Romania'],
  F: ['Scotland', 'Switzerland', 'Turkiye', 'Ukraine'],
}

const teamId = (code, slot) => `${code.toLowerCase()}${slot}`
const TEAMS = Object.fromEntries(GROUP_CODES.flatMap(code => NAMES[code].map((label, index) => {
  const id = teamId(code, index + 1)
  return [id, { teamId: id, actualTeamId: `${id}-actual`, stableKey: `${code}${index + 1}`, label, isoCode: null, isProvisional: true }]
})))

const ROUND_ROBIN = [[0, 1], [2, 3], [0, 2], [1, 3], [3, 0], [1, 2]]

// Match 1 is the real opener with a confirmed 8:00pm kick-off; the rest have none.
const groupMatches = GROUP_CODES.flatMap((code, groupIndex) => ROUND_ROBIN.map(([home, away], slot) => {
  const matchNumber = groupIndex * 6 + slot + 1
  return {
    matchId: `m${matchNumber}`,
    matchNumber,
    groupCode: code,
    homeTeamId: teamId(code, home + 1),
    awayTeamId: teamId(code, away + 1),
    scheduledDate: '2028-06-09',
    kickoffAt: matchNumber === 1 ? '2028-06-09T19:00:00Z' : null,
    venueName: matchNumber === 1 ? 'National Stadium of Wales' : null,
  }
}))

const reference = {
  groups: GROUP_CODES.map(code => ({ code, teams: NAMES[code].map((_, index) => TEAMS[teamId(code, index + 1)]) })),
  groupMatches,
  teamsById: TEAMS,
}

const journeyProps = {
  reference,
  draft: { groupPredictions: {} },
  summary: { groupComplete: 0, groupJokers: 0, groupJokerCap: 5 },
  scoreLocked: false,
  reviewMode: false,
  graceWindows: [],
  autosaveStatus: null,
  context: 'guest',
  activeMatchNumber: null,
  luckyDipDisabled: true,
  onLuckyDip: () => {},
  onOpenReview: () => {},
  onChange: () => {},
}

const match1Joker = container => container.querySelector('[data-match-number="1"] [data-joker-pill="true"]')

afterEach(() => {
  clearClockOverride()
  window.localStorage.removeItem(GROUPS_VIEW_STORAGE_KEY)
})

describe('Groups sim-clock — the joker lock follows the simulated clock', () => {
  it('leaves match 1 joker editable in real (2026) time', () => {
    clearClockOverride()
    const { container } = render(<GroupsPredictor {...journeyProps} />)
    expect(match1Joker(container).disabled).toBe(false)
  })

  it('locks match 1 joker once the simulated clock passes kick-off', () => {
    const { container, rerender } = render(<GroupsPredictor {...journeyProps} />)
    expect(match1Joker(container).disabled).toBe(false)

    // Scrub the shared clock past match 1's 2028 kick-off. The override is module
    // state, so re-render as the live app does when the clock notifies subscribers.
    setClockOverride('2028-06-09T20:00:00Z')
    rerender(<GroupsPredictor {...journeyProps} />)
    expect(match1Joker(container).disabled).toBe(true)
  })
})
