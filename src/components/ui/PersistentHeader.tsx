'use client'

import { useHeader } from '@/contexts/HeaderContext'
import { AppHeader } from './AppHeader'

/**
 * PersistentHeader - Sits in root layout and renders based on HeaderContext
 * This component persists across page navigations, just like the sidebar
 */
export function PersistentHeader() {
  const { headerConfig } = useHeader()

  // Don't render anything if no header config is set
  if (!headerConfig) {
    return null
  }

  return (
    <AppHeader
      title={headerConfig.title}
      subtitle={headerConfig.subtitle}
      rightStat={headerConfig.rightStat}
      showNavigation={headerConfig.showNavigation}
      tabs={headerConfig.tabs}
      activeTab={headerConfig.activeTab}
      onTabChange={headerConfig.onTabChange}
      actions={headerConfig.actions}
      showFilters={headerConfig.showFilters}
      filterContent={headerConfig.filterContent}
      additionalContent={headerConfig.additionalContent}
    />
  )
}


