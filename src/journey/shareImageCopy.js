/**
 * Every word that gets painted onto the share image, in one place.
 *
 * Player-facing only (CLAUDE.md §7): no internal or spec wording, no "Gameweek", no emoji — not
 * even a flag emoji, which is why the card draws real circular ISO flags instead. No point values
 * appear in prose either. The card shows what the player PICKED, not what it might be worth; the
 * one number on it, the group-goals total, is a goal count, not a score.
 */
import { GROUP_GOALS_COPY } from './groupGoalsModel.js'

export const SHARE_COPY = Object.freeze({
  brand: 'Euro 2028 Predictor',
  headerSubtitle: 'My predicted bracket',
  championKicker: 'Predicted champion',
  groupGoalsKicker: GROUP_GOALS_COPY.label,
  groupGoalsNote: 'Auto-calculated from my 36 group scores',
  topScorerKicker: 'My top scorer',
  groupScoresKicker: 'My champion’s group stage',
  jokerLabel: 'Joker played',
  joinTitle: 'Think you can do better?',
  joinBody: 'Make your own Euro 2028 predictions — free, no account needed to start.',
})

export const SHARE_FILE_NAME = 'euro-2028-my-bracket.png'

/**
 * The share sheet's own text. `title` and `text` are what WhatsApp puts beside the image.
 */
export function buildShareText(model) {
  const champion = model.champion?.label
  return Object.freeze({
    title: 'My Euro 2028 bracket',
    text: champion
      ? `I've got ${champion} winning Euro 2028. Here's my full bracket — make your own predictions:`
      : 'Here’s my Euro 2028 bracket — make your own predictions:',
  })
}

/**
 * The host, as a player would read it back off the image.
 *
 * Taken from the live origin rather than a constant, so the card is correct in every environment
 * and follows the app automatically if it ever moves to a custom domain. A baked-in URL would be
 * a lie the day the domain changes, and this one is going out to other people's phones.
 */
export function joinHostFromOrigin(origin) {
  const value = String(origin ?? '').trim()
  if (!value) return ''
  try {
    const { hostname } = new URL(value)
    // Local dev has nothing worth printing on a card meant to be shared.
    if (hostname === 'localhost' || hostname === '127.0.0.1') return ''
    return hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}
