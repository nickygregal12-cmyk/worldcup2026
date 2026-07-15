import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import styles from './PlayerIdentity.module.css'

function initialsForName(value) {
  const parts = String(value ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase()).join('')
}

export default function PlayerIdentity({
  player,
  isCurrentUser = false,
  onActivate = null,
  meta = null,
  size = 'medium',
  inline = false,
  actionLabel = null,
  className = '',
}) {
  const displayName = String(player?.displayName ?? 'Player').trim() || 'Player'
  // Your own name is just as clickable as anyone else's: callers that offer an
  // activation are offering it for every row, including the current user's.
  const interactive = typeof onActivate === 'function'
  // inline keeps name and meta on ONE line (compact table rows at the 48px floor); the default
  // stacks them.
  const copyClass = `${styles.copy} ${inline ? styles.copyInline : ''}`.trim()
  const content = (
    <>
      <span className={styles.avatar} aria-hidden="true">{initialsForName(displayName)}</span>
      <span className={copyClass}>
        <span className={styles.name}>{displayName}</span>
        {(meta || isCurrentUser) && (
          <span className={`${styles.meta} ${isCurrentUser ? styles.current : ''}`.trim()}>
            {isCurrentUser ? 'You' : meta}
          </span>
        )}
      </span>
    </>
  )
  const classes = `${styles.identity} ${size === 'large' ? styles.large : ''} ${interactive ? styles.button : ''} ${className}`.trim()

  if (interactive) {
    return (
      <button
        type="button"
        className={classes}
        onClick={() => onActivate(player)}
        aria-label={actionLabel ?? (isCurrentUser ? 'Open your player view' : `Compare predictions with ${displayName}`)}
        data-player-identity-trigger="true"
      >
        {content}
      </button>
    )
  }

  return <span className={classes} data-player-identity="true">{content}</span>
}
