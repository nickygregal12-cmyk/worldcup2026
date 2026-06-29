function readBoolean(value, fallback = false) {
  if (value == null || value === '') return fallback
  return String(value).toLowerCase() === 'true'
}

function readNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const env = import.meta.env

export const ENVIRONMENT = Object.freeze({
  appEnv: env.VITE_APP_ENV || 'development',
  supabaseUrl: env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || '',
  enableTimeTravel: readBoolean(env.VITE_ENABLE_TIME_TRAVEL, false),
  tournamentId: env.VITE_TOURNAMENT_ID || 'euro-2028-staging',
  tournamentName: env.VITE_TOURNAMENT_NAME || 'Euro 2028 Predictor',
  tournamentShortName: env.VITE_TOURNAMENT_SHORT_NAME || 'EURO 2028',
  tournamentYear: readNumber(env.VITE_TOURNAMENT_YEAR, 2028),
})

export function validateClientEnvironment() {
  const missing = []
  if (!ENVIRONMENT.supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!ENVIRONMENT.supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')

  return {
    valid: missing.length === 0,
    missing,
  }
}
