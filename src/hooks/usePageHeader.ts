'use client'

import { useEffect } from 'react'
import { useHeader, HeaderConfig } from '@/contexts/HeaderContext'

/**
 * usePageHeader - Hook for pages to register their header configuration
 * The header will persist across navigations and update when config changes
 * 
 * @example
 * ```tsx
 * usePageHeader({
 *   title: "NFL Players",
 *   subtitle: "2025 Season",
 *   tabs: [...],
 *   activeTab: activeTab,
 *   onTabChange: setActiveTab
 * })
 * ```
 */
export function usePageHeader(config: HeaderConfig) {
  const { setHeaderConfig } = useHeader()

  useEffect(() => {
    setHeaderConfig(config)

    // Clean up when component unmounts (optional - keeps last header)
    // return () => setHeaderConfig(null)
  }, [
    config.title,
    config.subtitle,
    config.rightStat?.value,
    config.rightStat?.label,
    config.showNavigation,
    config.activeTab,
    config.showFilters,
    // Note: We're watching primitive values, not the whole objects
    // This prevents unnecessary re-renders while still updating when key values change
  ])

  // Also provide updateHeaderConfig for dynamic updates
  const { updateHeaderConfig } = useHeader()
  
  return { updateHeaderConfig }
}


