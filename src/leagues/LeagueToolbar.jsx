import { Icon } from '../design-system/index.jsx'
import { LeaguePicker } from './LeaguePresentation.jsx'
import styles from './LeagueToolbar.module.css'

export default function LeagueToolbar({ leagues, selectedLeagueId, onSelectLeague, manageOpen, onToggleManage }) {
  return (
    <div className={styles.toolbar}>
      <LeaguePicker leagues={leagues} selectedId={selectedLeagueId} onSelect={onSelectLeague} />
      <button type="button" className={styles.manage} onClick={onToggleManage} aria-expanded={manageOpen}>
        <Icon name="settings" size={17} />
        <span>Manage leagues</span>
      </button>
    </div>
  )
}
