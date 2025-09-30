'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Trophy, Palette, LogOut, Plus } from 'lucide-react'

type UserTeam = {
  id: string
  name: string
  coins: number
  active: boolean
}

export function TeamSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, userTeams, loading, initialized, signOut: authSignOut } = useAuth()
  
  const [currentTeam, setCurrentTeam] = useState<UserTeam | null>(null)

  console.log('[TeamSidebar] Render:', { 
    hasUser: !!user, 
    teamsCount: userTeams.length, 
    loading, 
    initialized,
    pathname 
  })

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

  // Sign out function
  const handleSignOut = async () => {
    try {
      setCurrentTeam(null)
      await authSignOut()
      // Redirect to home page
      router.push('/')
    } catch (error) {
      console.error('TeamSidebar: Sign out error:', error)
      router.push('/')
    }
  }

  // Show loading state while initializing
  if (loading && !initialized) {
    return (
      <div
        className="fixed left-0 top-0 h-full w-64 z-50 flex flex-col items-center justify-center"
        style={{backgroundColor: 'var(--color-obsidian)', borderRight: '1px solid var(--color-steel)'}}
      >
        <div className="text-center">
          <div className="text-lg text-white mb-2">Loading...</div>
          <div className="text-sm text-gray-400">Initializing auth</div>
        </div>
      </div>
    )
  }

  // Show guest view if not authenticated
  if (!user) {
    return (
      <div
        className="fixed left-0 top-0 h-full w-64 z-50 flex flex-col"
        style={{backgroundColor: 'var(--color-obsidian)', borderRight: '1px solid var(--color-steel)'}}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex items-center justify-center">
          <div 
            onClick={() => router.push('/')}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            title="Go to Homepage"
          >
            <Image
              src="/yapsports-logo.png"
              alt="YAP Sports Logo"
              width={160}
              height={60}
              className="object-contain"
            />
          </div>
        </div>

        {/* Guest Content */}
        <div className="flex-1 p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">Welcome to YAP Sports!</h3>
            <p className="text-sm text-gray-400 mb-4">Sign in to access your teams and start playing fantasy sports.</p>
            <Button 
              onClick={() => router.push('/auth')}
              variant="primary"
              fullWidth
            >
              Sign In / Sign Up
            </Button>
          </div>

          {/* Navigation for guests */}
          <nav className="space-y-2">
            <a 
              href="/players" 
              className="flex items-center space-x-3 p-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <span className="text-lg">👥</span>
              <span>Browse Players</span>
            </a>
          </nav>
        </div>
      </div>
    )
  }


  return (
    <div
      className="fixed left-0 top-0 h-full w-64 z-50 flex flex-col"
      style={{backgroundColor: 'var(--color-obsidian)', borderRight: '1px solid var(--color-steel)'}}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-700 flex items-center justify-center">
        <div 
          onClick={() => router.push('/')}
          className="cursor-pointer hover:opacity-80 transition-opacity"
          title="Go to Homepage"
        >
          <Image
            src="/yapsports-logo.png"
            alt="YAP Sports Logo"
            width={160}
            height={60}
            className="object-contain"
            priority
          />
        </div>
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
            <button
              onClick={() => router.push('/teams/create')}
              className="w-full text-gray-400 text-sm p-3 text-center hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div className="mb-2">No teams found</div>
              <div className="text-xs">Create your first team to get started!</div>
            </button>
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
                <Trophy className="w-5 h-5" />
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
                <Palette className="w-5 h-5" />
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
            {user?.user_metadata?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white text-sm truncate">
              {user?.user_metadata?.username || user?.email?.split('@')[0]}
            </div>
            <div className="text-xs text-gray-400 truncate">{user?.email}</div>
          </div>
        </div>

        {/* Sign Out Button */}
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}