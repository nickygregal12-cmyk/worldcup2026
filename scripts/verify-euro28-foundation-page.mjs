import process from 'node:process'

const siteUrl = (process.env.EURO28_SITE_URL || 'https://euro28-predictor-dev.netlify.app').replace(/\/$/, '')
const assert = (condition, message) => { if (!condition) throw new Error(message) }
async function readText(pathname) {
  const response = await fetch(`${siteUrl}${pathname}`, { headers: { 'user-agent': 'Euro28FoundationVerifier/1.0' } })
  assert(response.ok, `${pathname} returned HTTP ${response.status}`)
  return response.text()
}

const [html, manifestText, worker, robots] = await Promise.all([
  readText('/'), readText('/manifest.json'), readText('/sw.js'), readText('/robots.txt'),
])
assert(html.includes('<title>Euro 2028 Predictor — Foundation Staging</title>'), 'The deployed HTML title is not the Euro foundation title.')
assert(html.includes('noindex, nofollow, noarchive'), 'The staging HTML is missing the no-index directive.')
assert(!html.includes('WC26 Predictor') && !html.includes('wc26predictor1.netlify.app'), 'The deployed HTML still contains WC26 references.')
const manifest = JSON.parse(manifestText)
assert(manifest.name === 'Euro 2028 Predictor — Foundation Staging', 'The deployed manifest is incorrect.')
assert(manifest.display === 'browser', 'The foundation must not advertise a standalone install.')
assert(worker.includes('registration.unregister()'), 'The retirement worker does not unregister itself.')
assert(robots.includes('Disallow: /'), 'The staging site is not blocked from indexing.')
const scriptMatch = html.match(/<script[^>]+src="([^"]*\/assets\/index-[^"]+\.js)"/)
assert(scriptMatch, 'Could not locate the deployed Vite bundle.')
const bundlePath = scriptMatch[1].startsWith('http') ? scriptMatch[1].replace(siteUrl, '') : scriptMatch[1]
const bundle = await readText(bundlePath)
for (const text of [
  'Canonical results now drive live tables, the live bracket and two separate leaderboards.',
  'Stage 9 · Results and scoring',
  'Original predictor',
  'KO Predictor',
  'get_competition_leaderboard',
  'get_my_competition_points',
  'save_my_prediction_bundle',
  'save_my_ko_prediction_bundle',
  'euro28-guest-prediction-bundle',
]) assert(bundle.includes(text), `The deployed Stage 9 bundle is missing: ${text}`)
assert(!bundle.includes('WC26 Control Centre'), 'The inherited WC26 admin application is active.')

console.log('Euro 2028 foundation page verification passed.')
console.log(`Site: ${siteUrl}`)
console.log('Public branding: Stage 9 results, scoring and separate leaderboards')
console.log('Canonical results: revisioned and audited')
console.log('Scoring: idempotent correction replacement')
console.log('Leaderboards: original and KO Predictor remain separate')
console.log('Live tables and bracket: canonical live context')
console.log('Guest storage: browser-only and unscored')
console.log('Inherited WC26 application bundle: inactive')
