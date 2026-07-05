import { buildPublicSignupReadiness } from '../auth/publicSignupReadiness.js'
import { EURO_SCORING_CONFIG, SCORING_CONFIG_STATUS } from '../config/scoringConfig.js'
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
  const scoringStatusLabel = scoring.status === SCORING_CONFIG_STATUS.LOCKED ? 'Locked scoring' : 'Provisional scoring'
  return Object.freeze({
    heading: 'Rules, scoring and trust',
    intro: 'Everything a new player needs before signing up: how the two competitions work, what scores points, when picks lock, how corrections are handled and what data the app stores.',
    status: scoringStatusLabel,
    heroStats: Object.freeze([
      Object.freeze({ label: 'Group picks', value: String(totals.groupMatches), note: 'Original Predictor score predictions' }),
      Object.freeze({ label: 'Original bracket', value: String(totals.knockoutMatches), note: 'Winner-only pre-tournament ties' }),
      Object.freeze({ label: 'KO Predictor', value: String(totals.knockoutMatches), note: 'Separate real-fixture competition' }),
      Object.freeze({ label: 'Jokers', value: `${scoring.joker.GROUP_STAGE_CAP} + ${scoring.joker.KO_PREDICTOR_CAP}`, note: `${scoring.joker.MULTIPLIER}× multiplier, never on Original Bracket` }),
    ]),
    trustCards: Object.freeze([
      Object.freeze({ label: 'Separate competitions', title: 'Original and KO points never combine', detail: 'Original Predictor standings stay separate from KO Predictor standings, points and winners.' }),
      Object.freeze({ label: 'Audited corrections', title: 'Result fixes are recalculated cleanly', detail: 'Official result corrections are admin-controlled, audited and replacement-based so totals can be rebuilt without double-counting.' }),
      Object.freeze({ label: 'Privacy basics', title: 'Only predictor data is stored', detail: 'The app stores account identity, display name, predictions, leagues and operational audit evidence needed to run the game.' }),
    ]),
    signupGateStatus: buildPublicSignupReadiness(),
    competitions: Object.freeze([
      Object.freeze({
        title: 'Original Predictor',
        eyebrow: 'Competition 1',
        summary: 'Your pre-tournament competition: group scores plus a winner-only bracket built from your predicted group tables.',
        points: Object.freeze([
          Object.freeze({ label: 'Group exact score', value: `${scoring.match.EXACT_SCORE} pts` }),
          Object.freeze({ label: 'Group correct outcome', value: `${scoring.match.CORRECT_OUTCOME} pts` }),
          Object.freeze({ label: 'Group jokers', value: `${scoring.joker.GROUP_STAGE_CAP} at ${scoring.joker.MULTIPLIER}×` }),
          Object.freeze({ label: 'Round of 16 pick', value: `${scoring.bracket.round_of_16} pts` }),
          Object.freeze({ label: 'Quarter-final pick', value: `${scoring.bracket.quarter_final} pts` }),
          Object.freeze({ label: 'Semi-final pick', value: `${scoring.bracket.semi_final} pts` }),
          Object.freeze({ label: 'Finalist pick', value: `${scoring.bracket.final} pts` }),
          Object.freeze({ label: 'Champion pick', value: `${scoring.bracket.champion} pts` }),
          Object.freeze({ label: 'Original bracket jokers', value: `${scoring.joker.ORIGINAL_BRACKET_CAP}` }),
        ]),
        bullets: Object.freeze([
          `Predict all ${totals.groupMatches} group-stage scores before the tournament starts.`,
          `Build one winner-only pre-tournament bracket across ${totals.knockoutMatches} ties.`,
          'Original Bracket has no score inputs, method controls or jokers.',
        ]),
      }),
      Object.freeze({
        title: 'KO Predictor',
        eyebrow: 'Competition 2',
        summary: 'A separate knockout-only game that opens once real knockout fixtures are known.',
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
      Object.freeze({ title: 'Group jokers', detail: 'Each group-stage joker locks when its match starts, so later unstarted jokers can still be moved.' }),
      Object.freeze({ title: 'KO Predictor', detail: 'Each real knockout fixture locks at its own kick-off after the fixture is known.' }),
    ]),
    policies: Object.freeze([
      Object.freeze({
        title: 'Corrections policy',
        badge: 'Audited',
        detail: 'If an official result is corrected, the admin control room records the correction reason and recalculates the affected standings from the corrected official result.',
        bullets: Object.freeze([
          'Original Predictor and KO Predictor totals are recalculated separately.',
          'Correction history remains visible to admins for evidence.',
          'External result APIs remain deferred, so official values are controlled through the admin flow.',
        ]),
      }),
      Object.freeze({
        title: 'Name policy',
        badge: 'Signup gate',
        detail: 'Display names and league names are for a mixed audience. Inappropriate names may be changed by the organiser, and blocked-word checks are a required signup gate before wide registration.',
        bullets: Object.freeze([
          'Use a name other players will recognise.',
          'Do not use abusive, misleading or impersonation-style names.',
          'Private league names follow the same standard as player names.',
        ]),
      }),
      Object.freeze({
        title: 'Privacy and deletion',
        badge: 'Signup gate',
        detail: 'The app stores the minimum data needed to run accounts, predictions, leagues and scoring evidence. A public deletion route and confirmed data-hosting region must be recorded before wide signups.',
        bullets: Object.freeze([
          'Stored data includes email, display name, saved predictions, league membership and admin audit evidence.',
          'Guest predictions stay on this device until you choose to save them to an account.',
          'Deletion requests will use the support contact recorded before public registration opens.',
        ]),
      }),
      Object.freeze({
        title: 'Support contact',
        badge: 'Owner decision',
        detail: 'For the current closed/dev stage, use the organiser channel that invited you. A dedicated scalable support contact is required before RULES-1 closes for wider signups.',
        bullets: Object.freeze([
          'Expected busy periods are lock day and matchday one.',
          'Support should cover account access, deletion requests and scoring questions.',
          'Rules and privacy wording will point at the dedicated channel once selected.',
        ]),
      }),
    ]),
    tieBreaks: Object.freeze({
      title: 'Tie-break ladder',
      status: 'Tournament gate',
      detail: 'The final tie-break ladder is recorded as a tournament gate and must be published before the first ball is kicked. Until then, leaderboard order is treated as provisional when players are tied on points.',
      steps: Object.freeze(['Points remain the primary ranking value.', 'Final tie-break wording is published before tournament scoring matters.', 'Final standings must match the published ladder.']),
    }),
    faqs: Object.freeze([
      Object.freeze({ question: 'Do Original and KO Predictor points combine?', answer: 'No. They are separate competitions with separate points, standings and winners.' }),
      Object.freeze({ question: 'Can I put jokers on my Original Bracket?', answer: `No. The Original Bracket is winner-only and has ${scoring.joker.ORIGINAL_BRACKET_CAP} jokers.` }),
      Object.freeze({ question: 'When can I see other people’s predictions?', answer: 'Original Predictor comparisons unlock after the global tournament lock. KO Predictor comparisons unlock fixture by fixture.' }),
      Object.freeze({ question: 'What happens if a score is entered wrong?', answer: 'Admins correct the official result with an audit note, then standings are recalculated from the corrected source.' }),
    ]),
    scoringStatus: scoring.status,
  })
}
