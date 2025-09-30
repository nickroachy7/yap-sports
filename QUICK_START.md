# 🚀 Quick Start - Yap Sports

## First Time Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env.local` with:
```env
# BallDontLie API
BALLDONTLIE_API_KEY=your_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Sync NFL Data (One Command!)
```bash
./scripts/setup-balldontlie.sh --master
```

**That's it!** Your app now has real NFL data. 🎉

---

## Alternative: Manual Sync Steps

If the script doesn't work, use the master endpoint:

```bash
curl -X POST http://localhost:3000/api/admin/setup/initial-sync \
  -H "Content-Type: application/json" \
  -d '{"season_year": 2024}'
```

---

## Common Commands

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Run linter
```

### Data Sync
```bash
# Full setup (all data)
./scripts/setup-balldontlie.sh --master

# Test mode (smaller dataset for testing)
TEST_MODE=true ./scripts/setup-balldontlie.sh --master

# Sync specific data type
curl -X POST http://localhost:3000/api/admin/sync/teams
curl -X POST http://localhost:3000/api/admin/sync/players -d '{"max_players": 500}'
curl -X POST http://localhost:3000/api/admin/sync/stats -d '{"dates": ["2024-09-08"]}'
```

### Testing
```bash
# Test API connection
curl -X POST http://localhost:3000/api/dev/test-api

# Check environment variables
curl http://localhost:3000/api/dev/env-check

# Get player profile
curl http://localhost:3000/api/players/{PLAYER_ID}/profile
```

---

## File Structure

```
yap-sports/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/sync/     # Data sync endpoints
│   │   │   ├── players/        # Player APIs
│   │   │   └── dev/            # Dev/testing endpoints
│   │   ├── dashboard/          # Main dashboard
│   │   └── players/            # Player pages
│   ├── components/ui/          # UI components
│   ├── lib/                    # Utilities & clients
│   └── types/                  # TypeScript types
├── scripts/                    # Setup scripts
└── docs/
    ├── BALLDONTLIE_SETUP_GUIDE.md
    ├── STATS_FIELD_MAPPING.md
    └── QUICK_START.md (this file)
```

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### API Key Issues
- Verify key at https://balldontlie.io
- Check `.env.local` has `BALLDONTLIE_API_KEY=...`
- Restart dev server after adding env vars

### No Data Showing
1. Run setup script: `./scripts/setup-balldontlie.sh --master`
2. Check database has data (query Supabase)
3. Clear browser cache
4. Check browser console for errors

### Stats Not Updating
```bash
# Sync latest stats
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -d '{"dates": ["2024-09-08"]}'
```

---

## Next Steps

1. ✅ Complete first-time setup above
2. 📖 Read [BALLDONTLIE_SETUP_GUIDE.md](./BALLDONTLIE_SETUP_GUIDE.md) for detailed info
3. 📊 Review [STATS_FIELD_MAPPING.md](./STATS_FIELD_MAPPING.md) for data structure
4. 🎨 Customize UI in `src/components/ui/`
5. 🔄 Set up cron jobs for automatic updates

---

## Resources

- **BallDontLie API Docs**: https://docs.balldontlie.io
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## Getting Help

1. Check documentation files in project root
2. Review API endpoint code in `src/app/api/`
3. Test individual endpoints with curl
4. Check console logs for detailed errors

---

**Ready to build!** 🏈 Your fantasy sports app is now loaded with real NFL data.

