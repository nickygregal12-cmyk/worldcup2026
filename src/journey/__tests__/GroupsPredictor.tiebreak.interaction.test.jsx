// @vitest-environment jsdom
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import GroupsPredictor from '../GroupsPredictor.jsx'

// Item 64, end to end, through the real resolver.
//
// tiebreakModel.test.js proves the rules and TiebreakPositionPicker proves the
// states, but neither proves that Groups WIRES them together. This drives the
// whole loop the way a player does: predict a draw that the tie-break criteria
// genuinely cannot separate, watch the picker appear, set the positions, then
// edit a score and watch those positions reset and say so.
//
// Nothing here is stubbed. resolveGroupTable decides whether the tie is real.

// The best-third ranking spans the whole tournament, so the resolver needs all six
// groups. Only Group A is interesting; B–F exist so the model has a table to build.
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
  return [id, {
    teamId: id,
    actualTeamId: `${id}-actual`,
    stableKey: `${code}${index + 1}`,
    label,
    isoCode: null, // the flag registry is not what this test is about
    isProvisional: true,
  }]
})))

// A round robin among the group's four teams, in a fixed order so the score maps
// below line up with the fixtures they describe.
const ROUND_ROBIN = [[0, 1], [2, 3], [0, 2], [1, 3], [3, 0], [1, 2]]

const groupMatches = GROUP_CODES.flatMap((code, groupIndex) => ROUND_ROBIN.map(([home, away], slot) => {
  const matchNumber = groupIndex * 6 + slot + 1
  return {
    matchId: `m${matchNumber}`,
    matchNumber,
    groupCode: code,
    homeTeamId: teamId(code, home + 1),
    awayTeamId: teamId(code, away + 1),
    scheduledDate: '2028-06-09',
  }
}))

const reference = {
  groups: GROUP_CODES.map(code => ({
    code,
    teams: NAMES[code].map((_, index) => TEAMS[teamId(code, index + 1)]),
  })),
  groupMatches,
  teamsById: TEAMS,
}

const score = (homeScore, awayScore) => ({ homeScore, awayScore, jokerApplied: false })

// Group A: Wales and Germany end up genuinely inseparable. They draw with each
// other, both lose to Spain by the same score, and both beat Italy by the same
// score — identical points, goal difference and goals scored, and their
// head-to-head IS the drawn match, so the criteria run out. Spain and Italy are
// cleanly first and last, so only the middle two are ever in question.
const GROUP_A_DRAWN = [score(1, 1), score(3, 0), score(0, 2), score(2, 0), score(0, 2), score(0, 2)]

// Every other group is decisive: 9/6/3/0 points, no two teams alike.
const DECISIVE = [score(1, 0), score(1, 0), score(2, 0), score(3, 0), score(0, 4), score(2, 0)]

const predictionsFor = groupA => Object.fromEntries(
  GROUP_CODES.flatMap((code, groupIndex) => (code === 'A' ? groupA : DECISIVE)
    .map((row, slot) => [groupIndex * 6 + slot + 1, row])),
)

const DRAWN = predictionsFor(GROUP_A_DRAWN)

// Wales beat Germany instead: the tie has an answer, so the picker has no question.
const SEPARATED = predictionsFor([score(2, 0), ...GROUP_A_DRAWN.slice(1)])

function Harness({ initial = DRAWN }) {
  const [groupPredictions, setGroupPredictions] = useState(initial)

  return (
    <GroupsPredictor
      reference={reference}
      draft={{ groupPredictions }}
      summary={{ groupComplete: 36, groupJokers: 0, groupJokerCap: 5 }}
      scoreLocked={false}
      reviewMode={false}
      graceWindows={[]}
      autosaveStatus={null}
      context="guest"
      activeMatchNumber={null}
      luckyDipDisabled
      onLuckyDip={() => {}}
      onOpenReview={() => {}}
      onChange={(match, patch) => setGroupPredictions(previous => ({
        ...previous,
        [match.matchNumber]: { ...previous[match.matchNumber], ...patch },
      }))}
    />
  )
}

const picker = () => document.querySelector('[data-tiebreak-picker="true"]')
const resetNotice = () => document.querySelector('[data-tiebreak-reset="true"]')
// Teams play three matches each, so a label has to name the one we mean.
const spainScoreInMatch2 = () => screen.getByRole('spinbutton', { name: 'Spain score in match 2' })

describe('Groups — unresolved tie, end to end', () => {
  it('does not raise the picker while the group can be decided', () => {
    // Wales win the head-to-head: the resolver separates all four cleanly, so
    // there is nothing to ask the player.
    render(<Harness initial={SEPARATED} />)

    expect(picker()).toBeNull()
  })

  // These three mount the whole predictor — 36 match cards — and drive it through
  // real user events, so they cost ~2s each on an idle machine and up to ten times
  // that when the full suite is running them alongside everything else. The generous
  // timeout is for that contention, not for a slow assertion: shave it back to the
  // isolated runtime and the suite goes green locally and flakes under load.
  it('raises the picker when the criteria genuinely cannot separate the teams', () => {
    render(<Harness />)

    expect(picker()).toBeTruthy()
    expect(picker().textContent).toContain('can’t be decided automatically')
    // Both tied teams are offered, with real ordering controls.
    expect(screen.getByRole('button', { name: 'Move Germany up' })).toHaveProperty('disabled', false)
    expect(resetNotice()).toBeNull()
  }, 60000)

  it('keeps the positions the player set, until a score moves underneath them', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Harness />)

    // Promote Germany above Wales, then commit it.
    await user.click(screen.getByRole('button', { name: 'Move Germany up' }))
    await user.click(screen.getByRole('button', { name: 'Save these positions' }))

    // Germany is first now, so it is Germany that can no longer move up — the
    // saved ordering survived the re-render.
    expect(screen.getByRole('button', { name: 'Move Germany up' })).toHaveProperty('disabled', true)
    expect(resetNotice()).toBeNull()

    // Now edit Spain v Italy — a match neither tied team plays in. Wales and
    // Germany stay exactly as tied as they were, so the picker stays; but the
    // table those positions were decided against no longer exists, so the ordering
    // cannot be carried forward. ANY score edit in the group resets it, not only
    // one that touches the tied teams.
    await user.click(screen.getByRole('button', { name: 'Increase Spain score in match 2' }))
    expect(spainScoreInMatch2()).toHaveProperty('value', '4')

    // The tie is still live, the ordering is gone, and the player is TOLD.
    expect(picker()).toBeTruthy()
    expect(resetNotice()).toBeTruthy()
    expect(resetNotice().textContent).toContain('reset these positions')
    // Reset means reset: Germany is back below Wales, so it can move up again.
    expect(screen.getByRole('button', { name: 'Move Germany up' })).toHaveProperty('disabled', false)
  }, 60000)

  it('drops the picker entirely once the edit resolves the tie', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Harness />)

    expect(picker()).toBeTruthy()

    // 2–1 Wales: the tie is gone, and so is the question.
    await user.click(screen.getByRole('button', { name: 'Increase Wales score in match 1' }))

    expect(picker()).toBeNull()
    expect(resetNotice()).toBeNull()
  }, 60000)
})
