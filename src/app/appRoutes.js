export const APP_ROUTE = Object.freeze({
  HOME: 'home',
  PREDICT: 'predict',
  BRACKET: 'bracket',
  KO_PREDICTOR: 'ko-predictor',
  LEAGUES: 'leagues',
  RESULTS: 'results',
  ACCOUNT: 'account',
  TOURNAMENT: 'tournament',
  ADMIN: 'admin',
})

export const APP_DESTINATIONS = Object.freeze([
  Object.freeze({ key: APP_ROUTE.HOME, label: 'Home', shortLabel: 'Home', hash: '#/', icon: 'home' }),
  Object.freeze({ key: APP_ROUTE.PREDICT, label: 'Groups', shortLabel: 'Groups', hash: '#/groups', icon: 'predict' }),
  Object.freeze({ key: APP_ROUTE.BRACKET, label: 'Bracket', shortLabel: 'Bracket', hash: '#/bracket', icon: 'bracket' }),
  Object.freeze({ key: APP_ROUTE.KO_PREDICTOR, label: 'KO Predictor', shortLabel: 'KO', hash: '#/ko-predictor', icon: 'trophy' }),
  Object.freeze({ key: APP_ROUTE.LEAGUES, label: 'Leagues', shortLabel: 'Leagues', hash: '#/leagues', icon: 'leagues' }),
  Object.freeze({ key: APP_ROUTE.RESULTS, label: 'Results', shortLabel: 'Results', hash: '#/results', icon: 'results' }),
  Object.freeze({ key: APP_ROUTE.ACCOUNT, label: 'Account', shortLabel: 'Account', hash: '#/account', icon: 'account' }),
  Object.freeze({ key: APP_ROUTE.TOURNAMENT, label: 'Tournament', shortLabel: 'Tournament', hash: '#/tournament', icon: 'info' }),
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
  ['/leaderboards', APP_ROUTE.RESULTS],
  ['/account', APP_ROUTE.ACCOUNT],
  ['/tournament', APP_ROUTE.TOURNAMENT],
  ['/admin', APP_ROUTE.ADMIN],
])

export function normaliseHashPath(hashValue = '') {
  const raw = String(hashValue).replace(/^#/, '').split('?')[0]
  const withSlash = raw === '' ? '/' : raw.startsWith('/') ? raw : `/${raw}`
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash
}

export function routeFromHash(hashValue = '') {
  return ROUTE_BY_PATH.get(normaliseHashPath(hashValue)) ?? APP_ROUTE.HOME
}

export function destinationForRoute(routeKey) {
  return APP_DESTINATIONS.find(destination => destination.key === routeKey) ?? APP_DESTINATIONS[0]
}
