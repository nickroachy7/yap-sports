'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { checkAuthWithRetry, loadTeamsWithRetry } from '@/lib/authUtils'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

type UserTeam = {
  id: string
  name: string
  coins: number
  active: boolean
}

type User = {
  id: string
  email: string
  username?: string
}

export function TeamSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createSupabaseBrowserClient()
  
  const [user, setUser] = useState<User | null>(null)
  const [userTeams, setUserTeams] = useState<UserTeam[]>([])
  const [currentTeam, setCurrentTeam] = useState<UserTeam | null>(null)
  const [loading, setLoading] = useState(true)

  // Load authentication and teams
  useEffect(() => {
    async function loadAuth() {
      console.log('TeamSidebar: Starting auth check...')
      const authResult = await checkAuthWithRetry()
      
      if (authResult.success && authResult.userId) {
        const { data: { session } } = await supabase.auth.getSession()
        setUser({
          id: authResult.userId,
          email: session?.user?.email || '',
          username: session?.user?.user_metadata?.username
        })
        await loadUserTeams(authResult.userId)
      } else {
        console.log('TeamSidebar: Auth failed:', authResult.error)
        setLoading(false)
      }
    }
    
    loadAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.user_metadata?.username
        })
        await loadUserTeams(session.user.id)
      } else {
        setUser(null)
        setUserTeams([])
        setCurrentTeam(null)
        setLoading(false)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase.auth])

  // Extract current team from URL
  useEffect(() => {
    if (pathname.includes('/dashboard/') && userTeams.length > 0) {
      const teamId = pathname.split('/dashboard/')[1]?.split('/')[0]
      const team = userTeams.find(t => t.id === teamId)
      setCurrentTeam(team || null)
    } else {
      // Clear current team when not on a dashboard page
      setCurrentTeam(null)
    }
  }, [pathname, userTeams])

  // Load user teams
  async function loadUserTeams(uid: string) {
    console.log('TeamSidebar: Loading teams for user:', uid)
    const teamsResult = await loadTeamsWithRetry(uid)
    
    if (teamsResult.success) {
      setUserTeams(teamsResult.teams)
      console.log('TeamSidebar: Successfully loaded teams:', teamsResult.teams.length)
    } else {
      console.error('TeamSidebar: Failed to load teams:', teamsResult.error)
      setUserTeams([])
    }
    
    setLoading(false)
  }

  // Sign out function
  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  // If not authenticated, don't show sidebar
  if (!user) {
    return null
  }

  console.log('TeamSidebar render:', { 
    user: user?.id, 
    userTeams: userTeams.length, 
    loading, 
    currentTeam: currentTeam?.id,
    pathname,
    teamsData: userTeams
  })

  return (
    <div
      className="fixed left-0 top-0 h-full w-64 z-50 flex flex-col"
      style={{backgroundColor: 'var(--color-obsidian)', borderRight: '1px solid var(--color-steel)'}}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-700 flex items-center justify-center">
        <Image
          src="/yapsports-logo.png"
          alt="YAP Sports Logo"
          width={160}
          height={60}
          className="object-contain"
          priority
        />
      </div>

      {/* Teams Section */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Teams</h2>
          <Button
            onClick={() => router.push('/teams/create')}
            variant="ghost"
            size="sm"
            className="text-lg px-2 py-1 h-auto w-8 h-8 flex items-center justify-center"
          >
            +
          </Button>
        </div>
        
        <div className="space-y-2">
          {loading ? (
            <div className="text-gray-400 text-sm p-3">Loading teams...</div>
          ) : userTeams.length > 0 ? (
            userTeams.map((team) => (
              <Link key={team.id} href={`/dashboard/${team.id}`}>
                <motion.div
                  whileHover={{ x: 2 }}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors",
                    currentTeam?.id === team.id 
                      ? "bg-green-600 text-white" 
                      : "hover:bg-gray-700 text-gray-300"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                    currentTeam?.id === team.id 
                      ? "bg-green-500 text-white" 
                      : "bg-gray-600 text-gray-200"
                  )}>
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                                  <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{team.name}</div>
                </div>
                </motion.div>
              </Link>
            ))
          ) : (
            <div className="text-gray-400 text-sm p-3 text-center">
              <div className="mb-2">No teams found</div>
              <div className="text-xs">Create your first team to get started!</div>
            </div>
          )}
        </div>
      </div>

      {/* Tools Section */}
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Tools</h2>
        
        <div className="space-y-2">
          <Link href="/players">
            <motion.div
              whileHover={{ x: 2 }}
              className={cn(
                "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors text-gray-300 hover:bg-gray-700",
                pathname === '/players' && "bg-green-600 text-white"
              )}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg">
                🏈
              </div>
              <span className="font-medium">Players</span>
            </motion.div>
          </Link>
          
          <Link href="/design-system">
            <motion.div
              whileHover={{ x: 2 }}
              className={cn(
                "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors text-gray-300 hover:bg-gray-700",
                pathname === '/design-system' && "bg-green-600 text-white"
              )}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg">
                🎨
              </div>
              <span className="font-medium">Design</span>
            </motion.div>
          </Link>
        </div>
      </div>

      {/* User Profile & Sign Out */}
      <div className="mt-auto p-6">
        {/* User Profile */}
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
            {user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white text-sm truncate">
              {user.username || user.email?.split('@')[0]}
            </div>
            <div className="text-xs text-gray-400 truncate">{user.email}</div>
          </div>
        </div>

        {/* Sign Out Button */}
        <Button
          onClick={signOut}
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700"
        >
          <span className="mr-3">🚪</span>
          Sign Out
        </Button>
      </div>
    </div>
  )
}