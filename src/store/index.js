import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, getProfile } from '../lib/supabase'

// Track whether listeners have been set up — only do it once
let authListenerSetUp = false
let visibilityListenerSetUp = false

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: true,
      isAdmin: false,
      isLeagueAdmin: false,
      initialized: false,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ 
        profile, 
        isAdmin: profile?.is_admin || false,
        isLeagueAdmin: profile?.admin_level === 'league_admin' || false
      }),
      setLoading: (isLoading) => set({ isLoading }),

      loadProfile: async (userId) => {
        const { data } = await getProfile(userId)
        if (data) {
          const [{ data: awardPreds }, { data: goalPreds }] = await Promise.all([
            supabase.from('award_predictions').select('award_type').eq('user_id', userId),
            supabase.from('tournament_predictions').select('prediction_type').eq('user_id', userId)
              .in('prediction_type', ['group_goals', 'knockout_goals', 'total_goals'])
          ])
          const playerAwards = awardPreds?.length || 0
          const goalsEntered = (goalPreds?.length || 0) > 0 ? 1 : 0
          const awards_done = playerAwards + goalsEntered
          set({ profile: { ...data, awards_done }, isAdmin: data.is_admin || false, isLeagueAdmin: data.admin_level === 'league_admin' || false })
        }
      },

      initialize: async () => {
        const state = get()

        // ── Set up auth state listener ONCE ─────────────────────────────
        if (!authListenerSetUp) {
          authListenerSetUp = true
          supabase.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
              set({ user: session.user, initialized: true })
              get().loadProfile(session.user.id).catch(() => {})
            } else if (event === 'SIGNED_OUT') {
              set({ user: null, profile: null, isAdmin: false, isLeagueAdmin: false, initialized: false })
            } else if (event === 'TOKEN_REFRESHED' && session?.user) {
              set({ user: session.user })
            }
          })
        }

        // ── iOS/Safari: refresh session when returning to app ONCE ───────
        if (!visibilityListenerSetUp && typeof document !== 'undefined') {
          visibilityListenerSetUp = true
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
              // Force a real network refresh — not just the local cache
              supabase.auth.refreshSession().then(({ data: { session }, error }) => {
                if (session?.user) {
                  set({ user: session.user })
                } else if (!error) {
                  // Session genuinely gone
                  const currentState = get()
                  if (currentState.user) {
                    set({ user: null, profile: null, isAdmin: false, isLeagueAdmin: false, initialized: false })
                  }
                }
                // If error (e.g. network offline), keep existing session
              }).catch(() => {})
            }
          })
        }

        // ── Already initialized — force refresh then return ──────────────
        if (state.initialized) {
          set({ isLoading: false })
          // Force a real token refresh (not just cache read)
          supabase.auth.refreshSession().then(({ data: { session }, error }) => {
            if (session?.user) {
              set({ user: session.user })
              get().loadProfile(session.user.id).catch(() => {})
            } else if (!error) {
              set({ user: null, profile: null, isAdmin: false, isLeagueAdmin: false, initialized: false })
            }
            // If network error, silently keep existing session
          }).catch(() => {})
          return
        }

        // ── First init ───────────────────────────────────────────────────
        set({ isLoading: true })
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            set({ user: session.user })
            await get().loadProfile(session.user.id)
          } else {
            set({ user: null, profile: null })
          }
        } catch (e) {
          console.error('Auth init error:', e)
        }
        set({ isLoading: false, initialized: true })
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, isAdmin: false, isLeagueAdmin: false, initialized: false })
      },
    }),
    {
      name: 'wc26-auth',
      partialize: (state) => ({ 
        user: state.user, 
        profile: state.profile,
        initialized: state.initialized,
      }),
    }
  )
)

export const useAppStore = create(
  persist(
    (set) => ({
      darkMode: false,
      showFuturePredictions: true,
      mobileMenuOpen: false,
      activeTab: 'home',
      appSettings: {},

      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setShowFuturePredictions: (val) => set({ showFuturePredictions: val }),
      toggleShowFuturePredictions: () => set((state) => ({ showFuturePredictions: !state.showFuturePredictions })),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      loadAppSettings: async () => {
        const { data } = await supabase.from('app_settings').select('key, value')
        const settings = {}
        data?.forEach(s => { settings[s.key] = s.value })
        set({ appSettings: settings })
      },
    }),
    {
      name: 'wc26-app',
      partialize: (state) => ({
        darkMode: state.darkMode,
        showFuturePredictions: state.showFuturePredictions,
      }),
    }
  )
)
