# Setup Scripts

Utility scripts for setting up and managing your Yap Sports application.

## BallDontLie API Setup

### Quick Start

```bash
# Run the automated setup (recommended)
./scripts/setup-balldontlie.sh --master

# Or run step-by-step sync
./scripts/setup-balldontlie.sh
```

### Environment Variables

You can customize the setup using environment variables:

```bash
# Change base URL (for production)
API_BASE_URL=https://your-app.vercel.app ./scripts/setup-balldontlie.sh --master

# Change season year
SEASON_YEAR=2024 ./scripts/setup-balldontlie.sh --master

# Run in test mode (smaller data sets)
TEST_MODE=true ./scripts/setup-balldontlie.sh --master
```

### Options

- `--master` or `-m`: Use the master setup endpoint (faster, all-in-one)
- (no flag): Run step-by-step sync with progress details

### Examples

```bash
# Production setup with specific season
API_BASE_URL=https://yapsports.vercel.app SEASON_YEAR=2024 ./scripts/setup-balldontlie.sh -m

# Test mode for development
TEST_MODE=true ./scripts/setup-balldontlie.sh -m

# Custom local port
API_BASE_URL=http://localhost:3001 ./scripts/setup-balldontlie.sh
```

## Prerequisites

1. **Running Server**: Your Next.js dev server must be running
   ```bash
   npm run dev
   ```

2. **API Key**: `BALLDONTLIE_API_KEY` must be set in `.env.local`

3. **Database**: Supabase connection configured in `.env.local`

4. **Dependencies**: 
   - `curl` (usually pre-installed)
   - `jq` (for JSON parsing) - Install with: `brew install jq`

## What Gets Synced

The setup script syncs data in this order:

1. **Teams** (32 NFL teams)
   - Abbreviations, names, divisions, conferences

2. **Players** (~1,800-2,000 active players)
   - Names, positions, teams, external IDs

3. **Games** (~285 games for a season)
   - Schedule, teams, dates, game status

4. **Stats** (player game statistics)
   - Fantasy points, yards, touchdowns, receptions, etc.

## Estimated Time

| Mode | Duration | Data Volume |
|------|----------|-------------|
| Test Mode | 2-3 minutes | ~400 records total |
| Full Setup | 8-12 minutes | ~10,000+ records |

## Troubleshooting

### "API is not accessible"
- Make sure `npm run dev` is running
- Check the port (default: 3000)
- Verify `API_BASE_URL` if using custom port

### "Teams sync failed"
- Check your `BALLDONTLIE_API_KEY` in `.env.local`
- Verify API key is valid at https://balldontlie.io

### "Stats sync failed"
- This is normal if games don't exist for the dates
- Run games sync first
- Try syncing stats for actual game dates

### Script Permission Denied
```bash
chmod +x scripts/setup-balldontlie.sh
```

## Manual Sync (Alternative)

If the script doesn't work, you can sync manually using curl:

```bash
# 1. Teams
curl -X POST http://localhost:3000/api/admin/sync/teams

# 2. Players
curl -X POST http://localhost:3000/api/admin/sync/players \
  -H "Content-Type: application/json" \
  -d '{"max_players": 2000}'

# 3. Games
curl -X POST http://localhost:3000/api/admin/sync/games \
  -H "Content-Type: application/json" \
  -d '{"season_year": 2024}'

# 4. Stats
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -H "Content-Type: application/json" \
  -d '{"season_year": 2024, "dates": ["2024-09-08"]}'
```

## Cleanup Retired Player Cards

### Quick Start

```bash
# Set your auth token
export AUTH_TOKEN='your-supabase-jwt-token'

# Run cleanup
./scripts/cleanup-retired-cards.sh

# Or for production
./scripts/cleanup-retired-cards.sh https://yapsports.vercel.app
```

### What It Does

This script removes cards for retired NFL players from your collection:

1. ✅ Finds all cards for retired players (`active = false`)
2. ✅ Marks them as "sold" in the database
3. ✅ Refunds their sell value in coins
4. ✅ Shows you what was removed

### Getting Your Auth Token

You can get your auth token from your browser's developer console:

```javascript
// Run this in the browser console while logged in
const { data } = await supabase.auth.getSession()
console.log(data.session.access_token)
```

Or from Supabase Studio:
1. Go to Authentication > Users
2. Find your user
3. Copy the JWT token

### Options

```bash
# Clean up specific team only
export TEAM_ID='your-team-id'
export AUTH_TOKEN='your-token'
./scripts/cleanup-retired-cards.sh

# Clean up all teams (default)
export AUTH_TOKEN='your-token'
./scripts/cleanup-retired-cards.sh
```

### Example Output

```
🧹 Yap Sports - Cleanup Retired Player Cards
============================================

🏠 Using local environment: http://localhost:3000
🔑 Auth token found: eyJhbGciOiJIUzI1NiIs...
🌍 Cleaning up all teams

🚀 Running cleanup...

✅ Cleanup complete!

📊 Results:
  • Cards removed: 3
  • Coins refunded: 🪙 200
  • Message: Successfully removed 3 cards for retired players

🗑️  Removed players:
  • Donovan McNabb (Quarterback - MIN) - 🪙 50
  • Calvin Johnson (Wide Receiver - DET) - 🪙 100
  • Ray Rice (Running Back - BAL) - 🪙 50

💰 Total coins refunded to your team(s): 🪙 200

✨ Done! Refresh your dashboard to see the updated collection.
```

## See Also

- [BallDontLie Setup Guide](../BALLDONTLIE_SETUP_GUIDE.md) - Complete documentation
- [Stats Field Mapping](../STATS_FIELD_MAPPING.md) - Field reference
- [Active Players & Better Rarity](../ACTIVE_PLAYERS_AND_BETTER_RARITY.md) - Pack improvements
- [API Documentation](https://docs.balldontlie.io) - BallDontLie API docs

