'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, Button, PlayerCard, PlayerModal, CollectionListView } from '@/components/ui'
import type { CollectionItem } from '@/components/ui'

// Enhanced Types
export interface Player {
  id: string
  first_name: string
  last_name: string
  position: string
  team: string
  photoUrl?: string
}

export interface UserCard {
  id: string
  remaining_contracts: number
  current_sell_value: number
  player: Player
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  projected_points?: number
}

export interface UserToken {
  id: string
  token_type: {
    id: string
    name: string
    description: string
    multiplier: number
    conditions: any
  }
  used: boolean
}

export interface LineupSlot {
  id: string
  slot: string
  label: string
  positions: string[]
  user_card?: UserCard
  applied_token?: UserToken
  shortLabel?: string
}

export interface LineupBuilderProps {
  availableCards: UserCard[]
  lineupSlots: LineupSlot[]
  availableTokens?: UserToken[]
  playerSeasonStats?: Map<string, any>
  trendingData?: Map<string, { direction: 'up' | 'down' | 'stable', strength: number, gamesPlayed: number }>
  playerGameStats?: Map<string, { avg: number, best: number, last: number }>
  onSlotChange: (slotId: string, userCard: UserCard | null) => void
  onTokenApply?: (slotId: string, token: UserToken | null) => void
  onPlayerClick?: (playerId: string) => void
  onSubmitLineup?: () => void
  loading?: boolean
  className?: string
  compact?: boolean
  showAvailableCards?: boolean
  showSubmitButton?: boolean
  showLineupGrid?: boolean
  title?: string
  hideInstructions?: boolean
  hideProjectedPoints?: boolean
  hideInternalHeader?: boolean
  disableSticky?: boolean
  // Controlled state props for sharing state between multiple instances
  selectedSlot?: string | null
  onSelectedSlotChange?: (slotId: string | null) => void
  slotFilter?: string | null
  onSlotFilterChange?: (slotId: string | null) => void
}

// Position slot configurations (without bench)
const POSITION_SLOTS = [
  { slot: 'QB', label: 'Quarterback', positions: ['QB'], shortLabel: 'QB' },
  { slot: 'RB1', label: 'Running Back 1', positions: ['RB'], shortLabel: 'RB' },
  { slot: 'RB2', label: 'Running Back 2', positions: ['RB'], shortLabel: 'RB' },
  { slot: 'WR1', label: 'Wide Receiver 1', positions: ['WR'], shortLabel: 'WR' },
  { slot: 'WR2', label: 'Wide Receiver 2', positions: ['WR'], shortLabel: 'WR' },
  { slot: 'TE', label: 'Tight End', positions: ['TE'], shortLabel: 'TE' },
  { slot: 'FLEX', label: 'Flex (RB/WR/TE)', positions: ['RB', 'WR', 'TE'], shortLabel: 'FLEX' },
]

// Helper function to get position colors
const getPositionColor = (position: string) => {
  const colors = {
    QB: 'bg-red-500',
    RB: 'bg-green-500', 
    WR: 'bg-amber-500',
    TE: 'bg-purple-500',
    FLEX: 'bg-blue-500'
  }
  return colors[position as keyof typeof colors] || 'bg-gray-500'
}

// Helper function to check if card can be placed in slot
const canPlaceCardInSlot = (card: UserCard, slot: LineupSlot): boolean => {
  return slot.positions.includes(card.player.position)
}

// Compact PlayerCard for lineup slots
const LineupPlayerCard: React.FC<{
  userCard: UserCard
  appliedToken?: UserToken
  onRemove?: () => void
  onPlayerClick?: () => void
  onTokenClick?: () => void
  isDragging?: boolean
}> = ({ userCard, appliedToken, onRemove, onPlayerClick, onTokenClick, isDragging = false }) => {
  const { player, projected_points = 0, remaining_contracts, rarity = 'common' } = userCard

  return (
    <motion.div
      className={cn(
        'relative',
        isDragging && 'opacity-50 rotate-2'
      )}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      <PlayerCard
        player={{
          id: player.id,
          name: `${player.first_name} ${player.last_name}`,
          position: player.position,
          team: player.team,
          photoUrl: player.photoUrl
        }}
        rarity={rarity}
        size="compact"
        contractsRemaining={remaining_contracts}
        stats={{
          points: projected_points,
          games: 0,
          avgPoints: projected_points
        }}
        showActions={false}
        interactive={true}
        onSelect={onPlayerClick}
      />
      
      {/* Projected Points Overlay - Smaller for compact size */}
      <div className="absolute top-1 right-1 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg z-10">
        {projected_points.toFixed(1)}
      </div>
      
      {/* Token Indicator - Smaller for compact size */}
      {appliedToken && (
        <div 
          className="absolute bottom-1 right-1 bg-purple-600 text-white text-[9px] font-bold px-1 py-0.5 rounded-full shadow-lg z-10 cursor-pointer hover:bg-purple-700 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onTokenClick?.()
          }}
          title={`${appliedToken.token_type.name} (${appliedToken.token_type.multiplier}x)`}
        >
          {appliedToken.token_type.multiplier}x
        </div>
      )}
      
      {/* Token Slot (when no token applied) - Smaller for compact size */}
      {!appliedToken && (
        <div 
          className="absolute bottom-1 right-1 bg-gray-600 hover:bg-gray-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full shadow-lg z-10 cursor-pointer transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onTokenClick?.()
          }}
          title="Apply token"
        >
          +🎯
        </div>
      )}
      
      {/* Remove Button - Smaller for compact size */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute top-1 left-1 w-4 h-4 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold transition-colors z-10 shadow-lg"
        >
          ×
        </button>
      )}
    </motion.div>
  )
}

// Empty slot component - compact size for 7-across layout
const EmptyLineupSlot: React.FC<{
  slot: LineupSlot
  isOver?: boolean
  onClick?: () => void
}> = ({ slot, isOver = false, onClick }) => {
  return (
    <motion.div
      onClick={onClick}
      className={cn(
        'w-28 h-40 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden',
        isOver 
          ? 'border-green-400 bg-green-900/20' 
          : 'border-gray-600 hover:border-gray-500'
      )}
      style={{backgroundColor: 'var(--color-gunmetal)'}}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      {/* Position Badge */}
      <div className={cn(
        'text-xs font-bold px-2 py-1 rounded-full mb-2',
        getPositionColor(slot.slot.includes('FLEX') ? 'FLEX' : slot.positions[0]),
        'text-white shadow-lg'
      )}>
        {slot.shortLabel || slot.slot}
      </div>
      
      {/* Slot Label */}
      <div className="text-xs font-medium text-gray-300 text-center px-2 mb-2 leading-tight">
        {slot.label}
      </div>
      
      {/* Plus Icon */}
      <div className="absolute bottom-2 right-2 w-5 h-5 border border-gray-500 rounded-full flex items-center justify-center text-gray-500 text-xs">
        +
      </div>
      
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full bg-gradient-to-br from-transparent via-gray-600 to-transparent"></div>
      </div>
    </motion.div>
  )
}

// Available card component with drag handle
const AvailablePlayerCard: React.FC<{
  userCard: UserCard
  onClick?: () => void
  isDragging?: boolean
}> = ({ userCard, onClick, isDragging = false }) => {
  const { player, projected_points = 0, remaining_contracts, rarity = 'common' } = userCard

  return (
    <motion.div
      className={cn(
        'cursor-pointer relative',
        isDragging && 'opacity-30 rotate-2'
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <PlayerCard
        player={{
          id: player.id,
          name: `${player.first_name} ${player.last_name}`,
          position: player.position,
          team: player.team,
          photoUrl: player.photoUrl
        }}
        rarity={rarity}
        size="compact"
        contractsRemaining={remaining_contracts}
        stats={{
          points: projected_points,
          games: 0,
          avgPoints: projected_points
        }}
        showActions={false}
        interactive={false}
      />
      
      {/* Projected Points Overlay */}
      <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10">
        {projected_points.toFixed(1)} FPTS
      </div>
      
      {/* Drag indicator */}
      <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-1 rounded z-10">
        Drag or Click
      </div>
    </motion.div>
  )
}

// Token Selection Modal Component
const TokenSelectionModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  availableTokens: UserToken[]
  slotId: string
  slotLabel: string
  currentToken?: UserToken
  onTokenSelect: (token: UserToken | null) => void
}> = ({ isOpen, onClose, availableTokens, slotId, slotLabel, currentToken, onTokenSelect }) => {
  if (!isOpen) return null

  const unusedTokens = availableTokens.filter(token => !token.used)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
        style={{backgroundColor: 'var(--color-midnight)'}}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            Select Token for {slotLabel}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Current Token */}
        {currentToken && (
          <div className="mb-4 p-3 bg-purple-900/20 border border-purple-500 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">{currentToken.token_type.name}</div>
                <div className="text-sm text-gray-400">{currentToken.token_type.description}</div>
                <div className="text-sm text-purple-400">{currentToken.token_type.multiplier}x multiplier</div>
              </div>
              <button
                onClick={() => {
                  onTokenSelect(null)
                  onClose()
                }}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Available Tokens */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-300">Available Tokens ({unusedTokens.length})</h4>
          
          {unusedTokens.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🎯</div>
              <div>No unused tokens available</div>
            </div>
          ) : (
            unusedTokens.map((token) => (
              <button
                key={token.id}
                onClick={() => {
                  onTokenSelect(token)
                  onClose()
                }}
                className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{token.token_type.name}</div>
                    <div className="text-sm text-gray-400">{token.token_type.description}</div>
                  </div>
                  <div className="text-purple-400 font-bold">
                    {token.token_type.multiplier}x
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export const LineupBuilder: React.FC<LineupBuilderProps> = ({
  availableCards = [],
  lineupSlots = [],
  availableTokens = [],
  playerSeasonStats,
  trendingData,
  playerGameStats,
  onSlotChange,
  onTokenApply,
  onPlayerClick,
  onSubmitLineup,
  loading = false,
  className,
  compact = false,
  showAvailableCards = true,
  showSubmitButton = true,
  showLineupGrid = true,
  title = "Lineup Builder",
  hideInstructions = false,
  hideProjectedPoints = false,
  hideInternalHeader = false,
  disableSticky = false,
  // Controlled state props
  selectedSlot: controlledSelectedSlot,
  onSelectedSlotChange,
  slotFilter: controlledSlotFilter,
  onSlotFilterChange
}) => {
  // Use controlled state if provided, otherwise use internal state
  const [internalSelectedSlot, setInternalSelectedSlot] = useState<string | null>(null)
  const [internalSlotFilter, setInternalSlotFilter] = useState<string | null>(null)
  
  const selectedSlot = controlledSelectedSlot !== undefined ? controlledSelectedSlot : internalSelectedSlot
  const setSelectedSlot = onSelectedSlotChange || setInternalSelectedSlot
  const slotFilter = controlledSlotFilter !== undefined ? controlledSlotFilter : internalSlotFilter
  const setSlotFilter = onSlotFilterChange || setInternalSlotFilter
  
  const [positionFilter, setPositionFilter] = useState<string>('ALL')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false)
  const [selectedTokenSlot, setSelectedTokenSlot] = useState<string | null>(null)
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false)

  // Memoized lineup slots with position configuration
  const currentLineup = useMemo(() => {
    return POSITION_SLOTS.map(posConfig => {
      const existingSlot = lineupSlots.find(slot => slot.slot === posConfig.slot)
      return {
        id: existingSlot?.id || `slot-${posConfig.slot}`,
        slot: posConfig.slot,
        label: posConfig.label,
        positions: posConfig.positions,
        user_card: existingSlot?.user_card,
        shortLabel: posConfig.shortLabel
      } as LineupSlot & { shortLabel: string }
    })
  }, [lineupSlots])

  // Memoized filtered cards for performance
  const filteredCards = useMemo(() => {
    const usedCardIds = new Set(
      currentLineup
        .filter(slot => slot.user_card)
        .map(slot => slot.user_card!.id)
    )

    let filtered = availableCards.filter(card => !usedCardIds.has(card.id))
    
    if (positionFilter !== 'ALL') {
      filtered = filtered.filter(card => card.player.position === positionFilter)
    }

    // Sort by projected points (descending)
    return filtered.sort((a, b) => (b.projected_points || 0) - (a.projected_points || 0))
  }, [availableCards, currentLineup, positionFilter])

  // Memoized total projected points
  const totalProjectedPoints = useMemo(() => {
    return currentLineup
      .filter(slot => slot.user_card)
      .reduce((sum, slot) => sum + (slot.user_card!.projected_points || 0), 0)
  }, [currentLineup])

  // Optimized drag end handler with useCallback
  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    // Moving from available cards to lineup slot
    if (source.droppableId === 'available-cards' && destination.droppableId.startsWith('lineup-slot-')) {
      const slotId = destination.droppableId.replace('lineup-slot-', '')
      const slot = currentLineup.find(s => s.slot === slotId)
      const card = availableCards.find(c => c.id === draggableId)

      if (slot && card && canPlaceCardInSlot(card, slot)) {
        onSlotChange(slot.slot, card)
      }
      return
    }

    // Moving from lineup slot back to available (remove from lineup)
    if (source.droppableId.startsWith('lineup-slot-') && destination.droppableId === 'available-cards') {
      const slotId = source.droppableId.replace('lineup-slot-', '')
      onSlotChange(slotId, null)
      return
    }

    // Moving between lineup slots (swap functionality)
    if (source.droppableId.startsWith('lineup-slot-') && destination.droppableId.startsWith('lineup-slot-')) {
      const sourceSlotId = source.droppableId.replace('lineup-slot-', '')
      const destSlotId = destination.droppableId.replace('lineup-slot-', '')
      
      if (sourceSlotId === destSlotId) return // Same slot

      const sourceSlot = currentLineup.find(s => s.slot === sourceSlotId)
      const destSlot = currentLineup.find(s => s.slot === destSlotId)
      
      if (sourceSlot?.user_card && destSlot && canPlaceCardInSlot(sourceSlot.user_card, destSlot)) {
        // Perform swap
        const sourceCard = sourceSlot.user_card
        const destCard = destSlot.user_card
        
        onSlotChange(sourceSlotId, destCard || null)
        onSlotChange(destSlotId, sourceCard)
      }
    }
  }, [currentLineup, availableCards, onSlotChange])

  // Optimized card click handler
  const handleCardClick = useCallback((card: UserCard) => {
    if (selectedSlot) {
      const slot = currentLineup.find(s => s.slot === selectedSlot)
      if (slot && canPlaceCardInSlot(card, slot)) {
        onSlotChange(selectedSlot, card)
        setSelectedSlot(null)
        setSlotFilter(null)
        setPositionFilter('ALL')
      }
    }
  }, [selectedSlot, currentLineup, onSlotChange, setSelectedSlot, setSlotFilter])

  // Optimized slot click handler
  const handleSlotClick = useCallback((slotId: string) => {
    if (selectedSlot === slotId) {
      // Clicking same slot again deselects it
      setSelectedSlot(null)
      setPositionFilter('ALL')
      setSlotFilter(null)
    } else {
      // Selecting a new slot
      setSelectedSlot(slotId)
      const slot = currentLineup.find(s => s.slot === slotId)
      if (slot) {
        // Set position filter based on slot requirements
        setPositionFilter(slot.positions.length === 1 ? slot.positions[0] : 'FLEX')
        setSlotFilter(slotId)
      }
    }
  }, [selectedSlot, currentLineup, setSelectedSlot, setSlotFilter])

  // Optimized remove handler
  const handleRemoveCard = useCallback((slotId: string) => {
    onSlotChange(slotId, null)
  }, [onSlotChange])

  // Convert available cards and tokens to collection items
  const getCollectionItems = useCallback((): CollectionItem[] => {
    const usedCardIds = new Set(
      currentLineup
        .filter(slot => slot.user_card)
        .map(slot => slot.user_card!.id)
    )

    let availableForCollection = availableCards.filter(card => !usedCardIds.has(card.id))
    
    // Filter by slot requirements if a slot is selected
    if (slotFilter) {
      const slot = currentLineup.find(s => s.slot === slotFilter)
      if (slot) {
        availableForCollection = availableForCollection.filter(card => 
          slot.positions.includes(card.player.position)
        )
      }
    }

    // Convert cards to collection items
    const playerItems: CollectionItem[] = availableForCollection.map((card, index) => {
      const playerId = card.player.id
      const seasonStats = playerSeasonStats?.get(playerId)
      const gameStats = playerGameStats?.get(playerId)
      const trendData = trendingData?.get(playerId)
      
      // Debug logging for first card
      if (index === 0) {
        console.log('🔍 LineupBuilder - First card:', {
          playerName: `${card.player.first_name} ${card.player.last_name}`,
          playerId,
          hasStatsMap: !!playerSeasonStats,
          statsMapSize: playerSeasonStats?.size || 0,
          hasSeasonStats: !!seasonStats,
          hasGameStats: !!gameStats,
          hasTrending: !!trendData,
          positionRank: seasonStats?.position_rank,
          trendDirection: trendData?.direction
        })
      }
      
      // Build game info with position rank
      let gameInfo = 'Available for lineup'
      if (seasonStats && seasonStats.games_played > 0) {
        const rankInfo = seasonStats.position_rank 
          ? `${card.player.position} #${seasonStats.position_rank}` 
          : card.player.position
        gameInfo = `${rankInfo} | ${seasonStats.games_played} games`
      } else if (seasonStats && seasonStats.games_played === 0) {
        gameInfo = `${card.player.position} | No games played`
      } else {
        // No stats found for this player at all
        gameInfo = `${card.player.position} | No stats yet`
      }
      
      return {
        id: card.id,
        type: 'player' as const,
        name: `${card.player.first_name} ${card.player.last_name}`,
        position: card.player.position,
        team: card.player.team,
        gameInfo,
        stats: {
          fpts: seasonStats?.total_fantasy_points || 0,
          proj: seasonStats?.avg_fantasy_points || 0,
          avg: gameStats?.avg || 0,
          best: gameStats?.best || 0,
          last: gameStats?.last || 0,
          snp: seasonStats?.catch_pct || 0,
          tar: seasonStats?.targets || 0,
          rec: seasonStats?.receptions || 0,
          yd: seasonStats?.passing_yards || seasonStats?.rushing_yards || seasonStats?.receiving_yards || 0,
          ypt: seasonStats?.yards_per_reception || 0,
          ypc: seasonStats?.yards_per_carry || 0,
          td: seasonStats?.passing_tds || seasonStats?.rushing_tds || seasonStats?.receiving_tds || 0,
          fum: seasonStats?.fumbles_lost || 0,
          lost: seasonStats?.passing_ints || 0
        },
        rarity: card.rarity || 'common',
        contractsRemaining: card.remaining_contracts,
        currentSellValue: card.current_sell_value,
        injuryStatus: 'healthy' as const,
        trending: trendData ? {
          direction: trendData.direction,
          strength: trendData.strength
        } : undefined,
        positionRank: seasonStats?.position_rank
      }
    })

    // Convert tokens to collection items
    const tokenItems: CollectionItem[] = (availableTokens || []).map(token => ({
      id: token.id,
      type: 'token' as const,
      name: token.token_type.name,
      description: token.token_type.description,
      multiplier: token.token_type.multiplier,
      used: token.used,
      statType: token.token_type.conditions?.stat_type?.toUpperCase() || 'BONUS'
    }))

    return [...playerItems, ...tokenItems]
  }, [availableCards, currentLineup, slotFilter, availableTokens, playerSeasonStats, trendingData, playerGameStats])

  // Handle collection item click
  const handleCollectionItemClick = useCallback((itemId: string, type: 'player' | 'token') => {
    if (type === 'player' && selectedSlot) {
      // Slot is selected, add player to lineup
      const card = availableCards.find(c => c.id === itemId)
      const slot = currentLineup.find(s => s.slot === selectedSlot)
      
      if (card && slot && canPlaceCardInSlot(card, slot)) {
        onSlotChange(selectedSlot, card)
        // Clear selection after adding
        setSelectedSlot(null)
        setSlotFilter(null)
        setPositionFilter('ALL')
      }
    } else if (type === 'player') {
      // No slot selected, try to find first empty matching slot and add instantly
      const card = availableCards.find(c => c.id === itemId)
      if (card) {
        // Find first empty slot that matches this player's position
        const emptyMatchingSlot = currentLineup.find(s => !s.user_card && canPlaceCardInSlot(card, s))
        
        if (emptyMatchingSlot) {
          // Instantly add to first available slot
          onSlotChange(emptyMatchingSlot.slot, card)
        } else {
          // No empty slot available, open player modal instead
          setSelectedPlayerId(card.player.id)
          setIsPlayerModalOpen(true)
          onPlayerClick?.(card.player.id)
        }
      }
    } else if (type === 'token') {
      // Handle token click - open token selection modal for the selected slot
      const token = availableTokens?.find(t => t.id === itemId)
      if (token && selectedSlot) {
        setSelectedTokenSlot(selectedSlot)
        setIsTokenModalOpen(true)
      } else if (token) {
        // If no slot selected, just show a message or could open a token details modal
        console.log('Token clicked:', token.token_type.name, '- Select a lineup slot to apply this token')
      }
    }
  }, [selectedSlot, availableCards, availableTokens, currentLineup, onSlotChange, onPlayerClick, setSelectedSlot, setSlotFilter])

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE']

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={cn(compact ? 'space-y-4' : 'space-y-6', className)}>
        {/* Compact header for dashboard integration */}
        {compact && showLineupGrid && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">🏈 {title}</h3>
            <div className="text-right">
              <div className="text-xs text-gray-400">Projected Points</div>
              <div className="text-lg font-bold text-green-400">{totalProjectedPoints.toFixed(1)}</div>
            </div>
          </div>
        )}

        {/* Lineup Grid - Sticky Section with Header */}
        {showLineupGrid && (
        <div 
          className={cn(disableSticky ? '' : 'sticky z-40 border-b')} 
          style={{
            top: disableSticky ? 'auto' : '130px',
            backgroundColor: disableSticky ? 'transparent' : 'var(--color-obsidian)', 
            borderColor: disableSticky ? 'transparent' : 'var(--color-steel)'
          }}
        >
          <Card className={cn(compact ? 'p-4' : 'p-6', 'hover:!transform-none hover:!shadow-none')} interactive={false}>
            {/* Consolidated Header with Projected Points */}
            {!compact && (
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Starting Lineup</h3>
                {!hideProjectedPoints && (
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Total Projected Points</div>
                    <div className="text-xl font-bold text-green-400">{totalProjectedPoints.toFixed(1)}</div>
                  </div>
                )}
              </div>
            )}
            <div className={cn(
              'grid gap-3 justify-items-center',
              compact 
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7'
            )}>
            {currentLineup.map((slot) => (
              <Droppable key={slot.slot} droppableId={`lineup-slot-${slot.slot}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="relative"
                  >
                    {slot.user_card ? (
                      <Draggable draggableId={slot.user_card.id} index={0}>
                        {(provided, snapshot) => {
                          const userCard = slot.user_card!; // We know it exists here
                          return (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <LineupPlayerCard
                                userCard={userCard}
                                appliedToken={slot.applied_token}
                                onRemove={() => handleRemoveCard(slot.slot)}
                                onPlayerClick={() => {
                                  setSelectedPlayerId(userCard.player.id)
                                  setIsPlayerModalOpen(true)
                                  onPlayerClick?.(userCard.player.id)
                                }}
                                onTokenClick={() => {
                                  setSelectedTokenSlot(slot.slot)
                                  setIsTokenModalOpen(true)
                                }}
                                isDragging={snapshot.isDragging}
                              />
                            </div>
                          )
                        }}
                      </Draggable>
                    ) : (
                      <EmptyLineupSlot
                        slot={slot}
                        isOver={snapshot.isDraggingOver}
                        onClick={() => handleSlotClick(slot.slot)}
                      />
                    )}
                    {provided.placeholder}
                    
                    {/* Selection indicator */}
                    {selectedSlot === slot.slot && (
                      <div className="absolute inset-0 border-2 border-green-400 rounded-lg pointer-events-none animate-pulse" />
                    )}
                  </div>
                )}
              </Droppable>
            ))}
            </div>
          </Card>
        </div>
        )}

        {/* Available Cards - hide in compact mode by default */}
        {showAvailableCards && (
          getCollectionItems().length === 0 ? (
            <div className="px-6">
              <Card className="p-6">
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">🏈</div>
                  <div className="text-lg font-medium">
                    {slotFilter ? 'No eligible items' : 'No available items'}
                  </div>
                  <div className="text-sm">
                    {slotFilter 
                      ? 'All eligible players for this position are already in your lineup'
                      : 'All players are already in your lineup'
                    }
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              {selectedSlot && (
                <div className="mb-4 mx-6 p-3 bg-green-900/20 border border-green-500 rounded-lg flex items-center justify-between">
                  <div className="text-green-300 text-sm font-medium">
                    Click a player to add to: {currentLineup.find(s => s.slot === selectedSlot)?.label}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSlotFilter(null)
                      setSelectedSlot(null)
                      setPositionFilter('ALL')
                    }}
                  >
                    Clear Filter
                  </Button>
                </div>
              )}

              {/* Players Section */}
              {getCollectionItems().some(item => item.type === 'player') && (
                <div>
                  <CollectionListView 
                    items={getCollectionItems().filter(item => item.type === 'player')}
                    onItemClick={handleCollectionItemClick}
                    showActions={true}
                    filterType="players"
                  />
                </div>
              )}

              {/* Tokens Section */}
              {getCollectionItems().some(item => item.type === 'token') && (
                <div className="px-6 mt-6 mb-4">
                  <h4 className="text-lg font-bold text-white">
                    Available Tokens ({getCollectionItems().filter(item => item.type === 'token').length})
                  </h4>
                </div>
              )}
              {getCollectionItems().some(item => item.type === 'token') && (
                <div>
                  <CollectionListView 
                    items={getCollectionItems().filter(item => item.type === 'token')}
                    onItemClick={handleCollectionItemClick}
                    showActions={true}
                    filterType="tokens"
                  />
                </div>
              )}
            </div>
          )
        )}

        {/* Submit Button */}
        {showSubmitButton && onSubmitLineup && (
          <div className="text-center">
            <Button
              onClick={onSubmitLineup}
              variant="primary"
              size={compact ? "sm" : "lg"}
              loading={loading}
              disabled={currentLineup.filter(slot => slot.user_card).length === 0}
            >
              Submit Lineup ({currentLineup.filter(slot => slot.user_card).length}/7 players)
            </Button>
          </div>
        )}
      </div>

      {/* Player Modal */}
      {selectedPlayerId && (
        <PlayerModal
          playerId={selectedPlayerId}
          isOpen={isPlayerModalOpen}
          onClose={() => {
            setIsPlayerModalOpen(false)
            setSelectedPlayerId(null)
          }}
        />
      )}

      {/* Token Selection Modal */}
      {selectedTokenSlot && (
        <TokenSelectionModal
          isOpen={isTokenModalOpen}
          onClose={() => {
            setIsTokenModalOpen(false)
            setSelectedTokenSlot(null)
          }}
          availableTokens={availableTokens}
          slotId={selectedTokenSlot}
          slotLabel={currentLineup.find(s => s.slot === selectedTokenSlot)?.label || selectedTokenSlot}
          currentToken={currentLineup.find(s => s.slot === selectedTokenSlot)?.applied_token}
          onTokenSelect={(token) => {
            onTokenApply?.(selectedTokenSlot, token)
          }}
        />
      )}
    </DragDropContext>
  )
}

export default LineupBuilder
