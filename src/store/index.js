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
        set({ isLoading: true })
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          set({ user: session.user })
          await get().loadProfile(session.user.id)
        }
        set({ isLoading: false })

        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            set({ user: session.user })
            await get().loadProfile(session.user.id)
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, profile: null, isAdmin: false })
          }
        })
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, isAdmin: false })
      },
    }),
    {
      name: 'wc26-auth',
      partialize: (state) => ({ user: state.user, profile: state.profile }),
    }
  )
)

export const useAppStore = create((set) => ({
  darkMode: false,
  mobileMenuOpen: false,
  activeTab: 'home',
  
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}))