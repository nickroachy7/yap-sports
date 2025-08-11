'use client'

import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'elevated' | 'outlined'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
  children: React.ReactNode
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({
    variant = 'default',
    padding = 'md',
    interactive = false,
    children,
    className = '',
    ...props
  }, ref) => {
    
    const variantClasses = {
      default: 'card',
      elevated: 'card shadow-xl',
      outlined: 'border-2 border-slate-200 bg-white rounded-lg'
    }
    
    const paddingClasses = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    }
    
    const cardClasses = cn(
      variantClasses[variant],
      paddingClasses[padding],
      interactive && 'cursor-pointer transition-transform duration-200',
      className
    )
    
    return (
      <motion.div
        ref={ref}
        className={cardClasses}
        whileHover={interactive ? { y: -4, scale: 1.02 } : undefined}
        transition={{
          duration: 0.2,
          ease: 'easeInOut'
        }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

export default Card
