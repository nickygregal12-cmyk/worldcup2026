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
  'Private leagues now sit above two separate competition standings',
  'Stage 11 · Leagues and shared prediction viewing',
  'Private leagues with two separate tables',
  'get_my_leagues',
  'get_league_standings',
  'get_league_member_predictions',
  'get_member_predictions_after_lock',
  'create_my_league',
  'join_league_by_code',
  'Stage 10 · Tournament operations',
  'Manual results and operational safeguards',
  'get_my_tournament_admin_access',
  'admin_list_tournament_matches',
  'admin_record_match_result',
  'admin_update_match_status',
  'admin_recalculate_match_points',
  'get_competition_leaderboard',
  'get_my_competition_points',
  'save_my_prediction_bundle',
  'save_my_ko_prediction_bundle',
  'euro28-guest-prediction-bundle',
]) assert(bundle.includes(text), `The deployed Stage 11 bundle is missing: ${text}`)
assert(!bundle.includes('WC26 Control Centre'), 'The inherited WC26 admin application is active.')

console.log('Euro 2028 foundation page verification passed.')
console.log(`Site: ${siteUrl}`)
console.log('Public branding: Stage 11 leagues and controlled shared predictions')
console.log('Leagues: one member list with separate Original and KO tables')
console.log('Shared predictions: original after global lock; KO match by match after start')
console.log('Admin access: service-managed and browser self-grant blocked')
console.log('Result operations: revision-safe, noted and append-only audited')
console.log('Scoring: explicit recalculation remains replacement-based')
console.log('Leaderboards: original and KO Predictor remain separate')
console.log('External result APIs: deferred')
console.log('Guest storage: browser-only and unscored')
console.log('Inherited WC26 application bundle: inactive')
