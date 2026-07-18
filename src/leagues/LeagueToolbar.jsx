import { Icon } from '../design-system/index.jsx'
import { LeaguePicker } from './LeaguePresentation.jsx'
import styles from './LeagueToolbar.module.css'

// Chip rail on top, then the dashed Create/Join pair (consolidated prototype-pack
// ruling 2026-07-18). Both dashed actions open the same manage panel, which holds
// the create and join forms.
export default function LeagueToolbar({ leagues, selectedLeagueId, onSelectLeague, manageOpen, onToggleManage }) {
  return (
    <div className={styles.toolbar}>
      <LeaguePicker leagues={leagues} selectedId={selectedLeagueId} onSelect={onSelectLeague} />
      <div className={styles.manageRow}>
        <button type="button" className={styles.manage} onClick={onToggleManage} aria-expanded={manageOpen}>
          <Icon name="plus" size={13} />
          <span>Create league</span>
        </button>
        <button type="button" className={styles.manage} onClick={onToggleManage} aria-expanded={manageOpen}>
          <Icon name="account-plus" size={13} />
          <span>Join with code</span>
        </button>
      </div>
    </div>
  )
}
