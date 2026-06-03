import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, getProfile } from '../lib/supabase'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: true,
      isAdmin: false,
      initialized: false,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ 
        profile, 
        isAdmin: profile?.is_admin || false 
      }),
      setLoading: (isLoading) => set({ isLoading }),

      loadProfile: async (userId) => {
        const { data } = await getProfile(userId)
        if (data) {
          set({ profile: data, isAdmin: data.is_admin || false })
        }
      },

      initialize: async () => {
        // If already initialized and we have persisted user, skip the spinner
        const state = get()
        if (state.initialized) {
          set({ isLoading: false })
          // Still refresh profile in background silently
          if (state.user) {
            get().loadProfile(state.user.id).catch(() => {})
          }
          return
        }

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

        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            set({ user: session.user })
            await get().loadProfile(session.user.id)
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, profile: null, isAdmin: false, initialized: false })
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            set({ user: session.user })
          }
        })
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, isAdmin: false, initialized: false })
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
      appSettings: {}, // loaded from app_settings table

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