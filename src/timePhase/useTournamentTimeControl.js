import { useCallback, useEffect, useState } from 'react'
import { ENVIRONMENT } from '../config/environment.js'
import { clearClockOverride, setClockOverride } from '../lib/clock.js'
import { canApplyStagingTime, normaliseTimeControl } from './timePhaseModel.js'
import { loadTournamentTimeControl } from './timePhaseService.js'

const EMPTY = normaliseTimeControl(null)

export function useTournamentTimeControl({ client, tournamentId, disabled = false }) {
  const [state, setState] = useState({ status: disabled ? 'disabled' : 'loading', control: EMPTY, error: null })

  const refresh = useCallback(async () => {
    if (disabled || !client || !tournamentId) return
    try {
      const control = await loadTournamentTimeControl(client, tournamentId)
      if (canApplyStagingTime({ appEnv: ENVIRONMENT.appEnv, enableTimeTravel: ENVIRONMENT.enableTimeTravel, control })) {
        setClockOverride(control.simulatedAt)
      } else {
        clearClockOverride()
      }
      setState({ status: 'ready', control, error: null })
    } catch (error) {
      clearClockOverride()
      setState({ status: 'error', control: EMPTY, error: error instanceof Error ? error.message : String(error) })
    }
  }, [client, disabled, tournamentId])

  useEffect(() => {
    void Promise.resolve().then(refresh)
    if (disabled) return undefined
    const timer = window.setInterval(refresh, 30_000)
    return () => window.clearInterval(timer)
  }, [disabled, refresh])

  return { ...state, refresh }
}
