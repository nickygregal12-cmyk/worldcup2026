/**
 * Everything the share image needs, derived and frozen — with no canvas, no DOM and no fonts in
 * sight. The painter (shareImageRenderer.js) consumes this and nothing else, which is what lets
 * the interesting decisions here be unit-tested in a node environment.
 *
 * It reads the SAME bracket surface the live page reads (buildOriginalBracketSurface) and the
 * SAME champion (predictedChampion), so the image cannot disagree with the board it came from.
 * Confirmed Decision 13 requires exactly that: the share card is the player's bracket rendered
 * from the converging wall chart, not a second bracket implementation.
 */
import { buildOriginalBracketSurface, predictedChampion } from './originalBracketPresentationModel.js'
import { calculateGroupGoalsTotal } from './groupGoalsModel.js'

export const BRACKET_TIE_COUNT = 15
const GROUP_MATCH_COUNT = 36

/**
 * Broadcast-style short names, for the seven-lane chart where a tie is ~130px wide.
 *
 * Only the names that genuinely do not fit are listed; everything else renders in full. The
 * renderer still measures and shrinks as a backstop, but eliding "Republic of Ireland" to
 * "Republic of Irel…" is not something a player should ever be shown, so the three long UEFA
 * names get a real abbreviation rather than a truncation.
 */
const SHORT_TEAM_NAMES = Object.freeze({
  'Republic of Ireland': 'Rep. Ireland',
  'Northern Ireland': 'N. Ireland',
  'Czech Republic': 'Czech Rep.',
  'Bosnia and Herzegovina': 'Bosnia-Herz.',
  'North Macedonia': 'N. Macedonia',
})

export function shareTeamName(label) {
  const name = String(label ?? '').trim()
  return SHORT_TEAM_NAMES[name] ?? name
}

function shareTeam(team) {
  if (!team) return null
  return Object.freeze({
    label: team.label,
    shortLabel: shareTeamName(team.label),
    isoCode: team.isoCode ?? null,
  })
}

/**
 * The champion's own three group matches, with the score the player predicted.
 *
 * Which three to show was the open question. Any three of the 36 is arbitrary; the champion's
 * three are the only set with a story — this is the road the team you crowned started on — and
 * they are deterministic, so the same bracket always produces the same card. They are a
 * candidate only: the layout decides whether they are actually drawn (see fitsGroupScores).
 */
function championGroupScores(reference, draft, champion) {
  if (!champion) return []
  return (reference.groupMatches ?? [])
    .filter(match => match.homeTeamId === champion.tournamentTeamId || match.awayTeamId === champion.tournamentTeamId)
    .map(match => {
      const row = draft.groupPredictions?.[String(match.matchNumber)]
      if (!Number.isInteger(row?.homeScore) || !Number.isInteger(row?.awayScore)) return null
      return Object.freeze({
        matchNumber: match.matchNumber,
        groupCode: match.groupCode,
        home: shareTeam(reference.teamsById?.[match.homeTeamId]),
        away: shareTeam(reference.teamsById?.[match.awayTeamId]),
        homeScore: row.homeScore,
        awayScore: row.awayScore,
        jokerApplied: Boolean(row.jokerApplied),
      })
    })
    .filter(Boolean)
    .sort((left, right) => left.matchNumber - right.matchNumber)
}

/**
 * A tie, reduced to what the chart draws: the two teams that met, and which one the player sent
 * through. The Original Bracket is winner-only by contract, so there is no score to carry here.
 */
function shareTie(tie) {
  const slots = tie.slots.map(slot => Object.freeze({
    team: shareTeam(slot.team),
    sourceCode: slot.sourceCode,
    unresolved: slot.unresolved,
    advancing: slot.selected,
  }))
  return Object.freeze({
    matchNumber: tie.matchNumber,
    stage: tie.stage,
    slots: Object.freeze(slots),
    decided: slots.some(slot => slot.advancing),
  })
}

/**
 * Why the image is gated on a complete bracket.
 *
 * The champion IS the card — it is the hero block and the thing that makes someone open the
 * image — and there is no champion until the final is picked. A part-picked chart shares as a
 * wall of dashed placeholder chips, which reads to the recipient as a broken app rather than as
 * a prediction, and that is the opposite of what a growth loop needs. So share unlocks at 15/15
 * and the button says plainly how many ties are left. "Finish your bracket to share it" is also
 * the stronger prompt.
 */
export function buildBracketShareModel({ reference, draft, preview }) {
  const surface = buildOriginalBracketSurface({ reference, draft, preview })
  const champion = predictedChampion(preview, reference)
  const goals = calculateGroupGoalsTotal(draft, GROUP_MATCH_COUNT)

  const ties = surface.ties.map(shareTie)
  const tiesByMatchNumber = Object.fromEntries(ties.map(tie => [tie.matchNumber, tie]))
  const decided = ties.filter(tie => tie.decided).length

  return Object.freeze({
    complete: decided === BRACKET_TIE_COUNT && Boolean(champion),
    decided,
    total: BRACKET_TIE_COUNT,
    remaining: BRACKET_TIE_COUNT - decided,
    champion: shareTeam(champion),
    columns: surface.wallColumns,
    tiesByMatchNumber: Object.freeze(tiesByMatchNumber),
    groupGoals: Object.freeze({ total: goals.total, complete: goals.complete }),
    /**
     * Reserved, and deliberately null. Top Scorer is worth 30 (CLAUDE.md §4) but has no player
     * pool, no persistence and no entry surface — Stage 17A owns all three. The image draws the
     * row only when this is non-null, so that stage lights it up without reopening the layout.
     */
    topScorer: null,
    groupScores: Object.freeze(championGroupScores(reference, draft, champion)),
  })
}

/**
 * The share button's own copy, so the component holds no product wording.
 */
export function describeShareReadiness(model) {
  if (model.complete) return { ready: true, label: 'Share my bracket', hint: null }
  if (model.remaining === BRACKET_TIE_COUNT) {
    return { ready: false, label: 'Share my bracket', hint: 'Pick your way through the bracket to share it.' }
  }
  const ties = model.remaining === 1 ? 'tie' : 'ties'
  return { ready: false, label: 'Share my bracket', hint: `${model.remaining} ${ties} left to pick before you can share.` }
}
