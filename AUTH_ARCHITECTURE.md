# Authentication Architecture

## Overview
Centralized authentication state management using React Context API to ensure consistent auth state across all pages.

## Architecture

### AuthContext (`/src/contexts/AuthContext.tsx`)
**Central authentication provider that manages:**
- User session state
- User teams data
- Loading states
- Sign in/out functionality
- Real-time team updates via Supabase subscriptions

**Key Features:**
1. **Single Source of Truth** - All components get auth state from one place
2. **Real-time Updates** - Automatically refreshes teams when database changes
3. **Automatic Session Management** - Handles token refresh and session persistence
4. **Consistent Sign Out** - Clears all state and storage properly

### Usage Across Components

#### Root Layout (`/src/app/layout.tsx`)
```tsx
<AuthProvider>
  <TeamSidebar />
  <main>{children}</main>
</AuthProvider>
```
- Wraps entire app to provide auth context globally

#### TeamSidebar (`/src/components/ui/TeamSidebar.tsx`)
```tsx
const { user, userTeams, loading, signOut } = useAuth()
```
- Gets user and teams from context
- Shows teams on ALL pages automatically
- Syncs across navigation

#### Team Creation (`/src/app/teams/create/page.tsx`)
```tsx
const { user, refreshTeams } = useAuth()
// After creating team:
await refreshTeams()
```
- Uses context to check auth
- Refreshes teams immediately after creation
- Sidebar updates automatically

## Auth Flow

### 1. **Sign In**
```
User signs in → AuthContext detects change → Loads teams → All components update
```

### 2. **Sign Out**
```
User signs out → AuthContext clears state → Redirects to home → Sidebar shows guest view
```

### 3. **Team Creation**
```
User creates team → API creates record → refreshTeams() called → Real-time subscription fires → Sidebar updates immediately
```

### 4. **Page Navigation**
```
User navigates to any page → Sidebar persists → Auth state maintained → Teams always visible
```

## Benefits

### ✅ **Consistency**
- Single auth state across entire app
- No more duplicate auth checks
- Prevents race conditions

### ✅ **Persistence**
- Auth state survives page navigation
- Teams always visible in sidebar
- Real-time sync with database

### ✅ **Performance**
- Single Supabase listener
- Efficient team loading with retry logic
- Debounced real-time updates

### ✅ **Developer Experience**
- Simple `useAuth()` hook
- Type-safe context
- Clear separation of concerns

## Components Modified

1. **Created:**
   - `/src/contexts/AuthContext.tsx` - Central auth provider

2. **Updated:**
   - `/src/app/layout.tsx` - Added AuthProvider wrapper
   - `/src/components/ui/TeamSidebar.tsx` - Uses useAuth() hook
   - `/src/app/teams/create/page.tsx` - Uses useAuth() for refresh

3. **Removed Dependencies:**
   - TeamSidebar no longer manages its own auth state
   - No more duplicate auth listeners
   - Simplified component logic

## Testing Checklist

- [x] Sign in/out works across all pages
- [x] Teams appear in sidebar immediately after creation
- [x] Sidebar persists when navigating between pages
- [x] Real-time updates work when teams are created
- [x] Sign out clears all state properly
- [x] Auth state survives page refresh
- [x] Guest view shows when not authenticated
- [x] Multiple tabs stay in sync

## Future Enhancements

1. **Protected Routes** - Middleware to check auth before page load
2. **Session Refresh** - Handle token expiration gracefully
3. **Optimistic Updates** - Show teams immediately before API confirms
4. **Team Caching** - Cache teams in localStorage for faster loads
5. **Error Boundaries** - Graceful fallbacks for auth failures
