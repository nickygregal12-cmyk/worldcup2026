// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LeaderList, LeagueActionsCard } from '../LeaguePresentation.jsx'
import { RANK_MOVEMENT_PENDING_REASON } from '../leagueModel.js'

// The Leagues rows and actions, driven by REAL taps. Static tests prove markup; these prove the
// wiring the finalisation owns: a tapped row opens THAT member's Player View; rows are a single line
// (no per-row gap); rank movement is stated once per scored table; and copy confirmation lives ON the
// button, inert during the interval.

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
    expect(onOpenPlayer.mock.calls[0][0]).toMatchObject({ userId: 'other', displayName: 'Amy' })
    await user.click(screen.getByRole('button', { name: 'Open your Player View' }))
    expect(onOpenPlayer.mock.calls[1][0]).toMatchObject({ userId: 'me', isCurrentUser: true })
  })

  it('is a single line per row: movement stated once, no per-row gap-to-leader', () => {
    render(<LeaderList rows={scoredRows} onOpenPlayer={() => {}} />)
    expect(screen.getAllByText(RANK_MOVEMENT_PENDING_REASON)).toHaveLength(1)
    // Gap-to-leader is trimmed from rows (owner ruling): the label must not appear.
    expect(screen.queryByText('17 behind leader')).toBeNull()
  })

  it('shows no movement note and dashes for rank before any scoring', () => {
    render(<LeaderList rows={preScoringRows} onOpenPlayer={() => {}} />)
    expect(screen.queryByText(RANK_MOVEMENT_PENDING_REASON)).toBeNull()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})

describe('league actions — on-button copy confirmation', () => {
  it('swaps the button to a confirmation, holds it inert, then reverts', async () => {
    const user = userEvent.setup()
    const onCopyInvite = vi.fn().mockResolvedValue('Copied')
    // A short confirmation interval keeps the test on real timers (waitFor + fake timers deadlock).
    render(<LeagueActionsCard joinCode="SYNTHLARGE" onCopyInvite={onCopyInvite} onShareLeague={() => null} hasSettings={false} confirmMs={60} />)

    await user.click(screen.getByRole('button', { name: /Copy invite/i }))

    // The label swaps to the confirmation, and the button is inert during the interval.
    const confirmed = await screen.findByRole('button', { name: /Copied/i })
    expect(confirmed.disabled).toBe(true)
    await user.click(confirmed) // a double-tap during the interval must not re-fire
    expect(onCopyInvite).toHaveBeenCalledTimes(1)

    // After the interval it reverts to the copy affordance.
    await waitFor(() => expect(screen.getByRole('button', { name: /Copy invite/i })).toBeTruthy())
  })
})
