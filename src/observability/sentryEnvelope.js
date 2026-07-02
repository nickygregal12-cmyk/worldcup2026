const SDK_NAME = 'euro28.observability'
const SDK_VERSION = '1.0.0'

function cleanText(value, fallback = '') {
  const text = String(value ?? fallback)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/((?:token|password|secret|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, '$1[redacted]')
  return text.length > 2000 ? `${text.slice(0, 2000)}…` : text
}

export function createEventId(cryptoObject = globalThis.crypto) {
  if (typeof cryptoObject?.randomUUID === 'function') {
    return cryptoObject.randomUUID().replaceAll('-', '')
  }
  const bytes = new Uint8Array(16)
  if (typeof cryptoObject?.getRandomValues === 'function') cryptoObject.getRandomValues(bytes)
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')
}

export function parseSentryDsn(value) {
  if (!value) return null
  let url
  try {
    url = new URL(String(value))
  } catch {
    return null
  }
  const segments = url.pathname.split('/').filter(Boolean)
  const projectId = segments.pop()
  if (!url.username || !projectId) return null
  const basePath = segments.length ? `/${segments.join('/')}` : ''
  return Object.freeze({
    publicKey: url.username,
    projectId,
    envelopeUrl: `${url.protocol}//${url.host}${basePath}/api/${projectId}/envelope/`,
  })
}

export function sanitiseUrl(value) {
  if (!value) return null
  try {
    const url = new URL(String(value), 'https://local.invalid')
    url.search = ''
    url.hash = ''
    return url.origin === 'https://local.invalid' ? url.pathname : url.toString()
  } catch {
    return cleanText(value, null)
  }
}

export function parseStackFrames(stack) {
  if (!stack) return []
  const frames = []
  for (const rawLine of String(stack).split('\n')) {
    const line = rawLine.trim()
    let match = line.match(/^at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)$/)
    if (!match) match = line.match(/^at\s+(.*?):(\d+):(\d+)$/)
    if (match?.length === 5) {
      frames.push({ function: cleanText(match[1], '<anonymous>'), filename: sanitiseUrl(match[2]), lineno: Number(match[3]), colno: Number(match[4]) })
      continue
    }
    if (match?.length === 4) {
      frames.push({ function: '<anonymous>', filename: sanitiseUrl(match[1]), lineno: Number(match[2]), colno: Number(match[3]) })
      continue
    }
    match = line.match(/^(.*?)@(.*?):(\d+):(\d+)$/)
    if (match) frames.push({ function: cleanText(match[1], '<anonymous>'), filename: sanitiseUrl(match[2]), lineno: Number(match[3]), colno: Number(match[4]) })
  }
  return frames.reverse()
}

export function normaliseError(error) {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  try {
    return new Error(JSON.stringify(error))
  } catch {
    return new Error('Unknown application error')
  }
}

export function createSentryEvent(error, {
  eventId = createEventId(),
  environment = 'development',
  release = null,
  runtime = 'browser',
  route = null,
  tags = {},
  contexts = {},
  componentStack = null,
  level = 'error',
  url = null,
} = {}) {
  const normalised = normaliseError(error)
  const frames = parseStackFrames(normalised.stack)
  const exception = {
    type: cleanText(normalised.name || 'Error'),
    value: cleanText(normalised.message || 'Unknown error'),
  }
  if (frames.length) exception.stacktrace = { frames }

  const event = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    level,
    environment,
    release: release || undefined,
    server_name: runtime === 'browser' ? undefined : 'netlify-function',
    exception: { values: [exception] },
    tags: {
      app: 'euro28-predictor',
      runtime,
      ...(route ? { route } : {}),
      ...tags,
    },
    contexts: {
      app: { app_name: 'Euro 2028 Predictor', app_version: release || 'unversioned' },
      runtime: { name: runtime },
      ...contexts,
    },
    request: url ? { url: sanitiseUrl(url) } : undefined,
    extra: componentStack ? { componentStack: cleanText(componentStack) } : undefined,
    sdk: { name: SDK_NAME, version: SDK_VERSION },
  }

  return JSON.parse(JSON.stringify(event))
}

export function createEnvelope(dsn, event) {
  const parsed = parseSentryDsn(dsn)
  if (!parsed) return null
  const header = JSON.stringify({
    event_id: event.event_id,
    dsn,
    sent_at: new Date().toISOString(),
    sdk: { name: SDK_NAME, version: SDK_VERSION },
  })
  const itemHeader = JSON.stringify({ type: 'event', content_type: 'application/json' })
  return Object.freeze({
    url: `${parsed.envelopeUrl}?sentry_key=${encodeURIComponent(parsed.publicKey)}&sentry_version=7&sentry_client=${SDK_NAME}%2F${SDK_VERSION}`,
    body: `${header}\n${itemHeader}\n${JSON.stringify(event)}`,
  })
}
