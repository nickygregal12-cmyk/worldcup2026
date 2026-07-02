import { useEffect, useMemo, useState } from 'react'
import { nextThemeChoice, readThemeChoice, resolveTheme, THEME_CHOICE, THEME_STORAGE_KEY } from './theme.js'

function browserStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}


function visualThemeChoice() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  if (!['stage13a', 'stage13b'].includes(params.get('visual'))) return null
  const requested = params.get('theme')
  return requested === THEME_CHOICE.DARK || requested === THEME_CHOICE.LIGHT ? requested : null
}

function mediaQuery() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null
}

export function useTheme() {
  const query = useMemo(() => mediaQuery(), [])
  const storage = useMemo(() => browserStorage(), [])
  const [choice, setChoice] = useState(() => visualThemeChoice() ?? readThemeChoice(storage))
  const [prefersDark, setPrefersDark] = useState(() => Boolean(query?.matches))
  const resolvedTheme = resolveTheme(choice, prefersDark)

  useEffect(() => {
    if (!query) return undefined
    const handleChange = event => setPrefersDark(event.matches)
    query.addEventListener?.('change', handleChange)
    return () => query.removeEventListener?.('change', handleChange)
  }, [query])

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const chooseTheme = nextChoice => {
    const safeChoice = Object.values(THEME_CHOICE).includes(nextChoice) ? nextChoice : THEME_CHOICE.SYSTEM
    setChoice(safeChoice)
    try {
      if (safeChoice === THEME_CHOICE.SYSTEM) storage?.removeItem(THEME_STORAGE_KEY)
      else storage?.setItem(THEME_STORAGE_KEY, safeChoice)
    } catch {
      // Theme persistence is optional; the active session still updates.
    }
  }

  return {
    choice,
    resolvedTheme,
    chooseTheme,
    toggleTheme: () => chooseTheme(nextThemeChoice(resolvedTheme)),
  }
}
