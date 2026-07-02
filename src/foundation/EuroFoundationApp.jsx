import { useCallback, useEffect, useMemo, useState } from 'react'
import { ENVIRONMENT } from '../config/environment.js'
import EuroAuthFoundation from '../auth/EuroAuthFoundation.jsx'
import PredictionJourneyFoundation from '../journey/PredictionJourneyFoundation.jsx'
import KoPredictorFoundation from '../koPredictor/KoPredictorFoundation.jsx'
import ResultsAndLeaderboardsFoundation from '../results/ResultsAndLeaderboardsFoundation.jsx'
import AdminOperationsFoundation from '../admin/AdminOperationsFoundation.jsx'
import LeaguesFoundation from '../leagues/LeaguesFoundation.jsx'
import { loadEuroFoundation } from './loadEuroFoundation.js'
import { createFoundationClient } from './supabaseClient.js'

const EXPECTED_TOTALS = Object.freeze({
  stages: 5,
  groups: 6,
  tournamentSlots: 24,
  confirmedVenues: 9,
  matches: 51,
  groupMatches: 36,
  knockoutMatches: 15,
  matchSlots: 102,
  enteredKickoffTimes: 0,
})

function formatDate(dateValue) {
  if (!dateValue) return 'Not set'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateValue}T12:00:00Z`))
}

function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`foundation-pill foundation-pill--${tone}`}>{children}</span>
}

function StatCard({ value, label, note, matchesExpected = true }) {
  return (
    <article className="foundation-stat">
      <strong>{value}</strong>
      <span>{label}</span>
      <small className={matchesExpected ? '' : 'foundation-warning-text'}>{note}</small>
    </article>
  )
}

function LoadingState() {
  return (
    <div className="foundation-state" role="status" aria-live="polite">
      <span className="foundation-spinner" aria-hidden="true" />
      <strong>Reading the Euro staging tournament model…</strong>
    </div>
  )
}

export default function EuroFoundationApp() {
  const clientState = useMemo(() => createFoundationClient(), [])
  const [state, setState] = useState(() => clientState.client
    ? { status: 'loading', data: null, error: null }
    : { status: 'error', data: null, error: clientState.error })

  const refresh = useCallback(async () => {
    if (!clientState.client) return

    setState(previous => ({ ...previous, status: 'loading', error: null }))

    try {
      const data = await loadEuroFoundation(clientState.client)
      setState({ status: 'ready', data, error: null })
    } catch (error) {
      setState({
        status: 'error',
        data: null,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [clientState])

  useEffect(() => {
    if (!clientState.client) return undefined

    let active = true
    loadEuroFoundation(clientState.client)
      .then(data => {
        if (active) setState({ status: 'ready', data, error: null })
      })
      .catch(error => {
        if (!active) return
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error.message : String(error),
        })
      })

    return () => {
      active = false
    }
  }, [clientState])

  const totals = state.data?.totals
  const expectedModel = totals
    ? Object.entries(EXPECTED_TOTALS).every(([key, expected]) => totals[key] === expected)
    : false

  return (
    <div className="foundation-shell">
      <header className="foundation-header">
        <div className="foundation-header__inner">
          <a className="foundation-brand" href="/" aria-label="Euro 2028 Predictor foundation home">
            <span className="foundation-brand__mark" aria-hidden="true">28</span>
            <span>
              <strong>Euro 2028 Predictor</strong>
              <small>Expanded admin control room staging</small>
            </span>
          </a>
          <StatusPill tone="safe">Admin control room · protected operations</StatusPill>
        </div>
      </header>

      <main className="foundation-main">
        <section className="foundation-hero">
          <div>
            <StatusPill tone="info">Stage 12 · Expanded tournament control room</StatusPill>
            <h1>The tournament control room now covers lock, grace, joker allocation and kill-switch controls.</h1>
            <p>
              Owner-only controls now apply the irreversible global lock, manage one-match grace windows and pause browser features safely. Results, leagues and the two competition leaderboards remain separate and protected.
            </p>
          </div>
          <div className="foundation-environment" aria-label="Environment details">
            <span>Environment</span>
            <strong>{ENVIRONMENT.appEnv}</strong>
            <span>Tournament</span>
            <strong>{ENVIRONMENT.tournamentShortName}</strong>
          </div>
        </section>

        {state.status === 'loading' && <LoadingState />}

        {state.status === 'error' && (
          <section className="foundation-panel foundation-panel--error" role="alert">
            <div>
              <StatusPill tone="danger">Connection check failed</StatusPill>
              <h2>The foundation screen could not read Euro staging.</h2>
              <p>{state.error}</p>
            </div>
            <button type="button" onClick={refresh}>Try again</button>
          </section>
        )}

        {state.status === 'ready' && state.data && (
          <>
            <section className="foundation-panel foundation-model-heading">
              <div>
                <StatusPill tone={expectedModel ? 'safe' : 'warning'}>
                  {expectedModel ? 'Verified model loaded' : 'Model needs review'}
                </StatusPill>
                <h2>{state.data.tournament.name}</h2>
                <p>
                  {formatDate(state.data.tournament.starts_on)} to {formatDate(state.data.tournament.ends_on)}.
                  Dates and venues are official; participant identities and match-specific kick-off times remain unresolved.
                </p>
              </div>
              <button type="button" className="foundation-secondary-button" onClick={refresh}>
                Refresh data
              </button>
            </section>

            <section className="foundation-stat-grid" aria-label="Tournament model totals">
              <StatCard
                value={totals.matches}
                label="official matches"
                note="36 group · 15 knockout"
                matchesExpected={totals.matches === EXPECTED_TOTALS.matches}
              />
              <StatCard
                value={totals.tournamentSlots}
                label="tournament slots"
                note={`${totals.unresolvedTournamentSlots} real teams unresolved`}
                matchesExpected={totals.tournamentSlots === EXPECTED_TOTALS.tournamentSlots}
              />
              <StatCard
                value={totals.confirmedVenues}
                label="confirmed venues"
                note="All linked to the tournament"
                matchesExpected={totals.confirmedVenues === EXPECTED_TOTALS.confirmedVenues}
              />
              <StatCard
                value={totals.enteredKickoffTimes}
                label="kick-off times entered"
                note="Correct until UEFA confirms them"
                matchesExpected={totals.enteredKickoffTimes === EXPECTED_TOTALS.enteredKickoffTimes}
              />
            </section>

            <EuroAuthFoundation client={clientState.client} />

            <PredictionJourneyFoundation
              key={state.data.guestReference.referenceVersion}
              client={clientState.client}
              reference={state.data.guestReference}
              tournament={state.data.tournament}
            />

            <KoPredictorFoundation
              client={clientState.client}
              reference={state.data.guestReference}
            />

            <ResultsAndLeaderboardsFoundation
              client={clientState.client}
              reference={state.data.guestReference}
            />

            <LeaguesFoundation
              client={clientState.client}
              tournamentId={state.data.tournament.id}
            />

            <AdminOperationsFoundation
              client={clientState.client}
              reference={state.data.guestReference}
            />

            <section className="foundation-two-column">
              <article className="foundation-panel">
                <div className="foundation-section-heading">
                  <div>
                    <span className="foundation-kicker">Tournament stages</span>
                    <h2>Official match skeleton</h2>
                  </div>
                  <StatusPill tone="neutral">{totals.matchSlots} match slots</StatusPill>
                </div>
                <div className="foundation-stage-list">
                  {state.data.stages.map(stage => (
                    <div className="foundation-stage-row" key={stage.id}>
                      <div>
                        <strong>{stage.name}</strong>
                        <span>{formatDate(stage.starts_on)} – {formatDate(stage.ends_on)}</span>
                      </div>
                      <b>{stage.expected_match_count} matches</b>
                    </div>
                  ))}
                </div>
              </article>

              <article className="foundation-panel">
                <span className="foundation-kicker">Safety boundary</span>
                <h2>Deliberately unavailable</h2>
                <p className="foundation-panel-copy">
                  These areas will return only after their Euro-specific database design, RLS and tests are approved.
                </p>
                <ul className="foundation-check-list">
                  <li>Shared design-system page rebuild</li>
                  <li>Seeded full-tournament scenario testing</li>
                  <li>Pre-tournament configuration review</li>
                  <li>Optional external results API syncing</li>
                </ul>
              </article>
            </section>

            <section className="foundation-panel foundation-next-step">
              <div>
                <span className="foundation-kicker">Next controlled batch</span>
                <h2>Build the shared design system and rebuild the main pages.</h2>
                <p>
                  Stage 12 completes the operational control room. The next controlled batch turns the current foundation screens into the final mobile-first Home, Groups, Knockout and Leagues experience.
                </p>
              </div>
              <StatusPill tone="warning">Stage 12 active</StatusPill>
            </section>
          </>
        )}
      </main>

      <footer className="foundation-footer">
        Euro 2028 development environment · isolated from WC26 production
      </footer>
    </div>
  )
}
