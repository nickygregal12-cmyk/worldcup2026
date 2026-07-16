// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmptyLeagueCollection, LeagueCollectionTabs } from '../LeagueCollectionTabs.jsx'

describe('league collection tabs', () => {
  it('shows independent counts and switches to the requested collection', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<LeagueCollectionTabs
      activeCompetition="original"
      collections={{ original: [{ id: 'o1' }, { id: 'o2' }], ko_predictor: [] }}
      onChange={onChange}
    />)

    expect(screen.getByRole('tab', { name: /Original/i }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('2 leagues')).toBeTruthy()
    await user.click(screen.getByRole('tab', { name: /KO/i }))
    expect(onChange).toHaveBeenCalledWith('ko_predictor')
  })

  it('explains that an empty KO collection does not inherit Original members', () => {
    render(<EmptyLeagueCollection competitionKey="ko_predictor" />)
    expect(screen.getByText(/Original league memberships do not carry across/i)).toBeTruthy()
  })
})
