// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import GroupsPredictor from '../GroupsPredictor.jsx'
import { GROUPS_VIEW_STORAGE_KEY } from '../useGroupsLanding.js'

// The DP Groups re-cut, asserted where it can be: structure and behaviour.
//
// The look itself — spacing, dark theme, truncation — is CSS and goes to the owner's
// visual review. What IS testable is everything the re-cut promised to DO, and each of
// these was a specific owner finding:
//
//   * the joker wears its own mark, not a generic star
//   * the page is not a dead end: it flows on to the Original Bracket
//   * one group at a time, chosen from letter tabs
//   * a fixture with no confirmed kick-off says so, loudly, and never invents one

const GROUP_CODES = ['A', 'B', 'C', 'D', 'E', 'F']
const NAMES = {
  A: ['Wales', 'Germany', 'Spain', 'Italy'],
  B: ['England', 'France', 'Denmark', 'Austria'],
  C: ['Netherlands', 'Croatia', 'Poland', 'Serbia'],
  D: ['Northern Ireland', 'Portugal', 'Belgium', 'Czechia'],
  E: ['Republic of Ireland', 'Norway', 'Sweden', 'Romania'],
  F: ['Scotland', 'Switzerland', 'Türkiye', 'Ukraine'],
}

const teamId = (code, slot) => `${code.toLowerCase()}${slot}`

const TEAMS = Object.fromEntries(GROUP_CODES.flatMap(code => NAMES[code].map((label, index) => {
  const id = teamId(code, index + 1)
  return [id, { teamId: id, actualTeamId: `${id}-actual`, stableKey: `${code}${index + 1}`, label, isoCode: null, isProvisional: true }]
})))

const ROUND_ROBIN = [[0, 1], [2, 3], [0, 2], [1, 3], [3, 0], [1, 2]]

// Match 1 is the real opening fixture: a confirmed 8:00pm kick-off at a real venue.
// Every other fixture has no kick-off time, which is the truth today — the draw has
// not been made — and is what the PROVISIONAL chip exists to say.
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

function renderGroups(overrides = {}) {
  return render(
    <GroupsPredictor
      reference={reference}
      draft={{ groupPredictions: {} }}
      summary={{ groupComplete: 0, groupJokers: 0, groupJokerCap: 5 }}
      scoreLocked={false}
      reviewMode={false}
      graceWindows={[]}
      autosaveStatus={null}
      context="guest"
      activeMatchNumber={null}
      luckyDipDisabled
      onLuckyDip={() => {}}
      onOpenReview={() => {}}
      onChange={() => {}}
      {...overrides}
    />,
  )
}

afterEach(() => window.localStorage.removeItem(GROUPS_VIEW_STORAGE_KEY))

describe('Groups re-cut — the joker wears its own mark', () => {
  it('draws the joker card on every joker control, and no star anywhere', () => {
    const { container } = renderGroups()

    // One mark per pill (six matches in the open group) plus the meter's own.
    expect(container.querySelectorAll('[data-joker-mark="true"]').length).toBe(7)
    // lucide's star renders as <polygon>/<path> inside .lucide-star; the joker mark is
    // ours. What matters is that the retired star class is nowhere on the surface.
    expect(container.querySelector('.lucide-star')).toBeNull()
  })
})

describe('Groups re-cut — the page flows on', () => {
  it('carries a real link into the Original Bracket rather than stopping', () => {
    renderGroups()

    const cta = screen.getByRole('link', { name: /Continue to your Original Bracket/ })
    // The registered bracket route, not a hash spelled out on the page.
    expect(cta.getAttribute('href')).toBe('#/bracket')
  })
})

describe('Groups re-cut — one group at a time', () => {
  it('opens Group A and swaps the whole card list when another letter is chosen', async () => {
    const user = userEvent.setup({ delay: null })
    renderGroups()

    // Group A is open: its teams are on the board and Group B's are not.
    expect(screen.getByLabelText('Wales score in match 1')).toBeTruthy()
    expect(screen.queryByLabelText('England score in match 7')).toBeNull()

    await user.click(screen.getByRole('button', { name: /^Group B/ }))

    expect(screen.getByLabelText('England score in match 7')).toBeTruthy()
    expect(screen.queryByLabelText('Wales score in match 1')).toBeNull()
  })
})

describe('Groups re-cut — the card says when and where', () => {
  it('prints a confirmed kick-off and venue, and never invents one that is missing', () => {
    const { container } = renderGroups()

    // Match 1 has both, so it shows both.
    expect(screen.getByText(/8:00pm/)).toBeTruthy()
    expect(screen.getByText(/National Stadium of Wales/)).toBeTruthy()

    // The other five in Group A have no confirmed time. They say so — §5 makes that
    // indicator a feature — rather than borrowing match 1's time or guessing a default.
    const provisional = container.querySelectorAll('[data-match-number] [class*="provisional"]')
    expect(provisional.length).toBe(5)
  })
})

describe('Groups re-cut — the next match and Match Centre stay close', () => {
  it('opens the group containing a live match on entry', () => {
    const liveReference = {
      ...reference,
      groupMatches: reference.groupMatches.map(match => ({
        ...match,
        status: match.matchNumber === 7 ? 'live' : 'scheduled',
      })),
    }

    renderGroups({ reference: liveReference })

    expect(screen.getByLabelText('England score in match 7')).toBeTruthy()
    expect(screen.queryByLabelText('Wales score in match 1')).toBeNull()
  })

  it('gives every visible fixture a direct Match Centre link', () => {
    renderGroups()

    const links = screen.getAllByRole('link', { name: /Match Centre/ })
    expect(links).toHaveLength(6)
    expect(links[0].getAttribute('href')).toBe('#/match-centre?match=1&competition=original')
  })

  it('remembers the By date preference on the next visit', async () => {
    const user = userEvent.setup({ delay: null })
    const first = renderGroups()
    await user.click(screen.getByRole('button', { name: 'By date' }))
    first.unmount()

    renderGroups()
    expect(screen.getByLabelText('England score in match 7')).toBeTruthy()
  })
})
