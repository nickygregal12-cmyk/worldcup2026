import styles from './LeagueCollectionTabs.module.css'
import { LEAGUE_COMPETITION } from './leagueModel.js'

const COLLECTIONS = Object.freeze([
  Object.freeze({ key: LEAGUE_COMPETITION.ORIGINAL, label: 'Original', fullLabel: 'Original Predictor' }),
  Object.freeze({ key: LEAGUE_COMPETITION.KO_PREDICTOR, label: 'KO', fullLabel: 'KO Predictor' }),
])

export function LeagueCollectionTabs({ activeCompetition, collections, onChange }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Predictor league collection">
      {COLLECTIONS.map(collection => {
        const count = collections[collection.key]?.length ?? 0
        const selected = activeCompetition === collection.key
        return (
          <button
            key={collection.key}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="league-collection-panel"
            className={styles.tab}
            onClick={() => onChange(collection.key)}
          >
            <span>{collection.label}</span>
            <small>{count} league{count === 1 ? '' : 's'}</small>
            <span className="sr-only">{collection.fullLabel}</span>
          </button>
        )
      })}
    </div>
  )
}

export function EmptyLeagueCollection({ competitionKey }) {
  const ko = competitionKey === LEAGUE_COMPETITION.KO_PREDICTOR
  return (
    <div className={styles.empty}>
      <strong>{ko ? 'No KO Predictor leagues yet' : 'No Original Predictor leagues yet'}</strong>
      <p>{ko
        ? 'Create a fresh KO league or join one with its invite code. Original league memberships do not carry across.'
        : 'Create your first Original league or join one with an invite code.'}</p>
    </div>
  )
}
