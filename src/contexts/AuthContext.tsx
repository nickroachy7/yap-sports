'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { User, Session } from '@supabase/supabase-js'

type UserTeam = {
  id: string
  name: string
  coins: number
  active: boolean
  created_at: string
}

type AuthContextType = {
  user: User | null
  session: Session | null
  userTeams: UserTeam[]
  loading: boolean
  initialized: boolean
  signOut: () => Promise<void>
  refreshTeams: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userTeams, setUserTeams] = useState<UserTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Debug: Log all state changes
  useEffect(() => {
    console.log('[AuthContext] STATE CHANGE:', {
      hasUser: !!user,
      userId: user?.id,
      hasSession: !!session,
      loading,
      initialized,
      teamsCount: userTeams.length,
      timestamp: new Date().toISOString()
    })
  }, [user, session, loading, initialized, userTeams])

  // Load user teams with proper error handling and timeout
  const loadUserTeams = useCallback(async (userId: string) => {
    console.log('[AuthContext] Loading teams for user:', userId)
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Teams query timeout after 10s')), 10000)
      })
      
      const queryPromise = supabase
        .from('user_teams')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: true })
      
      const { data: teams, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any

      if (error) {
        console.error('[AuthContext] Error loading teams:', error)
        console.error('[AuthContext] Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        setUserTeams([])
        return
      }

      console.log('[AuthContext] Teams loaded successfully:', teams?.length || 0, teams)
      setUserTeams(teams || [])
      console.log('[AuthContext] Teams state updated')
    } catch (error) {
      console.error('[AuthContext] Exception loading teams:', error)
      console.error('[AuthContext] Error type:', error instanceof Error ? error.message : 'Unknown error')
      setUserTeams([])
      // Don't let this block initialization
    }
  }, [supabase])

  // Public refresh function
  const refreshTeams = useCallback(async () => {
    if (user?.id) {
      console.log('[AuthContext] Manually refreshing teams')
      await loadUserTeams(user.id)
    }
  }, [user?.id, loadUserTeams])

  // Initialize auth state - runs once on mount
  useEffect(() => {
    console.log('[AuthContext] Initializing auth system...')
    
    let isMounted = true
    
    async function initializeAuth() {
      try {
        console.log('[AuthContext] Starting initialization - getting session...')
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[AuthContext] Error getting session:', error)
          if (isMounted) {
            setLoading(false)
            setInitialized(true)
            setIsInitialLoad(false)
          }
          return
        }

        console.log('[AuthContext] Initial session found:', !!initialSession, 'User ID:', initialSession?.user?.id)
        
        if (!isMounted) return

        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        
        if (initialSession?.user?.id) {
          console.log('[AuthContext] Loading teams for user:', initialSession.user.id)
          await loadUserTeams(initialSession.user.id)
        }
        
        if (isMounted) {
          console.log('[AuthContext] Initialization complete - setting loading to false')
          setLoading(false)
          setInitialized(true)
          setIsInitialLoad(false)
        }
      } catch (error) {
        console.error('[AuthContext] Initialize error:', error)
        if (isMounted) {
          setLoading(false)
          setInitialized(true)
          setIsInitialLoad(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[AuthContext] Auth event:', event, 'Has session:', !!newSession)
        
        if (!isMounted) return

        // Update session and user state
        setSession(newSession)
        setUser(newSession?.user ?? null)

        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] User signed out')
          setUserTeams([])
          setLoading(false)
        } 
        else if (event === 'SIGNED_IN') {
          console.log('[AuthContext] User signed in - isInitialLoad:', isInitialLoad)
          // Skip if this is the initial load - already handled by initializeAuth
          if (isInitialLoad) {
            console.log('[AuthContext] Skipping SIGNED_IN during initial load')
            return
          }
          // Only handle actual user sign-in events after initial load
          if (newSession?.user?.id) {
            console.log('[AuthContext] Loading teams for newly signed in user')
            setLoading(true)
            await loadUserTeams(newSession.user.id)
            setLoading(false)
          }
        }
        else if (event === 'TOKEN_REFRESHED') {
          console.log('[AuthContext] Token refreshed - maintaining current state')
          // Token refresh happens frequently (page nav, etc.)
          // Don't reload teams or change loading state - just update session
          // Teams are already loaded from initial auth
        }
        else if (event === 'USER_UPDATED') {
          console.log('[AuthContext] User updated')
          if (newSession?.user?.id) {
            // Don't set loading true here - just refresh teams quietly
            await loadUserTeams(newSession.user.id)
          }
        }
        else if (event === 'INITIAL_SESSION') {
          console.log('[AuthContext] Initial session event from auth listener - skipping (handled by initializeAuth)')
          // Skip this event - we already handled initial session in initializeAuth()
          // This prevents duplicate team loading and race conditions
        }
      }
    )

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription')
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, loadUserTeams])

  // Set up real-time subscription for team changes
  useEffect(() => {
    if (!user?.id || !initialized) return

    console.log('[AuthContext] Setting up real-time subscription for teams')
    
    const channel = supabase
      .channel(`user_teams_realtime_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_teams',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[AuthContext] Real-time team change:', payload.eventType)
          // Debounce the team reload slightly
          setTimeout(() => loadUserTeams(user.id), 500)
        }
      )
      .subscribe((status) => {
        console.log('[AuthContext] Real-time subscription status:', status)
      })

    return () => {
      console.log('[AuthContext] Cleaning up real-time subscription')
      supabase.removeChannel(channel)
    }
  }, [user?.id, initialized, supabase, loadUserTeams])

  // Sign out function
  const signOut = useCallback(async () => {
    console.log('[AuthContext] Signing out...')
    
    try {
      // Clear local state immediately
      setUser(null)
      setSession(null)
      setUserTeams([])
      setLoading(true)
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('[AuthContext] Sign out error:', error)
      } else {
        console.log('[AuthContext] Sign out successful')
      }
      
    } catch (error) {
      console.error('[AuthContext] Sign out exception:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const value = {
    user,
    session,
    userTeams,
    loading,
    initialized,
    signOut,
    refreshTeams
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
