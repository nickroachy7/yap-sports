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
  playerStats?: any  // Position-specific stats
  didNotPlay?: boolean  // Flag for DNP (Did Not Play) - completed games with no stats
}

export interface GameLogProps {
  entries: GameLogEntry[]
  playerName?: string
  position?: string  // NEW: Position to determine which columns to show
  className?: string
  compact?: boolean
  currentSeason?: number
  availableSeasons?: number[]
  onSeasonChange?: (season: number) => void
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

// Normalize position names
function normalizePosition(position?: string): string {
  if (!position) return 'WR';
  const pos = position.toUpperCase();
  if (pos.includes('QUARTERBACK') || pos === 'QB') return 'QB';
  if (pos.includes('RUNNING') || pos === 'RB') return 'RB';
  if (pos.includes('WIDE') || pos.includes('RECEIVER') || pos === 'WR') return 'WR';
  if (pos.includes('TIGHT') || pos === 'TE') return 'TE';
  return 'WR'; // Default to WR
}

export function GameLog({
  entries,
  playerName,
  position,
  className,
  compact = false,
  currentSeason = 2025,
  availableSeasons = [2025],
  onSeasonChange
}: GameLogProps) {
  const normalizedPos = normalizePosition(position);

  // Define columns based on position
  const getColumns = () => {
    switch (normalizedPos) {
      case 'QB':
        return [
          { key: 'cmp', label: 'CMP', span: 2 },
          { key: 'att', label: 'ATT', span: 2 },
          { key: 'pct', label: 'PCT%', span: 2 },
          { key: 'yds', label: 'YDS', span: 2 },
          { key: 'ypa', label: 'YPA', span: 2 },
          { key: 'td', label: 'TD', span: 2 },
          { key: 'int', label: 'INT', span: 2 },
          { key: 'rating', label: 'RATING', span: 2 }
        ];
      
      case 'RB':
        return [
          { key: 'car', label: 'CAR', span: 2 },
          { key: 'yds', label: 'YDS', span: 2 },
          { key: 'ypc', label: 'YPC', span: 2 },
          { key: 'td', label: 'TD', span: 2 },
          { key: 'tar', label: 'TAR', span: 2 },
          { key: 'rec', label: 'REC', span: 2 },
          { key: 'rec_yds', label: 'REC YDS', span: 2 },
          { key: 'rec_td', label: 'REC TD', span: 2 }
        ];
      
      case 'WR':
      case 'TE':
      default:
        return [
          { key: 'tar', label: 'TAR', span: 2 },
          { key: 'rec', label: 'REC', span: 2 },
          { key: 'yds', label: 'YDS', span: 3 },
          { key: 'ypr', label: 'YPR', span: 2 },
          { key: 'td', label: 'TD', span: 2 },
          { key: 'lng', label: 'LONG', span: 2 },
          { key: 'fum', label: 'FUM', span: 1 }
        ];
    }
  };

  const columns = getColumns();
  const totalStatSpan = columns.reduce((sum, col) => sum + col.span, 0);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header with Season Toggle */}
      {playerName && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xl font-bold text-white">
                {playerName} - Game Log
              </h3>
              <div className="w-16 h-1 rounded mt-2"
                   style={{backgroundColor: 'var(--color-uncommon)'}}></div>
            </div>
            
            {/* Season Toggle */}
            {availableSeasons && availableSeasons.length > 1 && onSeasonChange && (
              <div className="flex gap-2">
                {availableSeasons.map(season => (
                  <motion.button
                    key={season}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSeasonChange(season)}
                    className="px-4 py-2 rounded-lg font-bold text-sm transition-all"
                    style={{
                      backgroundColor: currentSeason === season 
                        ? 'var(--color-uncommon)' 
                        : 'var(--color-slate)',
                      color: currentSeason === season 
                        ? 'white' 
                        : 'var(--color-text-secondary)',
                      border: '1px solid',
                      borderColor: currentSeason === season
                        ? 'var(--color-uncommon)'
                        : 'var(--color-steel)'
                    }}
                  >
                    {season}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Column Headers */}
      <div className={`grid gap-2 px-6 py-2 text-xs font-semibold uppercase tracking-wider`}
           style={{
             color: '#8b8b8b',
             backgroundColor: 'transparent',
             borderBottom: '1px solid rgba(255,255,255,0.05)',
             gridTemplateColumns: `repeat(${8 + totalStatSpan}, minmax(0, 1fr))`
           }}>
        <div className="col-span-1 text-center">WK</div>
        <div className="col-span-3">OPP</div>
        <div className="col-span-2 text-center">PROJ</div>
        <div className="col-span-2 text-center">FPTS</div>
        {columns.map((col) => (
          <div key={col.key} className={`col-span-${col.span} text-center`}>
            {col.label}
          </div>
        ))}
      </div>

      {/* Game Entries */}
      <div>
        {entries.map((entry, index) => (
          <motion.div
            key={`${entry.id}-${entry.week}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "grid gap-2 px-6 py-3 transition-all duration-200",
              "hover:bg-white/[0.03]",
              entry.gameStatus === 'live' && "ring-1 ring-green-500/30"
            )}
            style={{
              backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(15, 20, 30, 0.4)',
              borderBottom: '1px solid rgba(255,255,255,0.02)',
              gridTemplateColumns: `repeat(${8 + totalStatSpan}, minmax(0, 1fr))`
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
              {entry.didNotPlay ? (
                <div className="text-sm font-bold text-yellow-500">
                  DNP
                </div>
              ) : (
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
              )}
            </div>

            {/* Position-Specific Stats */}
            {columns.map((col) => (
              <div key={col.key} className={`col-span-${col.span} flex items-center justify-center`}>
                <div className="text-sm font-semibold text-white">
                  {entry.didNotPlay 
                    ? '-'
                    : entry.playerStats?.[col.key] !== undefined && entry.playerStats?.[col.key] !== null
                    ? typeof entry.playerStats[col.key] === 'number' && (col.key.includes('p') || col.key === 'rating' || col.key === 'ypa' || col.key === 'ypc' || col.key === 'ypr')
                      ? entry.playerStats[col.key].toFixed(1)  // Percentages, averages, and ratings
                      : entry.playerStats[col.key]
                    : '-'}
                </div>
              </div>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  )
}