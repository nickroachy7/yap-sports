# Unified Persistent Header System

## Overview
Created a persistent header system that stays visible across all page navigations without refreshing, just like the sidebar. The header adapts to each page's context while maintaining consistent navigation and styling.

## Key Feature: **No Refresh Required**
The header persists in the root layout and updates based on page context. Navigate between pages and the header smoothly transitions without any page reload!

## Architecture

### Core Components

1. **HeaderContext** (`/src/contexts/HeaderContext.tsx`)
   - React Context that manages header configuration across the app
   - Single source of truth for current header state

2. **PersistentHeader** (`/src/components/ui/PersistentHeader.tsx`)
   - Lives in the root layout (renders once, never unmounts)
   - Reads configuration from HeaderContext
   - Updates smoothly as you navigate

3. **AppHeader** (`/src/components/ui/AppHeader.tsx`)
   - The actual header UI component
   - Renders all visual elements (nav arrows, tabs, filters, etc.)

4. **usePageHeader** Hook (`/src/hooks/usePageHeader.ts`)
   - Pages use this hook to register their header configuration
   - Automatically updates the persistent header

### How It Works

```
Root Layout (layout.tsx)
  └─ HeaderProvider (wraps entire app)
      └─ PersistentHeader (persists across navigation)
          └─ AppHeader (renders current config)

Page Component (e.g., players/page.tsx)
  └─ usePageHeader({ title, tabs, ... })
      └─ Updates HeaderContext
          └─ PersistentHeader re-renders with new config
```

## Features

### 1. **Navigation Arrows**
- Back and Forward buttons in the top-left corner
- Uses `router.back()` and `router.forward()` for browser-like navigation
- Helps users navigate between pages seamlessly

### 2. **Page Title & Subtitle**
- Main title (e.g., "NFL Players", team name)
- Subtitle with contextual information (e.g., "2025 Season · 1,200 Players")

### 3. **Right-Side Stats**
- Displays key metrics relevant to the page
- Configurable value and label

### 4. **Tab Navigation**
- Sleek tab system with icons and badges
- Active tab highlighted with green accent and bottom border
- Badge counts for items in each tab

### 5. **Action Buttons**
- Customizable icon buttons (Settings, Notifications, etc.)
- Support for notification badges (red dot indicator)
- Hover effects

### 6. **Filter Bar (Optional)**
- Shown/hidden based on active tab
- Accepts custom filter content as JSX
- Clean border separation

### 7. **Additional Content (Optional)**
- For custom sections like lineup grids
- Full-width integration with sticky header

## Usage Examples

### Simple Example - Players Page
```tsx
import { usePageHeader } from '@/hooks/usePageHeader'
import { Users, TrendingUp } from 'lucide-react'

export default function PlayersPage() {
  const [activeTab, setActiveTab] = useState('all-players')
  
  // Register header configuration - it persists automatically!
  usePageHeader({
    title: "NFL Players",
    subtitle: `2025 Season · ${allPlayers.length.toLocaleString()} Players`,
    rightStat: {
      value: filteredPlayers.length.toLocaleString(),
      label: 'Filtered Results'
    },
    showNavigation: true,
    tabs: [
      { id: 'all-players', label: 'All Players', icon: Users, badge: 1200 },
      { id: 'trending', label: 'Trending', icon: TrendingUp, badge: null }
    ],
    activeTab: activeTab,
    onTabChange: (tabId) => setActiveTab(tabId),
    showFilters: activeTab === 'all-players',
    filterContent: <FilterBar />
  })

  return (
    <StandardLayout>
      {/* Your page content */}
    </StandardLayout>
  )
}
```

### Advanced Example - Teams Dashboard Page
```tsx
import { usePageHeader } from '@/hooks/usePageHeader'
import { Trophy, LayoutGrid, Store, ClipboardList } from 'lucide-react'

export default function TeamDashboard() {
  const [activeTab, setActiveTab] = useState('lineup')
  
  // Register header with actions and additional content
  usePageHeader({
    title: currentTeam.name,
    subtitle: `Week ${currentWeek.week_number} · ${coins.toLocaleString()} Coins`,
    showNavigation: true,
    tabs: [
      { id: 'lineup', label: 'Lineup', icon: Trophy, badge: null },
      { id: 'collection', label: 'Collection', icon: LayoutGrid, badge: 45 },
      { id: 'store', label: 'Store', icon: Store, badge: 3 },
      { id: 'activity', label: 'Activity', icon: ClipboardList, badge: null }
    ],
    activeTab: activeTab,
    onTabChange: (tabId) => setActiveTab(tabId),
    actions: [
      { icon: BarChart3, label: 'Statistics', onClick: handleStats },
      { icon: Settings, label: 'Settings', onClick: handleSettings },
      { icon: Bell, label: 'Notifications', onClick: handleNotifications, badge: true }
    ],
    showFilters: activeTab === 'collection',
    filterContent: <CollectionFilters />,
    additionalContent: <LineupGrid />
  })

  return (
    <StandardLayout>
      {/* Your page content */}
    </StandardLayout>
  )
}
```

## Props Reference

### AppHeaderProps
```typescript
{
  // Page identification
  title: string                    // Main page title
  subtitle?: string                // Subtitle with contextual info
  rightStat?: {                    // Optional stats display
    value: string | number
    label: string
  }
  
  // Navigation
  showNavigation?: boolean         // Show back/forward arrows (default: true)
  
  // Tabs
  tabs?: Tab[]                     // Array of tab configurations
  activeTab?: string               // Currently active tab ID
  onTabChange?: (tabId: string) => void
  
  // Actions (right-side icons)
  actions?: HeaderAction[]         // Array of action buttons
  
  // Filters (optional bar below tabs)
  showFilters?: boolean            // Show filter bar
  filterContent?: ReactNode        // Custom filter JSX
  
  // Additional content
  additionalContent?: ReactNode    // Custom content (e.g., lineup grid)
}
```

### Tab Type
```typescript
{
  id: string           // Unique tab identifier
  label: string        // Display label
  icon: LucideIcon     // Lucide icon component
  badge?: number | null // Optional badge count
}
```

### HeaderAction Type
```typescript
{
  icon: LucideIcon     // Lucide icon component
  label: string        // Tooltip/aria-label
  onClick: () => void  // Click handler
  badge?: boolean      // Show notification dot
}
```

## Benefits

### 🚀 Performance & UX
1. **No Page Refresh**: Header stays mounted and updates smoothly (like sidebar)
2. **Instant Transitions**: Tab switches and navigation feel instantaneous
3. **Better UX**: Users get immediate feedback without waiting for reloads

### 🎨 Consistency
4. **Same Look Everywhere**: Header style and behavior unified across all pages
5. **Predictable Navigation**: Back/forward arrows work consistently

### 🛠️ Developer Experience
6. **Easy to Use**: Just call `usePageHeader()` hook in any page
7. **Maintainable**: Update header logic once, applies everywhere
8. **Type-Safe**: Full TypeScript support
9. **Flexible**: Highly configurable for different page needs
10. **Accessible**: Proper ARIA labels and hover states

## Pages Currently Using AppHeader

✅ **Players Page** (`/src/app/players/page.tsx`)
- Navigation arrows
- "All Players" and "Trending" tabs
- Search and filter bar
- Player count stats

✅ **Teams Dashboard** (`/src/app/dashboard/[teamId]/page.tsx`)
- Navigation arrows
- 4 tabs: Lineup, Collection, Store, Activity
- Action buttons: Statistics, Settings, Notifications
- Collection filters
- Lineup grid in additional content

## Adding Header to New Pages

It's super simple! Just 3 steps:

```tsx
// 1. Import the hook
import { usePageHeader } from '@/hooks/usePageHeader'

// 2. Call it in your component with your config
export default function MyNewPage() {
  usePageHeader({
    title: "My Page Title",
    subtitle: "Some context info",
    showNavigation: true,
    // ... other config
  })

  // 3. That's it! Header is now persistent across navigation
  return <StandardLayout>{/* your content */}</StandardLayout>
}
```

## Future Enhancements

- Add keyboard shortcuts for navigation (Cmd/Ctrl + [ for back, ] for forward)
- Mobile responsive design improvements
- Animation transitions between tabs
- Search history/suggestions
- Breadcrumb navigation option
- Remember last visited tab per page

