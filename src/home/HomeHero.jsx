import { useEffect, useState } from 'react'
import { getNow } from '../lib/clock.js'
import { countdownParts } from './homeDashboardModel.js'
import { formatKickoffDateTime } from './homeFormat.js'
import styles from './HomeHero.module.css'

/** Ticks the countdown without re-fetching the dashboard. Minute granularity. */
function useCountdown(lockAt, initial) {
  const [parts, setParts] = useState(initial)
  useEffect(() => {
    if (!lockAt) return undefined
    const tick = () => setParts(countdownParts(lockAt, getNow()))
    tick()
    const timer = setInterval(tick, 15000)
    return () => clearInterval(timer)
  }, [lockAt])
  return parts
}

/**
 * The broadcast countdown hero.
 *
 * The hero no longer names the two teams. It previously carried a title that
 * fell back to a bare "Match 1" whenever either participant read as unresolved,
 * while the fixture card immediately below named Wales and Germany from the same
 * data — one surface, two conditions, two answers. The re-cut gives the teams a
 * single home: the fixture card. The hero identifies the match (number, group)
 * and the moment, so there is no second condition left to disagree.
 */
export default function CountdownHero({ lockAt, countdown, openingMatch, provisional = false }) {
  const live = useCountdown(lockAt, countdown)
  const units = live
    ? [{ value: live.days, label: 'Days' }, { value: live.hours, label: 'Hours' }, { value: live.minutes, label: 'Mins' }]
    : null

  const where = openingMatch?.venueName ?? ''

  // Two carriers for the match identity, and they do NOT get the same copy.
  //
  // The corner ribbon is a fixed-width band, rotated into a corner that clips it,
  // and it is the variant shown below 64rem — so it is what a 390px phone sees.
  // "MATCH 1 · GROUP A" did not fit: the owner's eye test on the built app caught
  // the final letter sheared off by the clip. Truncated text does not ship, and
  // when the geometry cannot hold the copy, the copy gives way — so the ribbon
  // carries the match number alone.
  //
  // Nothing is lost by that. The flat chip below (shown from 64rem, unrotated and
  // unclipped, with room to spare) keeps the group, and the fixture card directly
  // beneath the hero already reads "GROUP A · MATCH 1" at every width.
  const ribbon = openingMatch ? `Match ${openingMatch.matchNumber}` : null
  const tag = openingMatch
    ? [`Match ${openingMatch.matchNumber}`, openingMatch.stageLabel].filter(Boolean).join(' · ')
    : null

  return (
    <section className={styles.countHero} aria-label="Countdown to prediction lock">
      <span className={styles.countWash} aria-hidden="true" />
      <span className={styles.countHatch} aria-hidden="true" />
      <span className={styles.countAccent} aria-hidden="true" />
      {openingMatch && <span className={styles.countWatermark} aria-hidden="true">{openingMatch.matchNumber}</span>}
      {/* The match identity, as real content rather than decoration. The rotated
          corner ribbon is a mobile device; the wide hero wants a flat chip in the
          body. Exactly one of the two is displayed at any width, so it is spoken
          once — and each carries only the copy its geometry can actually hold. */}
      {ribbon && <span className={styles.countRibbon}>{ribbon}</span>}

      <div className={styles.countBody}>
        {tag && <span className={styles.countTag}>{tag}</span>}
        <h1 className={styles.countEyebrow}>Predictions lock at kick-off</h1>

        {units
          ? (
            <div className={styles.countBig}>
              {units.map(unit => (
                <span className={styles.countUnit} key={unit.label}>
                  <strong>{String(unit.value).padStart(2, '0')}</strong>
                  <small>{unit.label}</small>
                </span>
              ))}
            </div>
          )
          : <div className={styles.countBig}><span className={styles.countUnit}><strong>Locked</strong></span></div>}

        <p className={styles.countWhen}>
          {formatKickoffDateTime(lockAt)}
          {where ? ` · ${where}` : ''}
        </p>

        {provisional && (
          <p className={styles.countProvisional}>
            <span>Provisional — kick-off time not confirmed</span>
          </p>
        )}
      </div>
    </section>
  )
}
