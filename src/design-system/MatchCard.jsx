import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config

/**
 * The shared match-card shell used by the Groups predictor and the Home page.
 *
 * Both surfaces show the same three bands — a meta header, a team line, and a
 * footer — and differ only in what sits between the two teams. Groups puts a
 * pair of ScoreInputs there; Home puts a kick-off time, a live score or a
 * full-time score. That difference is the `centre` slot; everything else is
 * shared so the two pages cannot drift apart visually.
 *
 * `as`/`href` let Home render the whole card as a link into Match Centre.
 * Callers that do so must pass `profileDisabled` to any nested TeamLabel,
 * because TeamLabel renders a <button> when a team profile is available and
 * interactive elements cannot legally nest.
 */
export default function MatchCard({
  as: Component = 'article',
  className = '',
  lineClassName = '',
  meta = null,
  badge = null,
  home = null,
  away = null,
  centre = null,
  note = null,
  action = null,
  ...props
}) {
  const showFooter = Boolean(note || action)

  return (
    <Component className={`match-card ${className}`.trim()} {...props}>
      <header className="match-card__header">
        <div>{meta}</div>
        {badge}
      </header>

      <div className={`match-card__line ${lineClassName}`.trim()}>
        <div className="match-card__team match-card__team--home">{home}</div>
        {centre}
        <div className="match-card__team match-card__team--away">{away}</div>
      </div>

      {showFooter && (
        <footer className="match-card__footer">
          {note}
          {action}
        </footer>
      )}
    </Component>
  )
}
