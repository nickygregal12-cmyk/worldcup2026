import { flagAssetForTeamIso } from './teamFlagRegistry.js'
import styles from './TeamBadge.module.css'

/**
 * The circular ISO-keyed team badge.
 *
 * TeamLabel resolves the same registry, but falls back to a two-letter initial
 * avatar whenever a slot is unresolved or the ISO code misses. An unresolved
 * slot must take the neutral dashed placeholder chip instead — never a letter
 * avatar, never a guessed flag. This renders the badge on its own so a surface
 * can honour that without inheriting the initials fallback.
 *
 * Three states, and exactly three. The dashed ring means ONE thing — this slot
 * has no team yet:
 *
 *   unresolved slot            -> neutral dashed placeholder ring
 *   resolved team, flag found  -> the flag
 *   resolved team, flag MISSING -> a loud danger badge, never the dashed ring
 *
 * The third state is a defect, not an empty slot, and it is deliberately ugly.
 * Before the DP-HOME eye-test fix a missing asset fell through to the same
 * `!flagUrl` branch as an empty slot, so a resolved Wales silently wore the
 * empty-slot treatment and the bug looked like a design. A registry miss now
 * announces itself — visibly, and to a screen reader — and the registry test
 * fails the check suite besides.
 */
export default function TeamBadge({ team, className = '' }) {
  const unresolved = !team || Boolean(team.unresolved)
  const flagUrl = unresolved ? null : flagAssetForTeamIso(team.isoCode)

  if (unresolved) {
    const classes = [styles.badge, styles.placeholder, className].filter(Boolean).join(' ')
    return <span className={classes} data-team-badge="placeholder" aria-hidden="true" />
  }

  if (!flagUrl) {
    const classes = [styles.badge, styles.missingFlag, className].filter(Boolean).join(' ')
    const name = team.label ?? team.isoCode ?? 'this team'
    return (
      <span
        className={classes}
        data-team-badge="missing-flag"
        data-missing-iso={team.isoCode ?? 'none'}
        role="img"
        aria-label={`Flag missing for ${name}`}
        title={`Flag missing for ${name} (code ${team.isoCode ?? 'none'})`}
      >!</span>
    )
  }

  const classes = [styles.badge, className].filter(Boolean).join(' ')
  return <img className={classes} data-team-badge="flag" data-iso={team.isoCode} src={flagUrl} alt="" aria-hidden="true" />
}
