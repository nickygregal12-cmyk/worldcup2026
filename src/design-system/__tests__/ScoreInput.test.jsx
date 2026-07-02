import React from 'react' // eslint-disable-line no-unused-vars
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ScoreInput from '../ScoreInput.jsx'

describe('ScoreInput', () => {
  it('uses the mobile numeric keypad contract and desktop steppers', () => {
    const html = renderToStaticMarkup(<ScoreInput value={2} label="Scotland score" onChange={() => {}} />)
    expect(html).toContain('inputMode="numeric"')
    expect(html).toContain('pattern="[0-9]*"')
    expect(html).toContain('Decrease Scotland score')
    expect(html).toContain('Increase Scotland score')
  })

  it('renders locked predictions as unmistakable read-only values', () => {
    const html = renderToStaticMarkup(<ScoreInput value={1} label="Scotland score" readOnly onChange={() => {}} />)
    expect(html).toContain('score-input--readonly')
    expect(html).toContain('read only')
    expect(html).not.toContain('<input')
  })

  it('shows a distinct grace state while remaining read-only presentation-safe', () => {
    const html = renderToStaticMarkup(<ScoreInput value={3} label="Scotland score" readOnly grace onChange={() => {}} />)
    expect(html).toContain('score-input--grace')
    expect(html).toContain('read only')
  })
})
