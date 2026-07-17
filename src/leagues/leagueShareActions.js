import { buildInviteLink } from './leagueModel.js'

async function copyToClipboard(text, onUnavailable) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    onUnavailable(text)
    return false
  }
}

export function buildLeagueShareActions({ league, onUnavailable }) {
  const copyLeagueCode = async () => {
    if (!league?.joinCode) return null
    return (await copyToClipboard(league.joinCode, onUnavailable)) ? 'Copied' : null
  }

  const shareLeague = async () => {
    if (!league?.joinCode) return null
    const url = buildInviteLink(window.location.origin, league.joinCode)
    const shareText = `Join my Euro 2028 Predictor league "${league.name}" — open this link and your invite code is filled in ready to join: ${url}`
    if (navigator.share) {
      try {
        await navigator.share({ title: league.name, text: shareText, url })
        return null
      } catch (error) {
        if (error?.name === 'AbortError') return null
      }
    }
    return (await copyToClipboard(url, onUnavailable)) ? 'Link copied' : null
  }

  return { copyLeagueCode, shareLeague }
}
