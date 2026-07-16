import process from 'node:process'

export const VISUAL_FIXTURE_ENV = 'VISUAL_USE_FIXTURE'
export const VISUAL_FIXTURE_AUTH_ENV = 'VISUAL_FIXTURE_AUTH'

export function visualFixtureEnabled(env = process.env) {
  return env[VISUAL_FIXTURE_ENV] === 'true'
}

export function resolveVisualAppUrl(origin, route, env = process.env) {
  if (!visualFixtureEnabled(env)) return `${origin}/${route}`

  const auth = env[VISUAL_FIXTURE_AUTH_ENV] === 'guest' ? 'guest' : 'signed-in'
  return `${origin}/visual-product.html?auth=${auth}${route}`
}
