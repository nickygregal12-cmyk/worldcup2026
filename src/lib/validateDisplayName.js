/**
 * validateDisplayName — checks a proposed display/user name against
 * content rules before saving. Returns { ok: true } or { ok: false, reason: string }.
 *
 * Covers:
 *  - Length / format
 *  - General profanity (English)
 *  - Scottish/sectarian football content (Rangers, Celtic and associated terms)
 *
 * This runs client-side only — it's a UX gate, not a security control.
 * Admin edits bypass this intentionally so moderators can clean up names.
 */

// Exact and partial-match terms that are never acceptable in a display name.
// Uses lowercase; we normalise the input before checking.
// Partial-match: if the blocklist term appears *anywhere* in the name (as a
// word or substring), it's rejected — so "bigbhoy" catches "bhoy" etc.
const BLOCKED_TERMS = [
  // === General profanity (common English) ===
  'fuck', 'fuk', 'f*ck', 'fvck',
  'shit', 'sh1t', 'sht',
  'cunt', 'cnt', 'c*nt', 'cvnt',
  'bastard', 'bstrd',
  'wank', 'wanker',
  'dick', 'dik', 'd1ck',
  'cock', 'c0ck',
  'arse', 'ass', 'a55',
  'bitch', 'b1tch',
  'piss', 'p1ss',
  'twat', 'tw4t',
  'bellend', 'bell end',
  'prick', 'pr1ck',
  'tosser', 'wankstain',
  'shite', 'sh1te',
  'bollock', 'bollocks',
  'slag', 'slut',
  'nigger', 'n1gger', 'nig',
  'chink', 'ch1nk',
  'spastic', 'retard',
  'faggot', 'fag',

  // === Rangers / sectarian terms ===
  'rangers',
  'gers',
  'huns',
  'teddy bears', // rhyming slang
  'loyalist',
  'orange order', 'orangeman', 'orange walk',
  'billy boy', 'billy boys', 'billyboy',
  'fenian',         // anti-Celtic sectarian slur
  'taig', 'taigs',  // anti-Celtic sectarian slur
  'proddy', 'proddie',
  'bluenose',

  // === Celtic / sectarian terms ===
  'celtic',
  'bhoy', 'bhoys',
  'tim', 'tims',    // sectarian slur for Celtic fans
  'fenian',         // also anti-Rangers
  'kaflik', 'kaflic', // phonetic slur
  'tattie',         // "tattie tim" slur
  'hoops',
  'parkhead', 'celtic park',
  'ibrox',          // Rangers ground — also blocks combined content
  'ira',            // Irish Republican Army — sectarian context
  'uda', 'uvf', 'ulf', // loyalist paramilitary references
  'up the ra',
  'h*n', 'hun',     // sectarian term for Rangers fans

  // === Combined / obvious combinations ===
  'rfc', 'cfc',     // Rangers/Celtic FC abbreviations
  'watp',           // "We Are The People" Rangers chant
  'ynwa',           // "You'll Never Walk Alone" — Celtic/Liverpool, avoid in this context
]

// Words that are only blocked as standalone words (not substrings), because
// they appear in legitimate names (e.g. "ass" is in "Assassin", "class" etc.)
const WHOLE_WORD_ONLY = new Set([
  'ass', 'arse', 'slag', 'tim', 'tims', 'hun', 'ira', 'rfc', 'cfc',
  'dick', 'cock', 'fag', 'gers', 'hoops',
])

// Normalise: lowercase, collapse spaces, strip common leet substitutions
function normalise(str) {
  return str
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function validateDisplayName(raw) {
  if (!raw || !raw.trim()) return { ok: false, reason: 'Display name cannot be empty.' }

  const trimmed = raw.trim()
  if (trimmed.length < 2) return { ok: false, reason: 'Display name must be at least 2 characters.' }
  if (trimmed.length > 30) return { ok: false, reason: 'Display name must be 30 characters or less.' }

  const norm = normalise(trimmed)

  for (const term of BLOCKED_TERMS) {
    const normTerm = normalise(term)
    if (WHOLE_WORD_ONLY.has(term)) {
      // Only reject if it's a standalone word (surrounded by spaces or string boundaries)
      const wordRegex = new RegExp(`(^|\\s)${normTerm}(\\s|$)`)
      if (wordRegex.test(norm)) {
        return { ok: false, reason: 'That name isn\'t allowed. Please choose something else.' }
      }
    } else {
      if (norm.includes(normTerm)) {
        return { ok: false, reason: 'That name isn\'t allowed. Please choose something else.' }
      }
    }
  }

  return { ok: true }
}
