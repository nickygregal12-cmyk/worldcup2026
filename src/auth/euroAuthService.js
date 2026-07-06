import {
  normaliseEmail,
  validatePublicSignupDisplayName,
  validateEmail,
  validatePassword,
} from './authValidation.js'
import { externalRecordSchema, parseExternal } from '../contracts/externalValidation.js'
import { profileRowSchema } from '../contracts/externalSchemas.js'

function requireClient(client) {
  if (!client) throw new Error('The Euro authentication client is unavailable.')
}

function throwValidation(result) {
  if (!result.valid) throw new Error(result.error)
  return result.value
}

export function buildAuthRedirectUrl(mode = null) {
  if (typeof window === 'undefined') return ''

  const url = new URL(window.location.origin)
  if (mode) url.searchParams.set('auth', mode)
  return url.toString()
}

export async function checkDisplayNameAvailability(client, displayName) {
  requireClient(client)
  const validatedName = throwValidation(validatePublicSignupDisplayName(displayName))
  const { data, error } = await client.rpc('is_display_name_available', {
    candidate: validatedName,
  })

  if (error) throw error
  return Boolean(data)
}

export async function signUpWithEmail(client, {
  email,
  password,
  displayName,
  redirectTo = buildAuthRedirectUrl(),
}) {
  requireClient(client)
  const validatedEmail = throwValidation(validateEmail(email))
  const validatedPassword = throwValidation(validatePassword(password))
  const validatedName = throwValidation(validatePublicSignupDisplayName(displayName))

  const available = await checkDisplayNameAvailability(client, validatedName)
  if (!available) throw new Error('That display name is already in use.')

  const { data, error } = await client.auth.signUp({
    email: validatedEmail,
    password: validatedPassword,
    options: {
      emailRedirectTo: redirectTo || undefined,
      data: {
        display_name: validatedName,
      },
    },
  })

  if (error) throw error
  return parseExternal(externalRecordSchema, data ?? {}, 'Sign-up response')
}

export async function signInWithEmail(client, { email, password }) {
  requireClient(client)
  const validatedEmail = throwValidation(validateEmail(email))
  const validatedPassword = throwValidation(validatePassword(password))
  const { data, error } = await client.auth.signInWithPassword({
    email: validatedEmail,
    password: validatedPassword,
  })

  if (error) throw error
  return parseExternal(externalRecordSchema, data ?? {}, 'Sign-in response')
}

export async function requestPasswordReset(client, {
  email,
  redirectTo = buildAuthRedirectUrl('update-password'),
}) {
  requireClient(client)
  const validatedEmail = throwValidation(validateEmail(email))
  const { data, error } = await client.auth.resetPasswordForEmail(validatedEmail, {
    redirectTo: redirectTo || undefined,
  })

  if (error) throw error
  return parseExternal(externalRecordSchema, data ?? {}, 'Password reset response')
}

export async function updatePassword(client, password) {
  requireClient(client)
  const validatedPassword = throwValidation(validatePassword(password))
  const { data, error } = await client.auth.updateUser({ password: validatedPassword })

  if (error) throw error
  return parseExternal(externalRecordSchema, data ?? {}, 'Password update response')
}

export async function signOut(client) {
  requireClient(client)
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export async function loadOwnProfile(client) {
  requireClient(client)
  const { data, error } = await client
    .from('profiles')
    .select('id,display_name,created_at,updated_at')
    .single()

  if (error) throw error
  return parseExternal(profileRowSchema, data, 'Profile response')
}

export async function updateOwnDisplayName(client, displayName) {
  requireClient(client)
  const validatedName = throwValidation(validatePublicSignupDisplayName(displayName))
  const { data, error } = await client.rpc('update_my_profile_display_name', {
    candidate: validatedName,
  })

  if (error) throw error
  const profile = Array.isArray(data) ? data[0] : data
  if (!profile) throw new Error('The updated profile was not returned.')
  return parseExternal(profileRowSchema, profile, 'Updated profile response')
}

export function getEmailForSession(session) {
  return normaliseEmail(session?.user?.email || '')
}
