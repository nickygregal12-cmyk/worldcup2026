import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PredictionReview from '../PredictionReview.jsx'
import { APP_ROUTE, routeFromHash } from '../../app/appRoutes.js'

const reference = {
  groups: [{ code: 'A', teamIds: [] }],
  groupMatches: Array.from({ length: 36 }, (_, index) => ({
    matchNumber: index + 1,
    matchId: `m${index + 1}`,
    groupCode: 'A',
  })),
  teamsById: { 'team-1': { label: 'Scotland', fifaCode: 'SCO', actualTeamId: 'sco' } },
}

function draftWith(scoredMatches) {
  return {
    groupPredictions: Object.fromEntries(reference.groupMatches.map((match, index) => [
      String(match.matchNumber),
      index < scoredMatches
        ? { matchNumber: match.matchNumber, homeScore: 2, awayScore: 1 }
        : { matchNumber: match.matchNumber, homeScore: null, awayScore: null },
    ])),
  }
}

function summaryWith({ groupComplete, bracketComplete, canSubmit, remaining, diagnostics = [] }) {
  return {
    groupComplete,
    bracketComplete,
    canSubmit,
    remaining,
    preview: {
      diagnostics,
      resolution: { knockout: { championTeamId: canSubmit ? 'team-1' : null } },
    },
  }
}

function render(props) {
  return renderToStaticMarkup(
    <PredictionReview
      reference={reference}
      context="account"
      locked={false}
      busy={false}
      reviewMode={false}
      onSubmit={() => {}}
      onEdit={() => {}}
      onOpenGroups={() => {}}
      {...props}
    />,
  )
}

const complete = { draft: draftWith(36), summary: summaryWith({ groupComplete: 36, bracketComplete: 15, canSubmit: true, remaining: 0 }) }
const partial = { draft: draftWith(10), summary: summaryWith({ groupComplete: 10, bracketComplete: 0, canSubmit: false, remaining: 41 }) }

describe('Review page route', () => {
  it('is a real reachable route at #/review', () => {
    expect(routeFromHash('#/review')).toBe(APP_ROUTE.REVIEW)
    expect(APP_ROUTE.REVIEW).toBe('review')
  })

  it('does not swallow the existing predict routes', () => {
    expect(routeFromHash('#/groups')).toBe(APP_ROUTE.PREDICT)
    expect(routeFromHash('#/bracket')).toBe(APP_ROUTE.BRACKET)
  })
})

describe('Review stepper', () => {
  it('marks Groups current and later steps todo while groups are unfinished', () => {
    const html = render(partial)
    const steps = [...html.matchAll(/data-state="(done|current|todo)"/g)].map(match => match[1])

    expect(steps).toEqual(['current', 'todo', 'todo'])
  })

  it('marks Groups done and Bracket current once every group score is in', () => {
    const html = render({
      draft: draftWith(36),
      summary: summaryWith({ groupComplete: 36, bracketComplete: 3, canSubmit: false, remaining: 12 }),
    })
    const steps = [...html.matchAll(/data-state="(done|current|todo)"/g)].map(match => match[1])

    expect(steps).toEqual(['done', 'current', 'todo'])
  })

  it('marks Review current once Groups and Bracket are both done', () => {
    const html = render(complete)
    const steps = [...html.matchAll(/data-state="(done|current|todo)"/g)].map(match => match[1])

    expect(steps).toEqual(['done', 'done', 'current'])
  })
})

describe('Review recap cards', () => {
  it('link back to the real Groups and Bracket routes', () => {
    const html = render(partial)

    expect(html).toContain('href="#/groups"')
    expect(html).toContain('href="#/bracket"')
  })

  it('show real counts, not hardcoded example text', () => {
    const html = render(partial)

    expect(html).toContain('10<span>/36</span>')
    expect(html).toContain('0<span>/15</span>')
    expect(html).toContain('26 to score')
  })
})

describe('Review group-goals field', () => {
  it('shows the genuinely calculated total from the draft', () => {
    // 36 matches at 2-1 = 3 goals each.
    expect(render(complete)).toContain('>108<')
    // 10 matches at 2-1 = 30.
    expect(render(partial)).toContain('>30<')
  })

  it('uses the interim copy and claims no scoring rule', () => {
    const html = render(complete)

    expect(html).toContain('Calculated automatically from your 36 group-stage score predictions. Not editable.')
    expect(html).not.toMatch(/nearest|within 5|within 10|25 points|20 points/i)
  })

  it('says the total is still moving while the predictor is partial', () => {
    expect(render(partial)).toContain('10/36 matches scored so far')
    expect(render(complete)).not.toContain('matches scored so far')
  })
})

describe('Review confirm CTA', () => {
  it('asks gently and enables once everything is valid', () => {
    const html = render(complete)

    expect(html).toContain('Ready to lock in?')
    expect(html).not.toContain('disabled=""')
  })

  it('is disabled with a specific reason when predictions are missing', () => {
    const html = render(partial)

    expect(html).toContain('disabled=""')
    expect(html).toContain('41 predictions still need attention before you can lock in.')
  })

  it('names stale bracket picks as the blocker when that is the cause', () => {
    const html = render({
      draft: draftWith(36),
      summary: summaryWith({ groupComplete: 36, bracketComplete: 15, canSubmit: false, remaining: 0, diagnostics: [{ code: 'stale' }] }),
    })

    expect(html).toContain('Some bracket selections became stale')
  })

  it('becomes "Edit my predictions" once confirmed, rather than disappearing', () => {
    const html = render({ ...complete, reviewMode: true })

    expect(html).toContain('Edit my predictions')
    expect(html).not.toContain('Ready to lock in?')
    expect(html).toContain('Your predictions stay editable until the global tournament lock.')
  })

  it('locks down entirely once the tournament lock is active', () => {
    const html = render({ ...complete, locked: true })

    expect(html).toContain('disabled=""')
    expect(html).toContain('The tournament lock is active.')
  })
})
