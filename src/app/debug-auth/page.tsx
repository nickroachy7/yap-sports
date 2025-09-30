'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { Card, Button } from '@/components/ui'

export default function DebugAuthPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    runDiagnostics()
  }, [])

  async function runDiagnostics() {
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    
    try {
      // Check localStorage
      const localStorageKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('auth')
      )
      
      const localStorageData: any = {}
      localStorageKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key)
          if (value) {
            localStorageData[key] = value.substring(0, 100) + '...'
          }
        } catch (e) {
          localStorageData[key] = 'Error reading'
        }
      })

      // Check cookies
      const cookies = document.cookie.split(';').map(c => c.trim()).filter(c => 
        c.includes('supabase') || c.includes('auth')
      )

      // Try to get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      // Try to get user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      // Check environment
      const env = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
          ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...'
          : 'NOT SET'
      }

      setDiagnostics({
        localStorage: localStorageData,
        cookies,
        session: session ? {
          user_id: session.user.id,
          expires_at: session.expires_at,
          access_token: session.access_token.substring(0, 20) + '...',
        } : null,
        sessionError: sessionError?.message || null,
        user: user ? {
          id: user.id,
          email: user.email,
        } : null,
        userError: userError?.message || null,
        env,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setDiagnostics({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null
      })
    } finally {
      setLoading(false)
    }
  }

  async function clearAllAuth() {
    // Clear localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key)
      }
    })

    // Clear cookies
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim()
      if (name.includes('supabase') || name.includes('auth')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      }
    })

    // Sign out from Supabase
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()

    alert('All auth data cleared! Page will reload.')
    window.location.href = '/auth'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{backgroundColor: 'var(--color-obsidian)'}}>
        <div className="text-white">Running diagnostics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8" style={{backgroundColor: 'var(--color-obsidian)'}}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">🔍 Auth Diagnostics</h1>
          <div className="space-x-4">
            <Button onClick={runDiagnostics}>Refresh</Button>
            <Button variant="ghost" onClick={clearAllAuth}>Clear All Auth & Sign Out</Button>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">📊 Diagnostic Results</h2>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-[600px]">
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        </Card>

        {diagnostics?.sessionError && (
          <Card className="p-6 border-red-500">
            <h2 className="text-xl font-bold text-red-400 mb-4">❌ Session Error</h2>
            <p className="text-white">{diagnostics.sessionError}</p>
            <div className="mt-4">
              <Button onClick={clearAllAuth}>Clear Auth & Sign In Again</Button>
            </div>
          </Card>
        )}

        {!diagnostics?.session && !diagnostics?.sessionError && (
          <Card className="p-6 border-yellow-500">
            <h2 className="text-xl font-bold text-yellow-400 mb-4">⚠️ No Active Session</h2>
            <p className="text-white mb-4">You are not currently signed in.</p>
            <Button onClick={() => window.location.href = '/auth'}>Go to Sign In</Button>
          </Card>
        )}

        {diagnostics?.session && (
          <Card className="p-6 border-green-500">
            <h2 className="text-xl font-bold text-green-400 mb-4">✅ Active Session Found</h2>
            <div className="text-white space-y-2">
              <p><strong>User ID:</strong> {diagnostics.session.user_id}</p>
              <p><strong>Expires:</strong> {new Date(diagnostics.session.expires_at * 1000).toLocaleString()}</p>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">💡 Troubleshooting Steps</h2>
          <ol className="text-white space-y-2 list-decimal list-inside">
            <li>Make sure the dev server is running (npm run dev)</li>
            <li>Restart the dev server if you just added middleware.ts</li>
            <li>Check that .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            <li>Try clearing auth data and signing in again (button above)</li>
            <li>Check browser console for errors</li>
            <li>Verify cookies are enabled in your browser</li>
          </ol>
        </Card>
      </div>
    </div>
  )
}
