// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHARE_OUTCOME, shareBracketImage } from '../shareBracketImage.js'

const FILE = { fileName: 'euro-2028-my-bracket.png', title: 'My Euro 2028 bracket', text: 'Here is my bracket' }

function blob() {
  return new Blob(['png'], { type: 'image/png' })
}

function stubNavigator(overrides) {
  for (const [key, value] of Object.entries(overrides)) {
    Object.defineProperty(navigator, key, { value, configurable: true, writable: true })
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  for (const key of ['share', 'canShare']) {
    Object.defineProperty(navigator, key, { value: undefined, configurable: true, writable: true })
  }
})

describe('sharing the bracket image', () => {
  it('hands the file to the native share sheet when the device can take files', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share, canShare: () => true })

    expect(await shareBracketImage(blob(), FILE)).toBe(SHARE_OUTCOME.SHARED)
    const [payload] = share.mock.calls[0]
    expect(payload.files[0].name).toBe(FILE.fileName)
    expect(payload.files[0].type).toBe('image/png')
    expect(payload.title).toBe(FILE.title)
  })

  it('treats a dismissed share sheet as a change of mind, not a failure', async () => {
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' })
    stubNavigator({ share: vi.fn().mockRejectedValue(abort), canShare: () => true })

    expect(await shareBracketImage(blob(), FILE)).toBe(SHARE_OUTCOME.CANCELLED)
  })

  it('downloads instead when the browser has no share sheet at all', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    URL.createObjectURL = vi.fn(() => 'blob:euro28')
    URL.revokeObjectURL = vi.fn()

    expect(await shareBracketImage(blob(), FILE)).toBe(SHARE_OUTCOME.DOWNLOADED)
    expect(click).toHaveBeenCalledOnce()
  })

  it('downloads when the browser has share but refuses files — the desktop Chrome case', async () => {
    const share = vi.fn()
    stubNavigator({ share, canShare: () => false })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    URL.createObjectURL = vi.fn(() => 'blob:euro28')
    URL.revokeObjectURL = vi.fn()

    expect(await shareBracketImage(blob(), FILE)).toBe(SHARE_OUTCOME.DOWNLOADED)
    // The whole point of gating on canShare: share() must never be called with files it will reject.
    expect(share).not.toHaveBeenCalled()
    expect(click).toHaveBeenCalledOnce()
  })

  it('still leaves the player with the image when the share sheet fails outright', async () => {
    stubNavigator({ share: vi.fn().mockRejectedValue(new Error('sheet exploded')), canShare: () => true })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    URL.createObjectURL = vi.fn(() => 'blob:euro28')
    URL.revokeObjectURL = vi.fn()

    expect(await shareBracketImage(blob(), FILE)).toBe(SHARE_OUTCOME.DOWNLOADED)
    expect(click).toHaveBeenCalledOnce()
  })
})
