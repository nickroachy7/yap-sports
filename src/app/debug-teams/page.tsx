'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { checkAuthWithRetry, loadTeamsWithRetry } from '@/lib/authUtils'

export default function DebugTeamsPage() {
  const [authStatus, setAuthStatus] = useState<any>({})
  const [teamsStatus, setTeamsStatus] = useState<any>({})
  const [rawData, setRawData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<string[]>([])
  
  const supabase = createSupabaseBrowserClient()

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(`[DebugTeams] ${message}`)
  }

  useEffect(() => {
    async function debugAuth() {
      addLog('Starting authentication debug...')
      
      try {
        // Test 1: Direct Supabase auth check
        addLog('Test 1: Direct Supabase getSession()...')
        const { data: { session }, error } = await supabase.auth.getSession()
        setRawData(prev => ({ ...prev, directAuth: { session: session?.user, error } }))
        
        if (error) {
          addLog(`Direct auth error: ${error.message}`)
        } else if (!session?.user) {
          addLog('No authenticated session found')
        } else {
          addLog(`Direct auth success: User ID ${session.user.id}`)
        }

        // Test 2: Retry-based auth check
        addLog('Test 2: checkAuthWithRetry()...')
        const authResult = await checkAuthWithRetry()
        setAuthStatus(authResult)
        
        if (authResult.success) {
          addLog(`Retry auth success: User ID ${authResult.userId}`)
          
          // Test 3: Direct teams query
          addLog('Test 3: Direct teams query...')
          const { data: directTeams, error: directError } = await supabase
            .from('user_teams')
            .select('*')
            .eq('user_id', authResult.userId)
            .eq('active', true)
          
          setRawData(prev => ({ 
            ...prev, 
            directTeams: { teams: directTeams, error: directError } 
          }))
          
          if (directError) {
            addLog(`Direct teams error: ${directError.message}`)
          } else {
            addLog(`Direct teams success: ${directTeams?.length || 0} teams found`)
          }

          // Test 4: Retry-based teams loading
          addLog('Test 4: loadTeamsWithRetry()...')
          const teamsResult = await loadTeamsWithRetry(authResult.userId)
          setTeamsStatus(teamsResult)
          
          if (teamsResult.success) {
            addLog(`Retry teams success: ${teamsResult.teams.length} teams loaded`)
          } else {
            addLog(`Retry teams error: ${teamsResult.error}`)
          }
        } else {
          addLog(`Retry auth failed: ${authResult.error}`)
        }

        // Test 5: Check user_teams table structure
        addLog('Test 5: Checking user_teams table structure...')
        const { data: tableInfo, error: tableError } = await supabase
          .from('user_teams')
          .select('*')
          .limit(1)
        
        setRawData(prev => ({ 
          ...prev, 
          tableStructure: { sample: tableInfo, error: tableError } 
        }))
        
        if (tableError) {
          addLog(`Table structure error: ${tableError.message}`)
        } else {
          addLog(`Table structure check: ${tableInfo?.length || 0} sample records`)
        }

      } catch (error) {
        addLog(`Unexpected error: ${error}`)
      } finally {
        setLoading(false)
        addLog('Debug complete!')
      }
    }

    debugAuth()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-4">Teams Loading Debug</h1>
        <p className="text-gray-400">Running diagnostics...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-white mb-6">Teams Loading Debug</h1>
      
      {/* Logs */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">Debug Log</h2>
        <div className="bg-gray-900 p-4 rounded-lg max-h-64 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="text-sm text-gray-300 font-mono">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Auth Status */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">Authentication Status</h2>
        <div className="bg-gray-800 p-4 rounded-lg">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap">
            {JSON.stringify(authStatus, null, 2)}
          </pre>
        </div>
      </div>

      {/* Teams Status */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">Teams Loading Status</h2>
        <div className="bg-gray-800 p-4 rounded-lg">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap">
            {JSON.stringify(teamsStatus, null, 2)}
          </pre>
        </div>
      </div>

      {/* Raw Data */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">Raw Data</h2>
        <div className="bg-gray-800 p-4 rounded-lg">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap">
            {JSON.stringify(rawData, null, 2)}
          </pre>
        </div>
      </div>

      <div className="text-sm text-gray-400">
        <p>This page helps debug team loading issues by testing each step of the authentication and data loading process.</p>
        <p>Check the browser console for additional detailed logs.</p>
      </div>
    </div>
  )
}
