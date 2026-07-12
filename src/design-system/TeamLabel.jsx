import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { flagAssetForTeamIso, normaliseTeamIsoCode } from './teamFlagRegistry.js'
import { useTeamProfileActivation } from './teamProfileContext.js'
import { resolveTeamProfileActivation } from './teamProfileActivation.js'
import styles from './TeamLabel.module.css'

/**
 * The shared team identity: circular ISO-keyed flag + name.
 *
 * Three states, and exactly three — the law TeamBadge already follows:
 *
 *   unresolved slot             -> neutral dashed placeholder ring (no letters)
 *   resolved team, flag found   -> the flag
 *   resolved team, flag MISSING -> a loud danger chip, never the dashed ring
 *
 * The third state is a DEFECT, not an empty slot. Until this stage a registry
 * miss fell through to the same `!flagUrl` branch as an empty slot, so a
 * resolved team silently wore the empty-slot treatment — the DP-HOME defect,
 * fixed on TeamBadge in 8f4ea93 and fixed here now.
 *
 * `unresolved` answers ONE question: is there a team behind this slot? It is not
 * the same question as whether the assignment is provisional. A provisional team
 * is still a resolved team: it keeps its flag and adds the "Provisional" line.
 * Every one of staging's 24 tournament_teams rows carries is_provisional = true
 * (the draw has not been made), so conflating the two blanks the whole board.
 */
export default function TeamLabel({
  team,
  label,
  isoCode,
  isProvisional,
  unresolved,
  compact = false,
  stacked = false,
  alignEnd = false,
  collapseCopy = false,
  onActivate = null,
  className = '',
  profileDisabled = false,
}) {
  const profileActivation = useTeamProfileActivation()
  const resolvedLabel = label ?? team?.label ?? 'To be confirmed'
  const resolvedIso = normaliseTeamIsoCode(isoCode ?? team?.isoCode ?? team?.fifaCode)
  const provisional = Boolean(isProvisional ?? team?.isProvisional)

  // A slot is unresolved when no team is behind it — `!actualTeamId`, nothing
  // else. Reference records from guestReferenceModel always carry the key (it is
  // null when the slot is empty), so `in` distinguishes "this record says the
  // slot is empty" from "this caller passed a bare {label, isoCode} object and
  // never had the field to begin with". An explicit prop still wins, because
  // bracket and KO surfaces know about slots the reference model does not.
  //
  // No record AT ALL is the emptiest a slot gets, and it is the common case: the
  // reference lookups (`id ? teamsById[id] : null`) hand back null for every KO
  // fixture whose teams the group stage has not produced yet. Such a slot has no
  // flag for the same reason it has no name — nobody is in it — so it must not
  // be read as a resolved team with a broken flag. Absent a record, an isoCode is
  // the only other way a caller names a team; with neither, the slot is empty.
  const slotIsEmpty = team
    ? ('actualTeamId' in team ? !team.actualTeamId : false)
    : !resolvedIso
  const isUnresolved = Boolean(unresolved ?? team?.unresolved ?? slotIsEmpty)

  const flagUrl = isUnresolved ? null : flagAssetForTeamIso(resolvedIso)
  const missingFlag = !isUnresolved && !flagUrl

  const activation = profileDisabled ? null : resolveTeamProfileActivation({
    unresolved: isUnresolved,
    team,
    explicitHandler: onActivate,
    contextHandler: profileActivation?.openTeamProfile,
  })

  const classes = [
    styles.teamLabel,
    compact ? styles.compact : '',
    stacked ? styles.stacked : '',
    alignEnd ? styles.alignEnd : '',
    collapseCopy ? styles.collapseCopy : '',
    activation ? styles.interactive : '',
    className,
  ].filter(Boolean).join(' ')

  // Three states, three branches. Kept explicit rather than folded into one
  // computed attribute so that each one is greppable and none can be quietly
  // merged back into another — the merge is exactly what the bug was.
  let chip
  if (isUnresolved) {
    chip = (
      <span
        className={`${styles.flag} ${styles.placeholder}`}
        data-team-label="placeholder"
        aria-hidden="true"
      />
    )
  } else if (missingFlag) {
    chip = (
      <span
        className={`${styles.flag} ${styles.missingFlag}`}
        data-team-label="missing-flag"
        data-missing-iso={resolvedIso ?? 'none'}
        role="img"
        aria-label={`Flag missing for ${resolvedLabel}`}
        title={`Flag missing for ${resolvedLabel} (code ${resolvedIso ?? 'none'})`}
      >!</span>
    )
  } else {
    chip = (
      <span className={styles.flag} data-team-label="flag" aria-hidden="true">
        <img src={flagUrl} alt="" />
      </span>
    )
  }

  const content = (
    <>
      {chip}
      <span className={styles.copy} data-team-label-copy="true">
        <strong>{resolvedLabel}</strong>
        {provisional && <small>Provisional</small>}
      </span>
    </>
  )

  if (activation) {
    return (
      <button
        type="button"
        className={classes}
        onClick={activation}
        aria-label={`Open ${resolvedLabel} team profile`}
        data-team-profile-trigger="true"
        data-team-provisional={provisional || undefined}
      >
        {content}
      </button>
    )
  }

  return (
    <span className={classes} data-team-provisional={provisional || undefined}>
      {content}
    </span>
  )
}
