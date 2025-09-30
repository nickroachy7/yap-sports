'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { Card, Button, LineupBuilder, PlayerModal, CollectionListView, SectionHeader, StandardLayout, ContentContainer, Select, SearchInput } from '@/components/ui'
import { UserCard, LineupSlot } from '@/components/ui/LineupBuilder'
import type { CollectionItem } from '@/components/ui'
import { Trophy, Coins, LayoutGrid, Store, BarChart3, Settings, Bell, Zap, Target, ClipboardList, Package, Gift } from 'lucide-react'

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

type TabType = 'lineup' | 'collection' | 'store' | 'activity'

export default function TeamDashboard() {
  const params = useParams()
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const { user, loading: authLoading, initialized } = useAuth()
  
  const [currentTeam, setCurrentTeam] = useState<UserTeam | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('lineup')
  const [loading, setLoading] = useState(true)
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [availableTokens, setAvailableTokens] = useState<any[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null)
  const [lineupSlots, setLineupSlots] = useState<LineupSlot[]>([])
  const [lineupLoading, setLineupLoading] = useState(false)
  const [selectedCollectionPlayerId, setSelectedCollectionPlayerId] = useState<string | null>(null)
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [availablePacks, setAvailablePacks] = useState<any[]>([])
  const [userPacks, setUserPacks] = useState<any[]>([])
  const [packLoading, setPackLoading] = useState(false)
  
  // Shared lineup state - for syncing between multiple LineupBuilder instances
  const [lineupSelectedSlot, setLineupSelectedSlot] = useState<string | null>(null)
  const [lineupSlotFilter, setLineupSlotFilter] = useState<string | null>(null)
  
  // Collection filters
  const [collectionSearchTerm, setCollectionSearchTerm] = useState('')
  const [collectionTypeFilter, setCollectionTypeFilter] = useState<'all' | 'player' | 'token'>('all')
  const [collectionPositionFilter, setCollectionPositionFilter] = useState('all')
  const [collectionSortBy, setCollectionSortBy] = useState<'name' | 'fpts' | 'rarity'>('fpts')
  const [collectionSortOrder, setCollectionSortOrder] = useState<'asc' | 'desc'>('desc')

  const teamId = params.teamId as string

  // Load team data when user is authenticated
  useEffect(() => {
    let isMounted = true
    
    async function loadTeamData() {
      // Wait for auth to be fully initialized
      if (!initialized) {
        console.log('[TeamDashboard] Waiting for auth to initialize...')
        return
      }

      // Check if user is authenticated
      if (!user) {
        console.log('[TeamDashboard] No user found after auth initialized')
        if (isMounted) {
          setLoading(false)
        }
        return
      }
      
      if (!isMounted) return
      
      try {
        console.log('[TeamDashboard] Auth initialized with user, loading team data for:', user.id, 'teamId:', teamId)
        
        // Reset state on team change
        setLoading(true)
        setCurrentTeam(null)
        setUserCards([])
        setAvailableTokens([])
        setLineupSlots([])
        setUserPacks([])
        
        await loadUserData(user.id)
      } catch (err) {
        console.error('[TeamDashboard] Error loading team data:', err)
        setLoading(false)
      }
    }
    
    loadTeamData()
    
    return () => {
      isMounted = false
    }
  }, [initialized, user, teamId]) // Changed: use initialized instead of authLoading

  async function loadUserData(uid: string) {
    try {
      console.log('Loading user data for:', uid, 'teamId:', teamId)
      
      // Load current team
      const { data: teams, error: teamsError } = await supabase
        .from('user_teams')
        .select('*')
        .eq('user_id', uid)
        .eq('active', true)
        .eq('id', teamId)
        .single()

      console.log('Team query result:', { teams, teamsError })

      if (teamsError || !teams) {
        console.error('Team not found:', teamsError)
        setLoading(false)
        router.push('/dashboard')
        return
      }
      
      console.log('Setting current team:', teams)
      setCurrentTeam(teams)

      // Load team's cards, tokens, lineup, and packs
      console.log('Loading team data...')
      await Promise.all([
        loadTeamCards(uid, teamId),
        loadTeamTokens(uid, teamId),
        loadTeamLineup(uid, teamId),
        loadAvailablePacks(),
        loadUserPacks()
      ])
      
      console.log('All team data loaded successfully')
      
    } catch (error) {
      console.error('Error loading user data:', error)
      setMessage('Failed to load team data: ' + (error as Error).message)
    } finally {
      console.log('Setting loading to false')
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

  // Get filtered collection items based on search and filters
  const getFilteredCollectionItems = (): CollectionItem[] => {
    let items = getCollectionItems()

    // Type filter
    if (collectionTypeFilter !== 'all') {
      items = items.filter(item => item.type === collectionTypeFilter)
    }

    // Position filter (only for players)
    if (collectionPositionFilter !== 'all') {
      items = items.filter(item => 
        item.type === 'token' || item.position === collectionPositionFilter
      )
    }

    // Search filter
    if (collectionSearchTerm) {
      const searchLower = collectionSearchTerm.toLowerCase()
      items = items.filter(item => {
        if (item.type === 'player') {
          return item.name.toLowerCase().includes(searchLower) ||
                 item.position?.toLowerCase().includes(searchLower) ||
                 item.team?.toLowerCase().includes(searchLower)
        } else {
          return item.name.toLowerCase().includes(searchLower) ||
                 item.description?.toLowerCase().includes(searchLower)
        }
      })
    }

    // Sort
    items.sort((a, b) => {
      let aValue: any, bValue: any

      switch (collectionSortBy) {
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'fpts':
          // Tokens don't have fpts, so put them at the end
          aValue = a.type === 'player' ? (a.stats?.fpts || 0) : -1
          bValue = b.type === 'player' ? (b.stats?.fpts || 0) : -1
          break
        case 'rarity':
          const rarityOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 }
          aValue = a.type === 'player' && a.rarity ? rarityOrder[a.rarity] : 0
          bValue = b.type === 'player' && b.rarity ? rarityOrder[b.rarity] : 0
          break
        default:
          aValue = a.name
          bValue = b.name
      }

      if (collectionSortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return items
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
      
      // Show success message with card details
      const cardsList = result.cards?.map((card: any) => 
        `${card.player.first_name} ${card.player.last_name} (${card.rarity})`
      ).join(', ') || ''
      
      setMessage(`✅ Successfully purchased ${result.pack.name}! Received ${result.cards?.length || 0} cards: ${cardsList}`)
      
      // Reload user cards to show the new cards in collection
      await loadData()
      
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
      if (user?.id) {
        await loadTeamCards(user.id, teamId)
        await loadTeamTokens(user.id, teamId)
        await loadUserPacks()
      }
      
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
    if (!user?.id || !teamId) return
    
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
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .order('opened_at', { ascending: false, nullsFirst: true })
      
      if (error) throw error
      setUserPacks(packs || [])
    } catch (error) {
      console.error('Error loading user packs:', error)
    }
  }

  console.log('[TeamDashboard] Render:', { loading, authLoading, initialized, hasUser: !!user, hasTeam: !!currentTeam, teamId })
  
  // Show loading while auth is initializing OR while team data is loading
  if (!initialized || (initialized && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--color-obsidian)'}}>
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">Loading Dashboard...</div>
          <div className="text-base" style={{color: 'var(--color-text-secondary)'}}>
            {!initialized ? 'Authenticating...' : 'Setting up your team'}
          </div>
        </div>
      </div>
    )
  }
  
  // Redirect if not authenticated
  if (!user) {
    console.log('[TeamDashboard] No user after auth initialized, redirecting...')
    router.push('/auth')
    return null
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
      {/* Compact Command Center Header - Full Width */}
      <div className="sticky top-0 z-50 border-b" style={{backgroundColor: 'var(--color-obsidian)', borderColor: 'var(--color-steel)'}}>
        {/* Top Info Bar - Minimal & Clean */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">{currentTeam.name}</h1>
            <div className="flex items-center space-x-3 text-sm">
              <span className="text-gray-500">·</span>
              <span className="text-gray-400">
                {currentWeek ? `Week ${currentWeek.week_number}` : 'Season'}
              </span>
              <span className="text-gray-500">·</span>
              <span className="font-semibold text-green-400 flex items-center gap-1">
                <Coins className="w-4 h-4" />
                {currentTeam.coins.toLocaleString()}
              </span>
            </div>
          </div>
          
          {/* Action Icons - Minimal Style */}
          <div className="flex items-center space-x-1">
            <button 
              className="p-2 text-gray-500 hover:text-white transition-colors"
              title="Statistics"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button 
              className="p-2 text-gray-500 hover:text-white transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              className="p-2 text-gray-500 hover:text-white transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {userPacks.filter(p => p.status === 'unopened').length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-400 rounded-full"></span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation - Sleek Design */}
        <div className="flex space-x-0 border-t px-6" style={{borderColor: 'var(--color-steel)'}}>
              {[
                { id: 'lineup', label: 'Lineup', Icon: Trophy, badge: null },
                { id: 'collection', label: 'Collection', Icon: LayoutGrid, badge: userCards.length + availableTokens.length },
                { id: 'store', label: 'Store', Icon: Store, badge: userPacks.filter(p => p.status === 'unopened').length || null },
                { id: 'activity', label: 'Activity', Icon: ClipboardList, badge: null }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`relative px-6 py-3 text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'text-green-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <tab.Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-700 text-gray-300">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  {/* Active indicator - bottom border */}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400"></div>
                  )}
                </button>
              ))}
        </div>

        {/* Collection Filters - Only show when Collection tab is active */}
        {activeTab === 'collection' && (
          <div className="px-6 py-3 border-t flex items-center gap-3" style={{borderColor: 'var(--color-steel)'}}>
            {/* Search - Full width first */}
              <div className="flex-1">
                <SearchInput
                  placeholder="Search by player name or token..."
                  value={collectionSearchTerm}
                  onChange={(e) => setCollectionSearchTerm(e.target.value)}
                  onClear={() => setCollectionSearchTerm('')}
                />
              </div>

              {/* Type Filter */}
              <div className="w-48">
                <Select
                  value={collectionTypeFilter}
                  onChange={(e) => setCollectionTypeFilter(e.target.value as 'all' | 'player' | 'token')}
                  options={[
                    { value: 'all', label: 'All Items' },
                    { value: 'player', label: 'Players' },
                    { value: 'token', label: 'Tokens' }
                  ]}
                  placeholder="All Items"
                />
              </div>

              {/* Position Filter */}
              <div className="w-48">
                <Select
                  value={collectionPositionFilter}
                  onChange={(e) => setCollectionPositionFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Positions' },
                    { value: 'QB', label: 'QB' },
                    { value: 'RB', label: 'RB' },
                    { value: 'WR', label: 'WR' },
                    { value: 'TE', label: 'TE' }
                  ]}
                  placeholder="All Positions"
                />
              </div>

              {/* Sort By */}
              <div className="w-40">
                <Select
                  value={collectionSortBy}
                  onChange={(e) => setCollectionSortBy(e.target.value as 'name' | 'fpts' | 'rarity')}
                  options={[
                    { value: 'name', label: 'Name' },
                    { value: 'fpts', label: 'Fantasy Points' },
                    { value: 'rarity', label: 'Rarity' }
                  ]}
                  placeholder="Sort By"
                />
              </div>

              {/* Order */}
              <div className="w-32">
                <Select
                  value={collectionSortOrder}
                  onChange={(e) => setCollectionSortOrder(e.target.value as 'asc' | 'desc')}
                  options={[
                    { value: 'asc', label: collectionSortBy === 'name' ? 'A → Z' : 'Low → High' },
                    { value: 'desc', label: collectionSortBy === 'name' ? 'Z → A' : 'High → Low' }
                  ]}
                />
              </div>

              {/* Reset Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCollectionSearchTerm('')
                  setCollectionTypeFilter('all')
                  setCollectionPositionFilter('all')
                  setCollectionSortBy('fpts')
                  setCollectionSortOrder('desc')
                }}
              >
                Reset Filters
              </Button>
          </div>
        )}

        {/* Lineup Grid - Part of Sticky Header (only show on Lineup tab) */}
        {activeTab === 'lineup' && currentWeek && (
          <div className="border-t" style={{borderColor: 'var(--color-steel)'}}>
            <LineupBuilder
              availableCards={userCards}
              lineupSlots={lineupSlots}
              availableTokens={availableTokens}
              onSlotChange={handleLineupSlotChange}
              onTokenApply={handleTokenApply}
              onPlayerClick={handlePlayerClick}
              loading={lineupLoading}
              title={`Week ${currentWeek.week_number} Lineup`}
              showAvailableCards={false}
              disableSticky={true}
              selectedSlot={lineupSelectedSlot}
              onSelectedSlotChange={setLineupSelectedSlot}
              slotFilter={lineupSlotFilter}
              onSlotFilterChange={setLineupSlotFilter}
            />
          </div>
        )}
      </div>
      
      {/* Lineup Tab - Available Players in ContentContainer */}
      {activeTab === 'lineup' && currentWeek && (
        <>
          
          {/* Available Players in ContentContainer */}
          <ContentContainer>
            <div>
              <LineupBuilder
                availableCards={userCards}
                lineupSlots={lineupSlots}
                availableTokens={availableTokens}
                onSlotChange={handleLineupSlotChange}
                onTokenApply={handleTokenApply}
                onPlayerClick={handlePlayerClick}
                loading={lineupLoading}
                title={`Week ${currentWeek.week_number} Lineup`}
                showAvailableCards={true}
                showLineupGrid={false}
                showSubmitButton={false}
                compact={true}
                selectedSlot={lineupSelectedSlot}
                onSelectedSlotChange={setLineupSelectedSlot}
                slotFilter={lineupSlotFilter}
                onSlotFilterChange={setLineupSlotFilter}
              />
            </div>
          </ContentContainer>
        </>
      )}
      
      {/* Other Tabs in ContentContainer */}
      {activeTab !== 'lineup' && (
        <ContentContainer>
          <div>

                {activeTab === 'collection' && (
          <Card className="p-0">
            {userCards.length === 0 && availableTokens.length === 0 ? (
              <div className="text-center py-6 px-6">
                <div className="text-base font-bold text-white mb-2">No items in collection</div>
                <div className="text-sm text-gray-400 mb-4">Purchase packs to get started</div>
                <Button onClick={() => setActiveTab('store')} variant="primary">
                  Go to Store
                </Button>
              </div>
            ) : (
              <CollectionListView 
                items={getFilteredCollectionItems()}
                onItemClick={handleCollectionItemClick}
                onSellPlayer={handlePlayerSell}
                showActions={true}
                filterType={collectionTypeFilter === 'all' ? undefined : collectionTypeFilter === 'player' ? 'players' : 'tokens'}
              />
            )}
          </Card>
        )}

                 {activeTab === 'store' && (
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
             <div className="text-center py-6">
               <div className="text-base font-bold text-white mb-2">Loading packs...</div>
               <div className="text-sm text-gray-400">Please wait</div>
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
                 <div className="text-center py-6">
                   <div className="text-base font-bold text-white mb-2">No packs</div>
                   <div className="text-sm text-gray-400">Purchase a pack above</div>
                 </div>
               ) : (
                 <div className="space-y-3">
                   {userPacks.map((userPack) => (
                     <div key={userPack.id} className="flex items-center justify-between p-4 rounded-lg border" style={{backgroundColor: 'var(--color-gunmetal)', borderColor: 'var(--color-steel)'}}>
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
           <Card className="py-6">
            <div className="flex items-center justify-between mb-6 px-6">
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
              <div className="text-sm text-gray-400">
                Pack purchases, openings, and sales
              </div>
            </div>

            {(() => {
              // Build activity feed from packs and transactions
              const activities: Array<{
                id: string
                type: 'pack_purchase' | 'pack_opening' | 'card_sale'
                timestamp: string
                data: any
              }> = []

              // Add pack purchases (unopened packs were purchased)
              userPacks.filter(p => p.status === 'unopened').forEach(pack => {
                activities.push({
                  id: `purchase-${pack.id}`,
                  type: 'pack_purchase',
                  timestamp: pack.created_at || new Date().toISOString(),
                  data: pack
                })
              })

              // Add pack openings (opened packs)
              userPacks.filter(p => p.status === 'opened' && p.opened_at).forEach(pack => {
                activities.push({
                  id: `opening-${pack.id}`,
                  type: 'pack_opening',
                  timestamp: pack.opened_at!,
                  data: pack
                })
              })

              // Sort by timestamp (most recent first)
              activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

              if (activities.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-500 px-6">
                    <div className="text-lg font-medium mb-2">No activity</div>
                    <div className="text-sm">Purchase packs to see your activity here</div>
                  </div>
                )
              }

              return (
                <div className="space-y-3">
                  {activities.slice(0, 20).map(activity => {
                    const timeAgo = (() => {
                      const now = new Date()
                      const then = new Date(activity.timestamp)
                      const diffMs = now.getTime() - then.getTime()
                      const diffMins = Math.floor(diffMs / 60000)
                      const diffHours = Math.floor(diffMins / 60)
                      const diffDays = Math.floor(diffHours / 24)

                      if (diffMins < 1) return 'Just now'
                      if (diffMins < 60) return `${diffMins}m ago`
                      if (diffHours < 24) return `${diffHours}h ago`
                      if (diffDays === 1) return 'Yesterday'
                      if (diffDays < 7) return `${diffDays}d ago`
                      return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    })()

                    return (
                      <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg" style={{backgroundColor: 'var(--color-gunmetal)'}}>
                        <div className="text-2xl flex-shrink-0">
                          {activity.type === 'pack_purchase' && <Gift className="w-6 h-6 text-green-400" />}
                          {activity.type === 'pack_opening' && <Package className="w-6 h-6 text-purple-400" />}
                          {activity.type === 'card_sale' && <Coins className="w-6 h-6 text-yellow-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-semibold text-white">
                              {activity.type === 'pack_purchase' && `Purchased ${activity.data.packs?.name || 'Pack'}`}
                              {activity.type === 'pack_opening' && `Opened ${activity.data.packs?.name || 'Pack'}`}
                              {activity.type === 'card_sale' && 'Sold Card'}
                            </div>
                            <div className="text-xs text-gray-400 flex-shrink-0 ml-2">{timeAgo}</div>
                          </div>
                          <div className="text-sm text-gray-400">
                            {activity.type === 'pack_purchase' && (
                              <span className="flex items-center gap-1">
                                <Coins className="w-3 h-3" /> {activity.data.packs?.price_coins || 0} coins
                              </span>
                            )}
                            {activity.type === 'pack_opening' && (
                              <span>Received new cards and tokens</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </Card>
        )}

         {/* Old activity code removed */}
         {false && (
           <div className="space-y-6">
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{display: 'none'}}>
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
        </ContentContainer>
      )}

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
     </StandardLayout>
   )
 }
