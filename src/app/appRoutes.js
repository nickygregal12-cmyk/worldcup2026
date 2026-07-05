export const APP_ROUTE = Object.freeze({
  HOME: 'home',
  PREDICT: 'predict',
  BRACKET: 'bracket',
  KO_PREDICTOR: 'ko-predictor',
  LEAGUES: 'leagues',
  RESULTS: 'results',
  MATCH_CENTRE: 'match-centre',
  PLAYER: 'player',
  LEADERBOARDS: 'leaderboards',
  ACCOUNT: 'account',
  TOURNAMENT: 'tournament',
  HOW_TO_PLAY: 'how-to-play',
  ADMIN: 'admin',
})

export const ADMIN_SECTION = Object.freeze({
  OVERVIEW: 'overview',
  RESULTS: 'results',
  CORRECTIONS: 'corrections',
  FIXTURES: 'fixtures',
  PHASE_FEATURES: 'phase-features',
  GRACE: 'grace',
  TIME: 'time',
  PROFILES: 'profiles',
  SCORING: 'scoring',
  TOURNAMENT_PICKS: 'tournament-picks',
  AUDIT: 'audit',
})

export const ADMIN_SECTIONS = Object.freeze([
  Object.freeze({ key: ADMIN_SECTION.OVERVIEW, label: 'Overview', hash: '#/admin?section=overview', heading: 'Operational overview' }),
  Object.freeze({ key: ADMIN_SECTION.RESULTS, label: 'Results', hash: '#/admin?section=results', heading: 'Result operations' }),
  Object.freeze({ key: ADMIN_SECTION.CORRECTIONS, label: 'Corrections', hash: '#/admin?section=corrections', heading: 'Result correction controls' }),
  Object.freeze({ key: ADMIN_SECTION.FIXTURES, label: 'Fixtures', hash: '#/admin?section=fixtures', heading: 'Fixture schedule operations' }),
  Object.freeze({ key: ADMIN_SECTION.PHASE_FEATURES, label: 'Phase & features', hash: '#/admin?section=phase-features', heading: 'Phase and feature safeguards' }),
  Object.freeze({ key: ADMIN_SECTION.GRACE, label: 'Grace', hash: '#/admin?section=grace', heading: 'Prediction grace controls' }),
  Object.freeze({ key: ADMIN_SECTION.TIME, label: 'Time', hash: '#/admin?section=time', heading: 'Staging Time & Phase' }),
  Object.freeze({ key: ADMIN_SECTION.PROFILES, label: 'Profiles', hash: '#/admin?section=profiles', heading: 'Team content' }),
  Object.freeze({ key: ADMIN_SECTION.SCORING, label: 'Scoring', hash: '#/admin?section=scoring', heading: 'Scoring and recovery' }),
  Object.freeze({ key: ADMIN_SECTION.TOURNAMENT_PICKS, label: 'Tournament Picks', hash: '#/admin?section=tournament-picks', heading: 'Tournament Picks' }),
  Object.freeze({ key: ADMIN_SECTION.AUDIT, label: 'Audit', hash: '#/admin?section=audit', heading: 'Administrator audit' }),
])

const ADMIN_SECTION_KEYS = new Set(ADMIN_SECTIONS.map(section => section.key))

export const LEADERBOARD_COMPETITION = Object.freeze({
  ORIGINAL: 'original',
  KO_PREDICTOR: 'koPredictor',
})

export const APP_DESTINATIONS = Object.freeze([
  Object.freeze({ key: APP_ROUTE.HOME, label: 'Home', shortLabel: 'Home', hash: '#/', icon: 'home' }),
  Object.freeze({ key: APP_ROUTE.PREDICT, label: 'Groups', shortLabel: 'Groups', hash: '#/groups', icon: 'predict' }),
  Object.freeze({ key: APP_ROUTE.BRACKET, label: 'Bracket', shortLabel: 'Bracket', hash: '#/bracket', icon: 'bracket' }),
  Object.freeze({ key: APP_ROUTE.KO_PREDICTOR, label: 'KO Predictor', shortLabel: 'KO', hash: '#/ko-predictor', icon: 'trophy' }),
  Object.freeze({ key: APP_ROUTE.LEAGUES, label: 'Leagues', shortLabel: 'Leagues', hash: '#/leagues', icon: 'leagues' }),
  Object.freeze({ key: APP_ROUTE.RESULTS, label: 'Results', shortLabel: 'Results', hash: '#/results', icon: 'results' }),
  Object.freeze({ key: APP_ROUTE.MATCH_CENTRE, label: 'Match Centre', shortLabel: 'Match', hash: '#/match-centre', icon: 'results' }),
  Object.freeze({ key: APP_ROUTE.LEADERBOARDS, label: 'Leaderboards', shortLabel: 'Tables', hash: '#/leaderboards', icon: 'results' }),
  Object.freeze({ key: APP_ROUTE.ACCOUNT, label: 'Account', shortLabel: 'Account', hash: '#/account', icon: 'account' }),
  Object.freeze({ key: APP_ROUTE.TOURNAMENT, label: 'Tournament', shortLabel: 'Tournament', hash: '#/tournament', icon: 'info' }),
  Object.freeze({ key: APP_ROUTE.HOW_TO_PLAY, label: 'How to play', shortLabel: 'Rules', hash: '#/how-to-play', icon: 'info' }),
  Object.freeze({ key: APP_ROUTE.ADMIN, label: 'Admin', shortLabel: 'Admin', hash: '#/admin', icon: 'admin' }),
])

const ROUTE_BY_PATH = new Map([
  ['', APP_ROUTE.HOME],
  ['/', APP_ROUTE.HOME],
  ['/home', APP_ROUTE.HOME],
  ['/groups', APP_ROUTE.PREDICT],
  ['/predict', APP_ROUTE.PREDICT],
  ['/predictions', APP_ROUTE.PREDICT],
  ['/group-stage-review', APP_ROUTE.PREDICT],
  ['/bracket', APP_ROUTE.BRACKET],
  ['/ko', APP_ROUTE.KO_PREDICTOR],
  ['/ko-predictor', APP_ROUTE.KO_PREDICTOR],
  ['/leagues', APP_ROUTE.LEAGUES],
  ['/results', APP_ROUTE.RESULTS],
  ['/match-centre', APP_ROUTE.MATCH_CENTRE],
  ['/match', APP_ROUTE.MATCH_CENTRE],
  ['/player', APP_ROUTE.PLAYER],
  ['/player-view', APP_ROUTE.PLAYER],
  ['/leaderboards', APP_ROUTE.LEADERBOARDS],
  ['/standings', APP_ROUTE.LEADERBOARDS],
  ['/rankings', APP_ROUTE.LEADERBOARDS],
  ['/account', APP_ROUTE.ACCOUNT],
  ['/tournament', APP_ROUTE.TOURNAMENT],
  ['/rules', APP_ROUTE.HOW_TO_PLAY],
  ['/how-to-play', APP_ROUTE.HOW_TO_PLAY],
  ['/howtoplay', APP_ROUTE.HOW_TO_PLAY],
  ['/admin', APP_ROUTE.ADMIN],
])

export function normaliseHashPath(hashValue = '') {
  const raw = String(hashValue).replace(/^#/, '').split('?')[0]
  const withSlash = raw === '' ? '/' : raw.startsWith('/') ? raw : `/${raw}`
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash
}

export function hashSearchParams(hashValue = '') {
  const query = String(hashValue).replace(/^#/, '').split('?')[1] ?? ''
  return new URLSearchParams(query)
}

export function leaderboardCompetitionFromHash(hashValue = '') {
  const requested = hashSearchParams(hashValue).get('competition')
  return requested === LEADERBOARD_COMPETITION.KO_PREDICTOR
    ? LEADERBOARD_COMPETITION.KO_PREDICTOR
    : LEADERBOARD_COMPETITION.ORIGINAL
}

export function routeFromHash(hashValue = '') {
  return ROUTE_BY_PATH.get(normaliseHashPath(hashValue)) ?? APP_ROUTE.HOME
}


export function adminSectionFromHash(hashValue = '') {
  const requested = hashSearchParams(hashValue).get('section')
  return ADMIN_SECTION_KEYS.has(requested) ? requested : ADMIN_SECTION.OVERVIEW
}

export function hasInvalidAdminSection(hashValue = '') {
  const requested = hashSearchParams(hashValue).get('section')
  return requested !== null && !ADMIN_SECTION_KEYS.has(requested)
}

export function adminSectionDestination(sectionKey) {
  return ADMIN_SECTIONS.find(section => section.key === sectionKey) ?? ADMIN_SECTIONS[0]
}

export function isKnownAppHash(hashValue = '') {
  return ROUTE_BY_PATH.has(normaliseHashPath(hashValue))
}

export function knownInternalHashes() {
  return Object.freeze([
    ...APP_DESTINATIONS.map(destination => destination.hash),
    ...ADMIN_SECTIONS.map(section => section.hash),
  ])
}

export function destinationForRoute(routeKey) {
  return APP_DESTINATIONS.find(destination => destination.key === routeKey) ?? APP_DESTINATIONS[0]
}

export function playerViewParamsFromHash(hashValue = '') {
  const params = hashSearchParams(hashValue)
  const competition = params.get('competition') === 'ko_predictor' ? 'ko_predictor' : 'original'
  return Object.freeze({
    userId: params.get('user') || params.get('member') || null,
    competition,
  })
}

export function matchCentreParamsFromHash(hashValue = '') {
  const params = hashSearchParams(hashValue)
  const match = Number(params.get('match'))
  return Object.freeze({
    matchNumber: Number.isInteger(match) && match > 0 ? match : null,
    competition: params.get('competition') === 'ko_predictor' ? 'ko_predictor' : 'original',
    leagueId: params.get('league') || null,
  })
}
