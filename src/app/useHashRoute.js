import { useEffect, useState } from 'react'
import { routeFromHash } from './appRoutes.js'

function currentRoute() {
  if (typeof window === 'undefined') return routeFromHash('')
  return routeFromHash(window.location.hash)
}

export function useHashRoute() {
  const [route, setRoute] = useState(currentRoute)

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(currentRoute())
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return route
}
