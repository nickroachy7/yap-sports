'use client'

import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  children: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    children,
    className = '',
    ...props
  }, ref) => {
    // Base button classes
    const baseClasses = 'btn'
    
    // Variant classes
    const variantClasses = {
      primary: 'btn-primary',
      success: 'btn-success', 
      warning: 'btn-warning',
      danger: 'btn-danger',
      ghost: 'btn-ghost',
      outline: 'btn-outline'
    }
    
    // Size classes
    const sizeClasses = {
      sm: 'text-sm px-3 py-2',
      md: 'text-base px-6 py-3',
      lg: 'text-lg px-8 py-4',
      xl: 'text-xl px-10 py-5'
    }
    
    // Combined classes
    const buttonClasses = cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && 'w-full',
      (disabled || loading) && 'opacity-50 cursor-not-allowed',
      className
    )
    
    const buttonContent = (
      <>
        {loading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
          />
        )}
        {icon && iconPosition === 'left' && !loading && (
          <span className="mr-2">{icon}</span>
        )}
        {children}
        {icon && iconPosition === 'right' && !loading && (
          <span className="ml-2">{icon}</span>
        )}
      </>
    )
    
    return (
      <motion.button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
        transition={{
          duration: 0.15,
          ease: 'easeInOut'
        }}
        {...props}
      >
        {buttonContent}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export default Button
