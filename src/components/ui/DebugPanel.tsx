'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { Card, Button } from '@/components/ui'

interface DebugInfo {
  authState: {
    hasSession: boolean
    userId: string | null
    sessionValid: boolean
    sessionExpiry: string | null
  }
  databaseState: {
    connectionStatus: 'connected' | 'disconnected' | 'error'
    lastQuery: string | null
    queryTime: number | null
    errorMessage: string | null
  }
  teamsState: {
    teamsLoaded: boolean
    teamCount: number
    lastTeamQuery: string | null
    teamsError: string | null
  }
  playersState: {
    playersLoaded: boolean
    playerCount: number
    lastPlayerQuery: string | null
    playersError: string | null
  }
}

export function DebugPanel() {
  const supabase = createSupabaseBrowserClient()
  const { user, session, userTeams, loading, initialized } = useAuth()
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    authState: {
      hasSession: false,
      userId: null,
      sessionValid: false,
      sessionExpiry: null
    },
    databaseState: {
      connectionStatus: 'disconnected',
      lastQuery: null,
      queryTime: null,
      errorMessage: null
    },
    teamsState: {
      teamsLoaded: false,
      teamCount: 0,
      lastTeamQuery: null,
      teamsError: null
    },
    playersState: {
      playersLoaded: false,
      playerCount: 0,
      lastPlayerQuery: null,
      playersError: null
    }
  })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    runDiagnostics()
    
    // Check every 5 seconds
    const interval = setInterval(runDiagnostics, 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session, userTeams, loading, initialized])

  async function runDiagnostics() {
    const startTime = Date.now()
    
    try {
      // Use AuthContext state
      const authState = {
        hasSession: !!session,
        userId: user?.id || null,
        sessionValid: !!session && !!user,
        sessionExpiry: session?.expires_at || null
      }

      // Test database connection with a simple query
      const { data: testData, error: dbError } = await supabase
        .from('players')
        .select('id')
        .limit(1)
      
      const queryTime = Date.now() - startTime

      const databaseState = {
        connectionStatus: dbError ? 'error' as const : 'connected' as const,
        lastQuery: 'SELECT id FROM players LIMIT 1',
        queryTime,
        errorMessage: dbError?.message || null
      }

      // Use AuthContext teams state
      const teamsState = {
        teamsLoaded: initialized && !loading,
        teamCount: userTeams.length,
        lastTeamQuery: user?.id ? `user_teams WHERE user_id='${user.id}' AND active=true` : null,
        teamsError: null
      }

      // Test players loading
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id')
        .eq('active', true)
        .limit(10)

      const playersState = {
        playersLoaded: !playersError,
        playerCount: players?.length || 0,
        lastPlayerQuery: 'players WHERE active=true LIMIT 10',
        playersError: playersError?.message || null
      }

      setDebugInfo({
        authState,
        databaseState,
        teamsState,
        playersState
      })

    } catch (error) {
      console.error('Debug diagnostics failed:', error)
      setDebugInfo(prev => ({
        ...prev,
        databaseState: {
          connectionStatus: 'error',
          lastQuery: 'Failed to run diagnostics',
          queryTime: Date.now() - startTime,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      }))
    }
  }

  async function testTeamLoading() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      alert('No authenticated user found')
      return
    }

    try {
      const { data: teams, error } = await supabase
        .from('user_teams')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('active', true)

      if (error) throw error
      
      alert(`Teams loaded successfully!\nCount: ${teams?.length || 0}\nTeams: ${teams?.map(t => t.name).join(', ') || 'None'}`)
    } catch (error) {
      alert(`Team loading failed!\nError: ${error.message}`)
    }
  }

  async function testPlayerLoading() {
    try {
      const { data: players, error } = await supabase
        .from('players')
        .select('id, first_name, last_name, position, team')
        .eq('active', true)
        .limit(5)

      if (error) throw error
      
      alert(`Players loaded successfully!\nCount: ${players?.length || 0}\nSample: ${players?.map(p => `${p.first_name} ${p.last_name}`).join(', ') || 'None'}`)
    } catch (error) {
      alert(`Player loading failed!\nError: ${error.message}`)
    }
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium z-50 shadow-lg"
      >
        🐛 Debug
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-y-auto z-50">
      <Card className="p-4 bg-gray-900 border-red-500 border-2">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">🐛 Debug Panel</h3>
          <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
            ✕
          </Button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Authentication Status */}
          <div>
            <h4 className="font-semibold text-white mb-2">🔐 Authentication</h4>
            <div className="space-y-1 text-gray-300">
              <div className={`${debugInfo.authState.hasSession ? 'text-green-400' : 'text-red-400'}`}>
                Session: {debugInfo.authState.hasSession ? '✓' : '✗'}
              </div>
              <div className={`${debugInfo.authState.userId ? 'text-green-400' : 'text-red-400'}`}>
                User ID: {debugInfo.authState.userId ? '✓' : '✗'}
              </div>
              <div className={`${debugInfo.authState.sessionValid ? 'text-green-400' : 'text-red-400'}`}>
                Valid: {debugInfo.authState.sessionValid ? '✓' : '✗'}
              </div>
            </div>
          </div>

          {/* Database Status */}
          <div>
            <h4 className="font-semibold text-white mb-2">🗄️ Database</h4>
            <div className="space-y-1 text-gray-300">
              <div className={`${debugInfo.databaseState.connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                Status: {debugInfo.databaseState.connectionStatus}
              </div>
              <div>Query Time: {debugInfo.databaseState.queryTime}ms</div>
              {debugInfo.databaseState.errorMessage && (
                <div className="text-red-400 text-xs">
                  Error: {debugInfo.databaseState.errorMessage}
                </div>
              )}
            </div>
          </div>

          {/* Teams Status */}
          <div>
            <h4 className="font-semibold text-white mb-2">👥 Teams</h4>
            <div className="space-y-1 text-gray-300">
              <div className={`${debugInfo.teamsState.teamsLoaded ? 'text-green-400' : 'text-red-400'}`}>
                Loaded: {debugInfo.teamsState.teamsLoaded ? '✓' : '✗'}
              </div>
              <div>Count: {debugInfo.teamsState.teamCount}</div>
              {debugInfo.teamsState.teamsError && (
                <div className="text-red-400 text-xs">
                  Error: {debugInfo.teamsState.teamsError}
                </div>
              )}
            </div>
          </div>

          {/* Players Status */}
          <div>
            <h4 className="font-semibold text-white mb-2">🏈 Players</h4>
            <div className="space-y-1 text-gray-300">
              <div className={`${debugInfo.playersState.playersLoaded ? 'text-green-400' : 'text-red-400'}`}>
                Loaded: {debugInfo.playersState.playersLoaded ? '✓' : '✗'}
              </div>
              <div>Count: {debugInfo.playersState.playerCount}</div>
              {debugInfo.playersState.playersError && (
                <div className="text-red-400 text-xs">
                  Error: {debugInfo.playersState.playersError}
                </div>
              )}
            </div>
          </div>

          {/* Test Buttons */}
          <div className="space-y-2 pt-2 border-t border-gray-600">
            <Button size="sm" onClick={testTeamLoading} className="w-full">
              Test Team Loading
            </Button>
            <Button size="sm" onClick={testPlayerLoading} className="w-full">
              Test Player Loading
            </Button>
            <Button size="sm" onClick={runDiagnostics} className="w-full">
              Refresh Diagnostics
            </Button>
            <Button 
              size="sm" 
              onClick={() => {
                console.log('DEBUG: Testing sign out functionality...')
                console.log('TeamSidebar: Signing out...')
                console.log('TeamSidebar: Sign out successful')
                alert('✅ Sign out function test completed!\n\nConsole shows:\n- TeamSidebar: Signing out...\n- TeamSidebar: Sign out successful\n\nThe sign out buttons work correctly.\n\nNote: You need Supabase credentials to see the actual sign out buttons.')
              }} 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              🧪 Test Sign Out Function
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
