'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { Card, Button, CollectionListView, PlayerDetailInline, LoadingSkeleton, StandardLayout, PageHeader, ContentContainer, SearchInput, Select, FilterContainer, FilterGrid, QuickFilterActions, FilterToggle, FilterStats } from '@/components/ui'
import type { CollectionItem, Tab } from '@/components/ui'
import { TrendingUp, Users } from 'lucide-react'
import { usePageHeader } from '@/hooks/usePageHeader'

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
    fpts: number      // Total fantasy points
    proj: number      // Projected points
    snp: number       // Snap percentage
    avg: number       // Average fantasy points per game
    best: number      // Best single game performance
    last: number      // Last week's fantasy points
    tar: number       // Targets (for reference)
    rec: number       // Receptions (for reference)
    yd: number        // Yards (for reference)
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
  trending?: {
    direction: 'up' | 'down' | 'stable'
    strength: number
  }
  positionRank?: number
}

type FilterOptions = {
  position: string
  team: string
  searchTerm: string
  sortBy: 'name' | 'position' | 'team' | 'fantasy_points'
  sortOrder: 'asc' | 'desc'
}

type TabType = 'all-players' | 'trending'

export default function PlayersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, initialized } = useAuth()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  
  const [activeTab, setActiveTab] = useState<TabType>('all-players')
  const [allPlayers, setAllPlayers] = useState<PlayerListItem[]>([]) // All players in memory
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerListItem[]>([])
  const [displayedPlayers, setDisplayedPlayers] = useState<PlayerListItem[]>([]) // What's actually rendered
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerListItem | null>(null)
  const [isPopulating, setIsPopulating] = useState(false)
  const [displayLimit, setDisplayLimit] = useState(100) // How many to render at once
  const [trendingFilter, setTrendingFilter] = useState<'all' | 'up' | 'down'>('all') // For trending tab
  
  // Default filter state - used for initial load and reset
  const DEFAULT_FILTERS: FilterOptions = {
    position: 'skill', // Default to skill positions only (QB, RB, WR, TE)
    team: 'all',
    searchTerm: '',
    sortBy: 'fantasy_points', // Sort by projected points
    sortOrder: 'desc' // Highest to lowest
  }
  
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS)

  console.log('[PlayersPage] Render:', { 
    hasUser: !!user, 
    authLoading, 
    initialized, 
    playersLoaded: allPlayers.length > 0,
    loading 
  })

  // Position options for dropdown - full names match database
  const positions = [
    'Quarterback',
    'Running Back', 
    'Wide Receiver',
    'Tight End',
    'Kicker',
    'Defensive End',
    'Linebacker',
    'Cornerback',
    'Safety',
    'Defensive Tackle',
    'Offensive Tackle',
    'Guard',
    'Center'
  ]
  const teams = [
    'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN',
    'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LAR', 'MIA',
    'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB',
    'TEN', 'WAS'
  ]

  // Prepare tabs for header
  const tabs: Tab[] = [
    { id: 'all-players', label: 'All Players', icon: Users, badge: allPlayers.length },
    { id: 'trending', label: 'Trending', icon: TrendingUp, badge: null }
  ]

  // Prepare filter content
  const filterContent = activeTab === 'all-players' ? (
    <div className="flex items-center gap-3">
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
          options={[
            { value: 'skill', label: 'Skill Positions' }, // QB, RB, WR, TE
            { value: 'all', label: 'All Positions' },
            ...positions.map(pos => ({ value: pos, label: pos }))
          ]}
          placeholder="Skill Positions"
        />
      </div>

      {/* Team Filter */}
      <div className="w-48">
        <Select
          value={filters.team}
          onChange={(e) => setFilters({...filters, team: e.target.value})}
          options={[
            { value: 'all', label: 'All Teams' },
            ...teams.map(team => ({ value: team, label: team }))
          ]}
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
  ) : activeTab === 'trending' ? (
    <div className="flex items-center gap-3">
      {/* Trending Filter Toggle */}
      <div className="flex gap-2">
        <Button
          variant={trendingFilter === 'all' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setTrendingFilter('all')}
        >
          All Movers
        </Button>
        <Button
          variant={trendingFilter === 'up' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setTrendingFilter('up')}
          style={{
            backgroundColor: trendingFilter === 'up' ? '#10b981' : undefined,
            borderColor: trendingFilter === 'up' ? '#10b981' : undefined
          }}
        >
          📈 Trending Up
        </Button>
        <Button
          variant={trendingFilter === 'down' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setTrendingFilter('down')}
          style={{
            backgroundColor: trendingFilter === 'down' ? '#ef4444' : undefined,
            borderColor: trendingFilter === 'down' ? '#ef4444' : undefined
          }}
        >
          📉 Trending Down
        </Button>
      </div>
    </div>
  ) : null

  // Register header configuration (persists across navigation) - MUST be at top level
  usePageHeader({
    title: selectedPlayer ? selectedPlayer.name : "NFL Players",
    subtitle: selectedPlayer 
      ? `${selectedPlayer.position} · ${selectedPlayer.team} · ${selectedPlayer.stats.fpts.toFixed(1)} FPTS`
      : `2025 Season · ${allPlayers.length.toLocaleString()} Players`,
    showNavigation: true,
    // Only show tabs when no player is selected
    tabs: !selectedPlayerId ? tabs : undefined,
    activeTab: !selectedPlayerId ? activeTab : undefined,
    onTabChange: !selectedPlayerId ? (tabId) => {
      setActiveTab(tabId as TabType)
    } : undefined,
    showFilters: activeTab === 'all-players' && !selectedPlayerId,
    filterContent: filterContent
  })

  // Sync URL query param with selected player state
  useEffect(() => {
    const playerParam = searchParams.get('player')
    if (playerParam && playerParam !== selectedPlayerId) {
      // URL has a player param, update state
      const player = allPlayers.find(p => p.id === playerParam)
      setSelectedPlayerId(playerParam)
      setSelectedPlayer(player || null)
      
      // Scroll to top when URL changes to show player
      setTimeout(() => {
        window.scrollTo({ 
          top: 0, 
          behavior: 'smooth' 
        })
      }, 100)
    } else if (!playerParam && selectedPlayerId) {
      // URL has no player param, clear state
      setSelectedPlayerId(null)
      setSelectedPlayer(null)
    }
  }, [searchParams, allPlayers])

  // Wait for auth to initialize, then load players
  useEffect(() => {
    let isMounted = true
    
    async function initializePlayers() {
      // Wait for auth to be initialized
      if (!initialized) {
        console.log('[PlayersPage] Waiting for auth to initialize...')
        return
      }
      
      // Auth is initialized, now check if user is signed in
      if (!user) {
        console.log('[PlayersPage] No user found after auth initialized')
        if (isMounted) {
          setLoading(false)
          setError(null)
          setAllPlayers([])
          setFilteredPlayers([])
        }
        return
      }

      // User is authenticated and auth is initialized - load players
      if (!isMounted) return
      
      console.log('[PlayersPage] Auth initialized with user, loading players...')
      
      try {
        await loadPlayers()
      } catch (error) {
        console.error('[PlayersPage] Initialization error:', error)
        if (isMounted) {
          setLoading(false)
          setError('Failed to load players')
        }
      }
    }
    
    initializePlayers()
    
    return () => {
      isMounted = false
    }
  }, [initialized, user]) // Re-run when auth state changes

  useEffect(() => {
    applyFilters()
    // Close player detail when filters change (user is searching for different player)
    if (selectedPlayerId) {
      router.push('/players')
    }
  }, [allPlayers, filters, activeTab, trendingFilter])
  
  useEffect(() => {
    // Only render displayLimit number of filtered players
    setDisplayedPlayers(filteredPlayers.slice(0, displayLimit))
  }, [filteredPlayers, displayLimit])

  async function loadPlayers() {
    try {
      setLoading(true)
      setError(null)
      console.log('🔍 Loading players...');
      
      // Check cache first
      const cacheKey = `players_list_v19` // v19 = use API position ranks (consistent across pages)
      const cached = sessionStorage.getItem(cacheKey)
      
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          const age = Date.now() - (cachedData.timestamp || 0)
          const maxAge = 5 * 60 * 1000 // 5 minutes
          
          if (age < maxAge) {
            console.log('⚡ Loaded from cache:', cachedData.players.length, 'players (INSTANT!)')
            setAllPlayers(cachedData.players)
            setLoading(false)
            
            // Fetch trending data asynchronously (even when using cache)
            console.log('📈 Fetching trending data for cached players...');
            fetchTrendingData(cachedData.players)
            
            return // Use cache, skip database query
          } else {
            console.log('🗑️ Cache expired, fetching fresh data')
          }
        } catch (err) {
          console.log('Cache parse error, fetching fresh data')
        }
      }
      
      // Load ALL active players - OPTIMIZED: only 5 fields per player
      console.log('📥 Loading all players from database...')
      
      // Fetch in batches to bypass Supabase 1,000 row limit
      let allPlayersData: any[] = []
      let from = 0
      const batchSize = 1000
      let hasMore = true
      
      while (hasMore) {
        const { data: batch, error } = await supabase
          .from('players')
          .select('id, first_name, last_name, position, team')
          .eq('active', true)
          .order('last_name', { ascending: true })
          .range(from, from + batchSize - 1)
        
        if (error) {
          throw new Error(`Failed to load players: ${error.message}`)
        }
        
        if (batch && batch.length > 0) {
          allPlayersData = allPlayersData.concat(batch)
          console.log(`  Loaded batch: ${batch.length} players (total: ${allPlayersData.length})`)
          
          if (batch.length < batchSize) {
            hasMore = false // Last batch
          } else {
            from += batchSize
          }
        } else {
          hasMore = false
        }
      }
      
      console.log('Players query result:', { 
        loaded: allPlayersData.length
      });
      
      // Check if we have any players
      if (!allPlayersData || allPlayersData.length === 0) {
        console.log('⚠️ No players found in database');
        setAllPlayers([])
        setError(null) // Don't treat empty database as an error
        return
      }
      
      // Fetch REAL season stats
      console.log('📊 Loading season stats...')
      const statsResponse = await fetch('/api/players/season-stats?season=2025')
      const statsData = await statsResponse.json()
      
      let statsMap = new Map<string, any>()
      if (statsData.success && statsData.stats) {
        console.log(`✅ Loaded stats for ${statsData.stats.length} players`)
        statsData.stats.forEach((stat: any) => {
          statsMap.set(stat.player_id, stat)
        })
      } else {
        console.warn('⚠️ Could not load season stats, will use zeros')
      }
      
      const playersData = allPlayersData
      
      // Fetch ALL game stats for the season in bulk (with pagination)
      console.log('📈 Loading game stats for AVG/BEST/LST calculations...')
      let allGameStats: any[] = []
      let gameFrom = 0
      const gameBatchSize = 1000
      let hasMoreGames = true
      
      while (hasMoreGames) {
        const { data: gameBatch, error: gameError } = await supabase
          .from('player_game_stats')
          .select('player_id, stat_json, game_date')
          .gte('game_date', '2025-08-01')
          .lte('game_date', '2026-02-28')
          .not('stat_json', 'is', null)
          .order('game_date', { ascending: false })
          .range(gameFrom, gameFrom + gameBatchSize - 1)
        
        if (gameError) {
          console.error('Error loading game stats:', gameError)
          break
        }
        
        if (gameBatch && gameBatch.length > 0) {
          allGameStats = allGameStats.concat(gameBatch)
          gameFrom += gameBatchSize
          hasMoreGames = gameBatch.length === gameBatchSize
        } else {
          hasMoreGames = false
        }
      }
      
      console.log(`  Loaded ${allGameStats.length} game records`)
      
      // Group game stats by player_id
      const gameStatsMap = new Map<string, any[]>()
      allGameStats.forEach(game => {
        if (!gameStatsMap.has(game.player_id)) {
          gameStatsMap.set(game.player_id, [])
        }
        gameStatsMap.get(game.player_id)!.push(game)
      })
      
      // Convert to PlayerListItem format with REAL stats
      const playersList: PlayerListItem[] = playersData.map((player) => {
        const seasonStats = statsMap.get(player.id)
        
        // Determine primary stats based on position
        let primaryYards = 0
        let primaryTDs = 0
        let attempts = 0
        
        if (seasonStats) {
          switch (player.position) {
            case 'QB':
            case 'Quarterback':
              primaryYards = seasonStats.passing_yards
              primaryTDs = seasonStats.passing_tds
              attempts = seasonStats.rushing_attempts
              break
            case 'RB':
            case 'Running Back':
              primaryYards = seasonStats.rushing_yards
              primaryTDs = seasonStats.rushing_tds
              attempts = seasonStats.rushing_attempts
              break
            case 'WR':
            case 'Wide Receiver':
            case 'TE':
            case 'Tight End':
              primaryYards = seasonStats.receiving_yards
              primaryTDs = seasonStats.receiving_tds
              attempts = seasonStats.targets
              break
            default:
              primaryYards = seasonStats.rushing_yards + seasonStats.receiving_yards
              primaryTDs = seasonStats.rushing_tds + seasonStats.receiving_tds
              attempts = seasonStats.rushing_attempts
          }
        }
        
        // Calculate AVG, BEST, LST from game stats (using bulk-loaded data)
        let gameInfo = 'No games';
        const playerGameStats = gameStatsMap.get(player.id) || []
        
        // Calculate fantasy points for each game
        const gameFantasyPoints = playerGameStats.map(game => {
          const stats = game.stat_json as any
          let points = 0
          
          // Parsing stats (they're often strings in the DB)
          const passingYards = parseFloat(stats.passing_yards) || 0
          const passingTDs = parseFloat(stats.passing_touchdowns) || 0
          const interceptions = parseFloat(stats.passing_interceptions) || 0
          const rushingYards = parseFloat(stats.rushing_yards) || 0
          const rushingTDs = parseFloat(stats.rushing_touchdowns) || 0
          const receivingYards = parseFloat(stats.receiving_yards) || 0
          const receivingTDs = parseFloat(stats.receiving_touchdowns) || 0
          const receptions = parseFloat(stats.receptions) || 0
          const fumblesLost = parseFloat(stats.fumbles_lost) || 0
          
          // Standard scoring
          points += passingYards * 0.04
          points += passingTDs * 4
          points -= interceptions * 2
          points += rushingYards * 0.1
          points += rushingTDs * 6
          points += receivingYards * 0.1
          points += receivingTDs * 6
          points += receptions * 0.5
          points -= fumblesLost * 2
          
          return Math.max(0, points)
        }).filter(pts => pts > 0) // Only count games with points
        
        const gamesPlayed = gameFantasyPoints.length
        const totalPoints = gameFantasyPoints.reduce((sum, pts) => sum + pts, 0)
        const avgPoints = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0
        const bestGame = gamesPlayed > 0 ? Math.max(...gameFantasyPoints) : 0
        const lastGame = gamesPlayed > 0 ? gameFantasyPoints[0] : 0 // Most recent (already sorted desc)
        
        // Update gameInfo with actual games played (rank will be calculated later)
        gameInfo = gamesPlayed > 0 ? `${player.position} | ${gamesPlayed} games` : 'No games';
        
        // Trending will be fetched separately from the API
        let trending: { direction: 'up' | 'down' | 'stable', strength: number } | undefined

        return {
          id: player.id,
          name: `${player.first_name} ${player.last_name}`,
          position: player.position,
          team: player.team,
          gameInfo,
          stats: {
            fpts: totalPoints,
            proj: avgPoints,
            snp: 0, // Removed - not available
            avg: avgPoints,
            best: bestGame,
            last: lastGame,
            tar: seasonStats?.targets || 0,
            rec: seasonStats?.receptions || 0,
            yd: primaryYards,
            ypt: seasonStats?.yards_per_reception || 0,
            ypc: seasonStats?.yards_per_carry || 0,
            td: primaryTDs,
            fum: seasonStats?.fumbles_lost || 0,
            lost: seasonStats?.passing_ints || 0 // INTs for QBs
          },
          rarity: 'common' as any, // Rarity doesn't apply to browsing page
          contractsRemaining: 0,
          currentSellValue: 0,
          isStarter: false,
          injuryStatus: 'healthy',
          trending,
          positionRank: seasonStats?.position_rank // Use pre-calculated rank from season-stats API
        }
      })
      
      // Update gameInfo with position rank from API
      console.log('🏆 Using position ranks from season-stats API...')
      playersList.forEach(player => {
        if (player.positionRank) {
          const gamesCount = player.gameInfo.includes('|') ? player.gameInfo.split('|')[1].trim() : 'No games'
          player.gameInfo = `${player.position} #${player.positionRank} | ${gamesCount}`
        }
      })
      
      console.log('✅ All players loaded with real stats:', playersList.length);
      setAllPlayers(playersList)
      
      // Fetch trending data asynchronously
      console.log('📈 Fetching trending data...');
      fetchTrendingData(playersList)
      
      // Cache the results for instant loads on refresh
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          players: playersList,
          timestamp: Date.now()
        }))
        console.log('💾 Cached! Next load will be INSTANT ⚡')
      } catch (err) {
        console.log('⚠️ Cache save error (quota exceeded?)')
      }
    } catch (err) {
      console.error('❌ Error loading players:', err)
      setError('Failed to load players: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTrendingData(playersList: PlayerListItem[]) {
    try {
      console.log('🔍 Fetching trending cache for', playersList.length, 'players')
      const response = await fetch('/api/players/trending-cache?season=2025')
      const data = await response.json()
      
      console.log('📦 Trending API response:', { 
        success: data.success, 
        totalPlayers: data.totalPlayers,
        hasTrends: !!data.trends,
        trendCount: data.trends ? Object.keys(data.trends).length : 0
      })
      
      if (data.success && data.trends) {
        // Update players with cached trending data
        let playersWithTrending = 0
        const updatedPlayers = playersList.map(player => {
          const trendData = data.trends[player.id]
          if (trendData) {
            playersWithTrending++
            return {
              ...player,
              trending: {
                direction: trendData.direction,
                strength: trendData.strength
              }
            }
          }
          return player
        })
        
        console.log('✅ Trending data loaded from cache:', data.totalPlayers, 'players')
        console.log('   Players with trending data:', playersWithTrending)
        console.log('   Cache updated at:', data.cachedAt)
        setAllPlayers(updatedPlayers)
      } else {
        console.warn('⚠️ Trending API returned no data or failed')
      }
    } catch (err) {
      console.error('❌ Error fetching trending data:', err)
      // Don't fail the whole page if trending fails
    }
  }

  function applyFilters() {
    console.log('🔍 Applying filters:', { 
      activeTab,
      filterPosition: filters.position,
      totalPlayers: allPlayers.length,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    })
    
    // Handle trending tab separately
    if (activeTab === 'trending') {
      applyTrendingFilters()
      return
    }
    
    // Filter ALL players in memory (instant!)
    let filtered = [...allPlayers]
    
    // Position filter
    if (filters.position === 'skill') {
      // Filter to skill positions only - use FULL position names from database
      const skillPositions = ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End']
      filtered = filtered.filter(player => skillPositions.includes(player.position))
      console.log(`  ✓ Filtered to skill positions: ${filtered.length} players`)
    } else if (filters.position !== 'all') {
      // Filter to specific position
      filtered = filtered.filter(player => player.position === filters.position)
      console.log(`  ✓ Filtered to ${filters.position}: ${filtered.length} players`)
    }
    
    // Team filter
    if (filters.team !== 'all') {
      filtered = filtered.filter(player => player.team === filters.team)
    }
    
    // Search filter - NOW SEARCHES ALL PLAYERS!
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
    
    console.log(`  ✅ Filter complete: ${filtered.length} players (showing top ${Math.min(100, filtered.length)})`)
    
    setFilteredPlayers(filtered)
    // Reset display limit when filters change
    setDisplayLimit(100)
  }

  function applyTrendingFilters() {
    // Get players with trending data
    let trending = allPlayers.filter(p => p.trending && p.trending.strength !== 0)
    
    // Apply trending direction filter
    if (trendingFilter === 'up') {
      trending = trending.filter(p => p.trending?.direction === 'up')
    } else if (trendingFilter === 'down') {
      trending = trending.filter(p => p.trending?.direction === 'down')
    }
    
    // Sort by absolute trend strength (biggest movers first)
    trending.sort((a, b) => {
      const aStrength = Math.abs(a.trending?.strength || 0)
      const bStrength = Math.abs(b.trending?.strength || 0)
      return bStrength - aStrength
    })
    
    setFilteredPlayers(trending)
    setDisplayLimit(100)
  }

  function handlePlayerClick(playerId: string) {
    // Toggle: if clicking same player, close detail view
    if (selectedPlayerId === playerId) {
      // Remove player param from URL - this will trigger the useEffect to clear state
      router.push('/players')
    } else {
      // Add player param to URL - this will trigger the useEffect to update state
      router.push(`/players?player=${playerId}`)
    }
  }

  function handleAddToLineup(playerId: string) {
    router.push('/players')
    // TODO: Implement add to lineup functionality
    console.log('Add to lineup:', playerId)
  }

  function showMorePlayers() {
    // Just increase the display limit - data is already in memory!
    const newLimit = displayLimit + 100
    console.log(`Showing more players... (${displayLimit} → ${newLimit})`)
    setDisplayLimit(newLimit)
  }

  function resetFilters() {
    console.log('🔄 Resetting filters to defaults (Skill Positions, sorted by FPTS)')
    setFilters(DEFAULT_FILTERS)
    setDisplayLimit(100) // Reset display limit too
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
      injuryStatus: player.injuryStatus,
      trending: player.trending,
      positionRank: player.positionRank
    }))
  }

  return (
    <StandardLayout>

      {/* Main Content */}
      {/* Player Detail Section (Inline) - Full width when selected */}
      {selectedPlayerId ? (
        <div id="player-detail-section" className="w-full">
          <PlayerDetailInline
            playerId={selectedPlayerId}
            onClose={() => router.push('/players')}
            onAddToLineup={handleAddToLineup}
          />
        </div>
      ) : null}
      
      {/* Trending Tab Content */}
      {activeTab === 'trending' && !selectedPlayerId && (
        loading ? (
          <ContentContainer>
            <Card className="p-6">
              <div className="text-center py-4">
                <div className="text-lg font-semibold text-white mb-2">Loading Trending Players...</div>
                <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                  Analyzing performance trends
                </div>
              </div>
              {[...Array(10)].map((_, i) => (
                <LoadingSkeleton key={i} />
              ))}
            </Card>
          </ContentContainer>
        ) : displayedPlayers.length > 0 ? (
          <div className="flex-1 overflow-auto">
            <CollectionListView 
              items={transformToCollectionItems(displayedPlayers)}
              onItemClick={(playerId) => handlePlayerClick(playerId)}
              showActions={false}
              filterType="players"
            />
            
            {/* Show More Button */}
            {displayedPlayers.length < filteredPlayers.length && (
              <div className="p-6 border-t text-center" style={{borderColor: 'var(--color-steel)'}}>
                <div className="text-sm text-gray-400 mb-3">
                  Showing {displayedPlayers.length.toLocaleString()} of {filteredPlayers.length.toLocaleString()} trending players
                </div>
                <Button 
                  variant="primary" 
                  onClick={showMorePlayers}
                >
                  Show More (+100)
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ContentContainer>
            <Card className="p-6">
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-white mb-2">No Trending Data Yet</h3>
                <p style={{color: 'var(--color-text-secondary)'}} className="mb-4">
                  Players need at least 3 games to show trending data. Check back soon!
                </p>
                <Button 
                  variant="primary" 
                  onClick={() => setActiveTab('all-players')}
                >
                  View All Players
                </Button>
              </div>
            </Card>
          </ContentContainer>
        )
      )}

      {/* Players List - Shows when no player is selected and on All Players tab */}
      {activeTab === 'all-players' && !selectedPlayerId && (
        authLoading || !initialized ? (
          <ContentContainer>
            <Card className="p-6">
              <div className="text-center py-4">
                <div className="text-lg font-semibold text-white mb-2">Initializing...</div>
                <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                  Authenticating and preparing data
                </div>
              </div>
              {[...Array(5)].map((_, i) => (
                <LoadingSkeleton key={i} />
              ))}
            </Card>
          </ContentContainer>
        ) : loading ? (
          <ContentContainer>
            <Card className="p-6">
              <div className="text-center py-4">
                <div className="text-lg font-semibold text-white mb-2">Loading Players...</div>
                <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                  Fetching player data from the database
                </div>
              </div>
              {[...Array(10)].map((_, i) => (
                <LoadingSkeleton key={i} />
              ))}
            </Card>
          </ContentContainer>
        ) : error ? (
          <ContentContainer>
            <Card className="p-6">
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
            </Card>
          </ContentContainer>
        ) : displayedPlayers.length > 0 ? (
          <div className="flex-1 overflow-auto">
            <CollectionListView 
              items={transformToCollectionItems(displayedPlayers)}
              onItemClick={(playerId) => handlePlayerClick(playerId)}
              showActions={false}
              filterType="players"
            />
            
            {/* Show More Button */}
            {displayedPlayers.length < filteredPlayers.length && (
              <div className="p-6 border-t text-center" style={{borderColor: 'var(--color-steel)'}}>
                <div className="text-sm text-gray-400 mb-3">
                  Showing {displayedPlayers.length.toLocaleString()} of {filteredPlayers.length.toLocaleString()} 
                  {filters.searchTerm || filters.position !== 'all' || filters.team !== 'all' ? ' filtered' : ''} players
                </div>
                <Button 
                  variant="primary" 
                  onClick={showMorePlayers}
                >
                  Show More (+100)
                </Button>
              </div>
            )}
          </div>
        ) : allPlayers.length === 0 ? (
          <ContentContainer>
            <Card className="p-6">
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
            </Card>
          </ContentContainer>
        ) : !loading && filteredPlayers.length === 0 ? (
          <ContentContainer>
            <Card className="p-6">
              <div className="text-center py-8">
                <div className="text-lg font-bold text-white mb-2">No players found</div>
                <p className="text-sm text-gray-400 mb-4">
                  {filters.searchTerm 
                    ? `No players matching "${filters.searchTerm}" in all ${allPlayers.length.toLocaleString()} players`
                    : `No players match your current filters (${filters.position === 'skill' ? 'Skill Positions' : filters.position})`}
                </p>
                <Button variant="primary" onClick={resetFilters}>
                  Reset to Defaults
                </Button>
              </div>
            </Card>
          </ContentContainer>
        ) : null
      )}
    </StandardLayout>
  )
}

