// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CountdownHero from '../HomeHero.jsx'

// The prototype pre-tournament hero (full-redesign ruling 2026-07-18): one pitch
// card carrying the kick-off pill, the "days to lock-in." headline, the prediction
// meter and the primary actions. The corner ribbon and unit grid it replaces are
// retired anatomy — this file holds the new card's contract.
describe('the lock-in hero card', () => {
  const lockAt = '2028-06-09T19:00:00.000Z'
  const countdown = { days: 13, hours: 4, minutes: 30 }

  it('states the days to lock-in and the kick-off moment, never the team names', () => {
    render(<CountdownHero lockAt={lockAt} countdown={countdown} openingMatch={{ matchNumber: 1, venueName: 'National Stadium of Wales' }} />)
    expect(screen.getByRole('heading', { name: /days to lock-in\./ })).toBeTruthy()
    expect(screen.getByText(/Kick-off .*National Stadium of Wales/)).toBeTruthy()
  })

  it('carries the prediction meter and routes the next action from the CTA', () => {
    render(
      <CountdownHero
        lockAt={lockAt}
        countdown={countdown}
        openingMatch={{ matchNumber: 1, venueName: null }}
        original={{ totalComplete: 12, total: 51 }}
        predictionCta={{ href: '#/groups' }}
      />,
    )
    expect(screen.getByRole('progressbar', { name: 'Your predictions: 12 of 51 complete' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Continue predicting' }).getAttribute('href')).toBe('#/groups')
    expect(screen.getByRole('link', { name: 'Build bracket' }).getAttribute('href')).toBe('#/bracket')
  })

  it('keeps the fail-loud provisional indicator when the lock is unconfirmed', () => {
    render(<CountdownHero lockAt={lockAt} countdown={countdown} openingMatch={null} provisional />)
    expect(screen.getByText('Provisional — kick-off time not confirmed')).toBeTruthy()
  })
})
