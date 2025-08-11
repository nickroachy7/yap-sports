'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import Button from './Button'
import Card from './Card'
import PlayerCard from './PlayerCard'
import { GameLog } from './GameLog'
import { cn } from '@/lib/utils'
import type { GameLogEntry } from './GameLog'

export type PlayerModalData = {
  id: string
  name: string
  position: string
  team: string
  jersey_number?: string
  height?: string
  weight?: string
  age?: number
  college?: string
  years_pro?: number
  injury_status?: 'healthy' | 'questionable' | 'doubtful' | 'out'
  stats?: {
    total_fantasy_points: number
    games_played: number
    avg_points_per_game: number
    best_game: number
    worst_game: number
    consistency_score: number
    last_5_games_avg: number
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

export function PlayerModal({
  isOpen,
  onClose,
  playerId,
  onViewFullProfile,
  onAddToLineup
}: PlayerModalProps) {
  const supabase = createSupabaseBrowserClient()
  const [player, setPlayer] = useState<PlayerModalData | null>(null)
  const [gameLogEntries, setGameLogEntries] = useState<GameLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && playerId) {
      loadPlayerData(playerId)
    } else if (!isOpen) {
      // Reset state when modal closes
      setPlayer(null)
      setGameLogEntries([])
      setError(null)
    }
  }, [isOpen, playerId])

  async function loadPlayerData(id: string) {
    try {
      setLoading(true)
      setError(null)

      // Auto-enhance player data (fast database lookup + background API enhancement)
      try {
        const enhanceResponse = await fetch(`/api/players/${id}/auto-enhance`)
        const enhanceData = await enhanceResponse.json()
        
        if (enhanceData.success && enhanceData.player) {
          console.log(`Loaded player data for ${enhanceData.player.name} (source: ${enhanceData.player.data_source})`)
          
          const enhancedPlayer: PlayerModalData = {
            id: enhanceData.player.id,
            name: enhanceData.player.name,
            position: enhanceData.player.position,
            team: enhanceData.player.team,
            jersey_number: enhanceData.player.jersey_number,
            height: enhanceData.player.height,
            weight: enhanceData.player.weight,
            age: enhanceData.player.age,
            college: enhanceData.player.college,
            years_pro: enhanceData.player.years_pro,
            injury_status: 'healthy',
            
            // Basic stats (could be calculated from game logs)
            stats: {
              total_fantasy_points: Math.floor(Math.random() * 300) + 150,
              games_played: Math.floor(Math.random() * 5) + 10,
              avg_points_per_game: Math.floor(Math.random() * 10) + 15,
              best_game: Math.floor(Math.random() * 15) + 25,
              worst_game: Math.floor(Math.random() * 8) + 5,
              consistency_score: Math.floor(Math.random() * 30) + 70,
              last_5_games_avg: Math.floor(Math.random() * 8) + 12
            },
            
            // Simple next matchup (could be enhanced)
            nextMatchup: {
              opponent: ['MIA', 'NE', 'NYJ', 'PIT', 'CLE', 'CIN'][Math.floor(Math.random() * 6)],
              date: '2025-09-15',
              time: '1:00 PM',
              is_home: Math.random() > 0.5,
              opponent_rank_vs_position: Math.floor(Math.random() * 20) + 10,
              projected_points: Math.floor(Math.random() * 10) + 15
            }
          }
          
          setPlayer(enhancedPlayer)
        } else {
          throw new Error(enhanceData.error || 'Failed to load player data')
        }
      } catch (enhanceError) {
        console.error('Error auto-enhancing player:', enhanceError)
        
        // Fallback to basic database query
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('id', id)
          .single()

        if (playerError) throw playerError
        if (!playerData) throw new Error('Player not found')

        const basicPlayer: PlayerModalData = {
          id: playerData.id,
          name: `${playerData.first_name} ${playerData.last_name}`,
          position: playerData.position,
          team: playerData.team,
          jersey_number: 'N/A',
          height: 'N/A',
          weight: 'N/A',
          age: undefined,
          college: 'N/A',
          years_pro: undefined,
          injury_status: 'healthy',
          stats: {
            total_fantasy_points: 0,
            games_played: 0,
            avg_points_per_game: 0,
            best_game: 0,
            worst_game: 0,
            consistency_score: 0,
            last_5_games_avg: 0
          }
        }
        setPlayer(basicPlayer)
      }

      // Load real game log data from our API
      try {
        const gameLogResponse = await fetch(`/api/players/${id}/game-log`)
        const gameLogData = await gameLogResponse.json()
        
        if (gameLogData.success && gameLogData.gameLogEntries) {
          console.log(`Loaded ${gameLogData.gameLogEntries.length} real game log entries for ${gameLogData.playerName}`)
          setGameLogEntries(gameLogData.gameLogEntries)
        } else {
          console.warn('Failed to load game log:', gameLogData.error)
          setGameLogEntries([]) // Empty array if no real data
        }
      } catch (gameLogError) {
        console.error('Error fetching game log:', gameLogError)
        setGameLogEntries([]) // Empty array on error
      }

    } catch (err: unknown) {
      console.error('Error loading player data:', err)
      setError(err.message || 'Failed to load player data')
    } finally {
      setLoading(false)
    }
  }

  function generateRandomHeight(position: string): string {
    const heights = {
      QB: ['6\'2"', '6\'3"', '6\'4"', '6\'5"', '6\'6"'],
      RB: ['5\'8"', '5\'9"', '5\'10"', '5\'11"', '6\'0"'],
      WR: ['5\'10"', '5\'11"', '6\'0"', '6\'1"', '6\'2"', '6\'3"'],
      TE: ['6\'3"', '6\'4"', '6\'5"', '6\'6"', '6\'7"']
    }
    const positionHeights = heights[position as keyof typeof heights] || heights.WR
    return positionHeights[Math.floor(Math.random() * positionHeights.length)]
  }

  function generateRandomWeight(position: string): string {
    const weights = {
      QB: ['215', '220', '225', '230', '235', '240'],
      RB: ['190', '195', '200', '205', '210', '215'],
      WR: ['180', '185', '190', '195', '200', '205'],
      TE: ['240', '245', '250', '255', '260', '265']
    }
    const positionWeights = weights[position as keyof typeof weights] || weights.WR
    return positionWeights[Math.floor(Math.random() * positionWeights.length)] + ' lbs'
  }

  function getRandomCollege(): string {
    const colleges = [
      'Alabama', 'Clemson', 'Ohio State', 'Georgia', 'LSU', 'Oklahoma', 'Texas',
      'Michigan', 'Penn State', 'Florida', 'Notre Dame', 'USC', 'Oregon', 'Wisconsin'
    ]
    return colleges[Math.floor(Math.random() * colleges.length)]
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
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
                          rarity="epic" // Could be dynamic based on player tier
                          stats={{
                            points: player.stats?.total_fantasy_points,
                            games: player.stats?.games_played,
                            avgPoints: player.stats?.avg_points_per_game
                          }}
                          contractsRemaining={Math.floor(Math.random() * 5) + 1} // Mock data
                          currentSellValue={Math.floor(Math.random() * 500) + 100} // Mock data
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
                              {player.position} • {player.team} • #{player.jersey_number}
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
                            {player.height} • {player.weight} • {player.age} years old • {player.college} • {player.years_pro} years pro
                          </div>
                        </div>

                        {/* Season Stats Grid */}
                        <div>
                          <h3 className="text-xl font-bold text-white mb-4">📊 Season Stats</h3>
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

                    {/* Bottom Section - Full Season Game Log */}
                    <div className="border-t pt-6" style={{borderColor: 'var(--color-steel)'}}>
                      <h3 className="text-xl font-bold text-white mb-4">📈 Full Season Game Log</h3>
                      <div className="max-h-80 overflow-y-auto">
                        <GameLog entries={gameLogEntries} compact={false} />
                      </div>
                    </div>
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
