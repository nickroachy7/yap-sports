'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

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

export type HeaderConfig = {
  title: string
  subtitle?: string
  rightStat?: {
    value: string | number
    label: string
  }
  showNavigation?: boolean
  tabs?: Tab[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  actions?: HeaderAction[]
  showFilters?: boolean
  filterContent?: ReactNode
  additionalContent?: ReactNode
}

type HeaderContextType = {
  headerConfig: HeaderConfig | null
  setHeaderConfig: (config: HeaderConfig | null) => void
  updateHeaderConfig: (updates: Partial<HeaderConfig>) => void
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig | null>(null)

  const updateHeaderConfig = (updates: Partial<HeaderConfig>) => {
    setHeaderConfig(prev => prev ? { ...prev, ...updates } : null)
  }

  return (
    <HeaderContext.Provider value={{ headerConfig, setHeaderConfig, updateHeaderConfig }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeader() {
  const context = useContext(HeaderContext)
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider')
  }
  return context
}


