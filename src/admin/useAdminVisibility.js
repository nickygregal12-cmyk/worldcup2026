import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadAdminAccess } from './adminOperationsService.js'
import { ADMIN_VISIBILITY_STATUS, deriveAdminVisibility } from './adminVisibilityModel.js'

function message(error) {
  return error instanceof Error ? error.message : String(error)
}

export function useAdminVisibility({ client, tournamentId, sessionState, fixtureAccess = null }) {
  const userId = sessionState.session?.user?.id ?? null
  const [revision, setRevision] = useState(0)
  const requestKey = userId && tournamentId ? `${userId}:${tournamentId}:${revision}` : null
  const [result, setResult] = useState(() => ({ key: fixtureAccess ? 'fixture' : null, access: fixtureAccess, error: null }))

  const retry = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    if (fixtureAccess || sessionState.status === 'loading' || !userId || !client || !tournamentId || !requestKey) return undefined
    let active = true
    loadAdminAccess(client, tournamentId)
      .then(access => { if (active) setResult({ key: requestKey, access, error: null }) })
      .catch(error => { if (active) setResult({ key: requestKey, access: null, error: message(error) }) })
    return () => { active = false }
  }, [client, tournamentId, sessionState.status, userId, fixtureAccess, requestKey])

  return useMemo(() => {
    if (fixtureAccess) {
      return Object.freeze({ ...deriveAdminVisibility({ sessionStatus: 'ready', session: sessionState.session, access: fixtureAccess }), retry })
    }
    if (requestKey && result.key !== requestKey) {
      return Object.freeze({ status: ADMIN_VISIBILITY_STATUS.CHECKING, isAdmin: false, role: null, error: null, retry })
    }
    return Object.freeze({
      ...deriveAdminVisibility({
        sessionStatus: sessionState.status,
        session: sessionState.session,
        access: result.access,
        accessError: result.error,
      }),
      retry,
    })
  }, [fixtureAccess, requestKey, result, retry, sessionState.session, sessionState.status])
}
