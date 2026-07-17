import { buildPublicSignupReadiness } from '../auth/publicSignupReadiness.js'
import { EURO_SCORING_CONFIG, SCORING_CONFIG_STATUS } from '../config/scoringConfig.js'
import { TOURNAMENT_CONFIG } from '../config/tournament.js'
import { buildCanonicalResultFeed } from '../results/resultModel.js'

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

function buildPhase(lifecycle, liveSnapshot, totalMatches) {
  const results = liveSnapshot?.results ?? []
  const liveMatches = Number(liveSnapshot?.summary?.liveMatches ?? 0)
  const confirmedMatches = Number(liveSnapshot?.summary?.confirmedMatches ?? 0)
  const visibleMatches = results.filter(result => result.scoreVisible).length
  const knockoutStarted = results.some(result => result.matchNumber > 36 && result.scoreVisible)
  const groupsComplete = Object.values(liveSnapshot?.groups ?? {}).length === 6 &&
    Object.values(liveSnapshot.groups).every(table => table.completedMatchCount === 6)

  if (confirmedMatches >= totalMatches) {
    return Object.freeze({ key: 'complete', tone: 'safe', eyebrow: 'Tournament complete', title: 'Euro 2028 is complete', detail: 'Every official result is confirmed.', completed: totalMatches, total: totalMatches })
  }
  if (knockoutStarted || groupsComplete) {
    return Object.freeze({ key: 'knockout', tone: liveMatches > 0 ? 'danger' : 'info', eyebrow: liveMatches > 0 ? 'Live now' : 'Knockout phase', title: 'The knockout path is taking shape', detail: `${confirmedMatches} official results confirmed. Real knockout positions now drive the bracket.`, completed: Math.max(visibleMatches, confirmedMatches), total: totalMatches })
  }
  if (liveMatches > 0 || visibleMatches > 0 || lifecycle?.started || lifecycle?.locked) {
    return Object.freeze({ key: 'groups', tone: liveMatches > 0 ? 'danger' : 'info', eyebrow: liveMatches > 0 ? 'Live now' : 'Group stage', title: 'Qualification is moving', detail: `${confirmedMatches} official results confirmed. Live group and third-place positions update together.`, completed: Math.max(visibleMatches, confirmedMatches), total: totalMatches })
  }
  return Object.freeze({ key: 'pre_tournament', tone: 'info', eyebrow: 'Before kick-off', title: 'The road to Euro 2028', detail: 'Build your predictions, inspect the format and follow confirmed tournament information.', completed: 0, total: totalMatches })
}

function buildPriorityFixture(reference, liveSnapshot) {
  if (!liveSnapshot) return null
  const feed = buildCanonicalResultFeed({ reference, liveSnapshot })
  const row = feed.sections.live?.[0]
    ?? feed.sections.review?.[0]
    ?? feed.sections.upcoming?.[0]
    ?? feed.sections.completed?.[0]
    ?? null
  if (!row) return null
  const source = [...reference.groupMatches, ...reference.knockoutMatches].find(match => match.matchNumber === row.matchNumber)
  return Object.freeze({
    ...row,
    groupCode: source?.groupCode ?? null,
    venueName: source?.venueName ?? null,
    city: source?.city ?? null,
    homeTeam: row.homeTeamId ? reference.teamsById?.[row.homeTeamId] ?? null : null,
    awayTeam: row.awayTeamId ? reference.teamsById?.[row.awayTeamId] ?? null : null,
  })
}

export function buildTournamentPageModel(foundation, config = TOURNAMENT_CONFIG, runtime = {}) {
  const facts = config.confirmedFacts
  const totals = foundation.totals
  const reference = foundation.guestReference
  const stages = foundation.stages ?? []
  const liveSnapshot = runtime.liveSnapshot ?? null
  const phase = buildPhase(runtime.lifecycle, liveSnapshot, facts.format.totalMatches)

  return Object.freeze({
    heading: config.name,
    context: 'Tournament',
    phase,
    priorityFixture: buildPriorityFixture(reference, liveSnapshot),
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
      teams: Object.freeze(group.teams.map(team => Object.freeze(team))),
      slots: Object.freeze(group.teams.map(team => Object.freeze({ code: team.slotCode, label: team.label, team }))),
    }))),
    qualification: liveSnapshot ? Object.freeze({ groups: liveSnapshot.groups, bestThird: liveSnapshot.bestThird }) : null,
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
    intro: 'A simple guide to the two competitions, scoring, lock times, result corrections and account privacy.',
    status: scoringStatusLabel,
    heroStats: Object.freeze([
      Object.freeze({ label: 'Group picks', value: String(totals.groupMatches), note: 'Original Predictor score predictions' }),
      Object.freeze({ label: 'Original bracket', value: String(totals.knockoutMatches), note: 'Winner-only pre-tournament ties' }),
      Object.freeze({ label: 'KO Predictor', value: String(totals.knockoutMatches), note: 'Separate real-fixture competition' }),
      Object.freeze({ label: 'Jokers', value: `${scoring.joker.GROUP_STAGE_CAP} + ${scoring.joker.KO_PREDICTOR_CAP}`, note: `${scoring.joker.MULTIPLIER}× multiplier, never on Original Bracket` }),
    ]),
    trustCards: Object.freeze([
      Object.freeze({ label: 'Separate competitions', title: 'Original and KO points stay separate', detail: 'Original Predictor and KO Predictor each have their own standings, points and winners.' }),
      Object.freeze({ label: 'Result corrections', title: 'Result fixes are recalculated cleanly', detail: 'If an official result changes, the affected tables are rebuilt from the corrected result so points are not counted twice.' }),
      Object.freeze({ label: 'Privacy basics', title: 'Only game information is used', detail: 'The app uses your account, display name, predictions and league details to run the game.' }),
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
          Object.freeze({ label: 'Correct advancer (any method)', value: `${scoring.koPredictor.CORRECT_ADVANCER} pts` }),
          Object.freeze({ label: 'Correct draw call (level at 90)', value: `${scoring.koPredictor.CORRECT_DRAW_CALL} pts` }),
          Object.freeze({ label: 'Exact 90-minute score', value: `${scoring.koPredictor.EXACT_90_SCORE} pts` }),
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
        badge: 'Official results',
        detail: 'If an official result is corrected, the affected standings are recalculated from the updated official result.',
        bullets: Object.freeze([
          'Original Predictor and KO Predictor totals are recalculated separately.',
          'Correction history is kept so any scoring change can be checked.',
          'Official values are entered through the organiser tools until live result feeds are added.',
        ]),
      }),
      Object.freeze({
        title: 'Name policy',
        badge: 'Account names',
        detail: 'Display names and league names are for a mixed audience. Inappropriate names may be blocked or changed by the organiser.',
        bullets: Object.freeze([
          'Use a name other players will recognise.',
          'Do not use abusive, misleading or impersonation-style names.',
          'Private league names follow the same standard as player names.',
        ]),
      }),
      Object.freeze({
        title: 'Privacy and deletion',
        badge: 'Account privacy',
        detail: 'The app stores the minimum data needed to run accounts, predictions, leagues and scoring.',
        bullets: Object.freeze([
          'Stored data includes email, display name, saved predictions and league membership.',
          'Guest predictions stay on this device until you choose to save them to an account.',
          'Deletion requests will use the support contact shown before accounts open more widely.',
        ]),
      }),
      Object.freeze({
        title: 'Support contact',
        badge: 'Support',
        detail: 'For now, use the organiser channel that invited you. A dedicated support contact will be shown before accounts open more widely.',
        bullets: Object.freeze([
          'Expected busy periods are lock day and matchday one.',
          'Support should cover account access, deletion requests and scoring questions.',
          'Rules and privacy wording will point at the dedicated channel once selected.',
        ]),
      }),
    ]),
    tieBreaks: Object.freeze({
      title: 'Tie-break ladder',
      status: 'Before kick-off',
      detail: 'The final tie-break ladder will be published before the first ball is kicked. Until then, tied players may share the same rank or appear in a temporary order.',
      steps: Object.freeze(['Points remain the primary ranking value.', 'Final tie-break wording is published before tournament scoring matters.', 'Final standings must match the published ladder.']),
    }),
    faqs: Object.freeze([
      Object.freeze({ question: 'Do Original and KO Predictor points combine?', answer: 'No. They are separate competitions with separate points, standings and winners.' }),
      Object.freeze({ question: 'Can I put jokers on my Original Bracket?', answer: `No. The Original Bracket is winner-only and has ${scoring.joker.ORIGINAL_BRACKET_CAP} jokers.` }),
      Object.freeze({ question: 'When can I see other people’s predictions?', answer: 'Original Predictor comparisons unlock after the global tournament lock. KO Predictor comparisons unlock fixture by fixture.' }),
      Object.freeze({ question: 'What happens if a score is entered wrong?', answer: 'The organiser corrects the official result, then standings are recalculated from the corrected score.' }),
    ]),
    scoringStatus: scoring.status,
  })
}
