import { describe, expect, it } from 'vitest'
import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_PERSONA_KEYS,
  STAGE16A_SYNTHETIC_EMAIL_DOMAIN,
  STAGE16A_SYNTHETIC_PERSONAS,
  WC26_PRODUCTION_PROJECT_REF,
  assertEuro28StagingProjectRef,
  buildStage16aSyntheticIdentityPlan,
  hasSyntheticEuro28Metadata,
  isSyntheticEuro28Email,
  validateStage16aSyntheticPersonaCatalogue,
} from '../lib/stage16aSyntheticIdentity.mjs'


const approvedPersonaKeysForAudit = [
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
]

describe('Stage 16A-P1 synthetic identity plumbing', () => {
  it('publishes exactly the approved nineteen deterministic personas', () => {
    const validation = validateStage16aSyntheticPersonaCatalogue()

    expect(validation.personaCount).toBe(19)
    expect(validation.keys).toEqual(STAGE16A_PERSONA_KEYS)
    expect(validation.keys).toEqual(approvedPersonaKeysForAudit)
    expect(STAGE16A_SYNTHETIC_PERSONAS.map(persona => persona.key)).toEqual(STAGE16A_PERSONA_KEYS)
  })

  it('uses only the reserved synthetic email domain and metadata marker', () => {
    for (const persona of STAGE16A_SYNTHETIC_PERSONAS) {
      expect(persona.email.endsWith(`@${STAGE16A_SYNTHETIC_EMAIL_DOMAIN}`)).toBe(true)
      expect(isSyntheticEuro28Email(persona.email)).toBe(true)
      expect(hasSyntheticEuro28Metadata(persona.metadata)).toBe(true)
      expect(persona.metadata.persona_key).toBe(persona.key)
      expect(persona.teardownGuard.requiresReservedEmailDomain).toBe(true)
      expect(persona.teardownGuard.requiresSyntheticMetadataMarker).toBe(true)
    }
  })

  it('fails closed outside Euro staging and explicitly blocks WC26 production', () => {
    expect(assertEuro28StagingProjectRef(EURO28_STAGING_PROJECT_REF)).toBe(EURO28_STAGING_PROJECT_REF)
    expect(() => assertEuro28StagingProjectRef(WC26_PRODUCTION_PROJECT_REF)).toThrow(/blocked against the WC26 production project/)
    expect(() => assertEuro28StagingProjectRef('random-project')).toThrow(/requires Euro staging project/)
  })

  it('builds a read-only identity plan rather than creating users', () => {
    const plan = buildStage16aSyntheticIdentityPlan({ projectRef: EURO28_STAGING_PROJECT_REF })

    expect(plan.stage).toBe('16A-P1')
    expect(plan.createsUsers).toBe(false)
    expect(plan.writesDatabase).toBe(false)
    expect(plan.personaCount).toBe(19)
    expect(plan.personas[0]).toEqual(expect.objectContaining({
      key: 'exact_score_heavy',
      email: 'exact_score_heavy@synthetic.euro28.test',
    }))
  })

  it('rejects catalogue drift before any seeding script can rely on it', () => {
    const badDomain = STAGE16A_SYNTHETIC_PERSONAS.map(persona => ({ ...persona }))
    badDomain[0] = { ...badDomain[0], email: 'real.user@example.com' }

    expect(() => validateStage16aSyntheticPersonaCatalogue(badDomain)).toThrow(/reserved synthetic email domain/)

    const badMarker = STAGE16A_SYNTHETIC_PERSONAS.map(persona => ({ ...persona }))
    badMarker[0] = { ...badMarker[0], metadata: { synthetic_euro28: false, persona_key: badMarker[0].key } }

    expect(() => validateStage16aSyntheticPersonaCatalogue(badMarker)).toThrow(/synthetic_euro28 metadata/)
  })
})
