import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    )
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    cookies: {
      get(name) {
        if (typeof document === 'undefined') return undefined
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        const cookieValue = parts.length === 2 ? parts.pop()?.split(';').shift() : undefined
        console.log(`[Supabase Cookie] Getting: ${name} = ${cookieValue ? 'found' : 'not found'}`)
        return cookieValue
      },
      set(name, value, options) {
        if (typeof document === 'undefined') return
        let cookie = `${name}=${value}`
        if (options?.maxAge) cookie += `; max-age=${options.maxAge}`
        else cookie += `; max-age=${60 * 60 * 24 * 365}` // Default 1 year
        cookie += `; path=${options?.path || '/'}`
        cookie += `; samesite=${options?.sameSite || 'lax'}`
        // Only set secure in production
        if (window.location.protocol === 'https:') {
          cookie += `; secure`
        }
        if (options?.domain) cookie += `; domain=${options.domain}`
        console.log(`[Supabase Cookie] Setting: ${name} = ${value.substring(0, 20)}...`)
        document.cookie = cookie
      },
      remove(name, options) {
        if (typeof document === 'undefined') return
        console.log(`[Supabase Cookie] Removing: ${name}`)
        this.set(name, '', { ...options, maxAge: 0 })
      }
    }
  })
}