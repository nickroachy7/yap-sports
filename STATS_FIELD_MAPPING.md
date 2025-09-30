# BallDontLie API Stats Field Mapping

This document defines the correct field mapping from the BallDontLie NFL API to our database `stat_json` field in the `player_game_stats` table.

## ⚠️ Important Notes

1. **The API uses `receptions`, NOT `receiving_receptions`**
2. **All receiving stats are prefixed with `receiving_` except `receptions`**
3. **Fantasy points are calculated and stored, not provided by the API**
4. **Always store the full `raw_stats` object for future reference**

## Field Mapping Reference

### Basic Information
| BallDontLie API Field | Our Database Field | Type | Notes |
|----------------------|-------------------|------|-------|
| `stat.player.first_name` + `stat.player.last_name` | `player_name` | string | Concatenated full name |
| `stat.team.abbreviation` | `team` | string | 3-letter team code |
| `stat.player.position` | `position` | string | Full position name |

### Passing Statistics
| BallDontLie API Field | Our Database Field | Type | Notes |
|----------------------|-------------------|------|-------|
| `stat.passing_attempts` | `passing_attempts` | number | Total pass attempts |
| `stat.passing_completions` | `passing_completions` | number | Completed passes |
| `stat.passing_yards` | `passing_yards` | number | Total passing yards |
| `stat.passing_touchdowns` | `passing_touchdowns` | number | Passing TDs |
| `stat.passing_interceptions` | `passing_interceptions` | number | Interceptions thrown |
| `stat.yards_per_pass_attempt` | `yards_per_pass_attempt` | number | Average yards/attempt |
| `stat.qb_rating` | `qb_rating` | number | QB rating |
| `stat.sacks` | `sacks` | number | Times sacked |

### Rushing Statistics
| BallDontLie API Field | Our Database Field | Type | Notes |
|----------------------|-------------------|------|-------|
| `stat.rushing_attempts` | `rushing_attempts` | number | Total rush attempts |
| `stat.rushing_yards` | `rushing_yards` | number | Total rushing yards |
| `stat.rushing_touchdowns` | `rushing_touchdowns` | number | Rushing TDs |
| `stat.yards_per_rush_attempt` | `yards_per_rush_attempt` | number | Average yards/carry |

### Receiving Statistics ⚠️ CRITICAL
| BallDontLie API Field | Our Database Field | Type | Notes |
|----------------------|-------------------|------|-------|
| `stat.receiving_targets` | `receiving_targets` | number | Times targeted |
| `stat.receptions` | `receptions` | number | ⚠️ NOT `receiving_receptions`! |
| `stat.receiving_yards` | `receiving_yards` | number | Total receiving yards |
| `stat.receiving_touchdowns` | `receiving_touchdowns` | number | Receiving TDs |
| `stat.yards_per_reception` | `yards_per_reception` | number | Average yards/catch |

### Other Statistics
| BallDontLie API Field | Our Database Field | Type | Notes |
|----------------------|-------------------|------|-------|
| `stat.fumbles` | `fumbles` | number | Total fumbles |
| `stat.fumbles_lost` | `fumbles_lost` | number | Fumbles lost to other team |
| `stat.fumbles_recovered` | `fumbles_recovered` | number | Own fumbles recovered |

### Calculated Fields
| Field Name | Calculation | Notes |
|-----------|------------|-------|
| `fantasy_points` | See formula below | Standard PPR scoring |

## Fantasy Points Calculation

```javascript
fantasy_points = 
  (passing_yards * 0.04) +           // 1 point per 25 yards
  (passing_touchdowns * 4) +          // 4 points per TD
  (passing_interceptions * -2) +      // -2 points per INT
  (rushing_yards * 0.1) +             // 1 point per 10 yards
  (rushing_touchdowns * 6) +          // 6 points per TD
  (receiving_yards * 0.1) +           // 1 point per 10 yards
  (receiving_touchdowns * 6) +        // 6 points per TD
  (receptions * 1) +                  // 1 point per reception (PPR)
  (fumbles_lost * -2)                 // -2 points per fumble lost
```

## Game Metadata
| BallDontLie API Field | Our Database Field | Type | Notes |
|----------------------|-------------------|------|-------|
| `stat.game.date` | `game_date` | string | ISO date string |
| `stat.game.status` | `game_status` | string | e.g., "Final", "Live" |
| `stat` (full object) | `raw_stats` | object | Store complete API response |

## Example Stat JSON Structure

```json
{
  "player_name": "Patrick Mahomes",
  "team": "KC",
  "position": "Quarterback",
  
  "passing_attempts": 35,
  "passing_completions": 24,
  "passing_yards": 315,
  "passing_touchdowns": 3,
  "passing_interceptions": 1,
  "yards_per_pass_attempt": 9.0,
  "qb_rating": 108.5,
  "sacks": 2,
  
  "rushing_attempts": 4,
  "rushing_yards": 18,
  "rushing_touchdowns": 0,
  "yards_per_rush_attempt": 4.5,
  
  "receiving_targets": 0,
  "receptions": 0,
  "receiving_yards": 0,
  "receiving_touchdowns": 0,
  "yards_per_reception": 0,
  
  "fumbles": 1,
  "fumbles_lost": 0,
  "fumbles_recovered": 1,
  
  "fantasy_points": 24.42,
  
  "game_date": "2024-09-08T17:00:00.000Z",
  "game_status": "Final",
  "raw_stats": { /* full API response */ }
}
```

## Common Pitfalls to Avoid

### ❌ WRONG
```javascript
// Don't use these field names:
rec: statJson.receiving_receptions  // Field doesn't exist!
tar: statJson.targets                // Should be receiving_targets
ypc: statJson.yards_per_catch        // Should be yards_per_reception
```

### ✅ CORRECT
```javascript
// Use these field names:
rec: statJson.receptions             // Correct field name
tar: statJson.receiving_targets      // Correct field name
ypc: statJson.yards_per_reception    // Correct field name
```

## Files Using Stat Mapping

### Writing Stats (Sync from API)
- `/src/app/api/admin/sync/stats/route.ts` - Main stats sync endpoint
- `/src/app/api/dev/sync-season-data/route.ts` - Dev testing endpoint

### Reading Stats (Display to Users)
- `/src/app/api/players/[playerId]/game-log/route.ts` - Player game logs
- `/src/app/api/players/[playerId]/profile/route.ts` - Player profiles
- Frontend components accessing stat_json fields

## Testing

To verify correct mapping, use the test endpoint:
```bash
curl -X POST http://localhost:3000/api/dev/test-api -H "Content-Type: application/json"
```

This will show sample stats from the BallDontLie API with actual field names.

## Last Updated
- Date: 2025-09-30
- By: Stats mapping standardization
- Version: 1.0

