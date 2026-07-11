import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
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
 */
export default function TeamBadge({ team, className = '' }) {
  const flagUrl = team && !team.unresolved ? flagAssetForTeamIso(team.isoCode) : null
  const classes = [styles.badge, flagUrl ? '' : styles.placeholder, className].filter(Boolean).join(' ')

  if (!flagUrl) return <span className={classes} aria-hidden="true" />
  return <img className={classes} src={flagUrl} alt="" aria-hidden="true" />
}
