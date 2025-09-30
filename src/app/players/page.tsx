'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { Card, Button, CollectionListView, PlayerModal, LoadingSkeleton, StandardLayout, PageHeader, ContentContainer, SearchInput, Select, FilterContainer, FilterGrid, QuickFilterActions, FilterToggle, FilterStats } from '@/components/ui'
import type { CollectionItem } from '@/components/ui'

type Player = {
  id: string
  external_ref: string
  first_name: string
  last_name: string
  position: string
  team: string
  active: boolean
}

type PlayerListItem = {
  id: string
  name: string
  position: string
  team: string
  gameInfo: string
  stats: {
    fpts: number
    proj: number
    snp: number
    tar: number
    rec: number
    yd: number
    ypt: number
    ypc: number
    td: number
    fum: number
    lost: number
  }
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  contractsRemaining: number
  currentSellValue: number
  isStarter: boolean
  injuryStatus: 'healthy' | 'questionable' | 'doubtful' | 'out'
}

type FilterOptions = {
  position: string
  team: string
  searchTerm: string
  sortBy: 'name' | 'position' | 'team' | 'fantasy_points'
  sortOrder: 'asc' | 'desc'
}

export default function PlayersPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  
  const [players, setPlayers] = useState<PlayerListItem[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPopulating, setIsPopulating] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    position: 'all',
    team: 'all',
    searchTerm: '',
    sortBy: 'name',
    sortOrder: 'asc'
  })

  const positions = ['QB', 'RB', 'WR', 'TE']
  const teams = [
    'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN',
    'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LAR', 'MIA',
    'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB',
    'TEN', 'WAS'
  ]

  useEffect(() => {
    let isMounted = true
    let loadingTimeout: NodeJS.Timeout
    
    async function initializePlayers() {
      if (!isMounted) return
      
      try {
        await loadPlayers()
      } catch (error) {
        console.error('Players initialization error:', error)
        if (isMounted) {
          setLoading(false)
          setError('Failed to load players')
        }
      }
    }
    
    initializePlayers()
    
    return () => {
      isMounted = false
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
      }
    }
  }, [])

  useEffect(() => {
    applyFilters()
  }, [players, filters])

  // Listen for auth state changes to handle delayed session loading
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Players: Auth state change detected:', event, !!session)
      
      // Handle sign out - clear players data  
      if (event === 'SIGNED_OUT') {
        console.log('Players: User signed out, clearing data')
        setPlayers([])
        setFilteredPlayers([])
        return
      }
      
      // If we get a session after initial load and players haven't loaded yet
      if (event === 'SIGNED_IN' && session && players.length === 0 && !loading) {
        console.log('Players: User signed in, loading players...')
        await loadPlayers()
      }
      
      // If session changes while players are loaded, reload them
      if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session && players.length === 0) {
        console.log('Players: Session refreshed, reloading players...')
        await loadPlayers()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [players.length, loading])

  async function loadPlayers() {
    try {
      setLoading(true)
      setError(null)
      console.log('🔍 Loading players...');
      
      // Load all active players
      const { data: playersData, error } = await supabase
        .from('players')
        .select('*')
        .eq('active', true)
        .order('last_name', { ascending: true })
      
      console.log('Players query result:', { count: playersData?.length, error: error?.message });
      
      if (error) {
        throw new Error(`Failed to load players: ${error.message}`)
      }
      
      // Check if we have any players
      if (!playersData || playersData.length === 0) {
        console.log('⚠️ No players found in database');
        setPlayers([])
        setError(null) // Don't treat empty database as an error
        return
      }
      
      // Convert to PlayerListItem format with mock stats
      const playersList: PlayerListItem[] = playersData.map((player, index) => ({
        id: player.id,
        name: `${player.first_name} ${player.last_name}`,
        position: player.position,
        team: player.team,
        gameInfo: `Sun 1:00 PM vs ${teams[Math.floor(Math.random() * teams.length)]}`,
        stats: {
          fpts: Math.floor(Math.random() * 200) + 100,
          proj: Math.floor(Math.random() * 10) + 15,
          snp: Math.floor(Math.random() * 30) + 50,
          tar: Math.floor(Math.random() * 80) + 20,
          rec: Math.floor(Math.random() * 60) + 15,
          yd: Math.floor(Math.random() * 800) + 200,
          ypt: Math.floor(Math.random() * 8) + 6,
          ypc: Math.floor(Math.random() * 10) + 8,
          td: Math.floor(Math.random() * 12) + 1,
          fum: Math.floor(Math.random() * 4),
          lost: Math.floor(Math.random() * 200) + 25
        },
        rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary'][Math.floor(Math.random() * 5)] as any,
        contractsRemaining: Math.floor(Math.random() * 10) + 1,
        currentSellValue: Math.floor(Math.random() * 150) + 50,
        isStarter: Math.random() > 0.7,
        injuryStatus: Math.random() > 0.9 ? 'questionable' : 'healthy'
      }))
      
      console.log('✅ Players loaded:', playersList.length);
      console.log('Sample player data:', playersList.slice(0, 2));
      setPlayers(playersList)
    } catch (err) {
      console.error('❌ Error loading players:', err)
      setError('Failed to load players: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...players]
    
    // Position filter
    if (filters.position !== 'all') {
      filtered = filtered.filter(player => player.position === filters.position)
    }
    
    // Team filter
    if (filters.team !== 'all') {
      filtered = filtered.filter(player => player.team === filters.team)
    }
    
    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(searchLower) ||
        player.position.toLowerCase().includes(searchLower) ||
        player.team.toLowerCase().includes(searchLower)
      )
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'position':
          aValue = a.position
          bValue = b.position
          break
        case 'team':
          aValue = a.team
          bValue = b.team
          break
        case 'fantasy_points':
          aValue = a.stats.fpts
          bValue = b.stats.fpts
          break
        default:
          aValue = a.name
          bValue = b.name
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    
    setFilteredPlayers(filtered)
  }

  function handlePlayerClick(playerId: string) {
    setSelectedPlayerId(playerId)
    setIsModalOpen(true)
  }

  function handleViewFullProfile(playerId: string) {
    setIsModalOpen(false)
    router.push(`/players/${playerId}`)
  }

  function handleAddToLineup(playerId: string) {
    // TODO: Implement add to lineup functionality
    console.log('Add to lineup:', playerId)
    setIsModalOpen(false)
  }

  function resetFilters() {
    setFilters({
      position: 'all',
      team: 'all',
      searchTerm: '',
      sortBy: 'name',
      sortOrder: 'asc'
    })
  }

  async function populatePlayersDatabase() {
    try {
      setIsPopulating(true)
      console.log('🔄 Populating players database...')
      
      // First, sync teams (required for player-team relationships)
      console.log('📋 Syncing teams first...')
      const teamsResponse = await fetch('/api/admin/sync/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!teamsResponse.ok) {
        const teamsError = await teamsResponse.json()
        throw new Error(`Failed to sync teams: ${teamsError.error || 'Unknown error'}`)
      }
      
      console.log('✅ Teams synced successfully')
      
      // Then sync players
      console.log('👥 Syncing players...')
      const playersResponse = await fetch('/api/admin/sync/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          test_mode: true, 
          per_page: 100, 
          max_players: 500 
        })
      })
      
      const result = await playersResponse.json()
      
      if (!playersResponse.ok) {
        throw new Error(result.error || 'Failed to populate players')
      }
      
      console.log('✅ Players database populated:', result)
      
      // Reload players after successful population
      await loadPlayers()
      
    } catch (err) {
      console.error('❌ Error populating players:', err)
      setError('Failed to populate players database: ' + (err as Error).message)
    } finally {
      setIsPopulating(false)
    }
  }

  // Transform PlayerListItem data to CollectionItem format (to match dashboard display)
  function transformToCollectionItems(playerList: PlayerListItem[]): CollectionItem[] {
    return playerList.map(player => ({
      id: player.id,
      type: 'player' as const,
      name: player.name,
      position: player.position,
      team: player.team,
      gameInfo: player.gameInfo,
      stats: player.stats,
      rarity: player.rarity,
      contractsRemaining: player.contractsRemaining,
      currentSellValue: player.currentSellValue,
      isStarter: player.isStarter,
      injuryStatus: player.injuryStatus
    }))
  }

  return (
    <StandardLayout>
      {/* Compact Header - Full Width */}
      <div className="border-b" style={{borderColor: 'var(--color-steel)'}}>
        {/* Top Info Bar */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">NFL Players</h1>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{players.length}</div>
            <div className="text-xs text-gray-400">
              Showing {filteredPlayers.length} of {players.length}
            </div>
          </div>
        </div>

        {/* Filter Bar - Compact Single Row */}
        <div className="px-6 py-3 border-t flex items-center gap-3" style={{borderColor: 'var(--color-steel)'}}>
          {/* Search - Full width first */}
          <div className="flex-1">
            <SearchInput
              placeholder="Search by player name..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
              onClear={() => setFilters({...filters, searchTerm: ''})}
            />
          </div>

          {/* Position Filter */}
          <div className="w-48">
            <Select
              value={filters.position}
              onChange={(e) => setFilters({...filters, position: e.target.value})}
              options={positions.map(pos => ({ value: pos, label: pos }))}
              placeholder="All Positions"
            />
          </div>

          {/* Team Filter */}
          <div className="w-48">
            <Select
              value={filters.team}
              onChange={(e) => setFilters({...filters, team: e.target.value})}
              options={teams.map(team => ({ value: team, label: team }))}
              placeholder="All Teams"
            />
          </div>

          {/* Sort By */}
          <div className="w-40">
            <Select
              value={filters.sortBy}
              onChange={(e) => setFilters({...filters, sortBy: e.target.value as any})}
              options={[
                { value: 'name', label: 'Name' },
                { value: 'position', label: 'Position' },
                { value: 'team', label: 'Team' },
                { value: 'fantasy_points', label: 'Fantasy Points' }
              ]}
              placeholder="Sort By"
            />
          </div>

          {/* Order */}
          <div className="w-32">
            <Select
              value={filters.sortOrder}
              onChange={(e) => setFilters({...filters, sortOrder: e.target.value as 'asc' | 'desc'})}
              options={[
                { value: 'asc', label: filters.sortBy === 'name' ? 'A → Z' : 'Low → High' },
                { value: 'desc', label: filters.sortBy === 'name' ? 'Z → A' : 'High → Low' }
              ]}
            />
          </div>

          {/* Reset Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
          >
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <ContentContainer>
        <div className="py-6">
        
        {/* Players List */}
        <Card className="py-6">
          <div className="flex items-center justify-between mb-6 px-6">
            <h2 className="text-xl font-bold text-white">All Players</h2>
            <div className="text-sm text-gray-400">
              Showing {filteredPlayers.length} of {players.length} players
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-lg font-semibold text-white mb-2">Loading Players...</div>
                <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                  Fetching player data from the database
                </div>
              </div>
              {[...Array(10)].map((_, i) => (
                <LoadingSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-lg font-bold text-white mb-2">Failed to load players</div>
              <p className="text-sm text-gray-400 mb-4">{error}</p>
              <div className="space-y-3">
                <Button variant="primary" onClick={() => { setError(null); loadPlayers(); }}>
                  Try Again
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    // Clear cache and reload
                    if (typeof window !== 'undefined') {
                      window.localStorage.clear()
                      window.sessionStorage.clear()
                      window.location.reload()
                    }
                  }}
                >
                  Clear Cache & Reload
                </Button>
              </div>
            </div>
          ) : filteredPlayers.length > 0 ? (
            <CollectionListView 
              items={transformToCollectionItems(filteredPlayers)}
              onItemClick={(playerId) => handlePlayerClick(playerId)}
              showActions={true}
              filterType="players"
            />
          ) : players.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🏈</div>
              <h3 className="text-xl font-bold text-white mb-2">No Players in Database</h3>
              <p style={{color: 'var(--color-text-secondary)'}} className="mb-6">
                It looks like the players database is empty. You can populate it with NFL player data.
              </p>
              <div className="space-y-3">
                <Button 
                  variant="primary" 
                  onClick={populatePlayersDatabase}
                  disabled={isPopulating}
                >
                  {isPopulating ? '🔄 Populating Players...' : '🚀 Populate Players Database'}
                </Button>
                <Button variant="ghost" onClick={() => { setError(null); loadPlayers(); }}>
                  🔄 Refresh
                </Button>
              </div>
              {isPopulating && (
                <div className="mt-4 text-sm" style={{color: 'var(--color-text-secondary)'}}>
                  This may take a few moments to fetch and populate NFL player data...
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-lg font-bold text-white mb-2">No players found</div>
              <p className="text-sm text-gray-400 mb-4">Try adjusting your filters</p>
              <Button variant="primary" onClick={resetFilters}>
                Reset Filters
              </Button>
            </div>
          )}
        </Card>
        </div>

      {/* Player Modal */}
      <PlayerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        playerId={selectedPlayerId}
        onViewFullProfile={handleViewFullProfile}
        onAddToLineup={handleAddToLineup}
      />
      </ContentContainer>
    </StandardLayout>
  )
}