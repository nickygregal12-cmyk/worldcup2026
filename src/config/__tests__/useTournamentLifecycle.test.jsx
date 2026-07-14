// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearClockOverride, setClockOverride } from '../../lib/clock.js'
import { useTournamentLifecycle } from '../useTournamentLifecycle.js'

const LOCK_AT = '2028-06-09T19:00:00.000Z'
const TOURNAMENT = { prediction_lock_at: LOCK_AT, prediction_locked_at: null, starts_on: '2028-06-09' }

/** A board that is never remounted, so a lock can only appear by re-evaluation. */
function Board({ tournament = TOURNAMENT }) {
  const lifecycle = useTournamentLifecycle(tournament)
  return <p data-testid="board">{lifecycle.locked ? 'locked' : 'editable'}</p>
}

const board = () => screen.getByTestId('board').textContent

afterEach(() => {
  clearClockOverride()
  vi.useRealTimers()
})

describe('useTournamentLifecycle', () => {
  it('locks an open page at the first kick-off without a reload', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2028-06-09T18:59:30.000Z'))

    render(<Board />)
    expect(board()).toBe('editable')

    // The page is never touched: only time passes.
    await act(async () => { await vi.advanceTimersByTimeAsync(29_000) })
    expect(board()).toBe('editable')

    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })
    expect(board()).toBe('locked')
  })

  it('does not lock early when the kick-off is further out than a 32-bit timer can hold', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-14T12:00:00.000Z'))

    render(<Board />)
    expect(board()).toBe('editable')

    // A raw setTimeout to a lock ~695 days out overflows and fires immediately. Sleeping
    // past the clamp must leave the board open, and must not spin.
    await act(async () => { await vi.advanceTimersByTimeAsync(2_147_483_647) })
    expect(board()).toBe('editable')
  })

  it('engages the lock when the simulated clock is moved across the boundary', () => {
    setClockOverride('2028-06-09T18:00:00.000Z')
    render(<Board />)
    expect(board()).toBe('editable')

    act(() => { setClockOverride('2028-06-09T19:00:00.000Z') })
    expect(board()).toBe('locked')
  })

  it('reopens a board when the simulated clock is moved back before the kick-off', () => {
    setClockOverride('2028-06-21T12:00:00.000Z')
    render(<Board />)
    expect(board()).toBe('locked')

    act(() => { setClockOverride('2028-06-09T18:00:00.000Z') })
    expect(board()).toBe('editable')
  })

  it('keeps a persisted lock closed however the clock moves', () => {
    setClockOverride('2026-07-14T12:00:00.000Z')
    render(<Board tournament={{ ...TOURNAMENT, prediction_locked_at: '2028-06-09T19:00:00.000Z' }} />)
    expect(board()).toBe('locked')
  })
})
