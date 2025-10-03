import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export type TrendDirection = 'up' | 'down' | 'stable'

export interface TrendingBadgeProps {
  direction: TrendDirection
  strength?: number
  compact?: boolean
  showLabel?: boolean
}

export function TrendingBadge({ 
  direction, 
  strength = 0, 
  compact = true,
  showLabel = false 
}: TrendingBadgeProps) {
  
  const getIcon = () => {
    switch (direction) {
      case 'up': return TrendingUp
      case 'down': return TrendingDown
      case 'stable': return Minus
      default: return Minus
    }
  }
  
  const Icon = getIcon()

  const getColor = () => {
    switch (direction) {
      case 'up': return '#10b981' // Green - #10b981
      case 'down': return '#ef4444' // Red - #ef4444
      case 'stable': return '#6b7280' // Gray - #6b7280
      default: return '#6b7280'
    }
  }
  
  const getBgColor = () => {
    switch (direction) {
      case 'up': return 'rgba(16, 185, 129, 0.1)' // Green bg
      case 'down': return 'rgba(239, 68, 68, 0.1)' // Red bg
      case 'stable': return 'rgba(107, 116, 128, 0.1)' // Gray bg
      default: return 'rgba(107, 116, 128, 0.1)'
    }
  }

  const getLabel = () => {
    switch (direction) {
      case 'up': return 'Trending Up'
      case 'down': return 'Trending Down'
      case 'stable': return 'Stable'
      default: return 'Stable'
    }
  }

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
        style={{
          backgroundColor: getBgColor(),
          color: getColor(),
          border: `1px solid ${getColor()}40`
        }}
        title={`${getLabel()}${strength ? ` (${strength > 0 ? '+' : ''}${strength}%)` : ''}`}
      >
        <Icon className="w-3 h-3" strokeWidth={2.5} />
        {direction !== 'stable' && strength !== 0 && (
          <span className="text-[10px] font-bold">
            {strength > 0 ? '+' : ''}{strength}%
          </span>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold"
      style={{
        backgroundColor: getBgColor(),
        color: getColor(),
        border: `1.5px solid ${getColor()}`
      }}
    >
      <Icon className="w-5 h-5" strokeWidth={2.5} />
      <div className="flex flex-col items-start">
        <span className="text-xs uppercase tracking-wider">{getLabel()}</span>
        {direction !== 'stable' && strength !== 0 && (
          <span className="text-xs font-bold">
            {strength > 0 ? '+' : ''}{strength}%
          </span>
        )}
      </div>
    </motion.div>
  )
}

