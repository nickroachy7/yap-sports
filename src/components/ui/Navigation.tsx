'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import Button from './Button'

type UserTeam = {
  id: string
  name: string
  coins: number
}

export function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createSupabaseBrowserClient()
  
  const [userId, setUserId] = useState<string | null>(null)
  const [userTeams, setUserTeams] = useState<UserTeam[]>([])
  const [currentTeam, setCurrentTeam] = useState<UserTeam | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    async function loadAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        setUserId(session.user.id)
        await loadUserTeams(session.user.id)
      }
    }
    
    loadAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.id) {
        setUserId(session.user.id)
        await loadUserTeams(session.user.id)
      } else {
        setUserId(null)
        setUserTeams([])
        setCurrentTeam(null)
      }
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  // Extract current team from URL
  useEffect(() => {
    if (pathname.includes('/dashboard/') && userTeams.length > 0) {
      const teamId = pathname.split('/dashboard/')[1]?.split('/')[0]
      const team = userTeams.find(t => t.id === teamId)
      setCurrentTeam(team || null)
    }
  }, [pathname, userTeams])

  async function loadUserTeams(uid: string) {
    try {
      const { data: teams, error } = await supabase
        .from('user_teams')
        .select('*')
        .eq('user_id', uid)
        .eq('active', true)
        .order('created_at', { ascending: true })

      if (error) throw error
      setUserTeams(teams || [])
    } catch (error) {
      console.error('Error loading teams:', error)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }



  const navigationLinks = [
    { href: '/players', label: 'Players', icon: '👥' },
    { href: '/design-system', label: 'Design', icon: '🎨' }
  ]

  return (
    <nav className="border-b" style={{backgroundColor: 'var(--color-midnight)', borderColor: 'var(--color-steel)'}}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-2xl font-black text-white">⚡</div>
            <div className="text-xl font-black text-white">YAP SPORTS</div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationLinks.map(link => (
              <Link 
                key={link.href}
                href={link.href}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${pathname.startsWith(link.href) 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }
                `}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* User Section */}
          <div className="flex items-center space-x-4">
            {userId ? (
              <>
                {/* No Teams State */}
                {userTeams.length === 0 && (
                  <Link href="/teams">
                    <Button variant="primary" size="sm">
                      Create Team
                    </Button>
                  </Link>
                )}

                {/* Current Team Display */}
                {currentTeam && (
                  <div className="hidden sm:flex items-center space-x-3 px-3 py-2 rounded-lg" 
                       style={{backgroundColor: 'var(--color-slate)'}}>
                    <div className="text-sm">
                      <div className="font-medium text-white">{currentTeam.name}</div>
                    </div>
                  </div>
                )}



                {/* Sign Out */}
                <Button variant="ghost" size="sm" onClick={signOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/auth">
                  <Button variant="primary" size="sm">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
          >
            ☰
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t pt-4 pb-4" style={{borderColor: 'var(--color-steel)'}}>
            <div className="space-y-2">
              {navigationLinks.map(link => (
                <Link 
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors
                    ${pathname.startsWith(link.href) 
                      ? 'bg-green-600 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }
                  `}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
            
            {/* Mobile Team Switcher */}
            {userId && userTeams.length > 0 && (
              <div className="border-t pt-4 mt-4" style={{borderColor: 'var(--color-steel)'}}>
                <div className="text-sm font-medium text-white mb-3">Your Teams</div>
                <div className="space-y-2">
                  {userTeams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => {
                        router.push(`/dashboard/${team.id}`)
                        setIsMenuOpen(false)
                      }}
                      className={`
                        w-full text-left p-3 rounded-lg transition-colors
                        ${currentTeam?.id === team.id 
                          ? 'bg-green-600 text-white' 
                          : 'hover:bg-gray-700 text-gray-300'
                        }
                      `}
                    >
                      <div className="font-medium">{team.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </nav>
  )
}
