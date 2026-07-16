import { useMemo, useState } from 'react'
import { Badge, ProgressBar, TeamLabel } from '../design-system/index.jsx'
import { buildOriginalBracketHealth } from './bracketHealthModel.js'
import { BRACKET_HEALTH_BEST_THIRD_PENDING, BRACKET_HEALTH_PROJECTED_LABEL, bracketHealthProvenance } from './bracketHealthCopy.js'
import styles from './OriginalBracketHealth.module.css'

function team(reference, teamId) {
  return teamId ? reference.teamsById?.[teamId] ?? null : null
}

function Matchup({ reference, homeTeamId, awayTeamId, unresolved = false }) {
  return (
    <div className={styles.matchup}>
      <TeamLabel team={team(reference, homeTeamId)} unresolved={unresolved || !homeTeamId} label={homeTeamId ? undefined : 'To be confirmed'} compact />
      <span>vs</span>
      <TeamLabel team={team(reference, awayTeamId)} unresolved={unresolved || !awayTeamId} label={awayTeamId ? undefined : 'To be confirmed'} compact />
    </div>
  )
}

// `model` lets the caller hand in a model it has already built — the Bracket page needs one
// anyway to put the alive count on the Health tab, and building it twice would be waste.
// Left optional so the component still stands alone.
export default function OriginalBracketHealth({ reference, preview, liveSnapshot, status = 'ready', error = null, model: providedModel = null, subjectLabel = 'Your' }) {
  const builtModel = useMemo(() => !providedModel && status === 'ready' && liveSnapshot
    ? buildOriginalBracketHealth({ reference, preview, liveSnapshot })
    : null, [liveSnapshot, preview, providedModel, reference, status])
  const model = providedModel ?? builtModel
  const [roundKey, setRoundKey] = useState('round_of_16')

  if (status === 'loading') return <div className={styles.state} role="status">Loading live bracket comparison…</div>
  if (status === 'error') return <div className={styles.state} role="alert">Live bracket comparison is unavailable. {error}</div>
  if (model?.status === 'pending') return <div className={styles.state}>Bracket health appears once the live group tables have enough results to project the knockout places.</div>
  if (!model || model.status !== 'ready') return null

  const round = model.rounds.find(item => item.key === roundKey) ?? model.rounds[0]
  const cards = model.cards.filter(card => card.stage === round.key)

  return (
    <section className={styles.root} aria-labelledby="bracket-health-heading">
      <div className={styles.heading}>
        <div>
          <span>Live comparison</span>
          <h3 id="bracket-health-heading">{subjectLabel} Original bracket health</h3>
          <p>{subjectLabel} saved bracket never changes. Known real fixtures are compared against it; unresolved fixtures continue to show the original matchup.</p>
        </div>
        <Badge tone={model.provisional ? 'warning' : 'info'}>
          {model.provisional ? 'Provisional' : 'Prediction remains locked'}
        </Badge>
      </div>

      {/* Fail-loud provenance (§5): while any slot is filled from a projection rather than
          a finished group, the panel says so in its own words and shows its working. */}
      {model.provisional && (
        <p className={styles.provenance}>
          {bracketHealthProvenance({
            groupsReady: model.projection.groupsReadyCount,
            groupsTotal: model.projection.groupsTotal,
          })}
          {!model.projection.allGroupsReady && ` ${BRACKET_HEALTH_BEST_THIRD_PENDING}`}
        </p>
      )}

      <nav className={styles.roundTabs} aria-label="Bracket health rounds">
        {model.rounds.map(item => (
          <button type="button" key={item.key} className={item.key === round.key ? styles.activeTab : ''} onClick={() => setRoundKey(item.key)}>
            <span>{item.label}</span><strong>{item.alive}/{item.total} alive</strong>
          </button>
        ))}
      </nav>

      <article className={styles.summary}>
        <div><span>{round.label} health</span><strong>{round.alive}/{round.total} predicted teams still alive</strong></div>
        <b>{round.healthPercent}%</b>
        <ProgressBar value={round.alive} max={Math.max(1, round.total)} label={`${round.label} bracket health`} />
        <div className={styles.metrics}>
          <span>{round.alive} alive</span><span>{round.out} out</span><span>+{round.securedPoints} secured</span><span>Up to {round.remainingPoints} remain</span>
        </div>
      </article>

      <div className={styles.cards}>
        {cards.map(card => (
          <article className={`${styles.card} ${styles[`tone_${card.tone}`]}`} key={card.matchNumber}>
            <div className={styles.cardMeta}>
              <span>{subjectLabel} original pick · M{card.matchNumber}</span>
              <Badge tone={card.tone === 'neutral' ? 'info' : card.tone}>{card.title}</Badge>
            </div>

            {card.liveParticipantsProjected ? (
              <>
                <span className={`${styles.contextLabel} ${styles.contextProjected}`}>{BRACKET_HEALTH_PROJECTED_LABEL}</span>
                <Matchup reference={reference} homeTeamId={card.liveHomeTeamId} awayTeamId={card.liveAwayTeamId} />
              </>
            ) : card.liveParticipantsKnown ? (
              <>
                <span className={styles.contextLabel}>Known real fixture</span>
                <Matchup reference={reference} homeTeamId={card.liveHomeTeamId} awayTeamId={card.liveAwayTeamId} />
                {(card.score || card.resultDetail) && <small>{[card.score, card.resultDetail].filter(Boolean).join(' · ')}</small>}
              </>
            ) : (
              <>
                <span className={styles.contextLabel}>Real fixture not known yet</span>
                <Matchup reference={reference} homeTeamId={card.originalHomeTeamId} awayTeamId={card.originalAwayTeamId} />
              </>
            )}

            <div className={styles.explanation}>
              <strong>{card.title}</strong>
              <p>{card.description}</p>
              {card.selectedTeamId && <span>Saved winner: <TeamLabel team={team(reference, card.selectedTeamId)} compact /></span>}
            </div>

            <div className={styles.cardFooter}>
              <span>{card.pointsSecured > 0 ? `+${card.pointsSecured} points secured` : card.pointsAvailable > 0 ? `${card.pointsAvailable} points available` : 'Original pick preserved'}</span>
              {card.matchCentreHref && <a href={card.matchCentreHref}>View Match Centre →</a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
