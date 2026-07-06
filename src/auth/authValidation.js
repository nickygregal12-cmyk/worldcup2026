export const DISPLAY_NAME_MIN_LENGTH = 3
export const DISPLAY_NAME_MAX_LENGTH = 30
export const PASSWORD_MIN_LENGTH = 8

const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*[\p{L}\p{N}]$/u

export function normaliseDisplayName(value) {
  return String(value ?? '').trim().replace(/\s+/gu, ' ')
}

export function validateDisplayName(value) {
  const normalised = normaliseDisplayName(value)

  if (
    normalised.length < DISPLAY_NAME_MIN_LENGTH
    || normalised.length > DISPLAY_NAME_MAX_LENGTH
  ) {
    return {
      valid: false,
      value: normalised,
      error: `Display name must be between ${DISPLAY_NAME_MIN_LENGTH} and ${DISPLAY_NAME_MAX_LENGTH} characters.`,
    }
  }

  if (!DISPLAY_NAME_PATTERN.test(normalised)) {
    return {
      valid: false,
      value: normalised,
      error: 'Use letters, numbers, spaces, full stops, hyphens, apostrophes or underscores only.',
    }
  }

  return { valid: true, value: normalised, error: null }
}


export const PUBLIC_SIGNUP_DISPLAY_NAME_MODERATION_MESSAGE = 'Choose a display name suitable for a mixed football audience.'

const PUBLIC_SIGNUP_BLOCKED_DISPLAY_NAME_PATTERNS = Object.freeze([
  /stop\s+the\s+boats/iu,
  /send\s+them\s+back/iu,
  /white\s+power/iu,
  /sectarian/iu,
  /racist/iu,
])

export function validatePublicSignupDisplayName(value) {
  const base = validateDisplayName(value)
  if (!base.valid) return base

  const normalised = base.value
  const hasBlockedLanguage = PUBLIC_SIGNUP_BLOCKED_DISPLAY_NAME_PATTERNS.some(pattern => pattern.test(normalised))
  if (hasBlockedLanguage) {
    return {
      valid: false,
      value: normalised,
      error: PUBLIC_SIGNUP_DISPLAY_NAME_MODERATION_MESSAGE,
    }
  }

  return base
}

export function normaliseEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function validateEmail(value) {
  const email = normaliseEmail(value)
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  return {
    valid,
    value: email,
    error: valid ? null : 'Enter a valid email address.',
  }
}

export function validatePassword(value) {
  const password = String(value ?? '')
  const valid = password.length >= PASSWORD_MIN_LENGTH

  return {
    valid,
    value: password,
    error: valid ? null : `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  }
}

export function validatePasswordConfirmation(password, confirmation) {
  if (password !== confirmation) {
    return { valid: false, error: 'The passwords do not match.' }
  }

  return { valid: true, error: null }
}
