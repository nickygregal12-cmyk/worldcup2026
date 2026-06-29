import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, getProfile } from '../lib/supabase'

// Set global listeners up once, even when React Strict Mode mounts twice.
let authListenerSetUp = false
let visibilityListenerSetUp = false
let initializationPromise = null

const SESSION_ONLY_KEY = 'wc26-session-only'
const SESSION_ACTIVE_KEY = 'wc26-session-active'

const shouldClearSessionOnlyLogin = () => {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SESSION_ONLY_KEY) === 'true' &&
    window.sessionStorage.getItem(SESSION_ACTIVE_KEY) !== 'true'
}

const clearSessionOnlyFlags = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SESSION_ONLY_KEY)
  window.sessionStorage.removeItem(SESSION_ACTIVE_KEY)
}

const emptyAuthState = {
  user: null,
  profile: null,
  isAdmin: false,
  isLeagueAdmin: false,
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      ...emptyAuthState,
      isLoading: true,
      initialized: false,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({
        profile,
        isAdmin: Boolean(profile?.is_admin),
        isLeagueAdmin: profile?.admin_level === 'league_admin',
      }),
      setLoading: (isLoading) => set({ isLoading }),

      loadProfile: async (userId) => {
        try {
          const { data, error } = await getProfile(userId)
          if (error) throw error

          if (!data) {
            set({
              profile: null,
              isAdmin: false,
              isLeagueAdmin: false,
            })
            return null
          }

          // Admin access is known as soon as the profile row arrives. Do not hold
          // protected routes behind the slower awards/progress helper queries.
          set({
            profile: data,
            isAdmin: Boolean(data.is_admin),
            isLeagueAdmin: data.admin_level === 'league_admin',
          })

          Promise.all([
            supabase.from('award_predictions').select('award_type').eq('user_id', userId),
            supabase.from('tournament_predictions').select('prediction_type').eq('user_id', userId)
              .eq('prediction_type', 'total_goals'),
          ]).then(([awardResult, goalResult]) => {
            if (get().user?.id !== userId) return

            const playerAwards = awardResult.data?.length || 0
            const goalsEntered = (goalResult.data?.length || 0) > 0 ? 1 : 0
            const awards_done = playerAwards + goalsEntered

            set(state => ({
              profile: state.profile?.id === userId
                ? { ...state.profile, awards_done }
                : state.profile,
            }))
          }).catch(() => {})

          return data
        } catch (error) {
          console.error('Profile load error:', error)

          // Keep an already hydrated profile during a temporary network failure,
          // but make sure its access flags are restored from that profile.
          const existingProfile = get().profile
          set({
            isAdmin: Boolean(existingProfile?.is_admin),
            isLeagueAdmin: existingProfile?.admin_level === 'league_admin',
          })
          return existingProfile || null
        }
      },

      initialize: async () => {
        if (initializationPromise) return initializationPromise

        initializationPromise = (async () => {
          set({ isLoading: true, initialized: false })

          // ── Auth-state listener ──────────────────────────────────────────
          if (!authListenerSetUp) {
            authListenerSetUp = true

            supabase.auth.onAuthStateChange((event, session) => {
              // initialize() performs the authoritative first-session check.
              // Ignoring this duplicate event avoids competing loading states.
              if (event === 'INITIAL_SESSION') return

              if (event === 'SIGNED_IN' && session?.user) {
                const signedInUser = session.user
                set({
                  user: signedInUser,
                  isLoading: true,
                  initialized: false,
                })

                get().loadProfile(signedInUser.id)
                  .finally(() => {
                    if (get().user?.id === signedInUser.id) {
                      set({ isLoading: false, initialized: true })
                    }
                  })
                return
              }

              if (event === 'SIGNED_OUT') {
                set({
                  ...emptyAuthState,
                  isLoading: false,
                  initialized: true,
                })
                return
              }

              if ((event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
                const refreshedUser = session.user
                const current = get()
                set({ user: refreshedUser })

                if (!current.profile || current.profile.id !== refreshedUser.id) {
                  get().loadProfile(refreshedUser.id).catch(() => {})
                }
              }
            })
          }

          // ── iOS/Safari: verify the session when returning to the app ─────
          if (!visibilityListenerSetUp && typeof document !== 'undefined') {
            visibilityListenerSetUp = true

            document.addEventListener('visibilitychange', () => {
              if (document.hidden) return

              supabase.auth.refreshSession()
                .then(async ({ data: { session }, error }) => {
                  if (session?.user) {
                    const current = get()
                    set({ user: session.user })

                    if (!current.profile || current.profile.id !== session.user.id) {
                      await get().loadProfile(session.user.id)
                    }
                  } else if (!error) {
                    set({
                      ...emptyAuthState,
                      isLoading: false,
                      initialized: true,
                    })
                  }
                  // A temporary network error must not sign the user out.
                })
                .catch(() => {})
            })
          }

          // ── First authoritative session restoration ──────────────────────
          if (shouldClearSessionOnlyLogin()) {
            await supabase.auth.signOut()
            clearSessionOnlyFlags()
            set({
              ...emptyAuthState,
              isLoading: false,
              initialized: true,
            })
            return
          }

          try {
            const { data: { session }, error } = await supabase.auth.getSession()
            if (error) throw error

            if (session?.user) {
              set({ user: session.user })
              await get().loadProfile(session.user.id)
            } else {
              set(emptyAuthState)
            }
          } catch (error) {
            console.error('Auth init error:', error)

            // Preserve a hydrated user/profile on temporary network failure.
            // Supabase will verify it again on the next token/visibility event.
            const existing = get()
            if (!existing.user) set(emptyAuthState)
          } finally {
            set({ isLoading: false, initialized: true })
          }
        })()

        try {
          await initializationPromise
        } finally {
          initializationPromise = null
        }
      },

      logout: async () => {
        clearSessionOnlyFlags()
        await supabase.auth.signOut()
        set({
          ...emptyAuthState,
          isLoading: false,
          initialized: true,
        })
      },
    }),
    {
      name: 'wc26-auth',
      version: 2,
      partialize: state => ({
        user: state.user,
        profile: state.profile,
      }),
      migrate: persistedState => ({
        user: persistedState?.user || null,
        profile: persistedState?.profile || null,
      }),
      merge: (persistedState, currentState) => {
        const profile = persistedState?.profile || null
        return {
          ...currentState,
          user: persistedState?.user || null,
          profile,
          isAdmin: Boolean(profile?.is_admin),
          isLeagueAdmin: profile?.admin_level === 'league_admin',
          // Never restore readiness flags from local storage. The live Supabase
          // session must be checked on every full app load.
          isLoading: true,
          initialized: false,
        }
      },
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
