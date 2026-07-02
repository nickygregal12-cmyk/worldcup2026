import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'
import { Badge, Card } from '../design-system/index.jsx'

function formatDate(value) {
  if (!value) return 'To be confirmed'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`))
}

export default function TournamentOverview({ foundation }) {
  const { tournament, totals, stages } = foundation
  return (
    <div className="content-stack tournament-overview">
      <section className="page-intro">
        <div>
          <Badge tone="info">Tournament information</Badge>
          <h1>{tournament.name}</h1>
          <p>Confirmed structure, predictor rules and the information still awaiting UEFA confirmation.</p>
        </div>
      </section>

      <div className="tournament-summary-grid">
        <Card as="article"><span>Dates</span><strong>{formatDate(tournament.starts_on)} – {formatDate(tournament.ends_on)}</strong><small>Stored in the canonical tournament model</small></Card>
        <Card as="article"><span>Format</span><strong>{totals.groups} groups · {totals.tournamentSlots} teams</strong><small>{totals.groupMatches} group matches and {totals.knockoutMatches} knockout matches</small></Card>
        <Card as="article"><span>Venues</span><strong>{totals.confirmedVenues} confirmed</strong><small>{totals.enteredKickoffTimes} match-specific kick-off times currently entered</small></Card>
      </div>

      <section className="tournament-content-grid">
        <Card as="article">
          <span className="page-eyebrow">Original Predictor</span>
          <h2>One pre-tournament competition</h2>
          <ul className="content-list">
            <li>Predict the 90-minute score in all {totals.groupMatches} group matches.</li>
            <li>Use up to {EURO_SCORING_CONFIG.joker.GROUP_STAGE_CAP} group-stage jokers at {EURO_SCORING_CONFIG.joker.MULTIPLIER}× points.</li>
            <li>Choose only the advancing team in each of the {totals.knockoutMatches} pre-tournament bracket matches.</li>
            <li>The bracket has {EURO_SCORING_CONFIG.joker.ORIGINAL_BRACKET_CAP} jokers.</li>
            <li>Prediction content locks at the tournament’s first kick-off.</li>
          </ul>
        </Card>

        <Card as="article">
          <span className="page-eyebrow">KO Predictor</span>
          <h2>A separate knockout competition</h2>
          <ul className="content-list">
            <li>Uses the {totals.knockoutMatches} real knockout fixtures after they are known.</li>
            <li>Predict the 90-minute score, advancing team and decision method separately.</li>
            <li>Use up to {EURO_SCORING_CONFIG.joker.KO_PREDICTOR_CAP} independent KO Predictor jokers.</li>
            <li>Its points, leaderboard and winner never combine with the Original Predictor.</li>
          </ul>
        </Card>
      </section>

      <Card as="section" className="tournament-scoring">
        <div className="home-section-heading">
          <div><span className="page-eyebrow">Central scoring configuration</span><h2>Current provisional values</h2></div>
          <Badge tone="warning">{EURO_SCORING_CONFIG.status}</Badge>
        </div>
        <div className="tournament-score-grid">
          <div><strong>{EURO_SCORING_CONFIG.match.EXACT_SCORE}</strong><span>Exact score</span></div>
          <div><strong>{EURO_SCORING_CONFIG.match.CORRECT_OUTCOME}</strong><span>Correct outcome</span></div>
          <div><strong>{EURO_SCORING_CONFIG.koPredictor.CORRECT_ADVANCING_TEAM}</strong><span>KO advancing team</span></div>
          <div><strong>{EURO_SCORING_CONFIG.koPredictor.CORRECT_DECISION_METHOD}</strong><span>KO method</span></div>
          <div><strong>{EURO_SCORING_CONFIG.joker.MULTIPLIER}×</strong><span>Joker multiplier</span></div>
        </div>
      </Card>

      <Card as="section">
        <div className="home-section-heading"><div><span className="page-eyebrow">Official match skeleton</span><h2>Tournament stages</h2></div><Badge>{totals.matches} matches</Badge></div>
        <div className="tournament-stage-list">
          {stages.map(stage => (
            <div key={stage.id}>
              <span><strong>{stage.name}</strong><small>{formatDate(stage.starts_on)} – {formatDate(stage.ends_on)}</small></span>
              <b>{stage.expected_match_count} matches</b>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
