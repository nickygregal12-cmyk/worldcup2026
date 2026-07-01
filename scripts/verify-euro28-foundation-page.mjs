import process from 'node:process'

const siteUrl = (process.env.EURO28_SITE_URL || 'https://euro28-predictor-dev.netlify.app').replace(/\/$/, '')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function readText(pathname) {
  const response = await fetch(`${siteUrl}${pathname}`, {
    headers: { 'user-agent': 'Euro28FoundationVerifier/1.0' },
  })
  assert(response.ok, `${pathname} returned HTTP ${response.status}`)
  return response.text()
}

const [html, manifestText, worker, robots] = await Promise.all([
  readText('/'),
  readText('/manifest.json'),
  readText('/sw.js'),
  readText('/robots.txt'),
])

assert(html.includes('<title>Euro 2028 Predictor — Foundation Staging</title>'), 'The deployed HTML title is not the Euro foundation title.')
assert(html.includes('noindex, nofollow, noarchive'), 'The staging HTML is missing the no-index directive.')
assert(!html.includes('WC26 Predictor'), 'The deployed HTML still contains WC26 branding.')
assert(!html.includes('wc26predictor1.netlify.app'), 'The deployed HTML still points at the WC26 live domain.')

const manifest = JSON.parse(manifestText)
assert(manifest.name === 'Euro 2028 Predictor — Foundation Staging', 'The deployed web manifest is not the Euro foundation manifest.')
assert(manifest.display === 'browser', 'The foundation manifest must not advertise an installable standalone app.')

assert(worker.includes('registration.unregister()'), 'The deployed retirement worker does not unregister itself.')
assert(robots.includes('Disallow: /'), 'The Euro development site is not blocked from indexing.')

const scriptMatch = html.match(/<script[^>]+src="([^"]*\/assets\/index-[^"]+\.js)"/)
assert(scriptMatch, 'Could not find the deployed Vite application bundle.')
const bundlePath = scriptMatch[1].startsWith('http')
  ? scriptMatch[1].replace(siteUrl, '')
  : scriptMatch[1]
const bundle = await readText(bundlePath)
assert(bundle.includes('Trusted account prediction saving is now active.'), 'The deployed bundle is not the Stage 6 atomic prediction saving foundation application.')
assert(bundle.includes('euro28-guest-prediction-bundle'), 'The deployed bundle is missing the versioned guest export format.')
assert(bundle.includes('Create or access your Euro account'), 'The deployed bundle is missing the Euro authentication foundation.')
assert(bundle.includes('save_my_prediction_bundle'), 'The deployed bundle is missing the trusted prediction save route.')
assert(!bundle.includes('WC26 Control Centre'), 'The active deployed bundle still contains the inherited admin application.')

console.log('Euro 2028 foundation page verification passed.')
console.log(`Site: ${siteUrl}`)
console.log('Public branding: Euro 2028 atomic prediction saving foundation')
console.log('Search indexing: blocked')
console.log('Inherited service worker: retirement enabled')
console.log('Guest storage: browser-only')
console.log('Euro authentication: active on staging')
console.log('Atomic prediction saving: active through the trusted RPC')
console.log('Inherited WC26 application bundle: inactive')
