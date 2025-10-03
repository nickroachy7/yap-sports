'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameLog } from './GameLog'
import type { GameLogEntry } from './GameLog'

export type PlayerDetailData = {
  id: string
  name: string
  position: string
  team: string
  jersey_number?: string | null
  height?: string | null
  weight?: string | null
  age?: number | null
  college?: string | null
  years_pro?: number | null
  injury_status?: 'healthy' | 'questionable' | 'doubtful' | 'out'
  position_rank?: number | null
  projected_points?: number | null
  trending?: {
    direction: 'up' | 'down' | 'stable'
    strength: number
    display: string
  } | null
  stats?: {
    total_fantasy_points: number
    games_played: number
    avg_points_per_game: number
    best_game: number
    worst_game: number
    consistency_score: number
    last_5_games_avg: number
    position_stats?: any
  }
  nextMatchup?: {
    opponent: string
    date: string
    time: string
    is_home: boolean
    opponent_rank_vs_position: number
    projected_points: number
  }
}

export interface PlayerDetailInlineProps {
  playerId: string | null
  onClose: () => void
  onViewFullProfile?: (playerId: string) => void
  onAddToLineup?: (playerId: string) => void
}

// Helper functions for team and position styling
const getTeamColor = (team: string) => {
  switch (team) {
    // AFC East
    case 'BUF': return '#00338D'
    case 'MIA': return '#008E97'
    case 'NE': return '#002244'
    case 'NYJ': return '#125740'
    // AFC North  
    case 'BAL': return '#241773'
    case 'CIN': return '#FB4F14'
    case 'CLE': return '#311D00'
    case 'PIT': return '#FFB612'
    // AFC South
    case 'HOU': return '#03202F'
    case 'IND': return '#002C5F'
    case 'JAX': return '#006778'
    case 'TEN': return '#0C2340'
    // AFC West
    case 'DEN': return '#FB4F14'
    case 'KC': return '#E31837'
    case 'LV': return '#000000'
    case 'LAC': return '#0080C6'
    // NFC East
    case 'DAL': return '#003594'
    case 'NYG': return '#0B2265'
    case 'PHI': return '#004C54'
    case 'WSH': return '#773141'
    // NFC North
    case 'CHI': return '#0B162A'
    case 'DET': return '#0076B6'
    case 'GB': return '#203731'
    case 'MIN': return '#4F2683'
    // NFC South
    case 'ATL': return '#A71930'
    case 'CAR': return '#0085CA'
    case 'NO': return '#D3BC8D'
    case 'TB': return '#D50A0A'
    // NFC West
    case 'ARI': return '#97233F'
    case 'LAR': return '#003594'
    case 'SF': return '#AA0000'
    case 'SEA': return '#002244'
    default: return '#6B7280'
  }
}

const getPositionColor = (position: string) => {
  switch (position) {
    case 'QB': return '#DC2626' // Red for QB
    case 'RB': return '#16A34A' // Green for RB  
    case 'WR': return '#CA8A04' // Yellow/Gold for WR
    case 'TE': return '#7C3AED' // Purple for TE
    case 'K': return '#6B7280' // Gray for K
    case 'DEF': return '#374151' // Dark gray for DEF
    default: return '#6B7280' // Default gray
  }
}

const getPositionAbbreviation = (position: string) => {
  const normalized = position.toUpperCase()
  if (normalized.includes('QUARTERBACK') || normalized === 'QB') return 'QB'
  if (normalized.includes('RUNNING') || normalized === 'RB') return 'RB'
  if (normalized.includes('WIDE') || normalized === 'WR') return 'WR'
  if (normalized.includes('TIGHT') || normalized === 'TE') return 'TE'
  if (normalized.includes('KICKER') || normalized === 'K') return 'K'
  if (normalized.includes('DEFENSE') || normalized === 'DEF') return 'DEF'
  return position.substring(0, 3).toUpperCase()
}

// Cache player data in sessionStorage for instant loads
const CACHE_KEY_PREFIX = 'player_detail_v19_' // v19 = removed season summary, updated game log header
const CACHE_EXPIRY = 5 * 60 * 1000 // 5 minutes

export function PlayerDetailInline({
  playerId,
  onClose,
  onViewFullProfile,
  onAddToLineup
}: PlayerDetailInlineProps) {
  const [player, setPlayer] = useState<PlayerDetailData | null>(null)
  const [gameLogEntries, setGameLogEntries] = useState<GameLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (playerId) {
      loadPlayerData(playerId)
    }
  }, [playerId])

  async function loadPlayerData(id: string) {
    try {
      setLoading(true)
      setError(null)

      // Check cache first
      const cacheKey = CACHE_KEY_PREFIX + id
      const cached = sessionStorage.getItem(cacheKey)
      
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          const age = Date.now() - cachedData.timestamp
          
          if (age < CACHE_EXPIRY) {
            console.log(`⚡ Loaded ${cachedData.player.name} from cache (INSTANT!)`)
            setPlayer(cachedData.player)
            setGameLogEntries(cachedData.gameLog || [])
            setLoading(false)
            return
          }
        } catch (err) {
          console.log('Cache parse error, fetching fresh')
        }
      }

      // Fetch from optimized endpoint
      console.log(`📥 Loading player ${id}...`)
      const response = await fetch(`/api/players/${id}/quick-data`)
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load player')
      }

      const loadedPlayer: PlayerDetailData = {
        id: data.player.id,
        name: data.player.name,
        position: data.player.position,
        team: data.player.team,
        jersey_number: data.player.jersey_number,
        height: data.player.height,
        weight: data.player.weight,
        age: data.player.age,
        college: data.player.college,
        years_pro: data.player.years_pro,
        injury_status: 'healthy',
        position_rank: data.player.position_rank,
        projected_points: data.player.projected_points,
        trending: data.player.trending,
        stats: data.player.stats,
        nextMatchup: data.player.nextMatchup
      }

      setPlayer(loadedPlayer)
      setGameLogEntries(data.gameLog || [])

      // Cache the results
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          player: loadedPlayer,
          gameLog: data.gameLog || [],
          timestamp: Date.now()
        }))
        console.log(`💾 Cached ${loadedPlayer.name} for instant reloads`)
      } catch (err) {
        console.log('⚠️ Cache save failed (quota exceeded?)')
      }

    } catch (err: any) {
      console.error('Error loading player data:', err)
      setError(err.message || 'Failed to load player data')
    } finally {
      setLoading(false)
    }
  }

  function getInjuryStatusColor(status?: string) {
    switch (status) {
      case 'healthy': return 'var(--color-uncommon)'
      case 'questionable': return 'var(--color-amber)'
      case 'doubtful': return 'var(--color-crimson)'
      case 'out': return 'var(--color-rare)'
      default: return 'var(--color-uncommon)'
    }
  }

  function getInjuryStatusLabel(status?: string) {
    return status?.toUpperCase() || 'HEALTHY'
  }

  function normalizePosition(position: string): string {
    const pos = position.toUpperCase();
    if (pos.includes('QUARTERBACK') || pos === 'QB') return 'QB';
    if (pos.includes('RUNNING') || pos === 'RB') return 'RB';
    if (pos.includes('WIDE') || pos.includes('RECEIVER') || pos === 'WR') return 'WR';
    if (pos.includes('TIGHT') || pos === 'TE') return 'TE';
    return position;
  }

  function renderPositionStats() {
    if (!player?.stats?.position_stats) return null

    const stats = player.stats.position_stats
    const normalizedPos = normalizePosition(player.position)

    if (normalizedPos === 'QB') {
      return (
        <div>
          <h3 className="text-xs font-bold mb-4 uppercase tracking-wide" style={{ color: 'var(--color-lime)' }}>
            🎯 Passing Stats
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <StatBox label="Pass Yds" value={stats.passing_yards || 0} />
            <StatBox label="Pass TDs" value={stats.passing_tds || 0} />
            <StatBox label="INTs" value={stats.passing_ints || 0} />
            <StatBox label="Comp %" value={`${stats.completion_pct || 0}%`} />
            <StatBox label="Comp" value={stats.completions || 0} />
            <StatBox label="Att" value={stats.attempts || 0} />
            <StatBox label="YPA" value={stats.yards_per_attempt || 0} />
            <StatBox label="Rating" value={stats.qb_rating?.toFixed(1) || '0.0'} />
          </div>
        </div>
      )
    }

    if (normalizedPos === 'RB') {
      return (
        <div>
          <h3 className="text-xs font-bold mb-4 uppercase tracking-wide" style={{ color: 'var(--color-lime)' }}>
            🏃 Rushing & Receiving
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <StatBox label="Rush Yds" value={stats.rushing_yards || 0} />
            <StatBox label="Rush TDs" value={stats.rushing_tds || 0} />
            <StatBox label="Carries" value={stats.rushing_attempts || 0} />
            <StatBox label="YPC" value={stats.yards_per_carry?.toFixed(1) || '0.0'} />
            <StatBox label="Rec" value={stats.receptions || 0} />
            <StatBox label="Rec Yds" value={stats.receiving_yards || 0} />
            <StatBox label="Rec TDs" value={stats.receiving_tds || 0} />
            <StatBox label="Targets" value={stats.targets || 0} />
          </div>
        </div>
      )
    }

    if (normalizedPos === 'WR' || normalizedPos === 'TE') {
      return (
        <div>
          <h3 className="text-xs font-bold mb-4 uppercase tracking-wide" style={{ color: 'var(--color-lime)' }}>
            🎯 Receiving Stats
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <StatBox label="Rec" value={stats.receptions || 0} />
            <StatBox label="Rec Yds" value={stats.receiving_yards || 0} />
            <StatBox label="Rec TDs" value={stats.receiving_tds || 0} />
            <StatBox label="Targets" value={stats.targets || 0} />
            <StatBox label="YPR" value={stats.yards_per_reception?.toFixed(1) || '0.0'} />
            <StatBox label="Catch %" value={`${stats.catch_pct || 0}%`} />
            <StatBox label="Long" value={stats.longest_reception || 0} />
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <AnimatePresence>
      {playerId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full mb-6"
        >
                  <div 
                    className="overflow-hidden border-b"
                    style={{ 
                      backgroundColor: 'var(--color-midnight)',
                      borderColor: 'var(--color-steel)'
                    }}
                  >
            {loading ? (
              <div className="text-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="text-3xl mb-3 inline-block"
                >
                  ⏳
                </motion.div>
                <div className="text-base font-semibold text-white">Loading Player Data...</div>
              </div>
            ) : error ? (
              <div className="text-center py-12 px-6">
                <div className="text-4xl mb-3">❌</div>
                <div className="text-lg font-bold text-white mb-2">Error Loading Player</div>
                <div className="text-sm mb-4" style={{color: 'var(--color-text-secondary)'}}>{error}</div>
                <Button variant="primary" onClick={onClose}>
                  Back to Players
                </Button>
              </div>
            ) : player ? (
              <div>
                <div className="space-y-0">
                  
                  {/* Top Row: Profile Photo + Player Info */}
                  <div className="flex gap-6 px-6 py-6">
                    
                    {/* Left: Profile Photo Placeholder */}
                    <div className="flex-shrink-0">
                      <div 
                        className="w-40 h-40 flex items-center justify-center rounded-lg border"
                        style={{
                          backgroundColor: 'var(--color-obsidian)',
                          borderColor: 'var(--color-steel)'
                        }}
                      >
                        <div className="text-center">
                          <div 
                            className="text-5xl font-black mb-1"
                            style={{ color: 'var(--color-text-tertiary)' }}
                          >
                            {player.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div 
                            className="text-[10px] uppercase tracking-wider font-semibold"
                            style={{ color: 'var(--color-text-tertiary)' }}
                          >
                            {player.name}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Player Info & Details */}
                    <div className="flex-1 flex flex-col justify-center">
                      {/* Player Name & Basic Info */}
                      <div className="mb-4">
                        <h2 className="text-3xl font-black mb-3" style={{ color: 'var(--color-text-primary)' }}>{player.name}</h2>
                        <div className="flex items-center gap-1 text-sm">
                          <span 
                            className="px-2 py-0.5 rounded text-xs font-bold text-white"
                            style={{backgroundColor: getTeamColor(player.team)}}
                          >
                            {player.team}
                          </span>
                          <span 
                            className="px-2 py-0.5 rounded text-xs font-bold text-white"
                            style={{backgroundColor: getPositionColor(getPositionAbbreviation(player.position))}}
                          >
                            {getPositionAbbreviation(player.position)}
                          </span>
                          {player.jersey_number && (
                            <>
                              <span className="mx-1" style={{ color: 'var(--color-text-tertiary)' }}>•</span>
                              <span style={{ color: 'var(--color-text-secondary)' }}>#{player.jersey_number}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Player Details Grid - More compact */}
                      <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
                        {player.height && player.weight && (
                          <div>
                            <div className="text-[10px] uppercase mb-0.5 font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>HT/WT</div>
                            <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{player.height}, {player.weight}</div>
                          </div>
                        )}
                        {player.age && (
                          <div>
                            <div className="text-[10px] uppercase mb-0.5 font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>Age</div>
                            <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{player.age}</div>
                          </div>
                        )}
                        {player.college && (
                          <div>
                            <div className="text-[10px] uppercase mb-0.5 font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>College</div>
                            <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{player.college}</div>
                          </div>
                        )}
                        {player.years_pro !== null && player.years_pro !== undefined && (
                          <div>
                            <div className="text-[10px] uppercase mb-0.5 font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>Experience</div>
                            <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                              {player.years_pro === 0 ? 'Rookie' : `${player.years_pro} Seasons`}
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="text-[10px] uppercase mb-0.5 font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>Status</div>
                          <div>
                            <span 
                              className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                              style={{
                                backgroundColor: getInjuryStatusColor(player.injury_status),
                                color: 'white'
                              }}
                            >
                              {getInjuryStatusLabel(player.injury_status)}
                            </span>
                          </div>
                        </div>
                        {player.nextMatchup && (
                          <div>
                            <div className="text-[10px] uppercase mb-0.5 font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>Next Game</div>
                            <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                              {player.nextMatchup.is_home ? 'vs' : '@'} {player.nextMatchup.opponent}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                  
                  {/* Season Stats - Full Width */}
                  {player.stats && (
                    <div 
                      className="px-6 py-5 border-t border-b"
                      style={{
                        backgroundColor: 'transparent',
                        borderColor: 'rgba(255,255,255,0.05)'
                      }}
                    >
                      {/* Column Headers */}
                      <div className="grid grid-cols-7 gap-3 mb-4">
                        <div className="text-center">
                          <div className="text-xs uppercase font-semibold" style={{ color: '#8b8b8b' }}>TREND</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs uppercase font-semibold" style={{ color: '#8b8b8b' }}>PRK</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs uppercase font-semibold" style={{ color: '#8b8b8b' }}>PROJ</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs uppercase font-semibold" style={{ color: '#8b8b8b' }}>AVG</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs uppercase font-semibold" style={{ color: '#8b8b8b' }}>BEST</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs uppercase font-semibold" style={{ color: '#8b8b8b' }}>LST</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs uppercase font-semibold" style={{ color: '#8b8b8b' }}>FPTS</div>
                        </div>
                      </div>
                      
                      {/* Stat Values */}
                      <div className="grid grid-cols-7 gap-3">
                        {/* TREND */}
                        <div className="flex items-center justify-center">
                          {player.trending && player.trending.direction !== 'stable' ? (
                            <div 
                              className="px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5"
                              style={{
                                backgroundColor: player.trending.direction === 'up' 
                                  ? 'rgba(22, 163, 74, 0.2)'
                                  : 'rgba(220, 38, 38, 0.2)',
                                color: player.trending.direction === 'up' ? '#22c55e' : '#dc2626',
                                border: `1.5px solid ${player.trending.direction === 'up' ? 'rgba(22, 163, 74, 0.4)' : 'rgba(220, 38, 38, 0.4)'}`
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                {player.trending.direction === 'up' ? (
                                  <path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                ) : (
                                  <path d="M7 7L17 17M17 17H9M17 17V9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                )}
                              </svg>
                              <span>{player.trending.strength > 0 ? '+' : ''}{player.trending.strength}%</span>
                            </div>
                          ) : (
                            <span className="text-xl font-black text-gray-600">--</span>
                          )}
                        </div>
                        
                        {/* PRK */}
                        <div className="text-center">
                          <div className="text-2xl font-black text-white">
                            {player.position_rank ? `#${player.position_rank}` : '--'}
                          </div>
                        </div>
                        
                        {/* PROJ */}
                        <div className="text-center">
                          <div className="text-2xl font-black text-white">
                            {player.projected_points?.toFixed(1) || player.nextMatchup?.projected_points?.toFixed(1) || '--'}
                          </div>
                        </div>
                        
                        {/* AVG */}
                        <div className="text-center">
                          <div className="text-2xl font-black text-white">
                            {player.stats.avg_points_per_game?.toFixed(1) || '0.0'}
                          </div>
                        </div>
                        
                        {/* BEST */}
                        <div className="text-center">
                          <div className="text-2xl font-black text-white">
                            {player.stats.best_game?.toFixed(1) || '0.0'}
                          </div>
                        </div>
                        
                        {/* LST */}
                        <div className="text-center">
                          <div className="text-2xl font-black text-white">
                            {player.stats.last_5_games_avg?.toFixed(1) || '0.0'}
                          </div>
                        </div>
                        
                        {/* FPTS */}
                        <div className="text-center">
                          <div className="text-2xl font-black text-white">
                            {player.stats.total_fantasy_points?.toFixed(1) || '0.0'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Game Log Section - Full Width */}
                  {gameLogEntries.length > 0 && (
                    <div 
                      className="border-t"
                      style={{ 
                        borderColor: 'rgba(255,255,255,0.05)'
                      }}
                    >
                      <div className="px-6 py-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2" style={{ color: '#8b8b8b' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                            <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2"/>
                            <line x1="8" y1="4" x2="8" y2="22" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          2025 Game Log
                        </h3>
                      </div>
                      <GameLog entries={gameLogEntries} position={player.position} />
                    </div>
                  )}

                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Helper component for stat boxes
function StatBox({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div 
      className="p-3 text-center border"
      style={{
        backgroundColor: 'var(--color-slate)',
        borderColor: highlight ? 'var(--color-lime)' : 'var(--color-steel)'
      }}
    >
      <div className="text-xs uppercase mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
        {label}
      </div>
      <div className="text-xl font-black" style={{ color: highlight ? 'var(--color-lime)' : 'var(--color-text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

