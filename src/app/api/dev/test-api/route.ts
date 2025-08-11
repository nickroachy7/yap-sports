import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('Testing Ball Don\'t Lie API connection...');

    // Check environment variables first
    const apiKey = process.env.BALLDONTLIE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'BALLDONTLIE_API_KEY not found in environment variables',
        details: 'Please add your Ball Don\'t Lie API key to .env.local'
      }, { status: 500 });
    }

    // Test basic import and API call
    try {
      // First try importing the SDK directly
      console.log('Testing direct SDK import...');
      const { BalldontlieAPI } = await import('@balldontlie/sdk');
      console.log('SDK imported successfully');

      // Try creating client directly
      console.log('Creating NFL client...');
      const client = new BalldontlieAPI({
        apiKey: apiKey,
      });
      console.log('NFL client created successfully');

      // Test teams API call directly
      console.log('Calling client.nfl.getTeams...');
      const teamsResponse = await client.nfl.getTeams();
      console.log('Teams API response:', teamsResponse);

      // Test players API call directly  
      console.log('Calling client.nfl.getPlayers...');
      const playersResponse = await client.nfl.getPlayers({ per_page: 5 });
      console.log('Players API response:', playersResponse);

      return NextResponse.json({
        success: true,
        message: 'API connection successful!',
        env_check: 'API key found',
        direct_test: true,
        teams: {
          count: teamsResponse.data?.length || 0,
          sample: teamsResponse.data?.slice(0, 3) || []
        },
        players: {
          count: playersResponse.data?.length || 0,
          sample: playersResponse.data?.slice(0, 3) || [],
          pagination: playersResponse.meta || null
        }
      });

    } catch (apiErr: any) {
      console.error('Direct API test error:', apiErr);
      
      // Now try our helper functions
      try {
        console.log('Testing helper functions...');
        const { fetchNFLPlayers, fetchNFLTeams } = await import('@/lib/nflProvider');
        
        const teamsResponse = await fetchNFLTeams();
        const playersResponse = await fetchNFLPlayers({ per_page: 5 });

        return NextResponse.json({
          success: true,
          message: 'Helper functions work!',
          env_check: 'API key found',
          direct_test: false,
          direct_error: apiErr?.message,
          teams: {
            count: teamsResponse.data?.length || 0,
            sample: teamsResponse.data?.slice(0, 3) || []
          },
          players: {
            count: playersResponse.data?.length || 0,
            sample: playersResponse.data?.slice(0, 3) || [],
            pagination: playersResponse.meta || null
          }
        });

      } catch (helperErr: any) {
        console.error('Helper function error:', helperErr);
        return NextResponse.json({ 
          error: 'Both direct API and helper functions failed',
          direct_error: apiErr?.message || apiErr?.stack,
          helper_error: helperErr?.message || helperErr?.stack,
          env_check: 'API key found but all calls failed'
        }, { status: 500 });
      }
    }

  } catch (err: any) {
    console.error('Overall API test error:', err);
    const message = err?.message || 'Unknown error';
    return NextResponse.json({ 
      error: message,
      details: err?.response?.data || err?.stack,
      env_check: 'Error checking environment'
    }, { status: 500 });
  }
}
