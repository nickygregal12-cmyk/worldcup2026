import { createEnvelope, createEventId, createSentryEvent, normaliseError } from './sentryEnvelope.js'

let configuration = Object.freeze({ enabled: false, dsn: '', environment: 'development', release: null })
let initialised = false
const capturedErrors = new WeakMap()

function readConfig() {
  const env = import.meta.env
  const enabled = String(env.VITE_OBSERVABILITY_ENABLED ?? 'true').toLowerCase() !== 'false'
  return Object.freeze({
    enabled: enabled && Boolean(env.VITE_SENTRY_DSN),
    dsn: env.VITE_SENTRY_DSN || '',
    environment: env.VITE_SENTRY_ENVIRONMENT || env.VITE_APP_ENV || 'development',
    release: env.VITE_SENTRY_RELEASE || null,
  })
}

async function transmit(envelope) {
  if (!envelope) return false
  try {
    if (typeof globalThis.navigator?.sendBeacon === 'function') {
      const accepted = globalThis.navigator.sendBeacon(envelope.url, new Blob([envelope.body], { type: 'application/x-sentry-envelope' }))
      if (accepted) return true
    }
  } catch {
    // Fall through to fetch.
  }
  try {
    const response = await fetch(envelope.url, {
      method: 'POST',
      body: envelope.body,
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      keepalive: true,
      credentials: 'omit',
    })
    return response.ok
  } catch {
    return false
  }
}

export function initObservability() {
  if (initialised) return configuration
  initialised = true
  configuration = readConfig()
  if (!configuration.enabled || typeof window === 'undefined') return configuration

  window.addEventListener('error', event => {
    captureException(event.error ?? new Error(event.message || 'Unhandled browser error'), {
      tags: { source: 'window.error' },
      url: event.filename || window.location.href,
    })
  })
  window.addEventListener('unhandledrejection', event => {
    captureException(normaliseError(event.reason), {
      tags: { source: 'window.unhandledrejection' },
      url: window.location.href,
    })
  })
  return configuration
}

export function getObservabilityState() {
  return configuration
}

export function captureException(error, options = {}) {
  const normalised = normaliseError(error)
  const previousEventId = capturedErrors.get(normalised)
  if (previousEventId) return previousEventId
  const eventId = options.eventId || createEventId()
  capturedErrors.set(normalised, eventId)
  if (!configuration.enabled) return eventId
  const route = typeof window === 'undefined' ? null : window.location.hash || window.location.pathname
  const event = createSentryEvent(normalised, {
    eventId,
    environment: configuration.environment,
    release: configuration.release,
    runtime: 'browser',
    route,
    url: typeof window === 'undefined' ? null : window.location.href,
    ...options,
  })
  void transmit(createEnvelope(configuration.dsn, event))
  return eventId
}
