import { useEffect, useState } from 'react'
import { getNow } from '../lib/clock.js'
import { Icon } from '../design-system/index.jsx'
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

function headline(live) {
  if (!live) return 'Predictions are locked.'
  if (live.days > 0) return `${live.days} day${live.days === 1 ? '' : 's'} to lock-in.`
  if (live.hours > 0) return `${live.hours} hour${live.hours === 1 ? '' : 's'} to lock-in.`
  return `${Math.max(live.minutes, 1)} minute${live.minutes === 1 ? '' : 's'} to lock-in.`
}

/**
 * The pre-tournament hero — the prototype's pitch card (full-redesign ruling
 * 2026-07-18): kick-off pill, "N days to lock-in." headline, the prediction
 * meter and the primary actions, all on one card. The provisional indicator is
 * a mandated fail-loud feature and stays.
 */
export default function CountdownHero({ lockAt, countdown, openingMatch, provisional = false, original = null, predictionCta = null, actions = null }) {
  const live = useCountdown(lockAt, countdown)
  const where = openingMatch?.venueName ?? ''
  const done = original?.totalComplete ?? 0
  const total = original?.total ?? 0
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <section className={styles.countHero} aria-label="Countdown to prediction lock">
      <span className={styles.countRing} aria-hidden="true" />
      <div className={styles.countBody}>
        <span className={styles.countPill}>
          <Icon name="clock" size={12} />
          Kick-off {formatKickoffDateTime(lockAt)}{where ? ` · ${where}` : ''}
        </span>
        <h1 className={styles.countBig}>{headline(live)}</h1>
        <p className={styles.countCopy}>
          Every group score and every bracket pick freezes at the first kick-off.
          After that, it&rsquo;s all tracking and bragging rights.
        </p>

        {provisional && (
          <p className={styles.countProvisional}><span>Provisional — kick-off time not confirmed</span></p>
        )}

        {original && (
          <div className={styles.countMeterBlock}>
            <div className={styles.countMeterRow}>
              <span>Predictions complete</span>
              <strong>{done}/{total}</strong>
            </div>
            <div
              className={styles.countMeter}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              aria-label={`Your predictions: ${done} of ${total} complete`}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        <div className={styles.countActions}>
          {predictionCta && (
            <a className={styles.countAction} href={predictionCta.href}>
              {done === total && total > 0 ? 'Review your picks' : done > 0 ? 'Continue predicting' : 'Start predicting'}
            </a>
          )}
          <a className={styles.countActionGhost} href="#/bracket">Build bracket</a>
          {actions}
        </div>
      </div>
    </section>
  )
}
