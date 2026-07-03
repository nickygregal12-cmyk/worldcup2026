import { createClient } from '@supabase/supabase-js'
import { ENVIRONMENT, validateClientEnvironment } from '../config/environment.js'

export function createAppClient() {
  const environmentCheck = validateClientEnvironment()

  if (!environmentCheck.valid) {
    return {
      client: null,
      error: `Missing browser environment variables: ${environmentCheck.missing.join(', ')}`,
    }
  }

  return {
    client: createClient(ENVIRONMENT.supabaseUrl, ENVIRONMENT.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 1,
        },
      },
    }),
    error: null,
  }
}
