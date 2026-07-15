// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LeaderList } from '../LeaguePresentation.jsx'
import { RANK_MOVEMENT_PENDING_REASON } from '../leagueModel.js'

// The Leagues standings rows, driven by REAL taps. The static test proves the markup;
// this proves the wiring that the re-cut owns: that a tapped row opens THAT member's Player
// View, and that rank movement is a designed not-yet state — the reason is stated ONCE per
// scored table and never as a per-row chip, and gap-to-leader is static text.

const scoredRows = [
  { userId: 'me', displayName: 'Nicky', rank: 1, totalPoints: 80, scoredMatchCount: 5, isCurrentUser: true },
  { userId: 'other', displayName: 'Amy', rank: 2, totalPoints: 63, scoredMatchCount: 5, isCurrentUser: false },
]

const preScoringRows = [
  { userId: 'a', displayName: 'Amy', rank: 1, totalPoints: 0, scoredMatchCount: 0, isCurrentUser: false },
  { userId: 'me', displayName: 'Nicky', rank: 2, totalPoints: 0, scoredMatchCount: 0, isCurrentUser: true },
]

describe('league standings interaction', () => {
  it('opens the tapped member’s Player View, not a fixed one', async () => {
    const user = userEvent.setup()
    const onOpenPlayer = vi.fn()
    render(<LeaderList rows={scoredRows} onOpenPlayer={onOpenPlayer} />)

    await user.click(screen.getByRole('button', { name: "Open Amy's Player View" }))
    expect(onOpenPlayer).toHaveBeenCalledTimes(1)
    expect(onOpenPlayer.mock.calls[0][0]).toMatchObject({ userId: 'other', displayName: 'Amy' })

    await user.click(screen.getByRole('button', { name: 'Open your Player View' }))
    expect(onOpenPlayer).toHaveBeenCalledTimes(2)
    expect(onOpenPlayer.mock.calls[1][0]).toMatchObject({ userId: 'me', isCurrentUser: true })
  })

  it('states the movement not-yet reason once per scored table, never as a per-row chip', () => {
    render(<LeaderList rows={scoredRows} onOpenPlayer={() => {}} />)
    // Exactly one occurrence of the pending-movement reason, and it is not repeated per row.
    expect(screen.getAllByText(RANK_MOVEMENT_PENDING_REASON)).toHaveLength(1)
    // Gap-to-leader is static text on the non-leader.
    expect(screen.getByText('17 behind leader')).toBeTruthy()
  })

  it('shows no movement note and dashes for rank before any scoring', () => {
    render(<LeaderList rows={preScoringRows} onOpenPlayer={() => {}} />)
    expect(screen.queryByText(RANK_MOVEMENT_PENDING_REASON)).toBeNull()
    // Rank is deferred to an em dash until scoring exists.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})
