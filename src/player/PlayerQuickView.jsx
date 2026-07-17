import { Dialog, Icon, PlayerIdentity } from '../design-system/index.jsx'
import { LEAGUE_COMPETITION } from '../leagues/leagueModel.js'
import { buildPlayerViewHref } from './playerViewLinks.js'
import styles from './PlayerQuickView.module.css'

function Action({ href, icon, title, copy, onClose }) {
  return (
    <a className={styles.action} href={href} onClick={onClose}>
      <span className={styles.icon}><Icon name={icon} size={19} /></span>
      <span><strong>{title}</strong><small>{copy}</small></span>
      <Icon name="chevron" size={17} />
    </a>
  )
}

export default function PlayerQuickView({ player, competitionKey, onClose }) {
  const open = Boolean(player)
  const playerName = player?.isCurrentUser ? 'Your profile' : player?.displayName ?? 'Player profile'
  const href = tab => buildPlayerViewHref({ userId: player?.userId, competitionKey, tab })

  return (
    <Dialog open={open} title={playerName} onClose={onClose} className={styles.dialog}>
      {player && (
        <div className={styles.body}>
          <PlayerIdentity player={player} isCurrentUser={player.isCurrentUser} size="large" meta={player.memberRole === 'owner' ? 'League owner' : null} />
          <div className={styles.stats} aria-label="League standing summary">
            <div><strong>{player.rank > 0 ? `#${player.rank}` : '—'}</strong><span>League rank</span></div>
            <div><strong>{player.totalPoints ?? 0}</strong><span>Points earned</span></div>
            <div>
              <strong>{player.gapToLeader == null ? '—' : player.gapToLeader === 0 ? 'Top' : player.gapToLeader}</strong>
              <span>{player.gapToLeader > 0 ? 'To leader' : 'Gap'}</span>
            </div>
          </div>
          <nav className={styles.actions} aria-label={`${player.displayName} profile options`}>
            <Action href={href('overview')} icon="account" title="View full profile" copy="Overview, released picks, tables and bracket health" onClose={onClose} />
            <Action href={href('points')} icon="results" title="Points breakdown" copy="See exactly how every available point was earned" onClose={onClose} />
            {!player.isCurrentUser && <Action href={href('headToHead')} icon="leagues" title="Head-to-head" copy="Compare your picks and points side by side" onClose={onClose} />}
            {competitionKey === LEAGUE_COMPETITION.ORIGINAL && <Action href={href('bracket')} icon="bracket" title="Bracket and health" copy="Compare this released knockout path with real life" onClose={onClose} />}
          </nav>
          <p className={styles.privacy}>Points already earned remain visible for fairness. Unreleased selections stay protected by the tournament lock.</p>
        </div>
      )}
    </Dialog>
  )
}
