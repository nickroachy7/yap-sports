'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface StandardLayoutProps {
  children: React.ReactNode
  className?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  rightContent?: React.ReactNode
  size?: 'default' | 'large'
  className?: string
}

interface ContentSectionProps {
  children: React.ReactNode
  className?: string
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

// Standard page container with consistent spacing
export function StandardLayout({ children, className }: StandardLayoutProps) {
  return (
    <div className={cn("min-h-screen", className)} style={{backgroundColor: 'var(--color-obsidian)'}}>
      {children}
    </div>
  )
}

// Standard page header with consistent styling
export function PageHeader({ 
  title, 
  description, 
  rightContent, 
  size = 'default',
  className 
}: PageHeaderProps) {
  return (
    <header 
      className={cn("border-b", className)}
      style={{backgroundColor: 'var(--color-midnight)', borderColor: 'var(--color-steel)'}}
    >
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className={cn(
              "font-black text-white mb-2",
              size === 'large' ? 'text-4xl' : 'text-3xl'
            )}>
              {title}
            </h1>
            {description && (
              <p className="text-lg" style={{color: 'var(--color-text-secondary)'}}>
                {description}
              </p>
            )}
          </div>
          {rightContent && (
            <div className="ml-8 flex-shrink-0">
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// Standard content container with consistent spacing
export function ContentContainer({ children, className }: StandardLayoutProps) {
  return (
    <div className={cn("max-w-7xl mx-auto", className)}>
      {children}
    </div>
  )
}

// Standard content section with consistent spacing
export function ContentSection({ 
  children, 
  className, 
  spacing = 'md' 
}: ContentSectionProps) {
  const spacingClasses = {
    none: '',
    sm: 'py-4',
    md: 'py-6', 
    lg: 'py-8'
  }

  return (
    <section className={cn(spacingClasses[spacing], className)}>
      {children}
    </section>
  )
}

// Standard section header for consistent section styling
interface SectionHeaderProps {
  title: string
  description?: string
  rightContent?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, description, rightContent, className }: SectionHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
          {description && (
            <p className="text-base" style={{color: 'var(--color-text-secondary)'}}>
              {description}
            </p>
          )}
        </div>
        {rightContent && (
          <div className="ml-6 flex-shrink-0">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  )
}

// Standard filter section for consistent filter layouts
interface FilterSectionProps {
  children: React.ReactNode
  className?: string
}

export function FilterSection({ children, className }: FilterSectionProps) {
  return (
    <div 
      className={cn("border-b", className)}
      style={{backgroundColor: 'var(--color-midnight)', borderColor: 'var(--color-steel)'}}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        {children}
      </div>
    </div>
  )
}
