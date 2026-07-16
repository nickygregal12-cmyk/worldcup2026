import { useCallback, useEffect, useMemo, useState } from 'react'
import { getNow } from '../lib/clock.js'
import { GROUPS_VIEW_MODE } from './groupsPresentationModel.js'
import { relevantGroupMatch } from './groupsLandingModel.js'

export const GROUPS_VIEW_STORAGE_KEY = 'euro28:groups-view'

function storedView() {
  try {
    const value = globalThis.localStorage?.getItem(GROUPS_VIEW_STORAGE_KEY)
    return Object.values(GROUPS_VIEW_MODE).includes(value) ? value : GROUPS_VIEW_MODE.GROUP
  } catch {
    return GROUPS_VIEW_MODE.GROUP
  }
}

export default function useGroupsLanding(reference) {
  const relevant = useMemo(() => relevantGroupMatch(reference, getNow()), [reference])
  const [viewMode, setViewModeState] = useState(storedView)
  const [openGroup, setOpenGroup] = useState(relevant?.groupCode ?? reference.groups?.[0]?.code ?? 'A')

  const setViewMode = useCallback(value => {
    setViewModeState(value)
    try { globalThis.localStorage?.setItem(GROUPS_VIEW_STORAGE_KEY, value) } catch { /* preference remains in memory */ }
  }, [])

  useEffect(() => {
    if (!relevant) return undefined

    const run = () => globalThis.document
      ?.getElementById(`group-match-${relevant.matchNumber}`)
      ?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    const frame = globalThis.requestAnimationFrame?.(run)
    if (frame == null) run()
    return () => { if (frame != null) globalThis.cancelAnimationFrame?.(frame) }
  }, [relevant, viewMode])

  return { viewMode, setViewMode, openGroup, setOpenGroup, relevantMatchNumber: relevant?.matchNumber ?? null }
}
