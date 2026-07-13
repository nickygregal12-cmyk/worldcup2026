// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BracketShareAction from '../BracketShareAction.jsx'
import { SHARE_OUTCOME } from '../shareBracketImage.js'
import { VISUAL_BRACKET_DRAFT, VISUAL_GROUP_REFERENCE } from '../../testFixtures/visualFixture.js'
import { resolveGuestTournamentPreview } from '../../guest/index.js'

// jsdom has no 2D canvas, so the painter is stubbed. What it paints is verified by its own unit
// tests and, at full resolution, by scripts/visual-share.mjs — this file is about the button.
vi.mock('../shareImageRenderer.js', () => ({
  renderBracketShareImage: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
}))
vi.mock('../shareBracketImage.js', async importOriginal => ({
  ...(await importOriginal()),
  shareBracketImage: vi.fn(async () => 'shared'),
}))

const { renderBracketShareImage } = await import('../shareImageRenderer.js')
const { shareBracketImage } = await import('../shareBracketImage.js')

const reference = VISUAL_GROUP_REFERENCE
const complete = VISUAL_BRACKET_DRAFT
const incomplete = {
  ...complete,
  bracketPredictions: {
    ...complete.bracketPredictions,
    51: { matchNumber: 51, advancingTeamId: null, updatedAt: null },
  },
}

function mount(draft) {
  return render(
    <BracketShareAction reference={reference} draft={draft} preview={resolveGuestTournamentPreview(reference, draft)} />,
  )
}

describe('bracket share action', () => {
  beforeEach(() => vi.clearAllMocks())

  it('offers the share once the bracket is complete', async () => {
    mount(complete)
    expect(screen.getByRole('button', { name: /share my bracket/i }).disabled).toBe(false)
  })

  it('refuses, and says what is missing, while a tie is unpicked', () => {
    mount(incomplete)
    expect(screen.getByRole('button', { name: /share my bracket/i }).disabled).toBe(true)
    expect(screen.getByText('1 tie left to pick before you can share.')).toBeTruthy()
  })

  it('paints the image and hands it to the share sheet', async () => {
    mount(complete)
    await userEvent.click(screen.getByRole('button', { name: /share my bracket/i }))

    await waitFor(() => expect(renderBracketShareImage).toHaveBeenCalledOnce())
    expect(shareBracketImage).toHaveBeenCalledOnce()
    const [blob, options] = shareBracketImage.mock.calls[0]
    expect(blob.type).toBe('image/png')
    expect(options.fileName).toBe('euro-2028-my-bracket.png')
    // The champion is what makes someone open the image, so it is named in the message beside it.
    expect(options.text).toMatch(/winning Euro 2028/)
  })

  it('confirms a download so the player knows where the image went', async () => {
    shareBracketImage.mockResolvedValueOnce(SHARE_OUTCOME.DOWNLOADED)
    mount(complete)
    await userEvent.click(screen.getByRole('button', { name: /share my bracket/i }))
    expect((await screen.findByRole('status')).textContent).toMatch(/saved to your device/i)
  })

  it('stays quiet when the player dismisses the share sheet — that is not a failure', async () => {
    shareBracketImage.mockResolvedValueOnce(SHARE_OUTCOME.CANCELLED)
    mount(complete)
    await userEvent.click(screen.getByRole('button', { name: /share my bracket/i }))
    await waitFor(() => expect(shareBracketImage).toHaveBeenCalledOnce())
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('reports a painter failure in the app’s own language, never a native dialog', async () => {
    renderBracketShareImage.mockRejectedValueOnce(new Error('canvas exploded'))
    mount(complete)
    await userEvent.click(screen.getByRole('button', { name: /share my bracket/i }))
    expect((await screen.findByRole('status')).textContent).toMatch(/could not be created/i)
  })
})
