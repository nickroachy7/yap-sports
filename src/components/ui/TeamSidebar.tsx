'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Trophy, Palette, LogOut, Plus, MoreVertical, Trash2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'

type UserTeam = {
  id: string
  name: string
  coins: number
  active: boolean
}

export function TeamSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, userTeams, loading, initialized, signOut: authSignOut, refreshTeams } = useAuth()
  
  const [currentTeam, setCurrentTeam] = useState<UserTeam | null>(null)
  const [openMenuTeamId, setOpenMenuTeamId] = useState<string | null>(null)
  const [deleteConfirmTeamId, setDeleteConfirmTeamId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  // Handle team deletion
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    setIsDeleting(true)
    try {
      // Get the supabase client and session
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        alert('Not authenticated')
        setIsDeleting(false)
        return
      }

      const response = await fetch('/api/teams/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ teamId })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to delete team')
        setIsDeleting(false)
        return
      }

      // Close dialogs
      setDeleteConfirmTeamId(null)
      setOpenMenuTeamId(null)

      // Refresh teams
      await refreshTeams()

      // If we're currently viewing the deleted team, redirect to dashboard
      if (currentTeam?.id === teamId) {
        router.push('/dashboard')
      }

      console.log('Team deleted successfully:', data)
    } catch (error) {
      console.error('Failed to delete team:', error)
      alert('An error occurred while deleting the team')
    } finally {
      setIsDeleting(false)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuTeamId(null)
    }
    
    if (openMenuTeamId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuTeamId])

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
              <div key={team.id} className="relative">
                <motion.div
                  whileHover={{ x: 2 }}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors relative",
                    currentTeam?.id === team.id 
                      ? "bg-green-600 text-white" 
                      : "hover:bg-gray-700 text-gray-300"
                  )}
                >
                  <Link href={`/dashboard/${team.id}`} className="flex items-center space-x-3 flex-1 min-w-0">
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
                  </Link>
                  
                  {/* Three dots menu */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setOpenMenuTeamId(openMenuTeamId === team.id ? null : team.id)
                    }}
                    className={cn(
                      "p-1 rounded hover:bg-gray-600/50 transition-colors",
                      currentTeam?.id === team.id ? "hover:bg-green-700" : ""
                    )}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </motion.div>

                {/* Dropdown menu */}
                {openMenuTeamId === team.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1 z-50 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirmTeamId(team.id)
                        setOpenMenuTeamId(null)
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left text-red-400 hover:bg-gray-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Team</span>
                    </button>
                  </div>
                )}
              </div>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmTeamId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={() => !isDeleting && setDeleteConfirmTeamId(null)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-white mb-4">Delete Team?</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete <strong>{userTeams.find(t => t.id === deleteConfirmTeamId)?.name}</strong>?
              This action cannot be undone and will delete all associated data including cards, lineups, and tokens.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setDeleteConfirmTeamId(null)}
                variant="ghost"
                className="flex-1"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const team = userTeams.find(t => t.id === deleteConfirmTeamId)
                  if (team) {
                    handleDeleteTeam(team.id, team.name)
                  }
                }}
                variant="primary"
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}