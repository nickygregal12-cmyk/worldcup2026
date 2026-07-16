import { Dialog, Icon } from '../design-system/index.jsx'
import styles from './MoreMenu.module.css'

function describe(destination) {
  if (destination.key === 'results') return 'Scores, live tables and the real bracket'
  if (destination.key === 'leaderboards') return 'Full Original and KO Predictor standings'
  if (destination.key === 'account') return 'Profile, sign-in and account security'
  if (destination.key === 'tournament') return 'Hosts, venues, dates and format'
  if (destination.key === 'how-to-play') return 'Scoring, locks and predictor rules'
  if (destination.key === 'admin') return 'Authorised tournament operations'
  if (destination.key === 'ko-predictor') return 'Predict confirmed real knockout fixtures'
  if (destination.key === 'predict') return 'Review every group-stage prediction'
  if (destination.key === 'review') return 'Check your entry before the tournament lock'
  return ''
}

export default function MoreMenu({ open, onClose, route, groups, theme }) {
  return (
    <Dialog open={open} title="More" onClose={onClose} className={styles.dialog}>
      <div className={styles.directory}>
        {groups.filter(group => group.destinations.length > 0).map(group => (
          <section className={styles.group} key={group.label} aria-labelledby={`more-${group.key}`}>
            <h3 id={`more-${group.key}`}>{group.label}</h3>
            <nav className={styles.list} aria-label={group.label}>
              {group.destinations.map(item => (
                <a
                  key={`${group.key}-${item.key}-${item.label}`}
                  href={item.hash}
                  className={item.key === route ? `${styles.link} ${styles.active}` : styles.link}
                  aria-current={item.key === route ? 'page' : undefined}
                  onClick={onClose}
                >
                  <span className={styles.icon}><Icon name={item.icon} size={20} /></span>
                  <span className={styles.copy}><strong>{item.label}</strong><small>{describe(item)}</small></span>
                  <Icon name="chevron" size={18} />
                </a>
              ))}
            </nav>
          </section>
        ))}
      </div>

      <button type="button" className={styles.theme} onClick={theme.toggleTheme}>
        <span className={styles.icon}><Icon name={theme.resolvedTheme === 'dark' ? 'sun' : 'moon'} size={20} /></span>
        <span className={styles.copy}>
          <strong>{theme.resolvedTheme === 'dark' ? 'Use light mode' : 'Use dark mode'}</strong>
          <small>Appearance is saved on this device</small>
        </span>
        <Icon name="chevron" size={18} />
      </button>
    </Dialog>
  )
}
