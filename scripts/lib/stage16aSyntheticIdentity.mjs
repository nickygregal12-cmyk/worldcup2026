export const EURO28_STAGING_PROJECT_REF = 'gcfdwobpnanjchcnvdco'
export const WC26_PRODUCTION_PROJECT_REF = 'ouhxawizadnwrhrjppld'
export const STAGE16A_SYNTHETIC_EMAIL_DOMAIN = 'synthetic.euro28.test'
export const STAGE16A_SYNTHETIC_METADATA_MARKER = Object.freeze({ synthetic_euro28: true })

export const STAGE16A_PERSONA_KEYS = Object.freeze([
  'exact_score_heavy',
  'outcome_only',
  'all_wrong',
  'partial_predictions',
  'no_predictions',
  'submitted_complete',
  'unsubmitted_identical',
  'joker_cap_reached',
  'zero_jokers',
  'engineered_tie_a',
  'engineered_tie_b',
  'bracket_survives_deep',
  'bracket_dead_early',
  'ko_only',
  'original_only',
  'ko_advancing_only',
  'ko_method_variant',
  'ko_joker_variant',
  'correction_sensitive',
])

const personaBlueprints = Object.freeze([
  ['exact_score_heavy', 'Exact Score Heavy', ['original', 'ko_predictor'], 'Many exact group scores and mixed bracket survival.'],
  ['outcome_only', 'Outcome Only', ['original', 'ko_predictor'], 'Correct outcomes without exact-score precision.'],
  ['all_wrong', 'All Wrong', ['original', 'ko_predictor'], 'Negative control for zero/near-zero scoring paths.'],
  ['partial_predictions', 'Partial Predictions', ['original'], 'Incomplete Original bundle for progress and privacy states.'],
  ['no_predictions', 'No Predictions', [], 'Signed-in member with no saved predictions.'],
  ['submitted_complete', 'Submitted Complete', ['original', 'ko_predictor'], 'Complete submitted Original plus KO Predictor evidence.'],
  ['unsubmitted_identical', 'Unsubmitted Identical', ['original'], 'Same picks as a submitted user but not submitted.'],
  ['joker_cap_reached', 'Joker Cap Reached', ['original', 'ko_predictor'], 'Exactly five group jokers and five KO jokers.'],
  ['zero_jokers', 'Zero Jokers', ['original', 'ko_predictor'], 'Complete picks with no jokers.'],
  ['engineered_tie_a', 'Engineered Tie A', ['original', 'ko_predictor'], 'First controlled tie-break comparison member.'],
  ['engineered_tie_b', 'Engineered Tie B', ['original', 'ko_predictor'], 'Second controlled tie-break comparison member.'],
  ['bracket_survives_deep', 'Bracket Survives Deep', ['original'], 'Original bracket keeps late-round live value.'],
  ['bracket_dead_early', 'Bracket Dead Early', ['original'], 'Original bracket loses live value early.'],
  ['ko_only', 'KO Only', ['ko_predictor'], 'KO Predictor-only account.'],
  ['original_only', 'Original Only', ['original'], 'Original-only account.'],
  ['ko_advancing_only', 'KO Advancing Only', ['ko_predictor'], 'KO advancing-team evidence without method precision.'],
  ['ko_method_variant', 'KO Method Variant', ['ko_predictor'], 'KO method evidence variant for 90/ET/pens checks.'],
  ['ko_joker_variant', 'KO Joker Variant', ['ko_predictor'], 'KO joker placement variant.'],
  ['correction_sensitive', 'Correction Sensitive', ['original', 'ko_predictor'], 'Designed to move after canonical result correction.'],
])

function buildEmail(key) {
  return `${key}@${STAGE16A_SYNTHETIC_EMAIL_DOMAIN}`
}

function buildPersona([key, displayName, competitions, scenario], index) {
  return Object.freeze({
    index: index + 1,
    key,
    displayName: `Synthetic ${displayName}`,
    email: buildEmail(key),
    metadata: Object.freeze({
      ...STAGE16A_SYNTHETIC_METADATA_MARKER,
      stage: '16A',
      persona_key: key,
    }),
    competitions: Object.freeze([...competitions]),
    scenario,
    teardownGuard: Object.freeze({
      requiresReservedEmailDomain: true,
      requiresSyntheticMetadataMarker: true,
    }),
  })
}

export const STAGE16A_SYNTHETIC_PERSONAS = Object.freeze(personaBlueprints.map(buildPersona))

export function normaliseProjectRef(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function assertEuro28StagingProjectRef(projectRef) {
  const normalised = normaliseProjectRef(projectRef)

  if (normalised === WC26_PRODUCTION_PROJECT_REF) {
    throw new Error('Stage 16A synthetic identity tooling is blocked against the WC26 production project')
  }

  if (normalised !== EURO28_STAGING_PROJECT_REF) {
    throw new Error(`Stage 16A synthetic identity tooling requires Euro staging project ${EURO28_STAGING_PROJECT_REF}`)
  }

  return normalised
}

export function isSyntheticEuro28Email(email) {
  const value = String(email ?? '').trim().toLowerCase()
  return value.endsWith(`@${STAGE16A_SYNTHETIC_EMAIL_DOMAIN}`) && value.split('@').length === 2
}

export function hasSyntheticEuro28Metadata(metadata) {
  return metadata?.synthetic_euro28 === true
}

export function validateStage16aSyntheticPersonaCatalogue(personas = STAGE16A_SYNTHETIC_PERSONAS) {
  if (!Array.isArray(personas)) throw new Error('Stage 16A personas must be an array')
  if (personas.length !== 19) throw new Error(`Stage 16A requires exactly 19 synthetic personas, found ${personas.length}`)

  const keys = personas.map(persona => persona.key)
  const emails = personas.map(persona => String(persona.email ?? '').toLowerCase())

  for (const key of STAGE16A_PERSONA_KEYS) {
    if (!keys.includes(key)) throw new Error(`Missing Stage 16A persona key: ${key}`)
  }

  if (new Set(keys).size !== keys.length) throw new Error('Stage 16A persona keys must be unique')
  if (new Set(emails).size !== emails.length) throw new Error('Stage 16A synthetic persona emails must be unique')

  for (const persona of personas) {
    if (!isSyntheticEuro28Email(persona.email)) {
      throw new Error(`Persona ${persona.key} must use the reserved synthetic email domain`)
    }
    if (!hasSyntheticEuro28Metadata(persona.metadata)) {
      throw new Error(`Persona ${persona.key} must carry synthetic_euro28 metadata`)
    }
    if (persona.metadata.persona_key !== persona.key) {
      throw new Error(`Persona ${persona.key} metadata persona_key must match the catalogue key`)
    }
    if (persona.teardownGuard?.requiresReservedEmailDomain !== true || persona.teardownGuard?.requiresSyntheticMetadataMarker !== true) {
      throw new Error(`Persona ${persona.key} must require both teardown guards`)
    }
  }

  return Object.freeze({
    personaCount: personas.length,
    keys: Object.freeze([...keys]),
    emails: Object.freeze([...emails]),
    emailDomain: STAGE16A_SYNTHETIC_EMAIL_DOMAIN,
    metadataMarker: 'synthetic_euro28: true',
  })
}

export function buildStage16aSyntheticIdentityPlan({ projectRef = EURO28_STAGING_PROJECT_REF } = {}) {
  const safeProjectRef = assertEuro28StagingProjectRef(projectRef)
  const validation = validateStage16aSyntheticPersonaCatalogue()

  return Object.freeze({
    stage: '16A-P1',
    projectRef: safeProjectRef,
    writesDatabase: false,
    createsUsers: false,
    personaCount: validation.personaCount,
    emailDomain: validation.emailDomain,
    metadataMarker: validation.metadataMarker,
    personas: Object.freeze(STAGE16A_SYNTHETIC_PERSONAS.map(persona => Object.freeze({
      key: persona.key,
      displayName: persona.displayName,
      email: persona.email,
      metadata: persona.metadata,
      competitions: persona.competitions,
      teardownGuard: persona.teardownGuard,
    }))),
  })
}
