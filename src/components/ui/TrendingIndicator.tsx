'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TrendingData {
  direction: 'up' | 'down' | 'stable'
  strength: number // -100 to +100
  summary: string
  indicator: string
}

export interface TrendingStats {
  seasonStats: {
    gamesPlayed: number
    gamesRemaining: number
    totalPoints: number
    averagePoints: number
    bestGame: number
    worstGame: number
    consistencyScore: number
  }
  recentPerformance: {
    lastThreeAverage: number
    lastFiveAverage: number
    recentGames: number
    improvementVsSeasonAvg: number
  }
  projections: {
    projectedTotalPoints: number
    projectedSeasonAverage: number
    gamesRemaining: number
  }
  analytics: {
    boomGames: number
    bustGames: number
    boomRate: number
    bustRate: number
    consistencyScore: number
  }
  injuryStatus?: {
    status: 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir'
    injury?: string
    returnDate?: string
  }
  positionRank?: {
    rank: number
    total: number
    percentile: number
  }
}

export interface TrendingIndicatorProps {
  trending: TrendingData
  stats?: TrendingStats
  compact?: boolean
  className?: string
}

export function TrendingIndicator({
  trending,
  stats,
  compact = false,
  className
}: TrendingIndicatorProps) {
  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up': return '#10b981' // green
      case 'down': return '#ef4444' // red
      default: return '#6b7280' // gray
    }
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="w-5 h-5" />
      case 'down': return <TrendingDown className="w-5 h-5" />
      default: return <Activity className="w-5 h-5" />
    }
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", className)}
        style={{
          backgroundColor: 'var(--color-slate)',
          border: `2px solid ${getTrendColor(trending.direction)}`,
        }}
      >
        <div style={{ color: getTrendColor(trending.direction) }}>
          {getTrendIcon(trending.direction)}
        </div>
        <div>
          <div className="text-sm font-bold text-white">
            {trending.direction === 'up' ? 'Trending Up' : trending.direction === 'down' ? 'Trending Down' : 'Stable'}
          </div>
          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {stats?.recentPerformance.lastFiveAverage.toFixed(1)} pts/game (L5)
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-4", className)}
    >
      {/* Main Trending Banner */}
      <div
        className="p-6 rounded-xl relative overflow-hidden"
        style={{
          backgroundColor: 'var(--color-slate)',
          border: `2px solid ${getTrendColor(trending.direction)}`,
        }}
      >
        {/* Background gradient */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(135deg, ${getTrendColor(trending.direction)} 0%, transparent 100%)`
          }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="p-3 rounded-full"
              style={{ backgroundColor: getTrendColor(trending.direction) + '20' }}
            >
              <div style={{ color: getTrendColor(trending.direction) }}>
                {getTrendIcon(trending.direction)}
              </div>
            </div>
            
            <div>
              <div className="text-2xl font-black text-white mb-1">
                {trending.indicator} {trending.direction.toUpperCase()}
              </div>
              <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {trending.summary}
              </div>
            </div>
          </div>

          {/* Strength meter */}
          <div className="text-right">
            <div className="text-3xl font-black" style={{ color: getTrendColor(trending.direction) }}>
              {trending.strength > 0 ? '+' : ''}{trending.strength}%
            </div>
            <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
              Trend Strength
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Season Performance */}
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--color-gunmetal)' }}
          >
            <div className="text-xs uppercase tracking-wider mb-2" 
                 style={{ color: 'var(--color-text-tertiary)' }}>
              Season Avg
            </div>
            <div className="text-2xl font-black text-white mb-1">
              {stats.seasonStats.averagePoints.toFixed(1)}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {stats.seasonStats.gamesPlayed} games played
            </div>
          </div>

          {/* Recent Performance */}
          <div 
            className="p-4 rounded-lg"
            style={{ 
              backgroundColor: 'var(--color-gunmetal)',
              border: `1px solid ${getTrendColor(trending.direction)}`
            }}
          >
            <div className="text-xs uppercase tracking-wider mb-2" 
                 style={{ color: 'var(--color-text-tertiary)' }}>
              Last 5 Games
            </div>
            <div className="text-2xl font-black" 
                 style={{ color: getTrendColor(trending.direction) }}>
              {stats.recentPerformance.lastFiveAverage.toFixed(1)}
            </div>
            <div className="text-xs flex items-center gap-1" 
                 style={{ color: getTrendColor(trending.direction) }}>
              {stats.recentPerformance.improvementVsSeasonAvg > 0 ? '↑' : '↓'}
              {Math.abs(stats.recentPerformance.improvementVsSeasonAvg).toFixed(1)} from avg
            </div>
          </div>

          {/* Projected Finish */}
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--color-gunmetal)' }}
          >
            <div className="text-xs uppercase tracking-wider mb-2" 
                 style={{ color: 'var(--color-text-tertiary)' }}>
              Proj. Finish
            </div>
            <div className="text-2xl font-black text-white mb-1">
              {stats.projections.projectedTotalPoints.toFixed(0)}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {stats.projections.gamesRemaining} games left
            </div>
          </div>

          {/* Position Rank */}
          {stats.positionRank && stats.positionRank.rank > 0 && (
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-gunmetal)' }}
            >
              <div className="text-xs uppercase tracking-wider mb-2" 
                   style={{ color: 'var(--color-text-tertiary)' }}>
                Position Rank
              </div>
              <div className="text-2xl font-black text-white mb-1">
                #{stats.positionRank.rank}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Top {stats.positionRank.percentile}%
              </div>
            </div>
          )}

          {/* Consistency */}
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--color-gunmetal)' }}
          >
            <div className="text-xs uppercase tracking-wider mb-2" 
                 style={{ color: 'var(--color-text-tertiary)' }}>
              Consistency
            </div>
            <div className="text-2xl font-black text-white mb-1">
              {stats.analytics.consistencyScore}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              out of 100
            </div>
          </div>

          {/* Boom Rate */}
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--color-gunmetal)' }}
          >
            <div className="text-xs uppercase tracking-wider mb-2" 
                 style={{ color: 'var(--color-text-tertiary)' }}>
              Boom Rate
            </div>
            <div className="text-2xl font-black text-green-400 mb-1">
              {stats.analytics.boomRate}%
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {stats.analytics.boomGames} boom games
            </div>
          </div>

          {/* Bust Rate */}
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--color-gunmetal)' }}
          >
            <div className="text-xs uppercase tracking-wider mb-2" 
                 style={{ color: 'var(--color-text-tertiary)' }}>
              Bust Rate
            </div>
            <div className="text-2xl font-black text-red-400 mb-1">
              {stats.analytics.bustRate}%
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {stats.analytics.bustGames} bust games
            </div>
          </div>

          {/* Best/Worst */}
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--color-gunmetal)' }}
          >
            <div className="text-xs uppercase tracking-wider mb-2" 
                 style={{ color: 'var(--color-text-tertiary)' }}>
              Best / Worst
            </div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-black text-green-400">
                {stats.seasonStats.bestGame.toFixed(1)}
              </div>
              <div className="text-lg" style={{ color: 'var(--color-text-tertiary)' }}>/</div>
              <div className="text-lg font-black text-red-400">
                {stats.seasonStats.worstGame.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Injury Status */}
      {stats?.injuryStatus && stats.injuryStatus.status !== 'healthy' && (
        <div 
          className="p-4 rounded-lg flex items-center gap-3"
          style={{ 
            backgroundColor: 'var(--color-gunmetal)',
            border: '2px solid #ef4444'
          }}
        >
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <div>
            <div className="text-sm font-bold text-red-400 uppercase">
              {stats.injuryStatus.status}
            </div>
            {stats.injuryStatus.injury && (
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {stats.injuryStatus.injury}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

