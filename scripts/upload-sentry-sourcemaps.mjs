/* global process */
import { readFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'

const required = ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT']
const present = required.filter(name => Boolean(process.env[name]))
const release = process.env.SENTRY_RELEASE || process.env.COMMIT_REF || ''

if (present.length === 0) {
  console.log('Sentry source-map upload skipped: observability release variables are not configured.')
  process.exit(0)
}

if (present.length !== required.length || !release) {
  const missing = required.filter(name => !process.env[name])
  if (!release) missing.push('SENTRY_RELEASE or COMMIT_REF')
  throw new Error(`Sentry source-map upload configuration is incomplete. Missing: ${missing.join(', ')}`)
}

const baseUrl = (process.env.SENTRY_URL || 'https://sentry.io').replace(/\/$/, '')
const organisation = encodeURIComponent(process.env.SENTRY_ORG)
const project = encodeURIComponent(process.env.SENTRY_PROJECT)
const token = process.env.SENTRY_AUTH_TOKEN
const distDir = path.resolve('dist')
const assetsDir = path.join(distDir, 'assets')

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  if (response.ok || response.status === 208) return response
  const detail = await response.text().catch(() => '')
  throw new Error(`Sentry release API returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`)
}

async function ensureRelease() {
  const url = `${baseUrl}/api/0/organizations/${organisation}/releases/`
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: release, projects: [process.env.SENTRY_PROJECT] }),
  })
  if (response.ok || response.status === 208 || response.status === 409) return
  const detail = await response.text().catch(() => '')
  throw new Error(`Sentry release creation returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`)
}

async function uploadFile(filePath, name, contentType) {
  const form = new FormData()
  form.set('name', name)
  form.set('file', new Blob([await readFile(filePath)], { type: contentType }), path.basename(filePath))
  await request(`${baseUrl}/api/0/projects/${organisation}/${project}/releases/${encodeURIComponent(release)}/files/`, {
    method: 'POST',
    body: form,
  })
}

await ensureRelease()
const entries = await readdir(assetsDir, { withFileTypes: true })
const maps = entries.filter(entry => entry.isFile() && entry.name.endsWith('.js.map'))

for (const map of maps) {
  const mapPath = path.join(assetsDir, map.name)
  const javascriptName = map.name.slice(0, -4)
  const javascriptPath = path.join(assetsDir, javascriptName)
  const sourceMapUrl = `~/assets/${map.name}`
  const javascript = `${await readFile(javascriptPath, 'utf8')}\n//# sourceMappingURL=${sourceMapUrl}\n`

  const javascriptForm = new FormData()
  javascriptForm.set('name', `~/assets/${javascriptName}`)
  javascriptForm.set('header', `Sourcemap: ${sourceMapUrl}`)
  javascriptForm.set('file', new Blob([javascript], { type: 'application/javascript' }), javascriptName)
  await request(`${baseUrl}/api/0/projects/${organisation}/${project}/releases/${encodeURIComponent(release)}/files/`, {
    method: 'POST',
    body: javascriptForm,
  })
  await uploadFile(mapPath, sourceMapUrl, 'application/json')
  await rm(mapPath)
}

console.log(`Sentry source-map upload completed for release ${release}. Uploaded ${maps.length} JavaScript bundle(s).`)
