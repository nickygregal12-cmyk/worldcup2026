import { useEffect, useMemo, useState } from 'react'
import { getNow, subscribeToClock } from '../lib/clock.js'
import { resolveTournamentLifecycle } from './tournamentLifecycle.js'

/**
 * setTimeout stores its delay in a signed 32-bit int. The prediction lock is years
 * out, so the true delay overflows and the timer fires immediately instead of never
 * — which would spin. We therefore sleep in chunks and re-arm until the instant
 * actually arrives.
 */
const MAX_TIMEOUT_MS = 2_147_483_647

function instantOf(value) {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

/**
 * Re-render the caller when the clock crosses `boundaryIso`, and whenever the
 * simulated clock is moved.
 *
 * Lock state used to be decided once, inside a useMemo keyed on the tournament, so a
 * page held open across the first kick-off kept an editable board until reload — and
 * under time travel the lock never engaged at all. Deciding it against a `now` that
 * is itself state is what makes the lock engage on an open page.
 */
export function useTournamentNow(boundaryIso) {
  const [now, setNow] = useState(getNow)

  useEffect(() => {
    let timer = null

    const clear = () => {
      if (timer != null) globalThis.clearTimeout(timer)
      timer = null
    }

    const schedule = () => {
      clear()
      const boundary = instantOf(boundaryIso)
      if (boundary == null) return
      const remaining = boundary - getNow().getTime()
      // Past the boundary there is nothing left to wait for: the lock is monotonic,
      // so this stops re-arming rather than ticking forever.
      if (remaining <= 0) return
      timer = globalThis.setTimeout(cross, Math.min(remaining, MAX_TIMEOUT_MS))
    }

    // Publish the current time, then re-arm: after a clamped chunk this simply sleeps
    // again; at the boundary the re-arm is a no-op and `locked` has already flipped.
    const cross = () => {
      setNow(getNow())
      schedule()
    }

    const unsubscribe = subscribeToClock(cross)
    schedule()

    return () => {
      clear()
      unsubscribe()
    }
  }, [boundaryIso])

  return now
}

/**
 * The live tournament lifecycle: identical to resolveTournamentLifecycle, except that
 * it re-evaluates when the lock instant passes instead of freezing at mount.
 */
export function useTournamentLifecycle(tournament) {
  // predictionLockAt does not depend on `now`, so resolving it against the current
  // clock is enough to learn the boundary we must wake up for.
  const boundaryIso = resolveTournamentLifecycle(tournament).predictionLockAt
  const now = useTournamentNow(boundaryIso)
  return useMemo(() => resolveTournamentLifecycle(tournament, now), [tournament, now])
}
