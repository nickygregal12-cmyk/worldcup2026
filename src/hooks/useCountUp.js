import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number from its previous value (0 on first mount) to `target`.
 * - Ease-out cubic over `duration` ms via requestAnimationFrame
 * - Respects prefers-reduced-motion (jumps straight to target)
 * - If `target` changes later (e.g. live point updates), animates from
 *   the last displayed value rather than restarting at 0
 */
export function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) return

    const reduceMotion = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion || target === fromRef.current) {
      fromRef.current = target
      setValue(target)
      return
    }

    const from = fromRef.current
    const start = performance.now()

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      const current = Math.round(from + (target - from) * eased)
      setValue(current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      fromRef.current = target // if unmounted mid-animation, snap forward
    }
  }, [target, duration])

  return value
}
