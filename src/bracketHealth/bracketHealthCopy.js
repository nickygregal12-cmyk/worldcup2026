// Player-facing copy for Bracket Health's reveal timing, in one place.
//
// It lives here rather than inline so the audits can assert the CONSTANT — audits pin
// structure and shared constants, never duplicated sentences, and the marker-hygiene
// ratchet enforces exactly that.

export const BRACKET_HEALTH_PENDING_COPY = Object.freeze({
  heading: 'Bracket Health opens once a group has played two rounds of matches.',
  detail: 'Until then there are no standings to compare your bracket against.',
})

// A projected occupant is not a fixture, and the card must never let the two be confused.
export const BRACKET_HEALTH_PROJECTED_LABEL = 'As it stands · on the group tables so far'

export const BRACKET_HEALTH_BEST_THIRD_PENDING =
  'The best third-placed teams need all six groups before they can be placed at all.'

export function bracketHealthProvenance({ groupsReady, groupsTotal }) {
  return `As it stands: ${groupsReady} of ${groupsTotal} groups have played two rounds, so some slots below show who would go through on the tables so far, not a confirmed fixture.`
}
