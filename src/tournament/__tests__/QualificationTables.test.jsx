// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import { buildLiveTournamentSnapshot } from '../../results/resultModel.js'
import QualificationTables from '../QualificationTables.jsx'

describe('shared qualification tables', () => {
  it('shows one selectable group beside all six third-place teams and an explicit top four', async () => {
    const user = userEvent.setup({ delay: null })
    const reference = buildGuestReference()
    const snapshot = buildLiveTournamentSnapshot({ reference, resultRows: [] })
    const { container } = render(
      <QualificationTables groupTables={snapshot.groups} bestThird={snapshot.bestThird} reference={reference} contextLabel="Live qualification" />,
    )

    expect(screen.getByRole('table', { name: 'Group A standings' })).toBeTruthy()
    expect(screen.getByRole('table', { name: 'Third-place qualification standings' }).querySelectorAll('tbody tr')).toHaveLength(6)
    expect(screen.getAllByText('Qualifies')).toHaveLength(4)
    expect(screen.getAllByText('Outside')).toHaveLength(2)
    expect(container.querySelectorAll('[data-team-label="flag"]').length).toBeGreaterThanOrEqual(10)

    await user.click(screen.getByRole('button', { name: 'B' }))
    expect(screen.getByRole('table', { name: 'Group B standings' })).toBeTruthy()
  })

  it('draws the cutline on the first third-place row below the qualification boundary', () => {
    const reference = buildGuestReference()
    const snapshot = buildLiveTournamentSnapshot({ reference, resultRows: [] })
    render(
      <QualificationTables groupTables={snapshot.groups} bestThird={snapshot.bestThird} reference={reference} contextLabel="Live qualification" />,
    )

    const rows = [...screen.getByRole('table', { name: 'Third-place qualification standings' }).querySelectorAll('tbody tr')]
    const cutlineRows = rows.filter(row => row.className.includes('cutline'))
    expect(cutlineRows).toHaveLength(1)
    expect(rows.indexOf(cutlineRows[0])).toBe(4)
  })
})
