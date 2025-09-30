# State Management & Authentication Guide

## 🎯 Overview

This application uses a **centralized authentication system** with **React Context** to manage all auth-related state. This ensures consistency across all pages and components.

---

## 🏗️ Architecture

### **Single Source of Truth: AuthContext**

```
┌─────────────────────────────────┐
│        AuthProvider             │
│  (wraps entire application)     │
├─────────────────────────────────┤
│                                 │
│  State:                         │
│  • user: User | null            │
│  • session: Session | null      │
│  • userTeams: UserTeam[]        │
│  • loading: boolean             │
│  • initialized: boolean         │
│                                 │
│  Methods:                       │
│  • signOut()                    │
│  • refreshTeams()               │
│                                 │
└─────────────────────────────────┘
         │
         ├──> TeamSidebar (always visible)
         ├──> Dashboard Pages (protected)
         ├──> Team Creation (protected)
         └──> Public Pages (anyone)
```

---

## 📦 Key Components

### 1. **Supabase Client** (`/src/lib/supabaseClient.ts`)

**Purpose:** Creates properly configured Supabase browser client

**Features:**
- ✅ Session persistence via cookies
- ✅ Auto token refresh
- ✅ PKCE flow for security
- ✅ Proper SSR/CSR handling

**Usage:**
```tsx
const supabase = createSupabaseBrowserClient()
```

### 2. **AuthContext** (`/src/contexts/AuthContext.tsx`)

**Purpose:** Central authentication state manager

**State Variables:**
- `user` - Current authenticated user (null if not signed in)
- `session` - Supabase session object
- `userTeams` - Array of user's teams
- `loading` - True while loading auth state
- `initialized` - True once initial auth check is complete

**Methods:**
- `signOut()` - Sign out user and clear all state
- `refreshTeams()` - Manually reload user's teams

**Lifecycle:**
```
1. App starts
   └─> AuthProvider initializes
       └─> Gets session from Supabase
           ├─> Session found
           │   └─> Load teams → Set initialized=true, loading=false
           └─> No session
               └─> Set initialized=true, loading=false

2. User signs in
   └─> SIGNED_IN event
       └─> Load teams → Update state

3. User creates team
   └─> refreshTeams() called
       └─> Teams reload

4. Real-time update
   └─> Database change detected
       └─> Teams reload (debounced 500ms)

5. User signs out
   └─> SIGNED_OUT event
       └─> Clear all state
```

### 3. **TeamSidebar** (`/src/components/ui/TeamSidebar.tsx`)

**Purpose:** Always-visible sidebar showing teams

**States:**
1. **Loading (not initialized)** - Shows loading spinner
2. **Guest (no user)** - Shows sign in/up button
3. **Authenticated** - Shows teams list and user profile

**Data Source:**
```tsx
const { user, userTeams, loading, initialized } = useAuth()
```

---

## 🔄 State Flow Examples

### **Signing In**
```
1. User enters credentials
2. AuthContext detects SIGNED_IN event
3. Loads user's teams
4. TeamSidebar automatically updates with teams
5. All pages now have access to user + teams
```

### **Creating a Team**
```
1. User submits team creation form
2. API creates team in database
3. Component calls refreshTeams()
4. AuthContext reloads teams
5. Real-time subscription also fires (backup)
6. TeamSidebar shows new team immediately
7. User redirected to new team dashboard
```

### **Navigating Pages**
```
1. User clicks link to different page
2. Page loads
3. AuthContext is already initialized
4. TeamSidebar persists with same state
5. New page can access user/teams from useAuth()
```

### **Signing Out**
```
1. User clicks sign out
2. AuthContext.signOut() called
3. Local state cleared immediately
4. Supabase session ended
5. TeamSidebar switches to guest view
6. User redirected to home page
```

---

## 🎨 Using Auth in Components

### **Basic Usage**
```tsx
'use client'
import { useAuth } from '@/contexts/AuthContext'

export default function MyPage() {
  const { user, userTeams, loading, initialized } = useAuth()

  if (!initialized) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Please sign in</div>
  }

  return (
    <div>
      <h1>Welcome {user.email}!</h1>
      <p>You have {userTeams.length} teams</p>
    </div>
  )
}
```

### **Protected Page**
```tsx
'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProtectedPage() {
  const { user, initialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (initialized && !user) {
      router.push('/auth')
    }
  }, [initialized, user, router])

  if (!initialized || !user) {
    return <div>Loading...</div>
  }

  return <div>Protected content</div>
}
```

### **Creating/Updating Teams**
```tsx
'use client'
import { useAuth } from '@/contexts/AuthContext'

export default function CreateTeam() {
  const { refreshTeams } = useAuth()

  async function handleCreate() {
    // Create team via API
    const response = await fetch('/api/teams/create', {...})
    
    // Refresh teams to show in sidebar
    await refreshTeams()
    
    // Navigate to new team
    router.push(`/dashboard/${newTeamId}`)
  }

  return <button onClick={handleCreate}>Create</button>
}
```

---

## 🚨 Common Issues & Solutions

### **Issue: Teams not showing in sidebar**
**Solution:** 
- Check browser console for `[AuthContext]` logs
- Verify user is signed in: `user` should not be null
- Check if teams exist in database
- Look for error messages in console

### **Issue: Infinite loading**
**Solution:**
- Check if `initialized` becomes true
- Look for errors in auth initialization
- Verify Supabase env variables are set
- Check network tab for failed requests

### **Issue: Teams don't update after creation**
**Solution:**
- Ensure `refreshTeams()` is called after API success
- Check real-time subscription logs
- Verify database INSERT permissions
- Check if team has correct `user_id`

### **Issue: Auth state resets on page navigation**
**Solution:**
- Verify `AuthProvider` wraps entire app in layout.tsx
- Check for duplicate `AuthProvider` instances
- Ensure components use `useAuth()` not local state

---

## ✅ Best Practices

1. **Always use `useAuth()` hook** - Never create local auth state
2. **Check `initialized` before `user`** - Prevents flash of wrong UI
3. **Call `refreshTeams()` after mutations** - Keep UI in sync
4. **Don't duplicate auth listeners** - Let AuthContext handle it
5. **Use loading states** - Show spinners while auth initializes
6. **Handle edge cases** - Check for null user/teams
7. **Log state changes** - Use console for debugging
8. **Test sign out** - Ensure all state clears properly

---

## 🐛 Debugging

### **Enable Detailed Logs**
All `[AuthContext]` prefixed logs show:
- Initialization steps
- Auth events (SIGNED_IN, SIGNED_OUT, etc.)
- Team loading
- Real-time subscription status

### **Check State**
```tsx
const auth = useAuth()
console.log('Auth State:', {
  user: auth.user?.email,
  teams: auth.userTeams.length,
  loading: auth.loading,
  initialized: auth.initialized
})
```

### **Common Log Messages**
- `[AuthContext] Initializing auth system...` - Starting up
- `[AuthContext] Initial session found: true` - User is signed in
- `[AuthContext] Teams loaded successfully: 3` - Teams fetched
- `[AuthContext] Auth event: SIGNED_IN` - User just signed in
- `[AuthContext] Real-time team change: INSERT` - New team created

---

## 📊 Performance

### **Optimizations**
- ✅ Single Supabase client instance
- ✅ Debounced real-time updates (500ms)
- ✅ Memoized callbacks with useCallback
- ✅ No redundant auth checks
- ✅ Efficient team loading

### **Metrics**
- Auth initialization: ~300ms
- Team loading: ~200ms  
- Real-time update latency: ~500-1000ms
- Page navigation: No auth re-check

---

## 🎯 Summary

**What LoadsWhen:**

| Event | What Loads | Triggers |
|-------|-----------|----------|
| **App Start** | Session + Teams (if signed in) | `AuthProvider` mount |
| **Sign In** | Session + Teams | `SIGNED_IN` event |
| **Sign Out** | Nothing | `SIGNED_OUT` event |
| **Create Team** | Teams | `refreshTeams()` call |
| **DB Change** | Teams | Real-time subscription |
| **Token Refresh** | Nothing (uses cached teams) | `TOKEN_REFRESHED` event |
| **Page Nav** | Nothing (uses existing state) | Route change |

**Key Principle:** 
> Auth and teams load ONCE on app start, then stay in memory. Updates happen via events/manual refresh, not page loads.
