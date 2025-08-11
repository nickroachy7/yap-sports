import { createSupabaseBrowserClient } from './supabaseClient'

export interface AuthResult {
  success: boolean
  userId: string | null
  error: string | null
  retryCount: number
}

export interface TeamLoadResult {
  success: boolean
  teams: any[]
  error: string | null
  retryCount: number
}

export interface PlayerLoadResult {
  success: boolean
  players: any[]
  error: string | null
  retryCount: number
}

/**
 * Robust authentication check with retry logic
 */
export async function checkAuthWithRetry(maxRetries = 3): Promise<AuthResult> {
  const supabase = createSupabaseBrowserClient()
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔐 Auth attempt ${attempt}/${maxRetries}`)
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error(`Auth error on attempt ${attempt}:`, error)
        if (attempt === maxRetries) {
          return {
            success: false,
            userId: null,
            error: error.message,
            retryCount: attempt
          }
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        continue
      }
      
      if (!session?.user?.id) {
        return {
          success: false,
          userId: null,
          error: 'No authenticated session found',
          retryCount: attempt
        }
      }
      
      console.log(`✅ Auth successful on attempt ${attempt}`)
      return {
        success: true,
        userId: session.user.id,
        error: null,
        retryCount: attempt
      }
      
    } catch (error) {
      console.error(`Auth exception on attempt ${attempt}:`, error)
      if (attempt === maxRetries) {
        return {
          success: false,
          userId: null,
          error: error instanceof Error ? error.message : 'Authentication failed',
          retryCount: attempt
        }
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
  
  return {
    success: false,
    userId: null,
    error: 'Max retries exceeded',
    retryCount: maxRetries
  }
}

/**
 * Load user teams with retry logic
 */
export async function loadTeamsWithRetry(userId: string, maxRetries = 3): Promise<TeamLoadResult> {
  const supabase = createSupabaseBrowserClient()
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`👥 Teams loading attempt ${attempt}/${maxRetries} for user: ${userId}`)
      
      const { data: teams, error } = await supabase
        .from('user_teams')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error(`Teams loading error on attempt ${attempt}:`, error)
        if (attempt === maxRetries) {
          return {
            success: false,
            teams: [],
            error: error.message,
            retryCount: attempt
          }
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        continue
      }
      
      console.log(`✅ Teams loaded successfully on attempt ${attempt}:`, teams?.length || 0)
      return {
        success: true,
        teams: teams || [],
        error: null,
        retryCount: attempt
      }
      
    } catch (error) {
      console.error(`Teams loading exception on attempt ${attempt}:`, error)
      if (attempt === maxRetries) {
        return {
          success: false,
          teams: [],
          error: error instanceof Error ? error.message : 'Teams loading failed',
          retryCount: attempt
        }
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
  
  return {
    success: false,
    teams: [],
    error: 'Max retries exceeded',
    retryCount: maxRetries
  }
}

/**
 * Load players with retry logic
 */
export async function loadPlayersWithRetry(maxRetries = 3): Promise<PlayerLoadResult> {
  const supabase = createSupabaseBrowserClient()
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🏈 Players loading attempt ${attempt}/${maxRetries}`)
      
      const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .eq('active', true)
        .order('last_name', { ascending: true })
      
      if (error) {
        console.error(`Players loading error on attempt ${attempt}:`, error)
        if (attempt === maxRetries) {
          return {
            success: false,
            players: [],
            error: error.message,
            retryCount: attempt
          }
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        continue
      }
      
      console.log(`✅ Players loaded successfully on attempt ${attempt}:`, players?.length || 0)
      return {
        success: true,
        players: players || [],
        error: null,
        retryCount: attempt
      }
      
    } catch (error) {
      console.error(`Players loading exception on attempt ${attempt}:`, error)
      if (attempt === maxRetries) {
        return {
          success: false,
          players: [],
          error: error instanceof Error ? error.message : 'Players loading failed',
          retryCount: attempt
        }
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
  
  return {
    success: false,
    players: [],
    error: 'Max retries exceeded',
    retryCount: maxRetries
  }
}

/**
 * Test database connectivity
 */
export async function testDatabaseConnection(): Promise<{ success: boolean; error: string | null; responseTime: number }> {
  const supabase = createSupabaseBrowserClient()
  const startTime = Date.now()
  
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id')
      .limit(1)
    
    const responseTime = Date.now() - startTime
    
    if (error) {
      return {
        success: false,
        error: error.message,
        responseTime
      }
    }
    
    return {
      success: true,
      error: null,
      responseTime
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database connection failed',
      responseTime: Date.now() - startTime
    }
  }
}

/**
 * Wait for authentication to be ready
 */
export async function waitForAuth(timeoutMs = 10000): Promise<AuthResult> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeoutMs) {
    const authResult = await checkAuthWithRetry(1)
    
    if (authResult.success) {
      return authResult
    }
    
    // If we get a clear "no session" result, don't keep retrying
    if (authResult.error === 'No authenticated session found') {
      return authResult
    }
    
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return {
    success: false,
    userId: null,
    error: 'Authentication timeout',
    retryCount: 0
  }
}
