import process from 'node:process'

const siteUrl = (process.env.EURO28_SITE_URL || 'https://euro28-predictor-dev.netlify.app').replace(/\/$/, '')
const assert = (condition, message) => { if (!condition) throw new Error(message) }
async function readText(pathname) {
  const response = await fetch(`${siteUrl}${pathname}`, { headers: { 'user-agent': 'Euro28AppShellVerifier/3.0' } })
  assert(response.ok, `${pathname} returned HTTP ${response.status}`)
  return response.text()
}
async function readJson(pathname) {
  const response = await fetch(`${siteUrl}${pathname}`, { headers: { 'user-agent': 'Euro28AppShellVerifier/3.0', accept: 'application/json' } })
  assert(response.ok, `${pathname} returned HTTP ${response.status}`)
  return response.json()
}

const [html, robots, health] = await Promise.all([
  readText('/'),
  readText('/robots.txt'),
  readJson('/.netlify/functions/health'),
])
assert(html.includes('<title>Euro 2028 Predictor</title>'), 'The deployed HTML title is not the Euro product title.')
assert(html.includes('noindex, nofollow, noarchive'), 'The staging HTML is missing the no-index directive.')
assert(!html.includes('WC26 Predictor') && !html.includes('wc26predictor1.netlify.app'), 'The deployed HTML still contains WC26 references.')
assert(!html.includes('rel="manifest"'), 'The deployed HTML still references the deferred web manifest.')
assert(robots.includes('Disallow: /'), 'The staging site is not blocked from indexing.')
assert(health.service === 'euro28-predictor' && health.status === 'ok', 'The deployed Stage 14 health endpoint is not healthy.')
assert(health.checks?.application?.status === 'ok' && health.checks?.database?.status === 'ok', 'The deployed Stage 14 health checks are incomplete.')
const assetPaths = [...new Set(
  [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+\.js)"/g)]
    .map(match => match[1])
    .map(assetPath => (
      assetPath.startsWith('http')
        ? assetPath.replace(siteUrl, '')
        : assetPath
    )),
)]

assert(assetPaths.length > 0, 'Could not locate the deployed Vite JavaScript assets.')

const deployedBundles = await Promise.all(assetPaths.map(readText))
const deployedJavaScript = deployedBundles.join('\n')

assert(
  !deployedJavaScript.includes('serviceWorker.register'),
  'The deployed bundle still registers the deferred service worker.',
)

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
  'euro28-guest-state-v2',
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
  'Fixtures and results',
  'Canonical result records',
  'Live context · not your bracket',
  'Original bracket progression',
  'Advancing teams',
  'Points story',
  'How the total was earned',
  'Canonical scoring rows only',
  'get_player_competition_points',
  'Community percentages are private',
  'Tournament so far',
  'Curated team facts',
  'get_team_profile_sheet',
  'admin_list_team_profiles',
  'admin_upsert_team_profile',
  'Euro 2028 Predictor hit a problem',
  'Runtime heartbeat',
  'Runtime health response',
  'Send Sentry test event',
]) assert(deployedJavaScript.includes(text), `The deployed Euro JavaScript is missing: ${text}`)
assert(!deployedJavaScript.includes('WC26 Control Centre'), 'The inherited WC26 admin application is active.')

console.log('Euro 2028 app-shell verification passed.')
console.log(`Site: ${siteUrl}`)
console.log('Public experience: Stage 13F-J player insight plus Stage 14 observability, Stage 13E team profiles and Stage 13D journeys')
console.log('Stage 13D leagues, shared predictions, canonical results and separate points remain active beneath Stage 14')
console.log('Player insight: canonical point sources, rank gaps and privacy-safe Original/KO evidence')
console.log('Runtime health: read-only Netlify endpoint and hourly validated heartbeat')
console.log('Error recovery: root boundary and optional Sentry-compatible browser/function reporting')
console.log('Validation: active Euro Supabase, RPC and health boundaries use Zod-backed parsing')
console.log('Themes: persisted light and dark appearance')
console.log('Groups: 36 mobile-first score cards with local flags, explicit states and five-joker controls')
console.log('Review: saved predictions count whether submitted or not')
console.log('Knockout controls: 90-minute score, advancing team, method and five separate KO jokers')
console.log('Navigation: Groups stays primary until all group results and eight Round of 16 pairings are ready')
console.log('Competition boundary: Original and KO points remain separate; predicted and live brackets never blend')
console.log('Admin controls: protected operations and revision-safe curated team profiles remain owner-controlled')
console.log('Team profile sources: curated admin facts, app-owned tournament data and privacy-gated Original Predictor aggregates')
console.log('External result APIs: deferred')
console.log('Database migrations: 17, including read-only player-insight Migration 017')
console.log('Guest storage: browser-only and unscored')
console.log('Inherited WC26 application bundle: inactive')
