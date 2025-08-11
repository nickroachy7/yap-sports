'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { Card, Button } from '@/components/ui'

type UserTeam = {
  id: string
  name: string
  coins: number
  user_id: string
  created_at: string
}

export default function DashboardHome() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  
  const [userId, setUserId] = useState<string | null>(null)
  const [userTeams, setUserTeams] = useState<UserTeam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAuth() {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Auth error:', error)
        router.push('/auth')
        return
      }
      
      if (session?.user?.id) {
        setUserId(session.user.id)
        await loadUserTeams(session.user.id)
      } else {
        router.push('/auth')
      }
    }
    
    loadAuth()
  }, [router, supabase.auth])

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
      
      // If user has teams, redirect to the first one
      if (teams && teams.length > 0) {
        router.push(`/dashboard/${teams[0].id}`)
      }
    } catch (error) {
      console.error('Error loading teams:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--color-obsidian)'}}>
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">Loading Teams...</div>
          <div className="text-base" style={{color: 'var(--color-text-secondary)'}}>Getting your fantasy teams ready</div>
        </div>
      </div>
    )
  }

  if (userTeams.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--color-obsidian)'}}>
        <Card className="p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🏈</div>
          <h1 className="text-2xl font-bold text-white mb-4">Welcome to YAP Sports!</h1>
          <p className="text-base mb-6" style={{color: 'var(--color-text-secondary)'}}>
            Create your first fantasy team to get started with pack opening, lineup building, and competitive play.
          </p>
          <Button variant="primary" fullWidth onClick={() => router.push('/teams')}>
            Create Your First Team
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--color-obsidian)'}}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-white mb-4">Your Fantasy Teams</h1>
          <p className="text-lg" style={{color: 'var(--color-text-secondary)'}}>
            Select a team to access your dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {userTeams.map(team => (
            <Card key={team.id} className="p-6 hover:ring-2 hover:ring-green-500/30 transition-all cursor-pointer"
                  onClick={() => router.push(`/dashboard/${team.id}`)}>
              <div className="text-center">
                <div className="text-3xl mb-3">🏆</div>
                <h3 className="text-xl font-bold text-white mb-2">{team.name}</h3>
                <div className="space-y-1 text-sm" style={{color: 'var(--color-text-secondary)'}}>
                  <div>💰 {team.coins.toLocaleString()} coins</div>
                  <div>📅 Created {new Date(team.created_at).toLocaleDateString()}</div>
                </div>
                <Button variant="primary" size="small" fullWidth className="mt-4">
                  Enter Dashboard
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={() => router.push('/teams')}>
            Manage All Teams
          </Button>
        </div>
      </div>
    </div>
  )
}
