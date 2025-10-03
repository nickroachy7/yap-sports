# 🔄 Restart Dev Server to See Position Ranks

## The Issue
The code has been updated, but Next.js is serving cached JavaScript. You need to restart the dev server.

## How to Restart

### Step 1: Stop the Server
In your terminal where `npm run dev` is running:
1. Press `Ctrl + C` (on both Mac and Windows)
2. Wait for it to stop completely

### Step 2: Start the Server
```bash
npm run dev
```

### Step 3: Hard Refresh Browser
Once the server is running again:
- **Mac**: `Cmd + Shift + R`
- **Windows**: `Ctrl + Shift + R`

## What You Should See After Restart

### Lineup Tab - Before
```
Daryl Richardson
IND | RB
Available for lineup    ← OLD
```

### Lineup Tab - After
```
Daryl Richardson
IND | RB
RB #15 | 2 games    ← NEW with position rank!
```

## Why This Happens

Next.js caches compiled components. When making changes to:
- Component interfaces (added `playerSeasonStats` prop)
- Data transformations (changed gameInfo logic)

The dev server sometimes needs a full restart to clear the cache and recompile everything.

## Quick Command

Just run this in your terminal:
```bash
# Stop current server (Ctrl+C), then:
npm run dev
```

Then hard refresh your browser!

