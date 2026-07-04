import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { JokerMeter, JokerPill } from '../JokerControl.jsx'

describe('JokerControl', () => {
  it('renders the approved pill with star, Joker label and multiplier only when armed', () => {
    const inactive = renderToStaticMarkup(<JokerPill statusLabel="Add joker" matchLabel="match 1" onClick={() => {}} />)
    expect(inactive).toContain('data-joker-pill="true"')
    expect(inactive).toContain('Joker')
    expect(inactive).not.toContain('2×')
    expect(inactive).not.toContain('>J<')

    const active = renderToStaticMarkup(<JokerPill active statusLabel="Joker applied" matchLabel="match 1" multiplier={2} onClick={() => {}} />)
    expect(active).toContain('aria-pressed="true"')
    expect(active).toContain('Joker')
    expect(active).toContain('2×')
  })

  it('renders disabled cap treatment as a real disabled pill', () => {
    const html = renderToStaticMarkup(<JokerPill disabled statusLabel="Joker limit reached" matchLabel="match 2" onClick={() => {}} />)
    expect(html).toContain('disabled=""')
    expect(html).toContain('Joker limit reached for match 2')
    expect(html).toContain('joker-control--pill')
  })

  it('renders a five-dot joker meter with filled count and accessible text', () => {
    const html = renderToStaticMarkup(<JokerMeter value={3} max={5} multiplier={2} label="group jokers selected" />)
    expect(html).toContain('data-joker-meter="true"')
    expect(html).toContain('3 of 5 group jokers selected')
    expect(html).toContain('JOKER METER')
    expect((html.match(/groups-joker-dot/g) ?? []).length).toBe(5)
    expect((html.match(/groups-joker-dot is-active/g) ?? []).length).toBe(3)
    expect(html).toContain('2× points')
  })
})
