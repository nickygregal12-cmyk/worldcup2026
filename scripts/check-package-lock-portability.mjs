import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lockPath = path.join(projectRoot, 'package-lock.json')
const allowedHost = 'registry.npmjs.org'
const forbiddenPatterns = [
  /internal\.api\.openai\.org/i,
  /applied-caas-gateway/i,
  /artifactory/i,
  /localhost/i,
  /127\.0\.0\.1/i,
]

const fail = message => {
  console.error(`Package-lock portability audit failed: ${message}`)
  process.exit(1)
}

if (!fs.existsSync(lockPath)) fail('package-lock.json is missing')

let lock
try {
  lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
} catch (error) {
  fail(`package-lock.json is not valid JSON: ${error.message}`)
}

const invalid = []
for (const [packagePath, metadata] of Object.entries(lock.packages ?? {})) {
  const resolved = metadata?.resolved
  if (!resolved || !resolved.includes('://')) continue

  let url
  try {
    url = new URL(resolved)
  } catch {
    invalid.push(`${packagePath || '<root>'}: invalid resolved URL ${resolved}`)
    continue
  }

  if (forbiddenPatterns.some(pattern => pattern.test(resolved))) {
    invalid.push(`${packagePath || '<root>'}: private or local registry URL ${resolved}`)
    continue
  }

  if (url.protocol !== 'https:' || url.hostname !== allowedHost) {
    invalid.push(`${packagePath || '<root>'}: expected https://${allowedHost}, found ${resolved}`)
  }
}

if (invalid.length) {
  console.error('Package-lock portability audit failed:')
  invalid.forEach(item => console.error(`- ${item}`))
  process.exit(1)
}

console.log('Package-lock portability audit passed.')
console.log(`Resolved package host: ${allowedHost}`)
console.log('Private build-environment registry URLs: none')
