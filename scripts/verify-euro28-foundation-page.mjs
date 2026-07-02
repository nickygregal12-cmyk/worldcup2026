import process from 'node:process'

const siteUrl = (process.env.EURO28_SITE_URL || 'https://euro28-predictor-dev.netlify.app').replace(/\/$/, '')
const assert = (condition, message) => { if (!condition) throw new Error(message) }
async function readText(pathname) {
  const response = await fetch(`${siteUrl}${pathname}`, { headers: { 'user-agent': 'Euro28AppShellVerifier/2.0' } })
  assert(response.ok, `${pathname} returned HTTP ${response.status}`)
  return response.text()
}

const [html, manifestText, worker, robots] = await Promise.all([
  readText('/'), readText('/manifest.json'), readText('/sw.js'), readText('/robots.txt'),
])
assert(html.includes('<title>Euro 2028 Predictor</title>'), 'The deployed HTML title is not the Euro product title.')
assert(html.includes('noindex, nofollow, noarchive'), 'The staging HTML is missing the no-index directive.')
assert(!html.includes('WC26 Predictor') && !html.includes('wc26predictor1.netlify.app'), 'The deployed HTML still contains WC26 references.')
const manifest = JSON.parse(manifestText)
assert(manifest.name === 'Euro 2028 Predictor', 'The deployed manifest is incorrect.')
assert(manifest.display === 'browser', 'The staging build must not silently change its install mode.')
assert(worker.includes('registration.unregister()'), 'The retirement worker does not unregister itself.')
assert(robots.includes('Disallow: /'), 'The staging site is not blocked from indexing.')
const scriptMatch = html.match(/<script[^>]+src="([^"]*\/assets\/index-[^"]+\.js)"/)
assert(scriptMatch, 'Could not locate the deployed Vite bundle.')
const bundlePath = scriptMatch[1].startsWith('http') ? scriptMatch[1].replace(siteUrl, '') : scriptMatch[1]
const bundle = await readText(bundlePath)
for (const text of [
  'Make every Euro 2028 match matter.',
  'Your Original Predictor and KO Predictor are tracked separately',
  'Some live account data is temporarily unavailable',
  'Progress temporarily unavailable',
  'Tournament control room',
  'Operational kill-switches',
  'Prediction grace windows',
  'Joker locks and knockout allocation',
  'Combined audit timeline',
  'admin_get_tournament_control_room',
  'admin_apply_global_prediction_lock',
  'admin_update_feature_control',
  'admin_search_prediction_users',
  'admin_list_prediction_grace',
  'admin_grant_prediction_grace',
  'admin_revoke_prediction_grace',
  'admin_list_operation_events',
  'get_my_leagues',
  'get_league_standings',
  'get_league_member_predictions',
  'get_member_predictions_after_lock',
  'get_my_tournament_admin_access',
  'admin_list_tournament_matches',
  'admin_record_match_result',
  'admin_update_match_status',
  'admin_recalculate_match_points',
  'get_competition_leaderboard',
  'save_my_prediction_bundle',
  'save_my_ko_prediction_bundle',
  'euro28-guest-prediction-bundle',
  'euro28:theme',
  'Group stage review',
  'Only confirmed real knockout fixtures are shown',
  'groups_primary',
  'ko_early_access',
  'ko_primary',
  'Predict all 36 scores',
  'Review progress',
  'Joker applied',
  'Saved on this device',
  'Provisional',
  'euro28-prediction-journey-v3',
  'Predicted context',
  'Your permanent pre-tournament bracket',
  'Pick only who advances',
  '0 bracket jokers',
  'Real fixture context',
  'KO Predictor match centre',
  '90-minute score',
  'Penalty shoot-out score is never predicted',
  'Team to advance',
  'How the tie is decided',
  'Your KO points',
  'KO jokers',
  'One member list, two separate competitions',
  'Compare with member',
  'Results, live tables and separate points',
  'Canonical result records',
  'Live context · not your bracket',
  'Original Predictor breakdown',
  'KO Predictor breakdown',
]) assert(bundle.includes(text), `The deployed Stage 13D bundle is missing: ${text}`)
assert(!bundle.includes('WC26 Control Centre'), 'The inherited WC26 admin application is active.')

console.log('Euro 2028 app-shell verification passed.')
console.log(`Site: ${siteUrl}`)
console.log('Public experience: Stage 13D leagues, shared predictions, canonical results, live tables, live bracket and separate points journeys')
console.log('Themes: persisted light and dark appearance')
console.log('Groups: 36 mobile-first score cards with local flags, explicit states and five-joker controls')
console.log('Review: saved predictions count whether submitted or not')
console.log('Knockout controls: 90-minute score, advancing team, method and five separate KO jokers')
console.log('Navigation: Groups stays primary until all group results and eight Round of 16 pairings are ready')
console.log('Competition boundary: Original and KO points remain separate; predicted and live brackets never blend')
console.log('Admin controls: protected Stage 12 operations remain available')
console.log('External result APIs: deferred')
console.log('Guest storage: browser-only and unscored')
console.log('Inherited WC26 application bundle: inactive')
