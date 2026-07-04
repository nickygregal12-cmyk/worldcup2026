import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import GuestAccountTransfer, { GuestAccountTransferPanel } from '../GuestAccountTransfer.jsx'
import { browserStorage, formatKoProgress, formatOriginalProgress, hasKoTransferContent, hasOriginalTransferContent, importButtonDisabled, koStatus, messageForError, noticeRole, originalStatus, shouldShowKoContinue, shouldShowOriginalContinue } from '../guestAccountTransferPresentation.js'
import { buildGuestAccountTransferPrompt } from '../guestAccountTransferModel.js'


function referenceFixture() {
  return {
    tournamentId: 'euro2028',
    referenceVersion: 'test-reference-v1',
    matches: [],
    groupMatches: [],
    knockoutMatches: [
      {
        id: 'ko-1',
        matchNumber: 37,
        participantsResolved: true,
        homeTeamId: 'england',
        awayTeamId: 'scotland',
      },
    ],
  }
}

function emptyClient() {
  return {
    rpc: async () => ({ data: null, error: null }),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
          single: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  }
}

function readySnapshot() {
  return {
    hasOriginal: true,
    hasKo: true,
    transferable: true,
    accountOriginal: null,
    accountKo: null,
    originalCompleteness: {
      complete: 51,
      remaining: 0,
      readyForAccountImport: true,
    },
    koSummary: {
      complete: 1,
      available: 1,
    },
  }
}

describe('GuestAccountTransferPanel', () => {
  it('renders the accepted keep prompt and competition-specific readiness copy', () => {
    globalThis.React = React
    const snapshot = readySnapshot()
    const prompt = buildGuestAccountTransferPrompt(snapshot)
    const html = renderToStaticMarkup(React.createElement(GuestAccountTransferPanel, {
      snapshot,
      prompt,
      busy: false,
      notice: null,
      transfer: () => {},
      startFresh: () => {},
    }))

    expect(html).toContain('Saved on this device')
    expect(html).toContain(prompt.heading)
    expect(html).toContain('We found group scores, bracket picks and a KO Predictor draft on this device.')
    expect(html).toContain(prompt.primaryAction)
    expect(html).toContain(prompt.secondaryAction)
    expect(html).toContain('Original Predictor')
    expect(html).toContain('51/51 complete')
    expect(html).toContain('KO Predictor')
    expect(html).toContain('1/1 available fixtures complete')
    expect(html).not.toMatch(/browser draft|browser copy|browser predictions|Add saved predictions|Add your guest predictions/i)
  })

  it('keeps helper status and error copy in player-facing device language', () => {
    expect(originalStatus({
      accountOriginal: true,
      originalCompleteness: { readyForAccountImport: true },
    })).toBe('Account entries already exist')
    expect(originalStatus({
      accountOriginal: null,
      originalCompleteness: { readyForAccountImport: true },
    })).toBe('Ready to keep')
    expect(originalStatus({
      accountOriginal: null,
      originalCompleteness: { readyForAccountImport: false },
    })).toBe('Finish the draft before keeping')

    expect(koStatus({
      accountKo: true,
      koSummary: { complete: 1 },
    })).toBe('Account entries already exist')
    expect(koStatus({
      accountKo: null,
      koSummary: { complete: 1 },
    })).toBe('Ready to keep')
    expect(koStatus({
      accountKo: null,
      koSummary: { complete: 0 },
    })).toBe('Finish one available fixture before keeping')

    expect(messageForError(new Error('guest import cannot overwrite'))).toContain('device copy')
    expect(messageForError(new Error('globally locked'))).toContain('device copy')
    expect(messageForError(new Error('revision mismatch'))).toBe('The account changed while the import was running. Reload and try again.')

    const snapshot = readySnapshot()
    expect(importButtonDisabled(snapshot, false)).toBe(false)
    expect(importButtonDisabled({ ...snapshot, transferable: false }, false)).toBe(true)
    expect(importButtonDisabled(snapshot, true)).toBe(true)
    expect(hasOriginalTransferContent(snapshot)).toBe(true)
    expect(hasKoTransferContent(snapshot)).toBe(true)
    expect(formatOriginalProgress(snapshot)).toBe('51/51 complete')
    expect(formatKoProgress(snapshot)).toBe('1/1 available fixtures complete')
    expect(shouldShowOriginalContinue(snapshot)).toBe(false)
    expect(shouldShowOriginalContinue({
      ...snapshot,
      accountOriginal: null,
      originalCompleteness: { complete: 12, remaining: 39, readyForAccountImport: false },
    })).toBe(true)
    expect(shouldShowKoContinue(snapshot)).toBe(false)
    expect(shouldShowKoContinue({
      ...snapshot,
      accountKo: null,
      koSummary: { complete: 0, available: 1 },
    })).toBe(true)
    expect(noticeRole({ tone: 'danger' })).toBe('alert')
    expect(noticeRole({ tone: 'safe' })).toBe('status')
    expect(noticeRole(null)).toBe('status')

    const originalLocalStorage = globalThis.localStorage
    try {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem: () => null },
      })
      expect(browserStorage()).toBe(globalThis.localStorage)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      })
    }

  })


  it('renders the signed-in transfer wrapper safely before async device checks complete', () => {
    globalThis.React = React
    const html = renderToStaticMarkup(React.createElement(GuestAccountTransfer, {
      client: emptyClient(),
      reference: referenceFixture(),
      userId: 'user-1',
    }))

    expect(html).toBe('')
  })

})
