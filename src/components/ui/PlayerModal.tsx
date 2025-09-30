'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from './Button'
import PlayerCard from './PlayerCard'
import { GameLog } from './GameLog'
import type { GameLogEntry } from './GameLog'

export type PlayerModalData = {
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

export interface PlayerModalProps {
  isOpen: boolean
  onClose: () => void
  playerId: string | null
  onViewFullProfile?: (playerId: string) => void
  onAddToLineup?: (playerId: string) => void
}

// Cache player data in sessionStorage for instant loads
const CACHE_KEY_PREFIX = 'player_modal_v4_' // v4 = position-aware game log
const CACHE_EXPIRY = 5 * 60 * 1000 // 5 minutes

export function PlayerModal({
  isOpen,
  onClose,
  playerId,
  onViewFullProfile,
  onAddToLineup
}: PlayerModalProps) {
  const [player, setPlayer] = useState<PlayerModalData | null>(null)
  const [gameLogEntries, setGameLogEntries] = useState<GameLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && playerId) {
      loadPlayerData(playerId)
    } else if (!isOpen) {
      // Don't reset state immediately - keep it for smooth closing animation
      // It will be replaced when a new player is opened
    }
  }, [isOpen, playerId])

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
            return // Use cache!
          }
        } catch (err) {
          console.log('Cache parse error, fetching fresh')
        }
      }

      // Fetch from new optimized endpoint
      console.log(`📥 Loading player ${id}...`)
      const response = await fetch(`/api/players/${id}/quick-data`)
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load player')
      }

      const loadedPlayer: PlayerModalData = {
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

  // Close modal on escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Normalize position (handles "Quarterback" or "QB")
  function normalizePosition(position: string): string {
    const pos = position.toUpperCase();
    if (pos.includes('QUARTERBACK') || pos === 'QB') return 'QB';
    if (pos.includes('RUNNING') || pos === 'RB') return 'RB';
    if (pos.includes('WIDE') || pos.includes('RECEIVER') || pos === 'WR') return 'WR';
    if (pos.includes('TIGHT') || pos === 'TE') return 'TE';
    return position;
  }

  // Render position-specific stats
  function renderPositionStats() {
    if (!player?.stats?.position_stats) return null

    const stats = player.stats.position_stats
    const normalizedPos = normalizePosition(player.position)

    if (normalizedPos === 'QB') {
      return (
        <div>
          <h3 className="text-xl font-bold text-white mb-4">🎯 Passing Stats</h3>
          <div className="grid grid-cols-4 gap-3">
            <StatBox label="Pass Yds" value={stats.passing_yards || 0} />
            <StatBox label="Pass TDs" value={stats.passing_tds || 0} />
            <StatBox label="INTs" value={stats.passing_ints || 0} />
            <StatBox label="Comp %" value={`${stats.completion_pct || 0}%`} />
            <StatBox label="Completions" value={stats.completions || 0} />
            <StatBox label="Attempts" value={stats.attempts || 0} />
            <StatBox label="YPA" value={stats.yards_per_attempt || 0} />
            <StatBox label="QB Rating" value={stats.qb_rating?.toFixed(1) || '0.0'} />
          </div>
        </div>
      )
    }

    if (normalizedPos === 'RB') {
      return (
        <div>
          <h3 className="text-xl font-bold text-white mb-4">🏃 Rushing & Receiving Stats</h3>
          <div className="grid grid-cols-4 gap-3">
            <StatBox label="Rush Yds" value={stats.rushing_yards || 0} />
            <StatBox label="Rush TDs" value={stats.rushing_tds || 0} />
            <StatBox label="Carries" value={stats.rushing_attempts || 0} />
            <StatBox label="YPC" value={stats.yards_per_carry?.toFixed(1) || '0.0'} />
            <StatBox label="Receptions" value={stats.receptions || 0} />
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
          <h3 className="text-xl font-bold text-white mb-4">🎯 Receiving Stats</h3>
          <div className="grid grid-cols-4 gap-3">
            <StatBox label="Receptions" value={stats.receptions || 0} />
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
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-xl"
              style={{
                backgroundColor: 'var(--color-midnight)',
                border: '2px solid var(--color-steel)'
              }}
            >
              {loading ? (
                <div className="p-8 text-center">
                  <div className="text-2xl mb-4">⏳</div>
                  <div className="text-lg font-bold text-white">Loading Player Data...</div>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <div className="text-2xl mb-4">❌</div>
                  <div className="text-lg font-bold text-white mb-2">Error Loading Player</div>
                  <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>{error}</div>
                  <Button variant="ghost" onClick={onClose} className="mt-4">Close</Button>
                </div>
              ) : player ? (
                <>
                  {/* Header with Close Button */}
                  <div className="absolute top-4 right-4 z-10">
                    <Button variant="ghost" size="sm" onClick={onClose}>
                      ✕
                    </Button>
                  </div>

                  {/* Main Content */}
                  <div className="p-8">
                    
                    {/* Top Section - Side by Side Layout */}
                    <div className="flex gap-8 mb-8">
                      
                      {/* Left Side - Large Player Card */}
                      <div className="flex-shrink-0">
                        <PlayerCard
                          player={{
                            id: player.id,
                            name: player.name,
                            position: player.position,
                            team: player.team
                          }}
                          size="large"
                          rarity="epic"
                          stats={{
                            points: player.stats?.total_fantasy_points,
                            games: player.stats?.games_played,
                            avgPoints: player.stats?.avg_points_per_game
                          }}
                          contractsRemaining={3}
                          currentSellValue={Math.floor((player.stats?.total_fantasy_points || 100) * 2)}
                          showActions={false}
                          interactive={false}
                        />
                      </div>

                      {/* Right Side - Player Info */}
                      <div className="flex-1 space-y-6">
                        
                        {/* Player Header Info */}
                        <div>
                          <h2 className="text-3xl font-black text-white mb-2">
                            {player.name}
                          </h2>
                          <div className="flex items-center gap-4 mb-3">
                            <span className="text-xl font-bold" style={{color: 'var(--color-text-secondary)'}}>
                              {player.position} • {player.team} {player.jersey_number ? `• #${player.jersey_number}` : ''}
                            </span>
                            <span 
                              className="px-3 py-1 rounded-full text-sm font-bold"
                              style={{
                                backgroundColor: getInjuryStatusColor(player.injury_status),
                                color: 'white'
                              }}
                            >
                              {getInjuryStatusLabel(player.injury_status)}
                            </span>
                          </div>
                          <div className="text-base" style={{color: 'var(--color-text-secondary)'}}>
                            {[
                              player.height,
                              player.weight,
                              player.age ? `${player.age} years old` : null,
                              player.college,
                              player.years_pro ? `${player.years_pro} years pro` : null
                            ].filter(Boolean).join(' • ') || 'No additional data available'}
                          </div>
                        </div>

                        {/* Fantasy Stats Grid */}
                        <div>
                          <h3 className="text-xl font-bold text-white mb-4">📊 Season Fantasy Stats</h3>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 rounded-lg" style={{backgroundColor: 'var(--color-slate)'}}>
                              <div className="text-2xl font-black text-white">
                                {player.stats?.avg_points_per_game?.toFixed(1) || '0.0'}
                              </div>
                              <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                                Avg Points/Game
                              </div>
                            </div>
                            <div className="text-center p-4 rounded-lg" style={{backgroundColor: 'var(--color-slate)'}}>
                              <div className="text-2xl font-black text-white">
                                {player.stats?.total_fantasy_points || 0}
                              </div>
                              <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                                Total Points
                              </div>
                            </div>
                            <div className="text-center p-4 rounded-lg" style={{backgroundColor: 'var(--color-slate)'}}>
                              <div className="text-2xl font-black text-white">
                                {player.stats?.best_game || 0}
                              </div>
                              <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                                Best Game
                              </div>
                            </div>
                            <div className="text-center p-4 rounded-lg" style={{backgroundColor: 'var(--color-slate)'}}>
                              <div className="text-2xl font-black text-white">
                                {player.stats?.consistency_score || 0}%
                              </div>
                              <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                                Consistency
                              </div>
                            </div>
                            <div className="text-center p-4 rounded-lg" style={{backgroundColor: 'var(--color-slate)'}}>
                              <div className="text-2xl font-black text-white">
                                {player.stats?.last_5_games_avg?.toFixed(1) || '0.0'}
                              </div>
                              <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                                Last 5 Games
                              </div>
                            </div>
                            <div className="text-center p-4 rounded-lg" style={{backgroundColor: 'var(--color-slate)'}}>
                              <div className="text-2xl font-black text-white">
                                {player.stats?.games_played || 0}
                              </div>
                              <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                                Games Played
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Next Matchup */}
                        {player.nextMatchup && (
                          <div>
                            <h3 className="text-xl font-bold text-white mb-4">🏈 Next Game</h3>
                            <div 
                              className="p-5 rounded-lg border"
                              style={{
                                backgroundColor: 'var(--color-slate)',
                                borderColor: 'var(--color-steel)'
                              }}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <div className="text-xl font-bold text-white">
                                    {player.nextMatchup.is_home ? 'vs' : '@'} {player.nextMatchup.opponent}
                                  </div>
                                  <div className="text-base" style={{color: 'var(--color-text-secondary)'}}>
                                    {player.nextMatchup.date} • {player.nextMatchup.time}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-bold text-white">
                                    {player.nextMatchup.projected_points.toFixed(1)}
                                  </div>
                                  <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                                    Projected
                                  </div>
                                </div>
                              </div>
                              <div className="text-base" style={{color: 'var(--color-text-secondary)'}}>
                                Opponent ranks #{player.nextMatchup.opponent_rank_vs_position} vs {player.position}s
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-6 border-t" style={{borderColor: 'var(--color-steel)'}}>
                          <Button 
                            variant="primary" 
                            onClick={() => onViewFullProfile?.(player.id)}
                            className="flex-1"
                          >
                            View Full Profile
                          </Button>
                          <Button 
                            variant="success" 
                            onClick={() => onAddToLineup?.(player.id)}
                            className="flex-1"
                          >
                            Add to Lineup
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Position-Specific Stats */}
                    {renderPositionStats()}

                    {/* Bottom Section - Full Season Game Log */}
                    {gameLogEntries.length > 0 && (
                      <div className="border-t pt-6 mt-6" style={{borderColor: 'var(--color-steel)'}}>
                        <h3 className="text-xl font-bold text-white mb-4">📈 Full Season Game Log</h3>
                        <div className="max-h-80 overflow-y-auto">
                          <GameLog entries={gameLogEntries} position={player.position} compact={false} />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Helper component for stat boxes
function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-3 rounded-lg" style={{backgroundColor: 'var(--color-slate)'}}>
      <div className="text-lg font-black text-white">
        {value}
      </div>
      <div className="text-xs" style={{color: 'var(--color-text-secondary)'}}>
        {label}
      </div>
    </div>
  )
}