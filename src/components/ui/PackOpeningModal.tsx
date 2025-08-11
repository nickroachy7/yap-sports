'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { cn } from '@/lib/utils'
import PlayerCard from './PlayerCard'
import Button from './Button'

interface PackOpeningModalProps {
  isOpen: boolean
  onClose: () => void
  packName: string
  onOpenPack: () => Promise<any>
}

interface RevealedCard {
  id: string
  rarity: string
  player_name: string
  position: string
  team_info?: {
    abbreviation: string
    name: string
    primary_color?: string
  }
  base_sell_value: number
  base_contracts: number
}

interface RevealedToken {
  id: string
  name: string
  description: string
  rarity: string
  condition_type: string
  condition_value: number
  bonus_type: string
  bonus_value: number
}

type AnimationPhase = 'idle' | 'anticipation' | 'opening' | 'revealing' | 'showcase' | 'complete'

export default function PackOpeningModal({ 
  isOpen, 
  onClose, 
  packName, 
  onOpenPack 
}: PackOpeningModalProps) {
  const [phase, setPhase] = useState<AnimationPhase>('idle')
  const [revealedCards, setRevealedCards] = useState<RevealedCard[]>([])
  const [revealedTokens, setRevealedTokens] = useState<RevealedToken[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const packControls = useAnimation()
  const backgroundControls = useAnimation()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase('idle')
      setRevealedCards([])
      setRevealedTokens([])
      setCurrentCardIndex(0)
      setError(null)
      setLoading(false)
    }
  }, [isOpen])

  const handleOpenPack = useCallback(async () => {
    if (loading || phase !== 'idle') return
    
    try {
      setLoading(true)
      setError(null)
      setPhase('anticipation')
      
      // Sophisticated anticipation phase
      await packControls.start({
        scale: [1, 1.05, 1],
        rotateY: [0, 5, -5, 0],
        transition: { duration: 1.5, ease: "easeInOut" }
      })
      
      setPhase('opening')
      
      // Elegant opening animation
      await Promise.all([
        packControls.start({
          scale: [1, 1.2, 0.8],
          rotateY: [0, 180],
          opacity: [1, 0.7, 0],
          transition: { duration: 2, ease: "easeInOut" }
        }),
        backgroundControls.start({
          opacity: [0, 0.3, 0.8],
          transition: { duration: 2, ease: "easeInOut" }
        })
      ])
      
      // Fetch pack contents
      const result = await onOpenPack()
      
      if (result.success) {
        setRevealedCards(result.contents.cards || [])
        setRevealedTokens(result.contents.tokens || [])
        setPhase('revealing')
        
        // Start elegant card reveal sequence
        setTimeout(() => {
          revealCardsSequentially(result.contents.cards || [])
        }, 300)
      } else {
        throw new Error(result.error || 'Failed to open pack')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error occurred')
      setPhase('idle')
      setLoading(false)
    }
  }, [loading, phase, packControls, backgroundControls, onOpenPack])

  const revealCardsSequentially = useCallback(async (cards: RevealedCard[]) => {
    for (let i = 0; i < cards.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600))
      setCurrentCardIndex(i + 1)
    }
    
    // Show showcase of best card
    await new Promise(resolve => setTimeout(resolve, 800))
    setPhase('showcase')
    setLoading(false)
    
    // Auto-close after showcase
    setTimeout(() => {
      setPhase('complete')
    }, 4000)
  }, [])

  const handleClose = useCallback(() => {
    if (phase === 'opening' || phase === 'anticipation') return
    setPhase('idle')
    onClose()
  }, [phase, onClose])

  const getRarityStyle = (rarity: string) => {
    const styles = {
      common: {
        borderColor: '#9E9E9E',
        boxShadow: '0 0 30px rgba(158, 158, 158, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        background: 'linear-gradient(135deg, rgba(158, 158, 158, 0.1) 0%, rgba(158, 158, 158, 0.05) 100%)'
      },
      uncommon: {
        borderColor: '#22C55E',
        boxShadow: '0 0 30px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)'
      },
      rare: {
        borderColor: '#DC2626',
        boxShadow: '0 0 40px rgba(220, 38, 38, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(220, 38, 38, 0.05) 100%)'
      },
      epic: {
        borderColor: '#8A2BE2',
        boxShadow: '0 0 50px rgba(138, 43, 226, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.25) 0%, rgba(138, 43, 226, 0.05) 100%)'
      },
      legendary: {
        borderColor: '#FFB700',
        boxShadow: '0 0 60px rgba(255, 183, 0, 0.8), 0 0 30px rgba(255, 183, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        background: 'linear-gradient(135deg, rgba(255, 183, 0, 0.3) 0%, rgba(255, 183, 0, 0.1) 100%)'
      }
    }
    return styles[rarity as keyof typeof styles] || styles.common
  }

  const getBestCard = useCallback(() => {
    if (revealedCards.length === 0) return null
    const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 }
    return revealedCards.reduce((best, card) => {
      const cardValue = rarityOrder[card.rarity as keyof typeof rarityOrder] || 1
      const bestValue = rarityOrder[best.rarity as keyof typeof rarityOrder] || 1
      return cardValue > bestValue ? card : best
    })
  }, [revealedCards])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ 
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.95) 100%)',
            backdropFilter: 'blur(8px)'
          }}
        >
          {/* Ambient Background Animation */}
          <motion.div
            animate={backgroundControls}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
              opacity: 0
            }}
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10, transition: { duration: 0.2 } }}
            className="relative w-full max-w-5xl max-h-[95vh] overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(30, 30, 46, 0.95) 100%)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            }}
          >
            {/* Close Button */}
            {phase !== 'opening' && phase !== 'anticipation' && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleClose}
                className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
                whileHover={{ 
                  scale: 1.1, 
                  background: 'rgba(255, 255, 255, 0.2)' 
                }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-white text-lg font-light">×</span>
              </motion.button>
            )}

            {/* Idle State - Elegant Pack Presentation */}
            {phase === 'idle' && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 sm:p-12">
                <motion.div
                  animate={packControls}
                  whileHover={{ 
                    scale: 1.02,
                    rotateY: 5,
                    transition: { duration: 0.3 }
                  }}
                  className="mb-8 relative"
                >
                  {/* Pack Glow Effect */}
                  <motion.div
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 rounded-3xl"
                    style={{
                      background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
                      filter: 'blur(20px)'
                    }}
                  />
                  
                  {/* Pack Container */}
                  <div
                    className="relative w-48 h-64 sm:w-56 sm:h-72 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                      border: '2px solid rgba(59, 130, 246, 0.3)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="text-6xl sm:text-7xl opacity-90">📦</div>
                    
                    {/* Shimmer Effect */}
                    <motion.div
                      animate={{
                        x: [-100, 300],
                        opacity: [0, 0.6, 0]
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
                        width: '30%'
                      }}
                    />
                  </div>
                </motion.div>

                <div className="text-center mb-8">
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
                    {packName}
                  </h2>
                  <p className="text-lg text-gray-300 opacity-80">
                    Discover legendary players and rare bonuses
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 rounded-xl max-w-md"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <p className="text-red-300 text-center">{error}</p>
                  </motion.div>
                )}

                <motion.button
                  onClick={handleOpenPack}
                  disabled={loading}
                  className="relative px-12 py-4 rounded-xl text-lg font-semibold text-white transition-all duration-300 overflow-hidden group"
                  style={{
                    background: loading 
                      ? 'rgba(59, 130, 246, 0.3)' 
                      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
                  }}
                  whileHover={!loading ? { 
                    scale: 1.05,
                    boxShadow: '0 15px 40px rgba(59, 130, 246, 0.4)'
                  } : {}}
                  whileTap={!loading ? { scale: 0.98 } : {}}
                >
                  {/* Button Glow Effect */}
                  <motion.div
                    animate={loading ? {
                      x: [-20, 120],
                      opacity: [0, 0.5, 0]
                    } : {}}
                    transition={loading ? {
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    } : {}}
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)',
                      width: '30%'
                    }}
                  />
                  
                  <span className="relative z-10">
                    {loading ? 'Opening...' : 'Open Pack'}
                  </span>
                </motion.button>
              </div>
            )}

            {/* Anticipation Phase */}
            {phase === 'anticipation' && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
                <motion.div
                  animate={packControls}
                  className="mb-8 relative"
                >
                  <div
                    className="w-56 h-72 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
                      border: '2px solid rgba(59, 130, 246, 0.5)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <div className="text-7xl opacity-90">📦</div>
                  </div>
                </motion.div>

                <h2 className="text-2xl font-bold text-white mb-4">
                  Preparing your pack...
                </h2>
                
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity
                  }}
                  className="w-2 h-2 bg-blue-400 rounded-full"
                />
              </div>
            )}

            {/* Opening Phase */}
            {phase === 'opening' && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
                <motion.div
                  animate={packControls}
                  className="mb-8 relative"
                >
                  <div
                    className="w-56 h-72 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
                      border: '2px solid rgba(59, 130, 246, 0.5)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <div className="text-7xl opacity-90">📦</div>
                  </div>
                  
                  {/* Energy Burst Effect */}
                  <motion.div
                    animate={{
                      scale: [0, 2, 4],
                      opacity: [0.8, 0.3, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity
                    }}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)'
                    }}
                  />
                </motion.div>

                <h2 className="text-2xl font-bold text-white mb-6">
                  Opening {packName}...
                </h2>
                
                <div className="w-64 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    animate={{
                      width: ['0%', '100%']
                    }}
                    transition={{
                      duration: 2,
                      ease: "easeOut"
                    }}
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #3B82F6 0%, #8B5CF6 100%)'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Revealing Phase */}
            {phase === 'revealing' && (
              <div className="p-6 sm:p-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    Your Cards
                  </h2>
                  <p className="text-gray-300">
                    {currentCardIndex} of {revealedCards.length} revealed
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-96 overflow-y-auto">
                  {revealedCards.slice(0, currentCardIndex).map((card, index) => {
                    const rarityStyle = getRarityStyle(card.rarity)
                    return (
                      <motion.div
                        key={card.id}
                        initial={{ 
                          opacity: 0, 
                          rotateY: 180, 
                          scale: 0.8,
                          z: -100
                        }}
                        animate={{ 
                          opacity: 1, 
                          rotateY: 0, 
                          scale: 1,
                          z: 0
                        }}
                        transition={{ 
                          duration: 0.8,
                          delay: index * 0.15,
                          ease: [0.25, 0.46, 0.45, 0.94]
                        }}
                        className="relative"
                      >
                        {/* Card Reveal Effect */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.15 + 0.4 }}
                          className="absolute inset-0 rounded-xl pointer-events-none z-10"
                          style={{
                            ...rarityStyle,
                            borderWidth: '2px',
                            borderStyle: 'solid'
                          }}
                        />
                        
                        <PlayerCard
                          player={{
                            id: card.id,
                            name: card.player_name,
                            position: card.position,
                            team: card.team_info?.abbreviation || 'UNK'
                          }}
                          rarity={card.rarity as any}
                          size="compact"
                          contractsRemaining={card.base_contracts}
                          currentSellValue={card.base_sell_value}
                          showActions={false}
                          interactive={false}
                          className="relative z-0"
                        />
                      </motion.div>
                    )
                  })}
                </div>

                {/* Progress Indicator */}
                <div className="mt-8 flex justify-center">
                  <div className="flex space-x-2">
                    {revealedCards.map((_, index) => (
                      <motion.div
                        key={index}
                        initial={{ scale: 0 }}
                        animate={{ 
                          scale: index < currentCardIndex ? 1 : 0.5,
                          backgroundColor: index < currentCardIndex ? '#3B82F6' : '#374151'
                        }}
                        transition={{ delay: index * 0.1 }}
                        className="w-3 h-3 rounded-full"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Showcase Phase */}
            {phase === 'showcase' && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <motion.div
                  initial={{ scale: 0, rotateY: 180 }}
                  animate={{ scale: 1, rotateY: 0 }}
                  transition={{ 
                    duration: 0.8, 
                    ease: [0.25, 0.46, 0.45, 0.94] 
                  }}
                  className="mb-8"
                >
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                    Pack Opened!
                  </h2>
                  <p className="text-gray-300 text-lg">
                    {revealedCards.length} cards • {revealedTokens.length} tokens
                  </p>
                </motion.div>

                {getBestCard() && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-8"
                  >
                    <p className="text-gray-300 mb-4 text-lg">Best Pull:</p>
                    <motion.div
                      animate={{ 
                        scale: [1, 1.02, 1],
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="relative"
                      style={getRarityStyle(getBestCard()!.rarity)}
                    >
                      <PlayerCard
                        player={{
                          id: getBestCard()!.id,
                          name: getBestCard()!.player_name,
                          position: getBestCard()!.position,
                          team: getBestCard()!.team_info?.abbreviation || 'UNK'
                        }}
                        rarity={getBestCard()!.rarity as any}
                        size="default"
                        contractsRemaining={getBestCard()!.base_contracts}
                        currentSellValue={getBestCard()!.base_sell_value}
                        showActions={false}
                        interactive={false}
                      />
                    </motion.div>
                  </motion.div>
                )}

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  onClick={handleClose}
                  className="px-8 py-3 rounded-xl text-white font-semibold transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
                  }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: '0 15px 40px rgba(59, 130, 246, 0.4)'
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
