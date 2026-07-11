import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PredictionInputRow from '../PredictionInputRow.jsx'

describe('PredictionInputRow', () => {
  it('renders two editable score inputs around a centred dash', () => {
    const html = renderToStaticMarkup(
      <PredictionInputRow
        homeValue={2}
        awayValue={1}
        homeLabel="Wales score"
        awayLabel="Germany score"
        onHomeChange={() => {}}
        onAwayChange={() => {}}
      />,
    )
    expect(html).toContain('data-prediction-input-row="true"')
    // Both scores are editable steppers with their own labels.
    expect((html.match(/data-score-input="editable"/g) ?? []).length).toBe(2)
    expect(html).toContain('Increase Wales score')
    expect(html).toContain('Increase Germany score')
    expect(html).toContain('–') // centred dash
  })

  it('propagates the locked read-only state to both sides', () => {
    const html = renderToStaticMarkup(
      <PredictionInputRow
        homeValue={2}
        awayValue={1}
        homeLabel="Wales score"
        awayLabel="Germany score"
        readOnly
        onHomeChange={() => {}}
        onAwayChange={() => {}}
      />,
    )
    expect((html.match(/data-score-input="readonly"/g) ?? []).length).toBe(2)
    expect(html).not.toContain('<input')
  })
})
