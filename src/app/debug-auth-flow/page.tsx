'use client'

import { useEffect, useState, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { Card, Button } from '@/components/ui'

type LogEntry = {
  timestamp: string
  source: string
  event: string
  details: any
  type: 'info' | 'success' | 'warning' | 'error'
}

export default function DebugAuthFlowPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isMonitoring, setIsMonitoring] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const supabase = createSupabaseBrowserClient()
  const authContext = useAuth()

  const addLog = (source: string, event: string, details: any, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString().split('T')[1].substring(0, 12),
      source,
      event,
      details,
      type
    }
    setLogs(prev => [...prev, entry])
  }

  useEffect(() => {
    if (!isMonitoring) return

    addLog('Page', 'Component Mounted', { url: window.location.href }, 'success')

    // Monitor AuthContext changes
    addLog('AuthContext', 'Current State', {
      hasUser: !!authContext.user,
      userId: authContext.user?.id,
      hasSession: !!authContext.session,
      loading: authContext.loading,
      initialized: authContext.initialized,
      teamsCount: authContext.userTeams.length
    }, 'info')

  }, [isMonitoring])

  // Monitor AuthContext state changes
  useEffect(() => {
    if (!isMonitoring) return
    
    addLog('AuthContext', 'State Changed', {
      hasUser: !!authContext.user,
      userId: authContext.user?.id,
      hasSession: !!authContext.session,
      loading: authContext.loading,
      initialized: authContext.initialized,
      teamsCount: authContext.userTeams.length
    }, authContext.user ? 'success' : 'warning')
  }, [authContext.user, authContext.session, authContext.loading, authContext.initialized, authContext.userTeams, isMonitoring])

  // Set up Supabase auth listener
  useEffect(() => {
    if (!isMonitoring) return

    addLog('Supabase', 'Setting up auth listener', {}, 'info')

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      addLog('Supabase', `Auth Event: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at,
        expiresIn: session?.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) + 's' : null
      }, event === 'SIGNED_OUT' ? 'error' : 'success')
    })

    return () => {
      addLog('Supabase', 'Cleaning up auth listener', {}, 'info')
      subscription.unsubscribe()
    }
  }, [supabase, isMonitoring])

  // Monitor localStorage changes
  useEffect(() => {
    if (!isMonitoring) return

    const checkStorage = () => {
      const keys = Object.keys(localStorage).filter(k => k.includes('supabase'))
      addLog('LocalStorage', 'Auth Keys Check', {
        keysFound: keys.length,
        keys: keys.map(k => k.substring(0, 50))
      }, keys.length > 0 ? 'success' : 'warning')
    }

    checkStorage()
    const interval = setInterval(checkStorage, 3000)

    return () => clearInterval(interval)
  }, [isMonitoring])

  // Scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const clearLogs = () => {
    setLogs([])
    addLog('System', 'Logs cleared', {}, 'info')
  }

  const testSession = async () => {
    addLog('Test', 'Manual session check started', {}, 'info')
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    addLog('Test', 'Session check result', {
      hasSession: !!session,
      userId: session?.user?.id,
      error: error?.message,
      expiresAt: session?.expires_at,
      expiresIn: session?.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) + 's' : null
    }, error ? 'error' : session ? 'success' : 'warning')

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    addLog('Test', 'User check result', {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      error: userError?.message
    }, userError ? 'error' : user ? 'success' : 'warning')
  }

  const testDatabase = async () => {
    addLog('Test', 'Database query started', {}, 'info')
    
    const { data, error } = await supabase
      .from('players')
      .select('id')
      .limit(1)
    
    addLog('Test', 'Database query result', {
      success: !!data && !error,
      error: error?.message,
      rowCount: data?.length || 0
    }, error ? 'error' : 'success')
  }

  const forceRefresh = () => {
    addLog('System', 'Force page refresh', {}, 'warning')
    window.location.reload()
  }

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      default: return 'text-blue-400'
    }
  }

  const getTypeIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      default: return 'ℹ️'
    }
  }

  return (
    <div className="min-h-screen p-8" style={{backgroundColor: 'var(--color-obsidian)'}}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">🔍 Real-Time Auth Flow Monitor</h1>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${isMonitoring ? 'bg-green-600' : 'bg-gray-600'} text-white`}>
              {isMonitoring ? '● MONITORING' : '○ PAUSED'}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsMonitoring(!isMonitoring)}
            >
              {isMonitoring ? 'Pause' : 'Resume'}
            </Button>
          </div>
        </div>

        {/* Current State Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <h3 className="text-sm font-bold text-gray-400 mb-2">AuthContext</h3>
            <div className="space-y-1 text-sm">
              <div className={authContext.user ? 'text-green-400' : 'text-red-400'}>
                User: {authContext.user ? '✅' : '❌'}
              </div>
              <div className={authContext.session ? 'text-green-400' : 'text-red-400'}>
                Session: {authContext.session ? '✅' : '❌'}
              </div>
              <div className={authContext.initialized ? 'text-green-400' : 'text-yellow-400'}>
                Initialized: {authContext.initialized ? '✅' : '⏳'}
              </div>
              <div className={authContext.loading ? 'text-yellow-400' : 'text-green-400'}>
                Loading: {authContext.loading ? '⏳' : '✅'}
              </div>
              <div className="text-gray-300">
                Teams: {authContext.userTeams.length}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-bold text-gray-400 mb-2">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="ghost" size="sm" fullWidth onClick={testSession}>
                Test Session
              </Button>
              <Button variant="ghost" size="sm" fullWidth onClick={testDatabase}>
                Test Database
              </Button>
              <Button variant="ghost" size="sm" fullWidth onClick={forceRefresh}>
                Force Refresh
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-bold text-gray-400 mb-2">Log Stats</h3>
            <div className="space-y-1 text-sm text-gray-300">
              <div>Total Entries: {logs.length}</div>
              <div className="text-green-400">Success: {logs.filter(l => l.type === 'success').length}</div>
              <div className="text-yellow-400">Warnings: {logs.filter(l => l.type === 'warning').length}</div>
              <div className="text-red-400">Errors: {logs.filter(l => l.type === 'error').length}</div>
              <Button variant="ghost" size="sm" fullWidth onClick={clearLogs} className="mt-2">
                Clear Logs
              </Button>
            </div>
          </Card>
        </div>

        {/* Live Log Stream */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">📜 Live Event Log</h2>
            <div className="text-sm text-gray-400">
              Auto-scrolling • Last updated: {logs[logs.length - 1]?.timestamp || 'Never'}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 max-h-[600px] overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                Waiting for events... Try refreshing the page or navigating between pages.
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className="border-l-2 border-gray-700 pl-3 py-1 hover:bg-gray-800 transition-colors">
                    <div className="flex items-start space-x-3">
                      <span className="text-gray-500 w-20 flex-shrink-0">{log.timestamp}</span>
                      <span className={`${getTypeColor(log.type)} w-6 flex-shrink-0`}>
                        {getTypeIcon(log.type)}
                      </span>
                      <span className="text-purple-400 w-32 flex-shrink-0 font-bold">
                        [{log.source}]
                      </span>
                      <span className="text-white flex-1">
                        {log.event}
                      </span>
                    </div>
                    <div className="ml-[180px] mt-1 text-gray-400">
                      {JSON.stringify(log.details, null, 2)}
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">📋 How to Use This Tool</h2>
          <div className="space-y-3 text-gray-300">
            <div>
              <strong className="text-white">1. Watch the logs in real-time:</strong> The event log shows every auth state change
            </div>
            <div>
              <strong className="text-white">2. Reproduce the issue:</strong> Navigate between pages, refresh, or perform actions
            </div>
            <div>
              <strong className="text-white">3. Look for patterns:</strong> Watch for:
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Multiple SIGNED_OUT events in a row (indicates conflict)</li>
                <li>Rapid state changes (auth → no auth → auth)</li>
                <li>TOKEN_REFRESHED followed by SIGNED_OUT (session conflict)</li>
                <li>AuthContext state changing when it shouldn't</li>
              </ul>
            </div>
            <div>
              <strong className="text-white">4. Test specific scenarios:</strong> Use Quick Actions to test session and database
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
