import { useCallback, useEffect, useState } from 'react'
import { loadOwnProfile } from './euroAuthService.js'

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

export function useEuroSession(client) {
  const [state, setState] = useState(() => ({
    status: client ? 'loading' : 'unavailable',
    session: null,
    profile: null,
    error: client ? null : 'Account services are unavailable.',
  }))

  const applySession = useCallback(async nextSession => {
    if (!nextSession?.user) {
      setState({ status: 'ready', session: null, profile: null, error: null })
      return
    }

    setState(previous => ({ ...previous, status: 'loading', session: nextSession, error: null }))
    try {
      const profile = await loadOwnProfile(client)
      setState({ status: 'ready', session: nextSession, profile, error: null })
    } catch (error) {
      setState({
        status: 'ready',
        session: nextSession,
        profile: null,
        error: errorMessage(error),
      })
    }
  }, [client])

  useEffect(() => {
    if (!client) return undefined
    let active = true

    client.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return
        if (error) throw error
        return applySession(data?.session ?? null)
      })
      .catch(error => {
        if (!active) return
        setState({ status: 'error', session: null, profile: null, error: errorMessage(error) })
      })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) void applySession(nextSession)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [client, applySession])

  return state
}
