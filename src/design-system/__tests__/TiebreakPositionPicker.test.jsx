import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TiebreakPositionPicker from '../TiebreakPositionPicker.jsx'
import { hasUnresolvedTie, labelFor, moveItem, orderFromTie } from '../tiebreakModel.js'

const tie = {
  groupCode: 'A',
  reason: 'both level on points, goal difference and goals scored',
  teams: [
    { teamId: 'wal', label: 'Wales' },
    { teamId: 'ger', label: 'Germany' },
  ],
}

describe('TiebreakPositionPicker (item 64 — component states)', () => {
  it('renders nothing when there is no unresolved tie (stub input null)', () => {
    expect(renderToStaticMarkup(<TiebreakPositionPicker tie={null} />)).toBe('')
    expect(renderToStaticMarkup(<TiebreakPositionPicker tie={{ groupCode: 'A', teams: [] }} />)).toBe('')
  })

  it('shows the amber provisional warning and a ranked picker for the tied teams', () => {
    const html = renderToStaticMarkup(<TiebreakPositionPicker tie={tie} />)
    expect(html).toContain('data-tiebreak-picker="true"')
    expect(html).toContain('data-tiebreak-warning="true"') // amber warning banner present
    expect(html).toContain('can’t be decided automatically')
    expect(html).toContain('Wales')
    expect(html).toContain('Germany')
    // Manual ordering controls with accessible labels.
    expect(html).toContain('Move Wales up')
    expect(html).toContain('Move Germany down')
    // No reset notice unless flagged.
    expect(html).not.toContain('data-tiebreak-reset')
  })

  it('shows the reset notice only when the stub reset flag is set', () => {
    const html = renderToStaticMarkup(<TiebreakPositionPicker tie={tie} resetNotice />)
    expect(html).toContain('data-tiebreak-reset="true"')
    expect(html).toContain('reset these positions')
  })
})

describe('tiebreak reorder logic', () => {
  const list = ['a', 'b', 'c']

  it('moves an item up and down', () => {
    expect(moveItem(list, 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(list, 1, 1)).toEqual(['a', 'c', 'b'])
  })

  it('is a no-op past the ends', () => {
    expect(moveItem(list, 0, -1)).toEqual(['a', 'b', 'c'])
    expect(moveItem(list, 2, 1)).toEqual(['a', 'b', 'c'])
  })

  it('reads its starting order and labels from the stub tie descriptor', () => {
    expect(orderFromTie(tie)).toEqual(['wal', 'ger'])
    expect(orderFromTie(null)).toEqual([])
    expect(labelFor(tie, 'ger')).toBe('Germany')
    expect(labelFor(tie, 'unknown')).toBe('unknown') // falls back to the id
  })

  it('only reports a tie worth resolving when the stub supplies tied teams', () => {
    expect(hasUnresolvedTie(tie)).toBe(true)
    expect(hasUnresolvedTie(null)).toBe(false)
    expect(hasUnresolvedTie({ groupCode: 'A', teams: [] })).toBe(false)
  })
})
