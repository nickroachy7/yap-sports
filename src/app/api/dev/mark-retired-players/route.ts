import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Mark known retired players as inactive in the database
 * This fixes players who are incorrectly marked as active
 */
export async function POST(req: NextRequest) {
  try {
    // List of known retired players to mark as inactive
    // Expanded list - adding more retired QBs, RBs, WRs, TEs
    const KNOWN_RETIRED_PLAYERS = [
      // Previously identified
      'Steve Smith Sr.',
      'Donovan McNabb',
      'Calvin Johnson',
      'Ray Rice',
      'Randy Moss',
      'Terrell Owens',
      'LaDainian Tomlinson',
      'Tony Romo',
      'Marshawn Lynch',
      'Adrian Peterson',
      'Rob Gronkowski',
      'Larry Fitzgerald',
      'Eli Manning',
      'Philip Rivers',
      'Drew Brees',
      'Antonio Brown',
      'LeVeon Bell',
      'Arian Foster',
      'Frank Gore',
      'Steve Smith',
      'Reggie Wayne',
      'Jason Witten',
      'Vernon Davis',
      'DeMarco Murray',
      'Jamaal Charles',
      
      // Newly added retired players
      'Kevin Kolb',
      'Andy Isabella',
      'Kellen Mond',
      'Matt Schaub',
      'Jay Cutler',
      'Mark Sanchez',
      'Tim Tebow',
      'Carson Palmer',
      'Sam Bradford',
      'Matt Cassel',
      'Alex Smith',
      'Ryan Fitzpatrick',
      'Blake Bortles',
      'Robert Griffin III',
      'Colin Kaepernick',
      'Nick Foles',
      'Case Keenum',
      'Colt McCoy',
      'Josh McCown',
      'Matt Moore',
      'DeShone Kizer',
      'Paxton Lynch',
      'Christian Ponder',
      'Brandon Weeden',
      'Ryan Mallett',
      'Jimmy Clausen',
      'Matt Flynn',
      'Curtis Painter',
      'Charlie Whitehurst',
      'Tarvaris Jackson',
      'Vince Young',
      'JaMarcus Russell',
      'Brady Quinn',
      'Kyle Boller',
      'Rex Grossman',
      'Tyler Palko',
      'Caleb Hanie',
      'John Skelton',
      'Max Hall',
      'Derek Anderson',
      'Seneca Wallace',
      'Luke McCown',
      'Kellen Clemens',
      'Matt Leinart',
      'Kevin Hogan',
      'Tom Savage',
      'Brock Osweiler',
      'Brian Hoyer',
      'Mike Glennon',
      'Ryan Lindley',
      'Landry Jones',
      'Bryce Petty',
      'Geno Smith',
      'EJ Manuel',
      'Logan Thomas',
      'AJ McCarron',
      'Sean Mannion',
      'Garrett Gilbert',
      'Nathan Peterman',
      'Chad Henne',
      'Matt Barkley',
      'Jacoby Brissett',
      'Cody Kessler',
      'Trevor Siemian',
      
      // Retired RBs
      'Peyton Hillis',
      'Knowshon Moreno',
      'Ahmad Bradshaw',
      'Michael Turner',
      'Steven Jackson',
      'Maurice Jones-Drew',
      'Rashard Mendenhall',
      'Ryan Mathews',
      'C.J. Spiller',
      'Darren McFadden',
      'Chris Johnson',
      'DeAngelo Williams',
      'Jonathan Stewart',
      'Reggie Bush',
      'Stevan Ridley',
      'Ben Tate',
      'Eddie Lacy',
      'Trent Richardson',
      'Doug Martin',
      'David Wilson',
      'Montee Ball',
      'Andre Ellington',
      'Bishop Sankey',
      'Carlos Hyde',
      'Ameer Abdullah',
      'Todd Gurley',
      
      // Retired WRs
      'Hakeem Nicks',
      'Pierre Garcon',
      'Torrey Smith',
      'Golden Tate',
      'Victor Cruz',
      'Percy Harvin',
      'Santonio Holmes',
      'Brandon Marshall',
      'Anquan Boldin',
      'Dwayne Bowe',
      'Mike Wallace',
      'Wes Welker',
      'Danny Amendola',
      'Julian Edelman',
      'DeSean Jackson',
      'Jordy Nelson',
      'Dez Bryant',
      'Demaryius Thomas',
      'Josh Gordon',
      'Kenny Britt',
      'Justin Blackmon',
      'Cordarrelle Patterson',
      'Tavon Austin',
      'Kelvin Benjamin',
      'Sammy Watkins',
      
      // Retired TEs
      'Owen Daniels',
      'Jermichael Finley',
      'Antonio Gates',
      'Greg Olsen',
      'Martellus Bennett',
      'Jimmy Graham',
      'Jordan Cameron',
      'Jared Cook',
      'Delanie Walker',
      'Coby Fleener',
      'Eric Ebron',
      'Tyler Eifert',
      'Jordan Reed',
      'Austin Seferian-Jenkins',
      
      // Additional retired players from user reports
      'Amos Zereoue',       // RB - Retired 2007
      'B.J. Daniels',       // QB/WR - Retired 2014
      'Jonathan Wells',     // RB - Retired 2006
      'Ja\'seem Reed',      // WR - Practice squad/inactive
      'Michael Wiley',      // RB - Retired early 2000s
      'Joshua Cephus',      // WR - Practice squad/inactive
      'Kerry Meier',        // WR - Retired 2012
      'Herb Haygood',       // WR - Retired 1990
      'Josh Malone',        // WR - Practice squad/barely active
      'Demetrius Williams', // WR - Retired 2011
      'Ray Jackson',        // RB - Practice squad/inactive
      'LaMike James'        // RB - Retired 2013
    ];

    console.log(`Searching for ${KNOWN_RETIRED_PLAYERS.length} known retired players...`);

    const results = {
      found: [] as any[],
      notFound: [] as string[],
      updated: [] as any[],
      alreadyInactive: [] as any[]
    };

    // Process each player
    for (const playerName of KNOWN_RETIRED_PLAYERS) {
      // Try to find the player by name
      const nameParts = playerName.split(' ');
      const lastName = nameParts[nameParts.length - 1].replace(/[^a-zA-Z]/g, ''); // Remove suffixes like Sr., Jr.
      const firstName = nameParts[0];

      const { data: players, error } = await supabaseAdmin
        .from('players')
        .select('id, first_name, last_name, active, team, position')
        .ilike('last_name', `%${lastName}%`)
        .ilike('first_name', `%${firstName}%`);

      if (error) {
        console.error(`Error searching for ${playerName}:`, error);
        continue;
      }

      if (!players || players.length === 0) {
        results.notFound.push(playerName);
        console.log(`❌ Not found: ${playerName}`);
        continue;
      }

      // Found the player(s)
      for (const player of players) {
        results.found.push({
          name: `${player.first_name} ${player.last_name}`,
          id: player.id,
          active: player.active,
          team: player.team,
          position: player.position
        });

        if (!player.active) {
          results.alreadyInactive.push({
            name: `${player.first_name} ${player.last_name}`,
            id: player.id
          });
          console.log(`✓ Already inactive: ${player.first_name} ${player.last_name}`);
        } else {
          // Update to inactive
          const { error: updateError } = await supabaseAdmin
            .from('players')
            .update({ active: false })
            .eq('id', player.id);

          if (updateError) {
            console.error(`Error updating ${player.first_name} ${player.last_name}:`, updateError);
          } else {
            results.updated.push({
              name: `${player.first_name} ${player.last_name}`,
              id: player.id,
              team: player.team,
              position: player.position
            });
            console.log(`✅ Marked inactive: ${player.first_name} ${player.last_name} (${player.position} - ${player.team})`);
          }
        }
      }
    }

    // Get count of active vs inactive players
    const { count: totalActive } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    const { count: totalInactive } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', false);

    return NextResponse.json({
      success: true,
      message: `Processed ${KNOWN_RETIRED_PLAYERS.length} known retired players`,
      summary: {
        searched: KNOWN_RETIRED_PLAYERS.length,
        found: results.found.length,
        notFound: results.notFound.length,
        updated: results.updated.length,
        alreadyInactive: results.alreadyInactive.length
      },
      playerCounts: {
        totalActive,
        totalInactive
      },
      details: {
        updated: results.updated,
        alreadyInactive: results.alreadyInactive,
        notFound: results.notFound
      }
    });

  } catch (err: any) {
    console.error('Mark retired players error:', err);
    return NextResponse.json({ 
      error: 'Failed to mark retired players', 
      details: err.message 
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check a specific player's status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerName = searchParams.get('name');

    if (!playerName) {
      return NextResponse.json({ error: 'Player name required' }, { status: 400 });
    }

    // Search for the player
    const nameParts = playerName.split(' ');
    const lastName = nameParts[nameParts.length - 1].replace(/[^a-zA-Z]/g, '');
    const firstName = nameParts[0];

    const { data: players, error } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, active, team, position')
      .ilike('last_name', `%${lastName}%`)
      .ilike('first_name', `%${firstName}%`);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!players || players.length === 0) {
      return NextResponse.json({ 
        found: false, 
        message: `No players found matching "${playerName}"` 
      });
    }

    return NextResponse.json({
      found: true,
      count: players.length,
      players: players.map(p => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        active: p.active,
        team: p.team,
        position: p.position
      }))
    });

  } catch (err: any) {
    console.error('Check player error:', err);
    return NextResponse.json({ 
      error: 'Failed to check player', 
      details: err.message 
    }, { status: 500 });
  }
}

