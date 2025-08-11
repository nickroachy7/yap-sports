'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Unified collection item interface
export interface CollectionItem {
  id: string
  type: 'player' | 'token'
  name: string
  // Player-specific fields
  position?: string
  team?: string
  gameInfo?: string
  stats?: {
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
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  contractsRemaining?: number
  currentSellValue?: number
  isStarter?: boolean
  injuryStatus?: 'healthy' | 'questionable' | 'doubtful' | 'out'
  // Token-specific fields
  description?: string
  multiplier?: number
  used?: boolean
  statType?: string
}

export interface CollectionListViewProps {
  items: CollectionItem[]
  onItemClick?: (itemId: string, type: 'player' | 'token') => void
  onSellPlayer?: (itemId: string) => void
  showActions?: boolean
  className?: string
  filterType?: 'all' | 'players' | 'tokens'
}

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'common': return 'var(--color-common)'
    case 'uncommon': return 'var(--color-uncommon)'
    case 'rare': return 'var(--color-rare)'
    case 'epic': return 'var(--color-epic)'
    case 'legendary': return 'var(--color-legendary)'
    default: return 'var(--color-common)'
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
  switch (position) {
    case 'Quarterback': return 'QB'
    case 'Running Back': return 'RB'
    case 'Wide Receiver': return 'WR'
    case 'Tight End': return 'TE'
    case 'Kicker': return 'K'
    case 'Defense': return 'DEF'
    case 'Defense/Special Teams': return 'DEF'
    default: return position // Already abbreviated or unknown
  }
}

const getTeamColor = (team: string) => {
  switch (team) {
    // AFC East
    case 'BUF': return '#00338D' // Buffalo blue
    case 'MIA': return '#008E97' // Miami teal
    case 'NE': return '#002244' // Patriots navy
    case 'NYJ': return '#125740' // Jets green
    // AFC North  
    case 'BAL': return '#241773' // Ravens purple
    case 'CIN': return '#FB4F14' // Bengals orange
    case 'CLE': return '#311D00' // Browns brown
    case 'PIT': return '#FFB612' // Steelers gold
    // AFC South
    case 'HOU': return '#03202F' // Texans navy
    case 'IND': return '#002C5F' // Colts blue
    case 'JAX': return '#006778' // Jaguars teal
    case 'TEN': return '#0C2340' // Titans navy
    // AFC West
    case 'DEN': return '#FB4F14' // Broncos orange
    case 'KC': return '#E31837' // Chiefs red
    case 'LV': return '#000000' // Raiders black
    case 'LAC': return '#0080C6' // Chargers blue
    // NFC East
    case 'DAL': return '#003594' // Cowboys blue
    case 'NYG': return '#0B2265' // Giants blue
    case 'PHI': return '#004C54' // Eagles green
    case 'WSH': return '#773141' // Commanders burgundy
    // NFC North
    case 'CHI': return '#0B162A' // Bears navy
    case 'DET': return '#0076B6' // Lions blue
    case 'GB': return '#203731' // Packers green
    case 'MIN': return '#4F2683' // Vikings purple
    // NFC South
    case 'ATL': return '#A71930' // Falcons red
    case 'CAR': return '#0085CA' // Panthers blue
    case 'NO': return '#D3BC8D' // Saints gold
    case 'TB': return '#D50A0A' // Bucs red
    // NFC West
    case 'ARI': return '#97233F' // Cardinals red
    case 'LAR': return '#003594' // Rams blue
    case 'SF': return '#AA0000' // 49ers red
    case 'SEA': return '#002244' // Seahawks navy
    default: return '#6B7280' // Default gray
  }
}

const getInjuryStatusColor = (status?: string) => {
  switch (status) {
    case 'healthy': return 'var(--color-uncommon)'
    case 'questionable': return 'var(--color-amber)'
    case 'doubtful': return 'var(--color-rare)'
    case 'out': return 'var(--color-steel)'
    default: return 'var(--color-uncommon)'
  }
}

const getTokenStatusColor = (used: boolean) => {
  return used ? 'var(--color-steel)' : 'var(--color-violet)'
}

export function CollectionListView({
  items,
  onItemClick,
  onSellPlayer,
  showActions = false,
  className,
  filterType = 'all'
}: CollectionListViewProps) {
  // Filter items based on type
  const filteredItems = items.filter(item => {
    if (filterType === 'all') return true
    if (filterType === 'players') return item.type === 'player'
    if (filterType === 'tokens') return item.type === 'token'
    return true
  })

  return (
    <div className={cn("", className)}>
      {/* Header */}
      <div className={`grid gap-3 px-6 py-3 text-xs font-medium uppercase tracking-wider border-b ${
        showActions ? 'grid-cols-24' : 'grid-cols-20'
      }`}
           style={{color: 'var(--color-text-secondary)', borderColor: 'var(--color-steel)'}}>
        <div className="col-span-6">Player</div>
        <div className="col-span-2 text-center">FPTS</div>
        <div className="col-span-2 text-center">PROJ</div>
        <div className="col-span-2 text-center">SNP%</div>
        <div className="col-span-2 text-center">TAR</div>
        <div className="col-span-2 text-center">REC</div>
        <div className="col-span-2 text-center">YD</div>
        <div className="col-span-2 text-center">TD</div>
        {showActions && <div className="col-span-4 text-center">Actions</div>}
      </div>

      {/* Item Rows */}
      <div>
        {filteredItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onItemClick?.(item.id, item.type)}
            className={cn(
              `grid gap-3 px-6 py-3 cursor-pointer transition-all duration-200 ${
                showActions ? 'grid-cols-24' : 'grid-cols-20'
              }`,
              "hover:bg-white/5",
              onItemClick && "hover:ring-1 hover:ring-white/10",
              item.type === 'token' && item.used && "opacity-60"
            )}
            style={{
              backgroundColor: index % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent'
            }}
          >
            {/* Item Info */}
            <div className="col-span-6 flex items-center gap-3">
              {/* Add/Select Button */}
              <div className="flex-shrink-0">
                <button className="w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center text-gray-400 hover:border-white hover:text-white transition-colors">
                  <span className="text-sm">+</span>
                </button>
              </div>

              {/* Item Details */}
              <div className="min-w-0 flex-1">
                {item.type === 'player' ? (
                  <>
                    {/* Player Name */}
                    <div className="font-medium text-white text-sm leading-tight">
                      {item.name}
                    </div>
                    
                    {/* Team and Position Badges */}
                    <div className="flex items-center gap-1 mt-1">
                      <span 
                        className="px-2 py-0.5 rounded text-xs font-bold text-white"
                        style={{backgroundColor: getTeamColor(item.team || '')}}
                      >
                        {item.team}
                      </span>
                      <span 
                        className="px-2 py-0.5 rounded text-xs font-bold text-white"
                        style={{backgroundColor: getPositionColor(getPositionAbbreviation(item.position || ''))}}
                      >
                        {getPositionAbbreviation(item.position || '')}
                      </span>
                      {item.injuryStatus && item.injuryStatus !== 'healthy' && (
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-bold text-white"
                          style={{backgroundColor: getInjuryStatusColor(item.injuryStatus)}}
                        >
                          {item.injuryStatus.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Token Name */}
                    <div className={cn(
                      "font-medium text-sm leading-tight",
                      item.used ? 'text-gray-400' : 'text-white'
                    )}>
                      {item.name}
                    </div>
                    
                    {/* Token Details */}
                    <div className="flex items-center gap-1 mt-1">
                      <span 
                        className="px-2 py-0.5 rounded text-xs font-bold text-white"
                        style={{backgroundColor: 'var(--color-violet)'}}
                      >
                        TOKEN
                      </span>
                      {item.used && (
                        <span className="text-xs text-red-400 font-medium">Used</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* FPTS */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-medium text-white">
                {item.type === 'player' ? (item.stats?.fpts?.toFixed(1) || '0.0') : '-'}
              </div>
            </div>

            {/* PROJ */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-medium text-white">
                {item.type === 'player' ? (item.stats?.proj?.toFixed(1) || '0.0') : '-'}
              </div>
            </div>

            {/* SNP% */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-medium text-white">
                {item.type === 'player' ? `${item.stats?.snp || 0}%` : '-'}
              </div>
            </div>

            {/* TAR */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-medium text-white">
                {item.type === 'player' ? (item.stats?.tar || '-') : '-'}
              </div>
            </div>

            {/* REC */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-medium text-white">
                {item.type === 'player' ? (item.stats?.rec || '-') : '-'}
              </div>
            </div>

            {/* YD */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-medium text-white">
                {item.type === 'player' ? (item.stats?.yd || '-') : '-'}
              </div>
            </div>

            {/* TD */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-sm font-medium text-white">
                {item.type === 'player' ? (item.stats?.td || '-') : '-'}
              </div>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="col-span-4 flex items-center justify-center gap-2"
                   onClick={(e) => e.stopPropagation()}>
                {item.type === 'player' && onSellPlayer && (
                  <button
                    onClick={() => onSellPlayer(item.id)}
                    className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                  >
                    Sell for 💰{item.currentSellValue || 0}
                  </button>
                )}
              </div>
            )}

          </motion.div>
        ))}
      </div>
    </div>
  )
}
