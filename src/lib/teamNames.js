/**
 * Team name normalisation for matching our DB names to external API names
 * Used for odds API and any other external data source
 */

// Maps our DB name → the-odds-api.com name (canonical direction)
const DB_TO_API = {
  // Fix 1: Bosnia variants
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  'Bosnia and Herzegovina': 'Bosnia and Herzegovina',
  'Bosnia': 'Bosnia and Herzegovina',

  // Fix 2: USA variants
  'United States': 'United States of America',
  'USA': 'United States of America',
  'US': 'United States of America',
  'United States of America': 'United States of America',

  // Fix 3: Türkiye unicode fix — both encoded and plain
  'Türkiye': 'Turkey',
  'Turkiye': 'Turkey',
  'Turkey': 'Turkey',

  // Full 48-team audit (Fix 5)
  'Czechia': 'Czech Republic',
  'Czech Republic': 'Czech Republic',
  "Côte d'Ivoire": "Côte d'Ivoire",
  'Ivory Coast': "Côte d'Ivoire",
  'Cote d\'Ivoire': "Côte d'Ivoire",
  'DR Congo': 'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
  'Congo DR': 'DR Congo',
  'South Korea': 'South Korea',
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'Curacao': 'Curaçao',
  'Curaçao': 'Curaçao',
  'Cape Verde': 'Cape Verde Islands',
  'Cape Verde Islands': 'Cape Verde Islands',
  'North Macedonia': 'Macedonia',
  'Macedonia': 'Macedonia',
  'New Zealand': 'New Zealand',
  'IR Iran': 'Iran',
  'Iran': 'Iran',
  'Saudi Arabia': 'Saudi Arabia',
  'Mexico': 'Mexico',
  'Canada': 'Canada',
  'Argentina': 'Argentina',
  'Brazil': 'Brazil',
  'France': 'France',
  'England': 'England',
  'Spain': 'Spain',
  'Germany': 'Germany',
  'Portugal': 'Portugal',
  'Netherlands': 'Netherlands',
  'Belgium': 'Belgium',
  'Croatia': 'Croatia',
  'Uruguay': 'Uruguay',
  'Colombia': 'Colombia',
  'Japan': 'Japan',
  'Morocco': 'Morocco',
  'Senegal': 'Senegal',
  'Australia': 'Australia',
  'Ecuador': 'Ecuador',
  'Switzerland': 'Switzerland',
  'Poland': 'Poland',
  'Serbia': 'Serbia',
  'Denmark': 'Denmark',
  'Scotland': 'Scotland',
  'Venezuela': 'Venezuela',
  'Panama': 'Panama',
  'Nigeria': 'Nigeria',
}

// Reverse map: API name → our DB name
const API_TO_DB = {}
for (const [db, api] of Object.entries(DB_TO_API)) {
  // Only set if not already set (first entry wins — canonical DB name)
  if (!API_TO_DB[api]) API_TO_DB[api] = db
}

/**
 * Normalise a string for fuzzy comparison:
 * lowercase, strip accents, remove non-alphanumeric
 */
export function normalise(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

// Pre-build a normalised lookup for fast fuzzy matching (Fix 4)
const NORMALISED_DB_TO_API = {}
for (const [db, api] of Object.entries(DB_TO_API)) {
  NORMALISED_DB_TO_API[normalise(db)] = api
}

const NORMALISED_API_TO_DB = {}
for (const [api, db] of Object.entries(API_TO_DB)) {
  NORMALISED_API_TO_DB[normalise(api)] = db
}

/**
 * Convert a DB team name to the odds API name.
 * Tries exact match first, then normalised fuzzy match. (Fix 4)
 */
export function toApiName(dbName) {
  if (!dbName) return dbName
  // Exact match
  if (DB_TO_API[dbName]) return DB_TO_API[dbName]
  // Normalised fuzzy match
  const norm = normalise(dbName)
  if (NORMALISED_DB_TO_API[norm]) return NORMALISED_DB_TO_API[norm]
  // No match — return as-is
  return dbName
}

/**
 * Convert an odds API team name to our DB name.
 * Tries exact match first, then normalised fuzzy match. (Fix 4)
 */
export function toDbName(apiName) {
  if (!apiName) return apiName
  // Exact match
  if (API_TO_DB[apiName]) return API_TO_DB[apiName]
  // Normalised fuzzy match
  const norm = normalise(apiName)
  if (NORMALISED_API_TO_DB[norm]) return NORMALISED_API_TO_DB[norm]
  // No match — return as-is
  return apiName
}

/**
 * Build an odds lookup key from two DB team names
 */
export function oddsKey(homeDbName, awayDbName) {
  return `${toApiName(homeDbName)}|${toApiName(awayDbName)}`
}
