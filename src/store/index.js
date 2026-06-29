import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, getProfile } from '../lib/supabase'

// Global listeners are registered once, including under React Strict Mode.
let authListenerSetUp = false
let visibilityListenerSetUp = false
let initializationPromise = null
let initialAuthEventSeen = false
let initialAuthSession = null
const initialAuthWaiters = new Set()

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

const readPersistedAuthHint = () => {
  if (typeof window === 'undefined') {
    return { user: null, hasSupabaseSession: false }
  }

  let persistedUser = null
  try {
    const raw = window.localStorage.getItem('wc26-auth')
    const parsed = raw ? JSON.parse(raw) : null
    persistedUser = parsed?.state?.user || null
  } catch (_) {}

  let hasSupabaseSession = false
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue

      const raw = window.localStorage.getItem(key)
      if (!raw) continue

      const parsed = JSON.parse(raw)
      const candidate = parsed?.currentSession || parsed?.session || parsed
      if (candidate?.access_token || candidate?.refresh_token || candidate?.user?.id) {
        hasSupabaseSession = true
        break
      }
    }
  } catch (_) {}

  return { user: persistedUser, hasSupabaseSession }
}

const notifyInitialAuthWaiters = session => {
  initialAuthWaiters.forEach(resolve => resolve(session || null))
  initialAuthWaiters.clear()
}

const waitForInitialAuthEvent = timeoutMs => {
  if (initialAuthEventSeen) return Promise.resolve(initialAuthSession)

  return new Promise(resolve => {
    let settled = false

    const finish = session => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      initialAuthWaiters.delete(finish)
      resolve(session || null)
    }

    const timer = window.setTimeout(() => finish(null), timeoutMs)
    initialAuthWaiters.add(finish)
  })
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
      authStatus: 'checking',

      setUser: user => set({ user }),
      setProfile: profile => set({
        profile,
        isAdmin: Boolean(profile?.is_admin),
        isLeagueAdmin: profile?.admin_level === 'league_admin',
      }),
      setLoading: isLoading => set({ isLoading }),

      loadProfile: async userId => {
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

          // Permissions are available as soon as the main profile row arrives.
          set({
            profile: data,
            isAdmin: Boolean(data.is_admin),
            isLeagueAdmin: data.admin_level === 'league_admin',
          })

          // These progress helpers are non-blocking and must not delay auth.
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

          // Keep a cached profile during a temporary connection problem.
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
          set({
            isLoading: true,
            initialized: false,
            authStatus: 'checking',
          })

          if (!authListenerSetUp) {
            authListenerSetUp = true

            supabase.auth.onAuthStateChange((event, session) => {
              if (event === 'INITIAL_SESSION') {
                initialAuthEventSeen = true
                initialAuthSession = session || null
                notifyInitialAuthWaiters(initialAuthSession)

                // A very late initial event can still restore a real session,
                // but only after the first check has already finished as guest.
                const current = get()
                if (session?.user && current.initialized && current.authStatus === 'guest') {
                  const signedInUser = session.user
                  set({
                    user: signedInUser,
                    isLoading: true,
                    initialized: false,
                    authStatus: 'checking',
                  })
                  get().loadProfile(signedInUser.id).finally(() => {
                    if (get().user?.id === signedInUser.id) {
                      set({
                        isLoading: false,
                        initialized: true,
                        authStatus: 'authenticated',
                      })
                    }
                  })
                }
                return
              }

              if (event === 'SIGNED_IN' && session?.user) {
                const signedInUser = session.user
                const current = get()

                // initialize() remains authoritative during first restoration.
                if (!current.initialized && current.authStatus === 'checking') {
                  set({ user: signedInUser })
                  return
                }

                set({
                  user: signedInUser,
                  isLoading: true,
                  initialized: false,
                  authStatus: 'checking',
                })
                get().loadProfile(signedInUser.id).finally(() => {
                  if (get().user?.id === signedInUser.id) {
                    set({
                      isLoading: false,
                      initialized: true,
                      authStatus: 'authenticated',
                    })
                  }
                })
                return
              }

              if (event === 'SIGNED_OUT') {
                set({
                  ...emptyAuthState,
                  isLoading: false,
                  initialized: true,
                  authStatus: 'guest',
                })
                return
              }

              if ((event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
                const refreshedUser = session.user
                const current = get()

                set({
                  user: refreshedUser,
                  authStatus: 'authenticated',
                })

                if (!current.profile || current.profile.id !== refreshedUser.id) {
                  get().loadProfile(refreshedUser.id).catch(() => {})
                }
              }
            })
          }

          if (!visibilityListenerSetUp && typeof document !== 'undefined') {
            visibilityListenerSetUp = true

            document.addEventListener('visibilitychange', () => {
              if (document.hidden) return

              supabase.auth.refreshSession()
                .then(async ({ data: { session }, error }) => {
                  if (session?.user) {
                    const current = get()
                    set({
                      user: session.user,
                      authStatus: 'authenticated',
                    })

                    if (!current.profile || current.profile.id !== session.user.id) {
                      await get().loadProfile(session.user.id)
                    }
                  } else if (!error) {
                    set({
                      ...emptyAuthState,
                      isLoading: false,
                      initialized: true,
                      authStatus: 'guest',
                    })
                  }
                  // On a network error, retain the existing session.
                })
                .catch(() => {})
            })
          }

          if (shouldClearSessionOnlyLogin()) {
            await supabase.auth.signOut()
            clearSessionOnlyFlags()
            set({
              ...emptyAuthState,
              isLoading: false,
              initialized: true,
              authStatus: 'guest',
            })
            return
          }

          try {
            const persistedHint = readPersistedAuthHint()
            const cachedUser = get().user || persistedHint.user
            const hasSessionHint = Boolean(cachedUser || persistedHint.hasSupabaseSession)

            // A browser with a cached login gets a longer restoration window.
            // Logged-out users still receive a definitive INITIAL_SESSION check.
            const initialEventWaitMs = hasSessionHint ? 3000 : 1200

            const [sessionResult, eventSession] = await Promise.all([
              supabase.auth.getSession(),
              waitForInitialAuthEvent(initialEventWaitMs),
            ])

            if (sessionResult.error) throw sessionResult.error

            let session = eventSession?.user
              ? eventSession
              : sessionResult.data?.session || null

            // Never convert a cached signed-in user into a guest based only on
            // an early empty read. Verify the refresh token first.
            if (!session?.user && hasSessionHint) {
              const refreshed = await supabase.auth.refreshSession()
              if (refreshed.error) throw refreshed.error
              session = refreshed.data?.session || null
            }

            if (session?.user) {
              set({
                user: session.user,
                isLoading: true,
                initialized: false,
                authStatus: 'checking',
              })

              await get().loadProfile(session.user.id)

              set({
                isLoading: false,
                initialized: true,
                authStatus: 'authenticated',
              })
            } else {
              set({
                ...emptyAuthState,
                isLoading: false,
                initialized: true,
                authStatus: 'guest',
              })
            }
          } catch (error) {
            console.error('Auth init error:', error)

            const existing = get()
            if (existing.user) {
              set({
                isLoading: false,
                initialized: true,
                authStatus: 'authenticated',
              })
            } else {
              set({
                ...emptyAuthState,
                isLoading: false,
                initialized: true,
                authStatus: 'guest',
              })
            }
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
          authStatus: 'guest',
        })
      },
    }),
    {
      name: 'wc26-auth',
      version: 3,
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
          // Readiness is never restored from localStorage.
          isLoading: true,
          initialized: false,
          authStatus: 'checking',
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
