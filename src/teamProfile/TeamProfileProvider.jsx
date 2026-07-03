import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TeamProfileContext } from '../design-system/teamProfileContext.js'
import TeamProfileSheet from './TeamProfileSheet.jsx'
import { loadTeamProfileSheet } from './teamProfileService.js'

export default function TeamProfileProvider({ client, reference, lifecycle = null, autoOpenTeam = null, children }) {
  const requestRef = useRef(0)
  const [state, setState] = useState({ open: false, status: 'idle', team: null, data: null, error: null })

  const load = useCallback(async team => {
    const requestId = ++requestRef.current
    setState({ open: true, status: 'loading', team, data: null, error: null })
    try {
      const data = await loadTeamProfileSheet(client, { reference, team })
      if (requestId !== requestRef.current) return
      setState({ open: true, status: data.status === 'error' ? 'error' : 'ready', team, data, error: data.errors?.[0] ?? null })
    } catch (error) {
      if (requestId !== requestRef.current) return
      setState({ open: true, status: 'error', team, data: null, error: error instanceof Error ? error.message : String(error) })
    }
  }, [client, reference])

  const close = useCallback(() => {
    requestRef.current += 1
    setState(previous => ({ ...previous, open: false }))
  }, [])

  const retry = useCallback(() => {
    if (state.team) void load(state.team)
  }, [load, state.team])

  const autoOpenRef = useRef(false)
  useEffect(() => {
    if (!autoOpenTeam || autoOpenRef.current) return
    autoOpenRef.current = true
    void load(autoOpenTeam)
  }, [autoOpenTeam, load])

  const value = useMemo(() => ({ openTeamProfile: load }), [load])

  return (
    <TeamProfileContext.Provider value={value}>
      {children}
      <TeamProfileSheet open={state.open} state={state} lifecycle={lifecycle} onClose={close} onRetry={retry} />
    </TeamProfileContext.Provider>
  )
}
