'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from './Button'
import PlayerCard from './PlayerCard'
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

// Cache player data in sessionStorage for instant loads
const CACHE_KEY_PREFIX = 'player_modal_v4_'
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
          <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{color: 'var(--color-text-secondary)'}}>🎯 Passing Stats</h3>
          <div className="grid grid-cols-4 gap-2">
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
          <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{color: 'var(--color-text-secondary)'}}>🏃 Rushing & Receiving</h3>
          <div className="grid grid-cols-4 gap-2">
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
          <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{color: 'var(--color-text-secondary)'}}>🎯 Receiving Stats</h3>
          <div className="grid grid-cols-4 gap-2">
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
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="px-6 pb-6"
        >
          <div className="overflow-hidden shadow-lg" style={{ backgroundColor: 'var(--color-midnight)' }}>
            {loading ? (
              <div className="text-center py-12">
                <div className="text-2xl mb-4">⏳</div>
                <div className="text-lg font-bold text-white">Loading Player Data...</div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-2xl mb-4">❌</div>
                <div className="text-lg font-bold text-white mb-2">Error Loading Player</div>
                <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>{error}</div>
                <Button variant="ghost" onClick={onClose} className="mt-4">Close</Button>
              </div>
            ) : player ? (
              <>
                {/* Header Bar */}
                <div 
                  className="px-6 py-3 flex items-center justify-between bg-gradient-to-r"
                  style={{
                    backgroundImage: 'linear-gradient(to right, var(--color-gunmetal), var(--color-midnight))',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {/* Left: Close Button + Player Info */}
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={onClose}>
                      ✕ Close
                    </Button>
                    <div>
                      <h2 className="text-2xl font-black text-white">
                        {player.name}
                      </h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-base font-bold" style={{color: 'var(--color-text-secondary)'}}>
                          {player.position} • {player.team} {player.jersey_number ? `• #${player.jersey_number}` : ''}
                        </span>
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-bold"
                          style={{
                            backgroundColor: getInjuryStatusColor(player.injury_status),
                            color: 'white'
                          }}
                        >
                          {getInjuryStatusLabel(player.injury_status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Next Matchup */}
                  {player.nextMatchup && (
                    <div 
                      className="rounded-lg p-4 flex items-center gap-8 min-w-[400px]"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div className="flex-1">
                        <div className="text-xs mb-2 uppercase tracking-wide" style={{color: 'var(--color-text-secondary)'}}>🏈 Next Matchup</div>
                        <div className="text-xl font-black text-white mb-1">
                          {player.nextMatchup.is_home ? 'vs' : '@'} {player.nextMatchup.opponent}
                        </div>
                        <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                          {player.nextMatchup.date}
                        </div>
                      </div>
                      <div className="text-center pl-6" style={{borderLeft: '1px solid rgba(255, 255, 255, 0.1)'}}>
                        <div className="text-xs mb-1 uppercase tracking-wide" style={{color: 'var(--color-text-secondary)'}}>Projected</div>
                        <div className="text-3xl font-black" style={{color: 'var(--color-uncommon)'}}>
                          {player.nextMatchup.projected_points?.toFixed(1) || '0.0'}
                        </div>
                        <div className="text-xs uppercase tracking-wide" style={{color: 'var(--color-text-secondary)'}}>FPTS</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Content - 2 Row Layout */}
                <div 
                  className="p-6 space-y-6"
                  style={{
                    backgroundColor: 'var(--color-midnight)'
                  }}
                >
                  
                  {/* Top Row - 2 Column Layout */}
                  <div className="grid grid-cols-2 gap-6">
                    
                    {/* Left Column - Player Card Only */}
                    <div className="flex justify-center">
                      <div className="scale-90">
                        <PlayerCard
                          player={{
                            id: player.id,
                            name: player.name,
                            position: player.position,
                            team: player.team
                          }}
                          size="medium"
                          rarity="epic"
                          contractsRemaining={3}
                          currentSellValue={Math.floor((player.stats?.total_fantasy_points || 100) * 2)}
                          showActions={false}
                          interactive={false}
                        />
                      </div>
                    </div>

                    {/* Right Column - Fantasy Stats + Player Details Stacked */}
                    <div className="space-y-4">
                      {/* Fantasy Season Stats */}
                      {player.stats && (
                        <div>
                          <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{color: 'var(--color-text-secondary)'}}>⭐ Fantasy Season Stats</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <StatBox label="Total Points" value={player.stats.total_fantasy_points?.toFixed(1) || '0.0'} />
                            <StatBox label="Games" value={player.stats.games_played || 0} />
                            <StatBox label="Avg PPG" value={player.stats.avg_points_per_game?.toFixed(1) || '0.0'} />
                            <StatBox label="Best" value={player.stats.best_game?.toFixed(1) || '0.0'} />
                            <StatBox label="Worst" value={player.stats.worst_game?.toFixed(1) || '0.0'} />
                            <StatBox label="Consistency" value={`${player.stats.consistency_score || 0}%`} />
                          </div>
                        </div>
                      )}

                      {/* Player Details - Stacked Below */}
                      <div 
                        className="rounded-lg p-4"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <h4 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{color: 'var(--color-text-secondary)'}}>Player Details</h4>
                        <div className="space-y-2">
                          {player.height && (
                            <div className="flex justify-between">
                              <span className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Height</span>
                              <span className="text-sm font-bold text-white">{player.height}</span>
                            </div>
                          )}
                          {player.weight && (
                            <div className="flex justify-between">
                              <span className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Weight</span>
                              <span className="text-sm font-bold text-white">{player.weight} lbs</span>
                            </div>
                          )}
                          {player.age && (
                            <div className="flex justify-between">
                              <span className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Age</span>
                              <span className="text-sm font-bold text-white">{player.age}</span>
                            </div>
                          )}
                          {player.college && (
                            <div className="flex justify-between">
                              <span className="text-xs" style={{color: 'var(--color-text-secondary)'}}>College</span>
                              <span className="text-sm font-bold text-white">{player.college}</span>
                            </div>
                          )}
                          {player.years_pro && (
                            <div className="flex justify-between">
                              <span className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Experience</span>
                              <span className="text-sm font-bold text-white">{player.years_pro} {player.years_pro === 1 ? 'yr' : 'yrs'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row - Game Log (Full Width) */}
                  {gameLogEntries.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{color: 'var(--color-text-secondary)'}}>📊 Game Log (2025 Season)</h3>
                      <div className="max-h-96 overflow-y-auto">
                        <GameLog entries={gameLogEntries} position={player.position} compact={true} />
                      </div>
                    </div>
                  )}
                </div>
                  </>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )
    }

// Helper component for stat boxes
function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div 
      className="rounded-lg p-2 text-center transition-all duration-200 hover:bg-opacity-50"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <div className="text-xs mb-1 uppercase tracking-wide" style={{color: 'var(--color-text-secondary)'}}>
        {label}
      </div>
      <div className="text-base font-bold text-white">
        {value}
      </div>
    </div>
  )
}
