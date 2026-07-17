import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import { buildCanonicalResultFeed, buildLiveBracketRounds, buildLiveTournamentSnapshot } from '../resultModel.js'
import ResultsExperience from '../ResultsExperience.jsx'
import { buildResultsHubModel } from '../resultsHubModel.js'

describe('Results experience', () => {
  it('shows a concise fixture-led product before official scores arrive', () => {
    const reference = buildGuestReference()
    const liveSnapshot = buildLiveTournamentSnapshot({ reference, resultRows: [] })
    const feed = buildCanonicalResultFeed({ reference, liveSnapshot })
    const model = buildResultsHubModel({ lifecycle: { started: false, locked: false }, feed })
    const bracketRounds = buildLiveBracketRounds({ reference, liveSnapshot })
    const html = renderToStaticMarkup(
      <ResultsExperience
        model={model}
        feed={feed}
        liveSnapshot={liveSnapshot}
        bracketRounds={bracketRounds}
        reference={reference}
      />,
    )

    expect(html).toContain('data-results-experience="phase-aware"')
    expect(html).toContain('Opening fixtures')
    expect((html.match(/data-results-fixture-card="true"/g) ?? [])).toHaveLength(4)
    expect((html.match(/data-team-label="flag"/g) ?? []).length).toBeGreaterThanOrEqual(8)
    expect(html).toContain('<details')
    expect(html).not.toContain('Live bracket</h3>')
    expect(html).not.toContain('Live tables')
  })
})
