'use client'

import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import Card from './Card'

export interface PlayerCardProps extends Omit<HTMLMotionProps<'div'>, 'size'> {
  player: {
    id: string
    name: string
    position: string
    team: string
    photoUrl?: string
  }
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  size?: 'compact' | 'default' | 'large'
  contractsRemaining?: number
  currentSellValue?: number
  stats?: {
    points?: number
    games?: number
    avgPoints?: number
  }
  showActions?: boolean
  interactive?: boolean
  selected?: boolean
  onSelect?: () => void
  onSell?: () => void
  onAddToLineup?: () => void
  children?: React.ReactNode
}

const PlayerCard = React.forwardRef<HTMLDivElement, PlayerCardProps>(
  ({
    player,
    rarity = 'common',
    size = 'default',
    contractsRemaining,
    currentSellValue,
    stats,
    showActions = true,
    interactive = true,
    selected = false,
    onSelect,
    onSell,
    onAddToLineup,
    children,
    className = '',
    ...props
  }, ref) => {
    
         const sizeClasses = {
       compact: 'w-40 h-64',
       default: 'w-80 h-[480px]',
       large: 'w-96 h-[540px]'
     }
    
    const cardClasses = cn(
      'player-card relative overflow-hidden',
      `rarity-${rarity}`,
      sizeClasses[size],
             selected && 'ring-2 ring-white ring-offset-2 ring-offset-black',
      interactive && 'cursor-pointer',
      className
    )
    
    const getRarityGradient = (rarity: string) => {
      const gradients = {
        common: 'from-gray-800 via-gray-900 to-black',
        uncommon: 'from-emerald-900 via-gray-900 to-black',
        rare: 'from-slate-700 via-slate-800 to-black', 
        epic: 'from-purple-900 via-gray-900 to-black',
        legendary: 'from-amber-900 via-yellow-900 to-black'
      }
      return gradients[rarity as keyof typeof gradients] || gradients.common
    }
    
         const getPositionColor = (position: string) => {
       const colors = {
         QB: 'bg-red-500',
         RB: 'bg-green-500',
         WR: 'bg-amber-500',
         TE: 'bg-purple-500',
         K: 'bg-orange-500',
         DEF: 'bg-gray-700'
       }
       return colors[position as keyof typeof colors] || 'bg-gray-500'
     }

    return (
      <motion.div
        ref={ref}
        className={cardClasses}
        onClick={onSelect}
                  whileHover={interactive ? { 
            y: -6, 
            scale: 1.01,
          } : undefined}
        whileTap={interactive ? { scale: 0.98 } : undefined}
        transition={{
          duration: 0.3,
          ease: 'easeOut'
        }}
        {...props}
      >
        <Card 
          variant="default" 
          padding="none" 
          className={cn(
            'h-full flex flex-col bg-gradient-to-br overflow-hidden relative',
            'backdrop-blur-sm border-0',
            getRarityGradient(rarity)
          )}
                 >
           {/* Header Section */}
           {size !== 'compact' && (
             <div className="relative p-6 pb-4">
               <div className="flex justify-between items-start mb-4">
                 <div className={cn(
                   'text-xs font-semibold px-3 py-1.5 rounded-full text-white tracking-wider',
                   getPositionColor(player.position)
                 )}>
                   {player.position}
                 </div>
                 <div className="text-xs font-medium px-3 py-1.5 rounded-full capitalize bg-white/10 text-white border border-white/20 backdrop-blur-sm">
                   {rarity}
                 </div>
               </div>

               {/* Team Info */}
               <div className="text-center">
                 <div className="text-xs font-medium text-white/60 mb-1 tracking-wide">
                   {player.team}
                 </div>
               </div>
             </div>
           )}

                     {/* Player Image Section */}
           <div className={cn(
             "flex-1 flex flex-col items-center justify-center relative min-h-0",
             size === 'compact' ? 'px-4 py-4' : 'px-6 pb-6'
           )}>
             {/* Background Glow Effect */}
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-50"></div>
             
             <div className={cn(
               "flex flex-col items-center justify-center relative z-10",
               size === 'compact' ? 'space-y-2' : 'space-y-4'
             )}>
               {player.photoUrl ? (
                 <motion.div
                   className="relative"
                   whileHover={{ scale: 1.08 }}
                   transition={{ duration: 0.3, ease: "easeOut" }}
                 >
                   <div className={cn(
                     "rounded-full bg-gradient-to-br from-white/30 via-white/10 to-transparent p-1 backdrop-blur-sm shadow-2xl",
                     size === 'compact' ? 'w-20 h-20' : 'w-32 h-32'
                   )}>
                     <div className="w-full h-full rounded-full bg-gradient-to-br from-white/20 to-transparent p-1">
                       <img
                         src={player.photoUrl}
                         alt={`${player.name} headshot`}
                         className="w-full h-full rounded-full object-cover shadow-lg"
                       />
                     </div>
                   </div>
                   {/* Inner glow */}
                   <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                 </motion.div>
               ) : (
                 <div className={cn(
                   "rounded-full bg-gradient-to-br from-white/30 via-white/10 to-transparent p-1 backdrop-blur-sm shadow-2xl",
                   size === 'compact' ? 'w-20 h-20' : 'w-32 h-32'
                 )}>
                   <div className="w-full h-full rounded-full bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center border border-white/20">
                     <span className={cn(
                       "font-black text-white/90 tracking-tight",
                       size === 'compact' ? 'text-xl' : 'text-3xl'
                     )}>
                       {player.name.split(' ').map(n => n[0]).join('')}
                     </span>
                   </div>
                 </div>
               )}

               {/* Player Name */}
               <div className="text-center">
                 <h3 className={cn(
                   "text-white leading-tight tracking-normal drop-shadow-lg px-2",
                   size === 'compact' ? 'text-sm font-bold' : 'text-xl font-semibold'
                 )}>
                   {player.name}
                 </h3>
               </div>
             </div>
           </div>

          {/* Stats & Info Section - Hide for compact cards */}
          {size !== 'compact' && (
            <div className="bg-gradient-to-t from-black/60 via-black/30 to-transparent backdrop-blur-md border-t border-white/20 p-4 relative">
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50"></div>
              
              {/* Stats Grid */}
              {stats && (
                <div className="grid grid-cols-3 gap-4 mb-4 relative z-10">
                  <div className="text-center">
                    <div className="text-lg font-black text-white stat-display tracking-tight drop-shadow-md">{stats.points || 0}</div>
                    <div className="text-xs text-white/70 font-bold tracking-wider uppercase">POINTS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-white stat-display tracking-tight drop-shadow-md">{stats.games || 0}</div>
                    <div className="text-xs text-white/70 font-bold tracking-wider uppercase">GAMES</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-white stat-display tracking-tight drop-shadow-md">{stats.avgPoints?.toFixed(1) || '0.0'}</div>
                    <div className="text-xs text-white/70 font-bold tracking-wider uppercase">AVG</div>
                  </div>
                </div>
              )}

              {/* Contract and Value Info */}
              <div className="flex justify-between items-center mb-4 relative z-10">
                {contractsRemaining !== undefined && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 shadow-lg shadow-green-400/50"></div>
                    <span className="text-white/90 font-medium text-sm">
                      <span className="font-black text-white">{contractsRemaining}</span> 
                      <span className="text-xs uppercase tracking-wide"> contracts</span>
                    </span>
                  </div>
                )}
                {currentSellValue !== undefined && (
                  <div className="text-right">
                    <div className="text-xs text-white/70 font-bold uppercase tracking-wider">Value</div>
                    <div className="font-black text-green-400 text-lg tracking-tight drop-shadow-md">
                      ${currentSellValue.toFixed(0)}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {showActions && (
                <div className="flex gap-3 relative z-10">
                  {onAddToLineup && (
                    <motion.button
                      className="flex-1 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white text-xs py-2 px-3 rounded-lg font-black uppercase tracking-wide backdrop-blur-sm border border-white/20 shadow-lg transition-all duration-200"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddToLineup()
                      }}
                    >
                      Add to Lineup
                    </motion.button>
                  )}
                  {onSell && (
                    <motion.button
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs py-2 px-3 rounded-lg font-black uppercase tracking-wide backdrop-blur-sm border border-emerald-400/30 shadow-lg shadow-emerald-500/25 transition-all duration-200"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSell()
                      }}
                    >
                      Sell
                    </motion.button>
                  )}
                </div>
              )}

              {children}
            </div>
          )}
        </Card>
      </motion.div>
    )
  }
)

PlayerCard.displayName = 'PlayerCard'

export default PlayerCard
