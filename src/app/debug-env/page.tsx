'use client'

export default function DebugEnvPage() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-4">Environment Variables Debug</h1>
      
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">Supabase Configuration</h2>
        <pre className="text-sm text-gray-300 whitespace-pre-wrap">
          {JSON.stringify(envVars, null, 2)}
        </pre>
      </div>

      <div className="text-sm text-gray-400">
        <p>Check that both environment variables are properly set.</p>
        <p>The ANON_KEY should show as 'SET' (actual value hidden for security).</p>
        <p>The URL should be your Supabase project URL.</p>
      </div>
    </div>
  )
}
