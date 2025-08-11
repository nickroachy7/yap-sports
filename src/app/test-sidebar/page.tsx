'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'

export default function TestSidebarPage() {
  const [authInfo, setAuthInfo] = useState<any>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function checkAuth() {
      const { data: { session }, error } = await supabase.auth.getSession()
      setAuthInfo({ session: session?.user, error })
      
      if (session?.user?.id) {
        const { data: userTeams, error: teamsError } = await supabase
          .from('user_teams')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('active', true)
        
        setTeams(userTeams || [])
        console.log('Teams:', userTeams, 'Error:', teamsError)
      }
      
      setLoading(false)
    }
    
    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-4">Testing Sidebar Auth</h1>
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-4">Testing Sidebar Auth</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Authentication Status</h2>
        <div className="bg-gray-800 p-4 rounded-lg">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap">
            {JSON.stringify({
              authenticated: !!authInfo?.session,
              userId: authInfo?.session?.id,
              email: authInfo?.session?.email,
              error: authInfo?.error
            }, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Teams ({teams.length})</h2>
        <div className="bg-gray-800 p-4 rounded-lg">
          {teams.length > 0 ? (
            <pre className="text-sm text-gray-300 whitespace-pre-wrap">
              {JSON.stringify(teams, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-400">No teams found</p>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-400">
        <p>This page helps debug why teams might not be showing in the sidebar.</p>
        <p>Check the browser console for additional logs from the TeamSidebar component.</p>
      </div>
    </div>
  )
}
