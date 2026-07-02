import { describe, expect, it } from 'vitest'
import { createEnvelope, createSentryEvent, parseSentryDsn, sanitiseUrl } from '../sentryEnvelope.js'

describe('Sentry-compatible observability envelope', () => {
  it('parses a public DSN without retaining a password', () => {
    expect(parseSentryDsn('https://public@example.ingest.sentry.io/123')).toEqual({
      publicKey: 'public',
      projectId: '123',
      envelopeUrl: 'https://example.ingest.sentry.io/api/123/envelope/',
    })
  })

  it('removes query strings and hashes from captured URLs', () => {
    expect(sanitiseUrl('https://example.test/groups?join=SECRET#member')).toBe('https://example.test/groups')
  })

  it('creates an event and envelope with no browser query data', () => {
    const event = createSentryEvent(new Error('Failure for person@example.com token=secret'), {
      eventId: 'a'.repeat(32),
      environment: 'staging',
      release: 'release-1',
      route: '/groups',
      url: 'https://example.test/groups?token=secret',
    })
    const envelope = createEnvelope('https://public@example.ingest.sentry.io/123', event)
    expect(event.request.url).toBe('https://example.test/groups')
    expect(event.tags).toMatchObject({ app: 'euro28-predictor', runtime: 'browser', route: '/groups' })
    expect(envelope.url).toContain('/api/123/envelope/')
    expect(envelope.body).not.toContain('token=secret')
    expect(envelope.body).not.toContain('person@example.com')
    expect(envelope.body).toContain('[redacted-email]')
  })
})
