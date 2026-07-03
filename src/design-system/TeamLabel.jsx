import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { flagAssetForTeamIso, normaliseTeamIsoCode } from './teamFlagRegistry.js'
import { useTeamProfileActivation } from './teamProfileContext.js'
import { resolveTeamProfileActivation } from './teamProfileActivation.js'

function initials(label) {
  const words = String(label ?? '').trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'TBC'
}

export default function TeamLabel({
  team,
  label,
  isoCode,
  isProvisional,
  unresolved = false,
  compact = false,
  onActivate = null,
  className = '',
  profileDisabled = false,
}) {
  const profileActivation = useTeamProfileActivation()
  const resolvedLabel = label ?? team?.label ?? 'To be confirmed'
  const resolvedIso = normaliseTeamIsoCode(isoCode ?? team?.isoCode ?? team?.fifaCode)
  const provisional = Boolean(isProvisional ?? team?.isProvisional)
  const flagUrl = !unresolved ? flagAssetForTeamIso(resolvedIso) : null
  const placeholder = unresolved || !flagUrl
  const activation = profileDisabled ? null : resolveTeamProfileActivation({
    unresolved,
    team,
    explicitHandler: onActivate,
    contextHandler: profileActivation?.openTeamProfile,
  })
  const classes = [
    'team-label',
    compact ? 'team-label--compact' : '',
    placeholder ? 'team-label--placeholder' : '',
    provisional ? 'team-label--provisional' : '',
    activation ? 'team-label--interactive' : '',
    className,
  ].filter(Boolean).join(' ')

  const content = (
    <>
      <span className="team-label__flag" aria-hidden="true">
        {flagUrl ? <img src={flagUrl} alt="" /> : <span>{initials(resolvedLabel)}</span>}
      </span>
      <span className="team-label__copy">
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
      >
        {content}
      </button>
    )
  }

  return <span className={classes}>{content}</span>
}
