'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { Card, Button, LineupBuilder, PlayerModal, CollectionListView, SectionHeader, StandardLayout, ContentContainer, Select } from '@/components/ui'
import { UserCard, LineupSlot } from '@/components/ui/LineupBuilder'
import type { CollectionItem } from '@/components/ui'

type UserTeam = {
  id: string
  name: string
  coins: number
  user_id: string
}

type Week = {
  id: string
  week_number: number
  lock_at: string
  status: string
}

type TabType = 'overview' | 'lineup' | 'collection' | 'packs' | 'activity'

export default function TeamDashboard() {
  const params = useParams()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  
  const [userId, setUserId] = useState<string | null>(null)
  const [currentTeam, setCurrentTeam] = useState<UserTeam | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [availableTokens, setAvailableTokens] = useState<any[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null)
  const [lineupSlots, setLineupSlots] = useState<LineupSlot[]>([])
  const [lineupLoading, setLineupLoading] = useState(false)
  const [selectedCollectionPlayerId, setSelectedCollectionPlayerId] = useState<string | null>(null)
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false)
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'players' | 'tokens'>('all')
  const [availablePacks, setAvailablePacks] = useState<any[]>([])
  const [userPacks, setUserPacks] = useState<any[]>([])
  const [packLoading, setPackLoading] = useState(false)

  const teamId = params.teamId as string

  // Load authentication and team data
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
        await loadUserData(session.user.id)
      } else {
        router.push('/auth')
      }
    }
    
    loadAuth()
  }, [teamId, router, supabase.auth])

  async function loadUserData(uid: string) {
    try {
      // Load current team
      const { data: teams, error: teamsError } = await supabase
        .from('user_teams')
        .select('*')
        .eq('user_id', uid)
        .eq('active', true)
        .eq('id', teamId)
        .single()

      if (teamsError || !teams) {
        setMessage('Team not found or access denied')
        router.push('/dashboard')
        return
      }
      
      setCurrentTeam(teams)

      // Load team's cards, tokens, lineup, and packs
      await loadTeamCards(uid, teamId)
      await loadTeamTokens(uid, teamId)
      await loadTeamLineup(uid, teamId)
      await loadAvailablePacks()
      await loadUserPacks()
      
    } catch (error) {
      console.error('Error loading user data:', error)
      setMessage('Failed to load team data: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function loadTeamCards(uid: string, teamId: string) {
    try {
      const { data: cardsData, error: cardsError } = await supabase
        .from('user_cards')
        .select(`
          id,
          remaining_contracts,
          current_sell_value,
          cards!inner (
            id,
            rarity,
            players!inner (
              id,
              first_name,
              last_name,
              position,
              team
            )
          )
        `)
        .eq('team_id', teamId)
        .eq('status', 'owned')
        .gt('remaining_contracts', 0)

      if (cardsError) throw cardsError

      // Transform to UserCard format with mock projected points
      const transformedCards: UserCard[] = (cardsData || []).map((card: any) => ({
        id: card.id,
        remaining_contracts: card.remaining_contracts,
        current_sell_value: card.current_sell_value,
        player: {
          id: card.cards.players.id,
          first_name: card.cards.players.first_name,
          last_name: card.cards.players.last_name,
          position: card.cards.players.position,
          team: card.cards.players.team
        },
        rarity: card.cards.rarity as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary',
        projected_points: Math.random() * 20 + 5 // Mock projected points
      }))

      setUserCards(transformedCards)
    } catch (error) {
      console.error('Error loading team cards:', error)
    }
  }

  async function loadTeamTokens(uid: string, teamId: string) {
    try {
      // For now, create some mock tokens - replace with actual database call later
      const mockTokens = [
        {
          id: 'token-1',
          token_type: {
            id: 'tt-1',
            name: 'Touchdown Bonus',
            description: 'Double points for touchdowns',
            multiplier: 2,
            conditions: { stat_type: 'touchdowns' }
          },
          used: false
        },
        {
          id: 'token-2', 
          token_type: {
            id: 'tt-2',
            name: 'Yardage Boost',
            description: '1.5x points for yards gained',
            multiplier: 1.5,
            conditions: { stat_type: 'yards' }
          },
          used: false
        },
        {
          id: 'token-3',
          token_type: {
            id: 'tt-3', 
            name: 'Reception Multiplier',
            description: '3x points for receptions',
            multiplier: 3,
            conditions: { stat_type: 'receptions' }
          },
          used: false
        }
      ]

      setAvailableTokens(mockTokens)
    } catch (error) {
      console.error('Error loading team tokens:', error)
    }
  }

  async function loadTeamLineup(uid: string, teamId: string) {
    try {
      // Load current week
      let { data: week, error: weekError } = await supabase
        .from('weeks')
        .select('*')
        .eq('status', 'current')
        .single()

      if (weekError || !week) {
        const { data: upcomingWeek, error: upcomingError } = await supabase
          .from('weeks')
          .select('*')
          .eq('status', 'upcoming')
          .order('week_number', { ascending: true })
          .limit(1)
          .single()

        if (upcomingError || !upcomingWeek) {
          console.error('No current or upcoming week found:', upcomingError)
          setCurrentWeek(null)
          return
        }
        
        week = upcomingWeek
      }

      setCurrentWeek(week)

      const positionSlots = [
        { slot: 'QB', label: 'Quarterback', positions: ['QB'] },
        { slot: 'RB1', label: 'Running Back 1', positions: ['RB'] },
        { slot: 'RB2', label: 'Running Back 2', positions: ['RB'] },
        { slot: 'WR1', label: 'Wide Receiver 1', positions: ['WR'] },
        { slot: 'WR2', label: 'Wide Receiver 2', positions: ['WR'] },
        { slot: 'TE', label: 'Tight End', positions: ['TE'] },
        { slot: 'FLEX', label: 'Flex (RB/WR/TE)', positions: ['RB', 'WR', 'TE'] },
      ]

      // Initialize lineup slots (for now, just empty slots)
      const slots: LineupSlot[] = positionSlots.map(pos => ({
        id: `slot-${pos.slot}`,
        slot: pos.slot,
        label: pos.label,
        positions: pos.positions,
        user_card: undefined
      }))

      setLineupSlots(slots)

    } catch (error) {
      console.error('Error loading lineup:', error)
    }
  }

  // Handle lineup slot changes
  const handleLineupSlotChange = async (slotId: string, userCard: UserCard | null) => {
    try {
      setLineupLoading(true)

      // Update local state
      setLineupSlots(prev => 
        prev.map(slot => 
          slot.slot === slotId ? { ...slot, user_card: userCard || undefined } : slot
        )
      )

      setMessage(userCard 
        ? `Added ${userCard.player.first_name} ${userCard.player.last_name} to ${slotId}` 
        : `Removed player from ${slotId}`
      )

    } catch (error) {
      console.error('Error updating lineup slot:', error)
      setMessage('Failed to update lineup: ' + (error as Error).message)
    } finally {
      setLineupLoading(false)
    }
  }

  // Handle token application
  const handleTokenApply = async (slotId: string, token: any | null) => {
    try {
      setLineupLoading(true)

      // If removing a token, mark it as unused
      if (!token) {
        const currentSlot = lineupSlots.find(slot => slot.slot === slotId)
        if (currentSlot?.applied_token) {
          setAvailableTokens(prev => 
            prev.map(t => 
              t.id === currentSlot.applied_token!.id ? { ...t, used: false } : t
            )
          )
        }
      } else {
        // If applying a token, mark it as used and remove any existing token from the slot
        const currentSlot = lineupSlots.find(slot => slot.slot === slotId)
        if (currentSlot?.applied_token) {
          // Mark the old token as unused
          setAvailableTokens(prev => 
            prev.map(t => 
              t.id === currentSlot.applied_token!.id ? { ...t, used: false } : t
            )
          )
        }
        
        // Mark the new token as used
        setAvailableTokens(prev => 
          prev.map(t => 
            t.id === token.id ? { ...t, used: true } : t
          )
        )
      }

      // Update lineup slots
      setLineupSlots(prev => 
        prev.map(slot => 
          slot.slot === slotId ? { ...slot, applied_token: token } : slot
        )
      )

      setMessage(token 
        ? `Applied ${token.token_type?.name || 'token'} to ${slotId}` 
        : `Removed token from ${slotId}`
      )

    } catch (error) {
      console.error('Error applying token:', error)
      setMessage('Failed to apply token: ' + (error as Error).message)
    } finally {
      setLineupLoading(false)
    }
  }

  // Handle player click
  const handlePlayerClick = (playerId: string) => {
    // The PlayerModal will handle this in the LineupBuilder component
    console.log('Player clicked:', playerId)
  }

  // Handle collection player click
  const handleCollectionPlayerClick = (cardId: string) => {
    // Find the player ID from the card ID
    const card = userCards.find(c => c.id === cardId)
    if (card) {
      setSelectedCollectionPlayerId(card.player.id)
      setIsCollectionModalOpen(true)
    }
  }

  // Handle collection item click
  const handleCollectionItemClick = (itemId: string, type: 'player' | 'token') => {
    if (type === 'player') {
      // Find the player ID from the card ID
      const card = userCards.find(c => c.id === itemId)
      if (card) {
        setSelectedCollectionPlayerId(card.player.id)
        setIsCollectionModalOpen(true)
      }
    } else {
      // Handle token click
      console.log('Token clicked:', itemId)
      // Could open a token details modal here
    }
  }

  // Transform UserCard data to CollectionItem format for players  
  const getPlayerListItems = () => {
    return userCards.map(card => ({
      id: card.id, // Use the card's unique ID, not the player's ID
      name: `${card.player.first_name} ${card.player.last_name}`,
      position: card.player.position,
      team: card.player.team,
      gameInfo: 'Next game info', // Could be populated with real game data
      stats: {
        fpts: card.projected_points || 0,
        proj: card.projected_points || 0,
        snp: Math.round(Math.random() * 100), // Mock data
        tar: Math.round(Math.random() * 10),
        rec: Math.round(Math.random() * 8),
        yd: Math.round(Math.random() * 100),
        ypt: Math.round(Math.random() * 10),
        ypc: Math.round(Math.random() * 15),
        td: Math.round(Math.random() * 3),
        fum: Math.round(Math.random() * 2),
        lost: Math.round(Math.random() * 1)
      },
      rarity: card.rarity || 'common',
      contractsRemaining: card.remaining_contracts,
      currentSellValue: card.current_sell_value,
      injuryStatus: 'healthy' as const
    }))
  }

  // Transform token data to CollectionItem format for tokens
  const getTokenListItems = () => {
    return availableTokens.filter(token => token && token.token_type).map(token => ({
      id: token.id,
      name: token.token_type?.name || 'Unknown Token',
      description: token.token_type?.description || 'No description',
      multiplier: token.token_type?.multiplier || 1,
      used: token.used || false,
      statType: token.token_type?.conditions?.stat_type?.toUpperCase() || 'BONUS'
    }))
  }

  // Transform data to unified CollectionItem format
  const getCollectionItems = (): CollectionItem[] => {
    const playerItems: CollectionItem[] = userCards.map(card => ({
      id: card.id,
      type: 'player' as const,
      name: `${card.player.first_name} ${card.player.last_name}`,
      position: card.player.position,
      team: card.player.team,
      gameInfo: 'Next game info',
      stats: {
        fpts: card.projected_points || 0,
        proj: card.projected_points || 0,
        snp: Math.round(Math.random() * 100), // Mock data
        tar: Math.round(Math.random() * 10),
        rec: Math.round(Math.random() * 8),
        yd: Math.round(Math.random() * 100),
        ypt: Math.round(Math.random() * 10),
        ypc: Math.round(Math.random() * 15),
        td: Math.round(Math.random() * 3),
        fum: Math.round(Math.random() * 2),
        lost: Math.round(Math.random() * 1)
      },
      rarity: card.rarity || 'common',
      contractsRemaining: card.remaining_contracts,
      currentSellValue: card.current_sell_value,
      injuryStatus: 'healthy' as const
    }))

    const tokenItems: CollectionItem[] = availableTokens
      .filter(token => token && token.token_type)
      .map(token => ({
        id: token.id,
        type: 'token' as const,
        name: token.token_type?.name || 'Unknown Token',
        description: token.token_type?.description || 'No description',
        multiplier: token.token_type?.multiplier || 1,
        used: token.used || false,
        statType: token.token_type?.conditions?.stat_type?.toUpperCase() || 'BONUS'
      }))

    return [...playerItems, ...tokenItems]
  }

  // Handle pack purchase
  const handlePackPurchase = async (packId: string) => {
    if (!currentTeam || packLoading) return
    
    try {
      setPackLoading(true)
      setMessage(null)
      
      const idempotencyKey = `pack-${packId}-${Date.now()}-${Math.random().toString(36).substring(7)}`
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      
      const response = await fetch('/api/teams/purchase-pack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          packId,
          teamId: currentTeam.id,
          idempotencyKey
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to purchase pack')
      }
      
      // Update team coins
      setCurrentTeam(prev => prev ? { ...prev, coins: result.remainingCoins } : null)
      
      // Add the new pack to user packs
      setUserPacks(prev => [...prev, {
        id: result.userPackId,
        pack: result.pack,
        status: 'unopened'
      }])
      
      setMessage(`✅ Successfully purchased ${result.pack.name}!`)
      
      // Reload user packs to get the latest data
      await loadUserPacks()
      
    } catch (error) {
      console.error('Pack purchase error:', error)
      setMessage(`❌ Failed to purchase pack: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setPackLoading(false)
    }
  }

  // Handle pack opening
  const handlePackOpen = async (userPackId: string) => {
    if (!currentTeam || packLoading) return
    
    try {
      setPackLoading(true)
      setMessage(null)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      
      const response = await fetch('/api/teams/open-pack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userPackId,
          teamId: currentTeam.id
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to open pack')
      }
      
      setMessage(`🎉 Pack opened! Received ${result.contents.cards?.length || 0} cards and ${result.contents.tokens?.length || 0} tokens`)
      
      // Reload user data
      await loadTeamCards(userId!, teamId)
      await loadTeamTokens(userId!, teamId)
      await loadUserPacks()
      
      return { success: true, contents: result.contents }
      
    } catch (error) {
      console.error('Pack opening error:', error)
      setMessage(`❌ Failed to open pack: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    } finally {
      setPackLoading(false)
    }
  }

  // Handle player selling
  const handlePlayerSell = async (userCardId: string) => {
    if (!currentTeam) return
    
    try {
      setMessage(null)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      
      const response = await fetch('/api/teams/sell-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userCardId,
          teamId: currentTeam.id
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to sell card')
      }
      
      // Update team coins
      setCurrentTeam(prev => prev ? { ...prev, coins: result.newBalance } : null)
      
      // Remove the sold card from userCards
      setUserCards(prev => prev.filter(card => card.id !== userCardId))
      
      setMessage(`💰 ${result.message}`)
      
    } catch (error) {
      console.error('Card selling error:', error)
      setMessage(`❌ Failed to sell card: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Load available packs
  const loadAvailablePacks = async () => {
    try {
      const { data: packs, error } = await supabase
        .from('packs')
        .select('*')
        .eq('enabled', true)
        .order('price_coins', { ascending: true })
      
      if (error) throw error
      setAvailablePacks(packs || [])
    } catch (error) {
      console.error('Error loading packs:', error)
    }
  }

  // Load user packs
  const loadUserPacks = async () => {
    if (!userId || !teamId) return
    
    try {
      const { data: packs, error } = await supabase
        .from('user_packs')
        .select(`
          id,
          status,
          opened_at,
          packs (
            id,
            name,
            price_coins,
            description
          )
        `)
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .order('opened_at', { ascending: false, nullsFirst: true })
      
      if (error) throw error
      setUserPacks(packs || [])
    } catch (error) {
      console.error('Error loading user packs:', error)
    }
  }

  if (loading || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--color-obsidian)'}}>
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">Loading Dashboard...</div>
          <div className="text-base" style={{color: 'var(--color-text-secondary)'}}>Setting up your team</div>
        </div>
      </div>
    )
  }

  if (!currentTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--color-obsidian)'}}>
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-4">Team Not Found</div>
          <div className="text-base mb-6" style={{color: 'var(--color-text-secondary)'}}>
            The requested team could not be found or you don&apos;t have access to it.
          </div>
          <Button onClick={() => router.push('/dashboard')}>
            Return to Teams
          </Button>
        </div>
      </div>
    )
  }

    return (
    <StandardLayout>
      <ContentContainer>
        <div className="py-6">
          {/* Header */}
          <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-2">{currentTeam.name}</h1>
              <p className="text-base" style={{color: 'var(--color-text-secondary)'}}>
                Fantasy Team Dashboard
              </p>
            </div>
            
                         {/* Team Stats - Always Visible */}
             <div className="grid grid-cols-4 gap-3">
               <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700/50">
                 <div className="text-lg mb-1">📇</div>
                 <div className="text-sm font-bold text-white">{userCards.length}</div>
                 <div className="text-xs text-gray-400">Player Cards</div>
               </div>
               <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700/50">
                 <div className="text-lg mb-1">🎁</div>
                 <div className="text-sm font-bold text-white">{userPacks.filter(p => p.status === 'unopened').length}</div>
                 <div className="text-xs text-gray-400">Unopened Packs</div>
               </div>
               <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700/50">
                 <div className="text-lg mb-1">🏈</div>
                 <div className="text-sm font-bold text-white">
                   {lineupSlots.filter(slot => slot.user_card).length}/7
                 </div>
                 <div className="text-xs text-gray-400">Lineup Set</div>
               </div>
               <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700/50">
                 <div className="text-lg mb-1">💰</div>
                 <div className="text-sm font-bold text-green-400">{currentTeam.coins.toLocaleString()}</div>
                 <div className="text-xs text-gray-400">Team Balance</div>
               </div>
             </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'lineup', label: 'Lineup', icon: '🏈' },
              { id: 'collection', label: 'Collection', icon: '📇' },
              { id: 'packs', label: 'Packs', icon: '🎁' },
              { id: 'activity', label: 'Activity', icon: '📋' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-green-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        {message && (
          <Card className="p-4 mb-6" style={{backgroundColor: 'var(--color-midnight)', borderColor: 'var(--color-steel)'}}>
            <div className={`text-sm ${
              message.includes('Error') || message.includes('Failed') 
                ? 'text-red-400' 
                : 'text-green-400'
            }`}>
              {message}
            </div>
          </Card>
        )}

                 {/* Tab Content */}
         {activeTab === 'overview' && (
           <div className="space-y-6">
             <SectionHeader 
               title="Team Overview"
               description="Quick access to your lineup, collection, and pack store"
               rightContent={
                 <div className="text-right">
                   <div className="text-2xl font-bold text-green-400">
                     {lineupSlots.reduce((total, slot) => 
                       total + (slot.user_card?.projected_points || 0), 0
                     ).toFixed(1)}
                   </div>
                   <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                     Projected Points
                   </div>
                 </div>
               }
             />

             {/* Quick Lineup Preview */}
             {currentWeek && (
               <Card className="p-6">
                 <div className="flex items-center justify-between mb-2">
                   <h3 className="text-xl font-bold text-white">Starting Lineup</h3>
                   <Button onClick={() => setActiveTab('lineup')} variant="ghost" size="sm">
                     Manage Lineup →
                   </Button>
                 </div>
                 <LineupBuilder
                   availableCards={userCards}
                   lineupSlots={lineupSlots}
                   availableTokens={availableTokens}
                   onSlotChange={handleLineupSlotChange}
                   onTokenApply={handleTokenApply}
                   onPlayerClick={handlePlayerClick}
                   loading={lineupLoading}
                   showAvailableCards={false}
                   showSubmitButton={false}
                   title=""
                   hideInstructions={true}
                   hideProjectedPoints={true}
                   hideInternalHeader={true}
                 />
               </Card>
             )}

             {/* Pack Purchase Actions */}
             <Card className="p-6">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xl font-bold text-white">Quick Pack Purchase</h3>
                 <Button onClick={() => setActiveTab('packs')} variant="ghost" size="sm">
                   View Store →
                 </Button>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Card className="p-4 border border-gray-600">
                   <div className="text-center">
                     <div className="text-3xl mb-2">⚽</div>
                     <div className="text-sm font-bold text-white">Basic Pack</div>
                     <div className="text-xs text-gray-400 mb-3">3 Cards</div>
                     <div className="text-lg font-bold text-green-400 mb-3">💰 50</div>
                     <Button variant="primary" size="sm" className="w-full">
                       Buy Now
                     </Button>
                   </div>
                 </Card>
                 
                 <Card className="p-4 border border-purple-500">
                   <div className="text-center">
                     <div className="text-3xl mb-2">🏈</div>
                     <div className="text-sm font-bold text-white">Premium Pack</div>
                     <div className="text-xs text-gray-400 mb-3">5 Cards + Token</div>
                     <div className="text-lg font-bold text-green-400 mb-3">💰 100</div>
                     <Button variant="primary" size="sm" className="w-full">
                       Buy Now
                     </Button>
                   </div>
                 </Card>
                 
                 <Card className="p-4 border border-yellow-500">
                   <div className="text-center">
                     <div className="text-3xl mb-2">🏆</div>
                     <div className="text-sm font-bold text-white">Elite Pack</div>
                     <div className="text-xs text-gray-400 mb-3">7 Cards + 2 Tokens</div>
                     <div className="text-lg font-bold text-green-400 mb-3">💰 200</div>
                     <Button variant="primary" size="sm" className="w-full">
                       Buy Now
                     </Button>
                   </div>
                 </Card>
               </div>
             </Card>

             {/* Collection Overview */}
             <Card className="p-6">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xl font-bold text-white">Your Collection</h3>
                 <Button onClick={() => setActiveTab('collection')} variant="ghost" size="sm">
                   View All →
                 </Button>
               </div>
               
               {userCards.length === 0 && availableTokens.length === 0 ? (
                 <div className="text-center py-8">
                   <div className="text-4xl mb-4">📇</div>
                   <div className="text-lg font-bold text-white mb-2">No Items Yet</div>
                   <div className="text-gray-400 mb-4">Purchase packs to start building your collection</div>
                 </div>
               ) : (
                 <div className="space-y-4">
                   {/* Players Section */}
                   {userCards.length > 0 && (
                     <div>
                       <h4 className="text-base font-bold text-white mb-2">
                         Player Cards ({userCards.length})
                       </h4>
                       <CollectionListView 
                         items={getCollectionItems().filter(item => item.type === 'player')}
                         onItemClick={handleCollectionItemClick}
                         showActions={true}
                         filterType="players"
                       />
                     </div>
                   )}

                   {/* Tokens Section */}
                   {availableTokens.length > 0 && (
                     <div>
                       <h4 className="text-base font-bold text-white mb-2">
                         Tokens ({availableTokens.length})
                       </h4>
                       <CollectionListView 
                         items={getCollectionItems().filter(item => item.type === 'token')}
                         onItemClick={handleCollectionItemClick}
                         showActions={true}
                         filterType="tokens"
                       />
                     </div>
                   )}
                 </div>
               )}
             </Card>
           </div>
         )}

                 {activeTab === 'lineup' && currentWeek && (
           <div className="space-y-6">
             <LineupBuilder
               availableCards={userCards}
               lineupSlots={lineupSlots}
               availableTokens={availableTokens}
               onSlotChange={handleLineupSlotChange}
               onTokenApply={handleTokenApply}
               onPlayerClick={handlePlayerClick}
               loading={lineupLoading}
               title={`Week ${currentWeek.week_number} Lineup`}
             />
           </div>
         )}

                 {activeTab === 'collection' && (
           <div className="space-y-6">
             {/* Tab Header */}
             <div className="mb-6">
               <div className="flex items-center justify-between">
                 <div>
                   <h2 className="text-2xl font-bold text-white">Your Collection</h2>
                   <p className="text-lg" style={{color: 'var(--color-text-secondary)'}}>
                     Manage your player cards and tokens
                   </p>
                 </div>
                 <div className="text-right">
                   <div className="text-2xl font-bold text-white">
                     {collectionFilter === 'all' 
                       ? userCards.length + availableTokens.length
                       : collectionFilter === 'players' 
                         ? userCards.length 
                         : availableTokens.length
                     }
                   </div>
                   <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                     {collectionFilter === 'all' 
                       ? 'Total Items'
                       : collectionFilter === 'players' 
                         ? 'Player Cards' 
                         : 'Tokens'
                     }
                   </div>
                 </div>
               </div>
             </div>

             {/* Collection Filters */}
             <Card className="p-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {/* Type Filter */}
                 <div>
                   <Select
                     value={collectionFilter}
                     onChange={(e) => setCollectionFilter(e.target.value as 'all' | 'players' | 'tokens')}
                     options={[
                       { value: 'all', label: `All Items (${userCards.length + availableTokens.length})` },
                       { value: 'players', label: `Players Only (${userCards.length})` },
                       { value: 'tokens', label: `Tokens Only (${availableTokens.length})` }
                     ]}
                     placeholder="Filter Collection"
                   />
                 </div>

                 {/* Quick Stats */}
                 <div className="md:col-span-2">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="text-center">
                       <div className="text-lg font-bold text-white">{userCards.length}</div>
                       <div className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Player Cards</div>
                     </div>
                     <div className="text-center">
                       <div className="text-lg font-bold text-white">{availableTokens.length}</div>
                       <div className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Tokens</div>
                     </div>
                     <div className="text-center">
                       <div className="text-lg font-bold text-white">{availableTokens.filter(t => !t.used).length}</div>
                       <div className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Available</div>
                     </div>
                     <div className="text-center">
                       <div className="text-lg font-bold text-white">{availableTokens.filter(t => t.used).length}</div>
                       <div className="text-xs" style={{color: 'var(--color-text-secondary)'}}>In Use</div>
                     </div>
                   </div>
                 </div>
               </div>
             </Card>

             {userCards.length === 0 && availableTokens.length === 0 ? (
               <Card className="p-6">
                 <div className="text-center py-8">
                   <div className="text-4xl mb-4">📇</div>
                   <div className="text-lg font-bold text-white mb-2">No Items Yet</div>
                   <div className="text-gray-400 mb-4">Purchase packs to start building your collection</div>
                   <Button onClick={() => setActiveTab('packs')} variant="primary">
                     Buy Packs
                   </Button>
                 </div>
               </Card>
             ) : (
               <div className="space-y-6">
                 {/* Players Section */}
                 {(collectionFilter === 'all' || collectionFilter === 'players') && userCards.length > 0 && (
                   <Card className="p-6">
                     <div className="flex items-center justify-between mb-4">
                       <h3 className="text-xl font-bold text-white">Player Cards ({userCards.length})</h3>
                     </div>
                     <CollectionListView 
                       items={getCollectionItems().filter(item => item.type === 'player')}
                       onItemClick={handleCollectionItemClick}
                       onSellPlayer={handlePlayerSell}
                       showActions={true}
                       filterType="players"
                     />
                   </Card>
                 )}

                 {/* Tokens Section */}
                 {(collectionFilter === 'all' || collectionFilter === 'tokens') && availableTokens.length > 0 && (
                   <Card className="p-6">
                     <div className="flex items-center justify-between mb-4">
                       <h3 className="text-xl font-bold text-white">Tokens ({availableTokens.length})</h3>
                     </div>
                     <CollectionListView 
                       items={getCollectionItems().filter(item => item.type === 'token')}
                       onItemClick={handleCollectionItemClick}
                       showActions={true}
                       filterType="tokens"
                     />
                   </Card>
                 )}
               </div>
             )}
           </div>
         )}

                 {activeTab === 'packs' && (
           <div className="space-y-6">
             {/* Tab Header */}
             <div className="mb-6">
               <div className="flex items-center justify-between">
                 <div>
                   <h2 className="text-2xl font-bold text-white">Pack Store</h2>
                   <p className="text-lg" style={{color: 'var(--color-text-secondary)'}}>
                     Purchase packs to expand your player collection and earn tokens
                   </p>
                 </div>
                 <div className="text-right">
                   <div className="text-2xl font-bold text-green-400">💰 {availablePacks.length > 0 ? availablePacks[0]?.price_coins || 300 : 300}+</div>
                   <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                     Starting Price
                   </div>
                 </div>
               </div>
             </div>

                       {/* Available Packs */}
           {availablePacks.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availablePacks.filter(pack => pack && pack.name).map((pack) => {
                const cardCount = pack.contents_schema_json?.slots
                  ?.filter((slot: any) => slot.type === 'card')
                  ?.reduce((sum: number, slot: any) => sum + slot.count, 0) || 0
                const tokenCount = pack.contents_schema_json?.slots
                  ?.filter((slot: any) => slot.type === 'token')
                  ?.reduce((sum: number, slot: any) => sum + slot.count, 0) || 0
                
                const packIcon = pack.name?.includes('Elite') ? '🏆' : 
                                pack.name?.includes('Premium') ? '🏈' : 
                                pack.name?.includes('Standard') ? '⚽' : '📦'
                
                const borderColor = pack.name?.includes('Elite') ? 'border-yellow-500 hover:border-yellow-400' : 
                                   pack.name?.includes('Premium') ? 'border-purple-500 hover:border-purple-400' : 
                                   'border-gray-600 hover:border-gray-500'
                
                const canPurchase = currentTeam && currentTeam.coins >= pack.price_coins && !packLoading
                
                return (
                  <Card key={pack.id} className={`p-6 border transition-colors ${borderColor}`}>
                    <div className="text-center">
                      <div className="text-6xl mb-4">{packIcon}</div>
                      <h3 className="text-xl font-bold text-white mb-2">{pack.name || 'Unknown Pack'}</h3>
                      <div className="text-sm text-gray-400 mb-4">
                        {pack.description || 'No description available'}
                      </div>
                      
                      <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Player Cards:</span>
                          <span className="text-white">{cardCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Tokens:</span>
                          <span className="text-white">{tokenCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Your Balance:</span>
                          <span className={`${canPurchase ? 'text-green-400' : 'text-red-400'}`}>
                            💰 {currentTeam?.coins.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-2xl font-bold text-green-400 mb-4">💰 {pack.price_coins?.toLocaleString() || '0'}</div>
                      <Button 
                        variant="primary" 
                        className="w-full"
                        disabled={!canPurchase}
                        onClick={() => handlePackPurchase(pack.id)}
                      >
                        {packLoading ? 'Processing...' : 
                         !canPurchase && currentTeam ? 'Insufficient Coins' : 
                         `Purchase ${pack.name || 'Pack'}`}
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
           ) : (
             <div className="text-center py-8">
               <div className="text-4xl mb-4">📦</div>
               <div className="text-lg font-bold text-white mb-2">Loading Packs...</div>
               <div className="text-gray-400">Please wait while we load available packs</div>
             </div>
           )}

                         {/* User Packs */}
             <Card className="p-6">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xl font-bold text-white">Your Packs</h3>
                 <div className="text-sm text-gray-400">
                   {userPacks.filter(p => p.status === 'unopened').length} unopened
                 </div>
               </div>
               
               {userPacks.length === 0 ? (
                 <div className="text-center py-8">
                   <div className="text-4xl mb-4">📦</div>
                   <div className="text-lg font-bold text-white mb-2">No packs yet</div>
                   <div className="text-gray-400">Purchase your first pack above to get started</div>
                 </div>
               ) : (
                 <div className="space-y-3">
                   {userPacks.map((userPack) => (
                     <div key={userPack.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                       <div className="flex items-center space-x-3">
                         <div className="text-2xl">📦</div>
                         <div>
                           <div className="font-bold text-white">{userPack.packs?.name || 'Unknown Pack'}</div>
                           <div className="text-sm text-gray-400">
                             {userPack.status === 'unopened' ? 'Ready to open' : 
                              `Opened ${new Date(userPack.opened_at).toLocaleDateString()}`}
                           </div>
                         </div>
                       </div>
                       <div className="flex items-center space-x-2">
                         <div className="text-sm text-gray-400">💰 {userPack.packs?.price_coins || 0}</div>
                         {userPack.status === 'unopened' && (
                           <Button 
                             variant="primary" 
                             size="sm"
                             disabled={packLoading}
                             onClick={() => handlePackOpen(userPack.id)}
                           >
                             {packLoading ? 'Opening...' : 'Open Pack'}
                           </Button>
                         )}
                         {userPack.status === 'opened' && (
                           <div className="text-sm text-green-400 font-bold">✅ Opened</div>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </Card>
          </div>
        )}

                 {activeTab === 'activity' && (
           <div className="space-y-6">
             {/* Tab Header */}
             <div className="mb-6">
               <div className="flex items-center justify-between">
                 <div>
                   <h2 className="text-2xl font-bold text-white">Team Activity</h2>
                   <p className="text-lg" style={{color: 'var(--color-text-secondary)'}}>
                     Track your team's transactions and lineup changes
                   </p>
                 </div>
                 <div className="text-right">
                   <div className="text-2xl font-bold text-white">12</div>
                   <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                     Total Activities
                   </div>
                 </div>
               </div>
             </div>

                         {/* Activity Filters */}
             <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <select
                    className="w-full px-4 py-2 rounded-lg text-white transition-colors"
                    style={{
                      backgroundColor: 'var(--color-slate)',
                      border: '1px solid var(--color-steel)'
                    }}
                  >
                    <option value="all">All Activities</option>
                    <option value="lineup">Lineup Changes</option>
                    <option value="packs">Pack Purchases</option>
                    <option value="trades">Trades</option>
                    <option value="tokens">Token Usage</option>
                  </select>
                </div>
                <div>
                  <select
                    className="w-full px-4 py-2 rounded-lg text-white transition-colors"
                    style={{
                      backgroundColor: 'var(--color-slate)',
                      border: '1px solid var(--color-steel)'
                    }}
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">12</div>
                      <div className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Total Activities</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">5</div>
                      <div className="text-xs" style={{color: 'var(--color-text-secondary)'}}>This Week</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Activity Feed */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
              
              <div className="space-y-4">
                {/* Sample Activity Items */}
                <div className="flex items-start space-x-4 p-4 rounded-lg" style={{backgroundColor: 'var(--color-gunmetal)'}}>
                  <div className="text-2xl">🏈</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">Lineup Updated</div>
                      <div className="text-xs" style={{color: 'var(--color-text-secondary)'}}>2 hours ago</div>
                    </div>
                    <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                      Added Tyreek Hill to WR1 position
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 rounded-lg" style={{backgroundColor: 'var(--color-gunmetal)'}}>
                  <div className="text-2xl">🎁</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">Pack Purchased</div>
                      <div className="text-xs" style={{color: 'var(--color-text-secondary)'}}>1 day ago</div>
                    </div>
                    <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                      Purchased Premium Pack for 💰 100 coins
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 rounded-lg" style={{backgroundColor: 'var(--color-gunmetal)'}}>
                  <div className="text-2xl">🎯</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">Token Applied</div>
                      <div className="text-xs" style={{color: 'var(--color-text-secondary)'}}>2 days ago</div>
                    </div>
                    <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                      Applied Touchdown Bonus token to Josh Allen (QB)
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 rounded-lg" style={{backgroundColor: 'var(--color-gunmetal)'}}>
                  <div className="text-2xl">📇</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">Card Acquired</div>
                      <div className="text-xs" style={{color: 'var(--color-text-secondary)'}}>3 days ago</div>
                    </div>
                    <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                      Opened pack and received Rare Derrick Henry card
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 rounded-lg" style={{backgroundColor: 'var(--color-gunmetal)'}}>
                  <div className="text-2xl">🏆</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">Scoring Complete</div>
                      <div className="text-xs" style={{color: 'var(--color-text-secondary)'}}>1 week ago</div>
                    </div>
                    <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                      Week 14 lineup scored 157.3 fantasy points
                    </div>
                  </div>
                </div>
              </div>

              {/* Load More */}
              <div className="text-center mt-6">
                <Button variant="ghost" size="sm">
                  Load More Activity
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Collection Player Modal */}
      {selectedCollectionPlayerId && (
        <PlayerModal
          playerId={selectedCollectionPlayerId}
          isOpen={isCollectionModalOpen}
          onClose={() => {
            setIsCollectionModalOpen(false)
            setSelectedCollectionPlayerId(null)
          }}
        />
      )}
      </ContentContainer>
    </StandardLayout>
  )
}
