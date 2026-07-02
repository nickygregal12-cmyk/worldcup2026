export const THEME_STORAGE_KEY = 'euro28:theme'
export const THEME_CHOICE = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
})

export function readThemeChoice(storage) {
  try {
    const value = storage?.getItem?.(THEME_STORAGE_KEY)
    return Object.values(THEME_CHOICE).includes(value) ? value : THEME_CHOICE.SYSTEM
  } catch {
    return THEME_CHOICE.SYSTEM
  }
}

export function resolveTheme(choice, prefersDark = false) {
  if (choice === THEME_CHOICE.DARK) return THEME_CHOICE.DARK
  if (choice === THEME_CHOICE.LIGHT) return THEME_CHOICE.LIGHT
  return prefersDark ? THEME_CHOICE.DARK : THEME_CHOICE.LIGHT
}

export function nextThemeChoice(resolvedTheme) {
  return resolvedTheme === THEME_CHOICE.DARK ? THEME_CHOICE.LIGHT : THEME_CHOICE.DARK
}
