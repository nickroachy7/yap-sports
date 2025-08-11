'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface GameLogEntry {
  id: string
  week: number
  opponent: string
  date: string
  time: string
  projection?: number
  actualPoints?: number
  isHome: boolean
  gameStatus: 'upcoming' | 'live' | 'completed'
  playerStats?: {
    snp?: number     // Snap percentage
    tar?: number     // Targets
    rec?: number     // Receptions  
    yd?: number      // Yards
    ypt?: number     // Yards per target
    ypc?: number     // Yards per catch
    td?: number      // Touchdowns
    fum?: number     // Fumbles
    lost?: number    // Fumbles lost
  }
}

export interface GameLogProps {
  entries: GameLogEntry[]
  playerName?: string
  className?: string
  compact?: boolean
}

const getGameStatusColor = (status: string) => {
  switch (status) {
    case 'upcoming': return 'var(--color-text-secondary)'
    case 'live': return 'var(--color-uncommon)'
    case 'completed': return 'var(--color-text-primary)'
    default: return 'var(--color-text-secondary)'
  }
}

const getGameStatusBg = (status: string) => {
  switch (status) {
    case 'upcoming': return 'var(--color-steel)'
    case 'live': return 'var(--color-uncommon)'
    case 'completed': return 'var(--color-slate)'
    default: return 'var(--color-steel)'
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
}

const formatTime = (timeString: string) => {
  return timeString
}

export function GameLog({
  entries,
  playerName,
  className,
  compact = false
}: GameLogProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      {playerName && (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-2">
            {playerName} - Game Log
          </h3>
          <div className="w-16 h-1 rounded"
               style={{backgroundColor: 'var(--color-uncommon)'}}></div>
        </div>
      )}

      {/* Column Headers */}
      <div className="grid grid-cols-24 gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider"
           style={{color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-steel)'}}>
        <div className="col-span-1 text-center">WK</div>
        <div className="col-span-3">OPP</div>
        <div className="col-span-2 text-center">PROJ</div>
        <div className="col-span-2 text-center">FPTS</div>
        <div className="col-span-2 text-center">SNP%</div>
        <div className="col-span-2 text-center">TAR</div>
        <div className="col-span-2 text-center">REC</div>
        <div className="col-span-2 text-center">YD</div>
        <div className="col-span-2 text-center">YPT</div>
        <div className="col-span-2 text-center">YPC</div>
        <div className="col-span-2 text-center">TD</div>
        <div className="col-span-1 text-center">FUM</div>
        <div className="col-span-1 text-center">LOST</div>
      </div>

      {/* Game Entries */}
      <div>
        {entries.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "grid grid-cols-24 gap-2 px-4 py-3 transition-all duration-200",
              "hover:brightness-110",
              entry.gameStatus === 'live' && "ring-1 ring-green-500/30"
            )}
            style={{
              backgroundColor: index % 2 === 1 ? 'var(--color-gunmetal)' : 'transparent'
            }}
          >
            {/* Week */}
            <div className="col-span-1 flex items-center justify-center">
              <div className="text-sm font-semibold text-white">
                {entry.week}
              </div>
            </div>

            {/* Opponent */}
            <div className="col-span-3 flex items-center">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  {!entry.isHome && (
                    <span className="text-xs font-bold"
                          style={{color: 'var(--color-text-tertiary)'}}>
                      @
                    </span>
                  )}
                  <span className="font-bold text-white text-sm">
                    {entry.opponent}
                  </span>
                </div>
                <div className="text-xs" style={{color: 'var(--color-text-secondary)'}}>
                  {formatDate(entry.date)} {formatTime(entry.time)}
                </div>
              </div>
            </div>

            {/* Projection */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-semibold text-white">
                {entry.projection ? entry.projection.toFixed(1) : '-'}
              </div>
            </div>

            {/* Actual Points */}
            <div className="col-span-2 flex items-center justify-center">
              <div className={cn(
                "text-sm font-semibold",
                entry.projection && entry.actualPoints && entry.actualPoints > entry.projection 
                  ? "text-green-400" 
                  : entry.projection && entry.actualPoints && entry.actualPoints < entry.projection
                  ? "text-red-400"
                  : "text-white"
              )}>
                {entry.actualPoints !== undefined ? entry.actualPoints.toFixed(1) : '-'}
              </div>
            </div>

            {/* SNP% */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-semibold text-white">
                {entry.playerStats?.snp ? `${entry.playerStats.snp}%` : '-'}
              </div>
            </div>

            {/* TAR */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-semibold text-white">
                {entry.playerStats?.tar || '-'}
              </div>
            </div>

            {/* REC */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-semibold text-white">
                {entry.playerStats?.rec || '-'}
              </div>
            </div>

            {/* YD */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-semibold text-white">
                {entry.playerStats?.yd || '-'}
              </div>
            </div>

            {/* YPT */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-semibold text-white">
                {entry.playerStats?.ypt || '-'}
              </div>
            </div>

            {/* YPC */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-semibold text-white">
                {entry.playerStats?.ypc || '-'}
              </div>
            </div>

            {/* TD */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-semibold text-white">
                {entry.playerStats?.td || '-'}
              </div>
            </div>

            {/* FUM */}
            <div className="col-span-1 flex items-center justify-center">
              <div className="text-sm font-semibold text-white">
                {entry.playerStats?.fum || '-'}
              </div>
            </div>

            {/* LOST */}
            <div className="col-span-1 flex items-center justify-center">
              <div className="text-sm font-semibold text-white">
                {entry.playerStats?.lost || '-'}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary Stats */}
      {entries.length > 0 && (
        <div className="mt-6 p-4 rounded-lg"
             style={{backgroundColor: 'var(--color-slate)', border: '1px solid var(--color-steel)'}}>
          <h4 className="text-sm font-bold uppercase tracking-wide mb-3"
              style={{color: 'var(--color-text-secondary)'}}>
            Season Summary
          </h4>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-black text-white">
                {entries.filter(e => e.gameStatus === 'completed').length}
              </div>
              <div className="text-xs font-medium uppercase tracking-wide"
                   style={{color: 'var(--color-text-tertiary)'}}>
                Games Played
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-white">
                {entries
                  .filter(e => e.actualPoints !== undefined)
                  .reduce((sum, e) => sum + (e.actualPoints || 0), 0)
                  .toFixed(1)}
              </div>
              <div className="text-xs font-medium uppercase tracking-wide"
                   style={{color: 'var(--color-text-tertiary)'}}>
                Total Points
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-white">
                {entries.filter(e => e.actualPoints !== undefined).length > 0
                  ? (entries
                      .filter(e => e.actualPoints !== undefined)
                      .reduce((sum, e) => sum + (e.actualPoints || 0), 0) /
                      entries.filter(e => e.actualPoints !== undefined).length
                    ).toFixed(1)
                  : '0.0'}
              </div>
              <div className="text-xs font-medium uppercase tracking-wide"
                   style={{color: 'var(--color-text-tertiary)'}}>
                Avg Per Game
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-white">
                {Math.max(...entries.map(e => e.actualPoints || 0)).toFixed(1)}
              </div>
              <div className="text-xs font-medium uppercase tracking-wide"
                   style={{color: 'var(--color-text-tertiary)'}}>
                Best Game
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
