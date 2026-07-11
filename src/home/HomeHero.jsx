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

  const where = [openingMatch?.venueName].filter(Boolean).join('')
  const ribbon = openingMatch
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
          once. */}
      {ribbon && <span className={styles.countRibbon}>{ribbon}</span>}

      <div className={styles.countBody}>
        {ribbon && <span className={styles.countTag}>{ribbon}</span>}
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
