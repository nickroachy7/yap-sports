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
    loadPlayers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [players, filters])

  async function loadPlayers() {
    try {
      setLoading(true)
      console.log('🔍 Loading players...');
      
      const { data: playersData, error } = await supabase
        .from('players')
        .select('*')
        .eq('active', true)
        .order('last_name', { ascending: true })
      
      console.log('Players query result:', { count: playersData?.length, error });
      
      if (error) throw error
      
      // Convert to PlayerListItem format with mock stats
      const playersList: PlayerListItem[] = (playersData || []).map((player, index) => ({
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
      <PageHeader 
        title="NFL Players" 
        description="Research and analyze player performance"
        rightContent={
          <div className="text-right">
            <div className="text-2xl font-black text-white">
              {filteredPlayers.length}
            </div>
            <FilterStats 
              total={players.length}
              filtered={filteredPlayers.length}
              label="players"
              className="text-sm"
            />
          </div>
        }
      />

      <FilterContainer 
        title="Filter & Search"
        description="Find players by position, team, or search by name"
      >
        <FilterGrid columns={6}>
          {/* Search */}
          <div className="lg:col-span-2">
            <SearchInput
              placeholder="Search players..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
              onClear={() => setFilters({...filters, searchTerm: ''})}
            />
          </div>

          {/* Position Filter */}
          <div>
            <Select
              value={filters.position}
              onChange={(e) => setFilters({...filters, position: e.target.value})}
              options={positions.map(pos => ({ value: pos, label: pos }))}
              placeholder="All Positions"
            />
          </div>

          {/* Team Filter */}
          <div>
            <Select
              value={filters.team}
              onChange={(e) => setFilters({...filters, team: e.target.value})}
              options={teams.map(team => ({ value: team, label: team }))}
              placeholder="All Teams"
            />
          </div>

          {/* Sort By */}
          <div>
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

          {/* Actions */}
          <div>
            <QuickFilterActions>
              <FilterToggle
                active={filters.sortOrder === 'desc'}
                onClick={() => setFilters({...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'})}
              >
                {filters.sortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A'}
              </FilterToggle>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
              >
                Reset
              </Button>
            </QuickFilterActions>
          </div>
        </FilterGrid>
      </FilterContainer>

      {/* Main Content */}
      <ContentContainer>
        <div className="py-6">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 text-center">
            <div className="text-xl font-black text-white">
              {players.filter(p => p.position === 'QB').length}
            </div>
            <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
              Quarterbacks
            </div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-xl font-black text-white">
              {players.filter(p => p.position === 'RB').length}
            </div>
            <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
              Running Backs
            </div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-xl font-black text-white">
              {players.filter(p => p.position === 'WR').length}
            </div>
            <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
              Wide Receivers
            </div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-xl font-black text-white">
              {players.filter(p => p.position === 'TE').length}
            </div>
            <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
              Tight Ends
            </div>
          </Card>
        </div>

        {/* Players List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              {filters.position !== 'all' ? `${filters.position}s` : 'All Players'}
              {filters.team !== 'all' && ` - ${filters.team}`}
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                Showing {filteredPlayers.length} of {players.length} players
              </span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <LoadingSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">❌</div>
              <h3 className="text-xl font-bold text-white mb-2">Failed to Load Players</h3>
              <p style={{color: 'var(--color-text-secondary)'}} className="mb-4">
                {error}
              </p>
              <Button variant="primary" onClick={() => { setError(null); loadPlayers(); }}>
                Try Again
              </Button>
            </div>
          ) : filteredPlayers.length > 0 ? (
            <CollectionListView 
              items={transformToCollectionItems(filteredPlayers)}
              onItemClick={(playerId) => handlePlayerClick(playerId)}
              showActions={true}
              filterType="players"
            />
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-white mb-2">No Players Found</h3>
              <p style={{color: 'var(--color-text-secondary)'}} className="mb-4">
                Try adjusting your search filters or search terms.
              </p>
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