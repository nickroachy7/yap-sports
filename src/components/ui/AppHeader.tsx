'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react'
import { SearchInput, Select, Button } from '@/components/ui'
import { ReactNode } from 'react'

/**
 * AppHeader - Unified header component for consistent navigation across the app
 * 
 * This header provides:
 * - Back/Forward navigation arrows
 * - Page title and subtitle
 * - Right-side stats or info
 * - Tab navigation with badges
 * - Action buttons (settings, notifications, etc.)
 * - Optional filter bar
 * - Optional additional content (like lineup grids)
 * 
 * Used on: Teams Dashboard, Players Page, and other major sections
 */

export type Tab = {
  id: string
  label: string
  icon: LucideIcon
  badge?: number | null
}

export type HeaderAction = {
  icon: LucideIcon
  label: string
  onClick: () => void
  badge?: boolean
}

export type AppHeaderProps = {
  // Page identification
  title: string
  subtitle?: string
  rightStat?: {
    value: string | number
    label: string
  }
  
  // Navigation
  showNavigation?: boolean
  
  // Tabs
  tabs?: Tab[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  
  // Actions (icons on right side)
  actions?: HeaderAction[]
  
  // Filters (optional, shown below tabs)
  showFilters?: boolean
  filterContent?: ReactNode
  
  // Optional additional content
  additionalContent?: ReactNode
}

export function AppHeader({
  title,
  subtitle,
  rightStat,
  showNavigation = true,
  tabs = [],
  activeTab,
  onTabChange,
  actions = [],
  showFilters = false,
  filterContent,
  additionalContent
}: AppHeaderProps) {
  const router = useRouter()

  return (
    <div className="sticky top-0 z-50 border-b" style={{backgroundColor: 'var(--color-obsidian)', borderColor: 'var(--color-steel)'}}>
      {/* Top Info Bar - Minimal & Clean */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center space-x-4">
          {/* Navigation Arrows */}
          {showNavigation && (
            <div className="flex items-center space-x-1 mr-2">
              <button 
                className="p-2 text-gray-500 hover:text-white transition-colors"
                title="Go Back"
                onClick={() => router.back()}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                className="p-2 text-gray-500 hover:text-white transition-colors"
                title="Go Forward"
                onClick={() => router.forward()}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          <h1 className="text-xl font-bold text-white">{title}</h1>
          
          {subtitle && (
            <div className="flex items-center space-x-3 text-sm">
              <span className="text-gray-500">·</span>
              <span className="text-gray-400">{subtitle}</span>
            </div>
          )}
        </div>
        
        {/* Right Side - Stats or Actions */}
        <div className="flex items-center space-x-4">
          {rightStat && (
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{rightStat.value}</div>
              <div className="text-xs text-gray-400">{rightStat.label}</div>
            </div>
          )}
          
          {/* Action Icons */}
          {actions.length > 0 && (
            <div className="flex items-center space-x-1">
              {actions.map((action, idx) => (
                <button 
                  key={idx}
                  className="p-2 text-gray-500 hover:text-white transition-colors relative"
                  title={action.label}
                  onClick={action.onClick}
                >
                  <action.icon className="w-5 h-5" />
                  {action.badge && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation - Sleek Design */}
      {tabs.length > 0 && (
        <div className="flex space-x-0 border-t px-6" style={{borderColor: 'var(--color-steel)'}}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`relative px-6 py-3 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'text-green-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge !== undefined && (
                  <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-700 text-gray-300">
                    {tab.badge}
                  </span>
                )}
              </div>
              {/* Active indicator - bottom border */}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400"></div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Filter Bar - Optional, shown when needed */}
      {showFilters && filterContent && (
        <div className="px-6 py-3 border-t" style={{borderColor: 'var(--color-steel)'}}>
          {filterContent}
        </div>
      )}

      {/* Additional Content - For custom sections like lineup grids */}
      {additionalContent && (
        <div className="border-t" style={{borderColor: 'var(--color-steel)'}}>
          {additionalContent}
        </div>
      )}
    </div>
  )
}

// Export type for external use
export type { Tab as AppHeaderTab }

