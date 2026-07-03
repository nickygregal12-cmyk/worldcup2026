import { useEffect, useState } from 'react'
import { routeFromHash } from './appRoutes.js'

function currentLocation() {
  const hash = typeof window === 'undefined' ? '' : window.location.hash
  return Object.freeze({ hash, route: routeFromHash(hash) })
}

export function useHashLocation() {
  const [location, setLocation] = useState(currentLocation)

  useEffect(() => {
    const handleHashChange = () => {
      setLocation(currentLocation())
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return location
}

export function useHashRoute() {
  return useHashLocation().route
}
