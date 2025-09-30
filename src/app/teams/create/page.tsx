'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { Card, Button } from '@/components/ui'

export default function CreateTeamPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { user, session, loading: authLoading, refreshTeams } = useAuth()
  
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault()
    
    if (!teamName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a team name' })
      return
    }

    if (teamName.length < 3 || teamName.length > 50) {
      setMessage({ type: 'error', text: 'Team name must be between 3-50 characters' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const token = session?.access_token

      if (!token) {
        setMessage({ type: 'error', text: 'Not authenticated. Please sign in again.' })
        setLoading(false)
        return
      }

      const response = await fetch('/api/teams/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ teamName: teamName.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to create team' })
        setLoading(false)
        return
      }

      setMessage({ type: 'success', text: data.message || 'Team created successfully!' })
      
      // Refresh teams in the AuthContext (will update sidebar immediately)
      await refreshTeams()
      
      // Redirect to the new team's dashboard after a short delay
      setTimeout(() => {
        router.push(`/dashboard/${data.team.id}`)
      }, 1000)

    } catch (error) {
      console.error('Error creating team:', error)
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' })
      setLoading(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--color-obsidian)'}}>
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">
            {authLoading ? 'Authenticating...' : 'Loading...'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{backgroundColor: 'var(--color-obsidian)'}}>
      <Card className="p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏈</div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Your Team</h1>
          <p className="text-base" style={{color: 'var(--color-text-secondary)'}}>
            Choose a unique name for your fantasy football team
          </p>
        </div>

        <form onSubmit={handleCreateTeam} className="space-y-6">
          <div>
            <label htmlFor="teamName" className="block text-sm font-medium text-white mb-2">
              Team Name
            </label>
            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter your team name..."
              maxLength={50}
              className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{
                backgroundColor: 'var(--color-slate)',
                border: '1px solid var(--color-steel)'
              }}
              disabled={loading}
              autoFocus
            />
            <div className="mt-2 text-xs text-gray-400">
              {teamName.length}/50 characters
            </div>
          </div>

          {message && (
            <div 
              className={`p-4 rounded-lg ${
                message.type === 'error' 
                  ? 'bg-red-500/20 border border-red-500/50 text-red-200' 
                  : 'bg-green-500/20 border border-green-500/50 text-green-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-3">
            <Button 
              type="submit" 
              variant="primary" 
              fullWidth 
              disabled={loading || !teamName.trim()}
            >
              {loading ? 'Creating Team...' : 'Create Team'}
            </Button>
            
            <Button 
              type="button"
              variant="ghost" 
              fullWidth 
              onClick={() => router.push('/dashboard')}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>

        <div className="mt-8 p-4 rounded-lg" style={{backgroundColor: 'var(--color-midnight)', border: '1px solid var(--color-steel)'}}>
          <h3 className="text-sm font-semibold text-white mb-2">🎁 Starter Bonus</h3>
          <p className="text-xs" style={{color: 'var(--color-text-secondary)'}}>
            Your new team will start with <strong className="text-green-500">5,000 coins</strong> to buy packs and build your roster!
          </p>
        </div>
      </Card>
    </div>
  )
}
