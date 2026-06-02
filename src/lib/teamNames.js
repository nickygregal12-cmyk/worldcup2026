/**
 * Team name normalisation for matching our DB names to external API names
 * Used for odds API and any other external data source
 */

// Maps our DB name → API name (the-odds-api.com format)
const DB_TO_API = {
  'Czechia': 'Czech Republic',
  'Türkiye': 'Turkey',
  'Turkiye': 'Turkey',
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  'United States': 'United States of America',
  'USA': 'United States of America',
  'Ivory Coast': "Côte d'Ivoire",
  "Côte d'Ivoire": "Côte d'Ivoire",
  'DR Congo': 'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
  'South Korea': 'South Korea',
  'Korea Republic': 'South Korea',
  'Curacao': 'Curaçao',
  'Curaçao': 'Curaçao',
  'Cape Verde': 'Cape Verde Islands',
  'North Macedonia': 'Macedonia',
}

// Reverse map: API name → our DB name (for matching incoming API data)
const API_TO_DB = Object.fromEntries(
  Object.entries(DB_TO_API).map(([db, api]) => [api, db])
)

/**
 * Normalise a DB team name to match the odds API
 */
export function toApiName(dbName) {
  return DB_TO_API[dbName] || dbName
}

/**
 * Normalise an API team name to match our DB
 */
export function toDbName(apiName) {
  return API_TO_DB[apiName] || apiName
}

/**
 * Build an odds lookup key from two DB team names
 * Tries multiple name variants to maximise match rate
 */
export function oddsKey(homeDbName, awayDbName) {
  return `${toApiName(homeDbName)}|${toApiName(awayDbName)}`
}

/**
 * Fuzzy match — strip accents and lowercase for comparison
 */
export function normalise(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}