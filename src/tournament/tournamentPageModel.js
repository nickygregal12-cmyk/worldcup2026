import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'
import { TOURNAMENT_CONFIG } from '../config/tournament.js'

function formatDate(value) {
  if (!value) return 'To be confirmed'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`))
}

function formatDateRange(startDate, endDate) {
  return `${formatDate(startDate)} – ${formatDate(endDate)}`
}

function groupSlotStatus(group) {
  const slots = group.teams ?? []
  const confirmed = slots.filter(slot => !slot.isProvisional).length
  return confirmed === slots.length && slots.length > 0 ? 'Confirmed' : 'Qualifying under way'
}

export function buildTournamentPageModel(foundation, config = TOURNAMENT_CONFIG) {
  const facts = config.confirmedFacts
  const totals = foundation.totals
  const reference = foundation.guestReference
  const stages = foundation.stages ?? []

  return Object.freeze({
    heading: config.name,
    context: 'Tournament',
    summary: Object.freeze([
      Object.freeze({ label: 'Dates', value: formatDateRange(facts.tournamentStartDate, facts.tournamentEndDate), note: 'Confirmed by UEFA schedule announcement' }),
      Object.freeze({ label: 'Hosts', value: facts.hostNations.join(', '), note: facts.hostNationNote }),
      Object.freeze({ label: 'Venues', value: `${facts.venues.length} confirmed`, note: `${new Set(facts.venues.map(venue => venue.city)).size} host cities` }),
      Object.freeze({ label: 'Format', value: `${facts.format.groupCount} groups · ${facts.format.teamCount} teams`, note: `${facts.format.totalMatches} matches, no third-place play-off` }),
    ]),
    venues: facts.venues,
    keyDates: Object.freeze([
      Object.freeze({ label: 'Opening match', date: formatDate(facts.openingMatch.date), detail: `${facts.openingMatch.venueName}, ${facts.openingMatch.city}` }),
      Object.freeze({ label: 'Semi-final 1', date: formatDate(facts.finalWeek.semiFinalDates[0]), detail: `${facts.finalWeek.venueName}, ${facts.finalWeek.city}` }),
      Object.freeze({ label: 'Semi-final 2', date: formatDate(facts.finalWeek.semiFinalDates[1]), detail: `${facts.finalWeek.venueName}, ${facts.finalWeek.city}` }),
      Object.freeze({ label: 'Final', date: formatDate(facts.finalWeek.finalDate), detail: `${facts.finalWeek.venueName}, ${facts.finalWeek.city}` }),
    ]),
    format: Object.freeze([
      Object.freeze({ label: 'Group stage', count: `${facts.format.teamCount} teams`, detail: `${facts.format.groupCount} groups of ${facts.format.teamsPerGroup}` }),
      Object.freeze({ label: 'Round of 16', count: `${facts.format.automaticGroupQualifiers * facts.format.groupCount + facts.format.bestThirdQualifiers} teams`, detail: `Top ${facts.format.automaticGroupQualifiers} in each group plus ${facts.format.bestThirdQualifiers} best third-placed teams` }),
      Object.freeze({ label: 'Straight knockout', count: `${facts.format.knockoutMatches} matches`, detail: facts.format.thirdPlacePlayoff ? 'Includes third-place play-off' : 'No third-place play-off' }),
    ]),
    groups: Object.freeze(reference.groups.map(group => Object.freeze({
      code: group.code,
      status: groupSlotStatus(group),
      slots: Object.freeze(group.teams.map(team => Object.freeze({ code: team.slotCode, label: team.isProvisional ? 'Qualifying slot' : team.label }))),
    }))),
    certainty: Object.freeze({
      confirmed: `${totals.officialDateVenueMatches}/${totals.matches} fixtures have official date and venue skeletons`,
      provisional: facts.unconfirmed.join(' '),
    }),
    stages,
  })
}

export function buildHowToPlayPageModel(foundation, scoring = EURO_SCORING_CONFIG) {
  const totals = foundation.totals
  return Object.freeze({
    heading: 'How to play',
    competitions: Object.freeze([
      Object.freeze({
        title: 'Original Predictor',
        summary: 'Your pre-tournament competition.',
        points: Object.freeze([
          Object.freeze({ label: 'Group exact score', value: `${scoring.match.EXACT_SCORE} pts` }),
          Object.freeze({ label: 'Group correct outcome', value: `${scoring.match.CORRECT_OUTCOME} pts` }),
          Object.freeze({ label: 'Group jokers', value: `${scoring.joker.GROUP_STAGE_CAP} at ${scoring.joker.MULTIPLIER}×` }),
          Object.freeze({ label: 'Original bracket jokers', value: `${scoring.joker.ORIGINAL_BRACKET_CAP}` }),
        ]),
        bullets: Object.freeze([
          `Predict all ${totals.groupMatches} group-stage scores.`,
          `Build one winner-only pre-tournament bracket across ${totals.knockoutMatches} ties.`,
          'Original bracket scores, method controls and jokers do not exist.',
        ]),
      }),
      Object.freeze({
        title: 'KO Predictor',
        summary: 'A separate second competition once real knockout fixtures are known.',
        points: Object.freeze([
          Object.freeze({ label: '90-minute exact score', value: `${scoring.match.EXACT_SCORE} pts` }),
          Object.freeze({ label: '90-minute outcome', value: `${scoring.match.CORRECT_OUTCOME} pts` }),
          Object.freeze({ label: 'Correct advancing team', value: `${scoring.koPredictor.CORRECT_ADVANCING_TEAM} pts` }),
          Object.freeze({ label: 'Correct method', value: `${scoring.koPredictor.CORRECT_DECISION_METHOD} pts` }),
          Object.freeze({ label: 'KO jokers', value: `${scoring.joker.KO_PREDICTOR_CAP} at ${scoring.joker.MULTIPLIER}×` }),
        ]),
        bullets: Object.freeze([
          `Predict each of the ${totals.knockoutMatches} real knockout fixtures when participants are confirmed.`,
          'KO Predictor points and winner stay separate from the Original Predictor.',
          'Everyone starts the knockouts on zero.',
        ]),
      }),
    ]),
    locks: Object.freeze([
      Object.freeze({ title: 'Original Predictor content', detail: 'Group scores and the Original Bracket lock at the first tournament kick-off.' }),
      Object.freeze({ title: 'Group jokers', detail: 'Each group-stage joker locks when its match starts.' }),
      Object.freeze({ title: 'KO Predictor', detail: 'Each real knockout fixture locks at its own kick-off after the fixture is known.' }),
    ]),
    faqs: Object.freeze([
      Object.freeze({ question: 'Do Original and KO Predictor points combine?', answer: 'No. They are separate competitions with separate points, standings and winners.' }),
      Object.freeze({ question: 'Can I put jokers on my Original Bracket?', answer: `No. The Original Bracket is winner-only and has ${scoring.joker.ORIGINAL_BRACKET_CAP} jokers.` }),
      Object.freeze({ question: 'When can I see other people’s predictions?', answer: 'Original Predictor comparisons unlock after the global tournament lock. KO Predictor comparisons unlock fixture by fixture.' }),
    ]),
    scoringStatus: scoring.status,
  })
}
