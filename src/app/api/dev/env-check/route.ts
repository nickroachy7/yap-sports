import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envVars = {
      BALLDONTLIE_API_KEY: process.env.BALLDONTLIE_API_KEY ? '***PRESENT***' : 'MISSING',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '***PRESENT***' : 'MISSING',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***PRESENT***' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***PRESENT***' : 'MISSING',
      NODE_ENV: process.env.NODE_ENV,
    };

    return NextResponse.json({
      success: true,
      message: 'Environment check completed',
      environment: envVars,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: err?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
