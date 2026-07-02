import React from 'react' // eslint-disable-line no-unused-vars
import { Badge, Button, Dialog, Icon, TeamLabel } from '../design-system/index.jsx'
import { TEAM_PROFILE_MILESTONES } from './teamProfileModel.js'

function formatDate(value) {
  if (!value) return 'Date to be confirmed'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)
}

function percentage(value) {
  return value == null ? '—' : `${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1)}%`
}

function CuratedFacts({ curated }) {
  if (curated.status !== 'ready') {
    return (
      <section className="team-profile-section team-profile-empty">
        <span className="foundation-kicker">Team guide</span>
        <h3>Profile details not added yet</h3>
        <p>Ranking, qualifying route and tournament history will appear here once the team is confirmed and the editorial profile is approved.</p>
      </section>
    )
  }

  return (
    <section className="team-profile-section">
      <span className="foundation-kicker">Team guide</span>
      <div className="team-profile-facts">
        <div><span>Ranking</span><strong>{curated.ranking ? `#${curated.ranking}` : 'Not entered'}</strong></div>
        <div><span>Qualifying route</span><strong>{curated.qualifyingRoute ?? 'Not entered'}</strong></div>
        <div><span>Best EURO finish</span><strong>{curated.bestEuroFinish ?? 'Not entered'}</strong></div>
      </div>
      {curated.editorialNote && <p className="team-profile-editorial">{curated.editorialNote}</p>}
    </section>
  )
}

function TournamentForm({ tournament }) {
  const group = tournament.group
  return (
    <section className="team-profile-section">
      <span className="foundation-kicker">Tournament so far</span>
      {group ? (
        <>
          <div className="team-profile-position">
            <div><strong>{group.position ?? '—'}</strong><span>Group {group.code} position</span></div>
            <div><strong>{group.points}</strong><span>Points</span></div>
            <div><strong>{group.played}</strong><span>Played</span></div>
            <div><strong>{group.goalDifference >= 0 ? '+' : ''}{group.goalDifference}</strong><span>Goal difference</span></div>
          </div>
          {group.positionProvisional && <p className="team-profile-note">Position uses the current provisional tie-break fallback.</p>}
        </>
      ) : <p className="team-profile-note">This team is not currently assigned to a tournament group.</p>}

      <div className="team-profile-fixtures">
        {tournament.results.length > 0 ? tournament.results.map(result => (
          <article key={result.matchId}>
            <span>{result.state === 'live' ? 'Live' : result.outcome ?? 'Result'}</span>
            <div><strong>{result.homeLabel} {result.score ?? '–'} {result.awayLabel}</strong><small>{result.stageLabel}</small></div>
          </article>
        )) : <p className="team-profile-note">No canonical tournament results yet.</p>}
      </div>

      <div className="team-profile-next">
        <span>Next fixture</span>
        {tournament.nextFixture ? (
          <strong>{tournament.nextFixture.homeLabel} v {tournament.nextFixture.awayLabel} · {formatDate(tournament.nextFixture.kickoffAt ?? tournament.nextFixture.scheduledDate)}</strong>
        ) : <strong>No future fixture is currently resolved.</strong>}
      </div>
    </section>
  )
}

function ViewerPrediction({ viewer }) {
  if (!viewer) return <p className="team-profile-note">Sign in to see how this team features in your own Original Predictor bracket.</p>
  if (!viewer.hasOriginalPredictionSet) return <p className="team-profile-note">You have not started an Original Predictor bracket yet.</p>

  const milestones = [
    ['predictedGroupWinner', 'Group winner'],
    ['predictedRoundOf16', 'Round of 16'],
    ['predictedQuarterFinal', 'Quarter-finals'],
    ['predictedSemiFinal', 'Semi-finals'],
    ['predictedFinal', 'Final'],
    ['predictedChampion', 'Champion'],
  ]

  return (
    <div className="team-profile-own-prediction">
      <strong>Your prediction</strong>
      <div>{milestones.map(([key, label]) => <span key={key} className={viewer[key] ? 'is-picked' : ''}>{viewer[key] ? '✓' : '–'} {label}</span>)}</div>
    </div>
  )
}

function PredictionSection({ predictions }) {
  return (
    <section className="team-profile-section">
      <span className="foundation-kicker">Prediction outlook</span>
      <ViewerPrediction viewer={predictions.viewerPrediction} />
      {!predictions.aggregatesVisible ? (
        <div className="team-profile-lock-state">
          <Icon name="lock" size={18} />
          <div><strong>Community percentages are private</strong><p>{predictions.visibilityReason}</p></div>
        </div>
      ) : predictions.eligiblePredictionCount === 0 ? (
        <p className="team-profile-note">No complete Original Predictor brackets are available for percentages yet.</p>
      ) : (
        <>
          <p className="team-profile-sample">Based on {predictions.eligiblePredictionCount} complete Original Predictor bracket{predictions.eligiblePredictionCount === 1 ? '' : 's'}.</p>
          <div className="team-profile-aggregates">
            {TEAM_PROFILE_MILESTONES.map(([key, label]) => {
              const value = predictions.aggregates?.[key] ?? null
              return (
                <div key={key}>
                  <div><span>{label}</span><strong>{percentage(value)}</strong></div>
                  <span className="team-profile-meter"><i style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} /></span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

export default function TeamProfileSheet({ open, state, onClose, onRetry }) {
  const team = state.team
  const data = state.data
  const title = team?.label ? `${team.label} profile` : 'Team profile'

  return (
    <Dialog open={open} title={title} onClose={onClose} className="team-profile-sheet">
      {state.status === 'loading' && (
        <div className="team-profile-loading" role="status"><Icon name="loader" className="ui-icon--spin" /><strong>Loading team profile…</strong></div>
      )}

      {state.status === 'error' && (
        <div className="team-profile-error" role="alert">
          <Badge tone="danger">Profile unavailable</Badge>
          <p>{state.error}</p>
          <Button icon="refresh" onClick={onRetry}>Try again</Button>
        </div>
      )}

      {data && (
        <div className="team-profile-content">
          <header className="team-profile-identity">
            <TeamLabel team={{ ...data.profile.team, teamId: data.profile.team.tournamentTeamId, label: data.profile.team.name }} profileDisabled />
            <div>
              {data.profile.team.groupCode && <Badge tone="info">Group {data.profile.team.groupCode}</Badge>}
              {data.profile.team.isHost && <Badge tone="safe">Host nation</Badge>}
              {data.profile.team.isProvisional && <Badge tone="warning">Provisional data</Badge>}
            </div>
          </header>

          {data.status === 'partial' && <div className="team-profile-partial"><Icon name="alert" size={18} /><span>Some profile sections could not refresh. Available information is shown below.</span></div>}

          <CuratedFacts curated={data.profile.curated} />
          {data.tournament.status === 'error'
            ? <section className="team-profile-section team-profile-empty"><h3>Tournament data unavailable</h3><p>Canonical results and the current group position could not be loaded.</p></section>
            : <TournamentForm tournament={data.tournament} />}
          <PredictionSection predictions={data.profile.predictions} />
        </div>
      )}
    </Dialog>
  )
}
