import { createClient } from '@supabase/supabase-js'
import { ENVIRONMENT, validateClientEnvironment } from '../config/environment.js'

const { supabaseUrl, supabaseAnonKey } = ENVIRONMENT
const environmentCheck = validateClientEnvironment()

if (!environmentCheck.valid) {
  console.error(`Missing Supabase environment variables: ${environmentCheck.missing.join(', ')}`)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Auth helpers
export const signUpWithEmail = async (email, password, displayName) => {
  // Generate clean username from display name (lowercase, no spaces/special chars)
  const cleanUsername = displayName.toLowerCase().replace(/[^a-z0-9_]/g, '')
  // Sign up the user — pass both display name (as typed) and clean username
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: cleanUsername || displayName.toLowerCase().replace(/\s/g, ''),
        full_name: displayName.trim(), // preserved exactly as typed
      },
      emailRedirectTo: window.location.origin,
    },
  })
  if (error) return { data, error }

  // Sign in immediately so session is active without email confirmation
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data: signInData, error: signInError }
}

export const signInWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}