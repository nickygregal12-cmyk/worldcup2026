/* global process */

function createEventId() {
  return globalThis.crypto?.randomUUID?.().replaceAll('-', '') ?? `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(32, '0').slice(0, 32)
}

function parseDsn(value) {
  if (!value) return null
  try {
    const url = new URL(value)
    const segments = url.pathname.split('/').filter(Boolean)
    const projectId = segments.pop()
    if (!url.username || !projectId) return null
    const basePath = segments.length ? `/${segments.join('/')}` : ''
    return {
      publicKey: url.username,
      envelopeUrl: `${url.protocol}//${url.host}${basePath}/api/${projectId}/envelope/`,
    }
  } catch {
    return null
  }
}

function cleanText(value, fallback = '') {
  return String(value ?? fallback)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/((?:token|password|secret|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, '$1[redacted]')
    .slice(0, 2000)
}

function parseFrames(stack) {
  if (!stack) return []
  const frames = []
  for (const raw of String(stack).split('\n')) {
    const line = raw.trim()
    const match = line.match(/^at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/)
    if (!match) continue
    frames.push({
      function: cleanText(match[1] || '<anonymous>'),
      filename: cleanText(match[2]),
      lineno: Number(match[3]),
      colno: Number(match[4]),
    })
  }
  return frames.reverse()
}

export async function captureFunctionException(error, functionName, context = {}) {
  const dsn = process.env.SENTRY_DSN
  const parsed = parseDsn(dsn)
  const eventId = createEventId()
  if (!parsed) return eventId
  const normalised = error instanceof Error ? error : new Error(String(error))
  const exception = { type: cleanText(normalised.name || 'Error'), value: cleanText(normalised.message || 'Unknown function error') }
  const frames = parseFrames(normalised.stack)
  if (frames.length) exception.stacktrace = { frames }
  const event = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: 'node',
    level: 'error',
    environment: process.env.SENTRY_ENVIRONMENT || process.env.CONTEXT || 'development',
    release: process.env.SENTRY_RELEASE || process.env.COMMIT_REF || undefined,
    exception: { values: [exception] },
    tags: { app: 'euro28-predictor', runtime: 'netlify-function', function: functionName },
    contexts: { runtime: { name: 'netlify-function' }, ...context },
    sdk: { name: 'euro28.observability', version: '1.0.0' },
  }
  const header = JSON.stringify({ event_id: eventId, dsn, sent_at: new Date().toISOString(), sdk: event.sdk })
  const itemHeader = JSON.stringify({ type: 'event', content_type: 'application/json' })
  const body = `${header}\n${itemHeader}\n${JSON.stringify(event)}`
  const url = `${parsed.envelopeUrl}?sentry_key=${encodeURIComponent(parsed.publicKey)}&sentry_version=7&sentry_client=euro28.observability%2F1.0.0`
  try {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-sentry-envelope' }, body })
  } catch {
    // Monitoring must never replace the function's own response path.
  }
  return eventId
}

export function withFunctionObservability(functionName, handler) {
  return async (...args) => {
    try {
      return await handler(...args)
    } catch (error) {
      const eventId = await captureFunctionException(error, functionName)
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ error: 'Internal function error', reference: eventId }),
      }
    }
  }
}
