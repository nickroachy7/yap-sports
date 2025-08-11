'use client'

import { Button, Card, PlayerCard, GameLog, CollectionListView, StandardLayout, PageHeader, ContentContainer, SectionHeader } from '@/components/ui'
import type { GameLogEntry, CollectionItem } from '@/components/ui'

type PlayerListItem = {
  id: string
  name: string
  position: string
  team: string
  gameInfo: string
  stats: {
    fpts: number
    proj: number
    snp: number
    tar: number
    rec: number
    yd: number
    ypt: number
    ypc: number
    td: number
    fum: number
    lost: number
  }
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  contractsRemaining: number
  currentSellValue: number
  isStarter: boolean
  injuryStatus: 'healthy' | 'questionable' | 'doubtful' | 'out'
}

export default function DesignSystemPage() {
  const mockPlayer = {
    id: '1',
    name: 'Josh Allen',
    position: 'QB',
    team: 'BUF',
    photoUrl: undefined // We'll add actual photos later
  }

  const mockStats = {
    points: 287.5,
    games: 12,
    avgPoints: 23.9
  }

  const mockGameLogEntries: GameLogEntry[] = [
    {
      id: '1',
      week: 1,
      opponent: 'LV',
      date: '2024-09-08',
      time: '8:27 PM',
      projection: 24.5,
      actualPoints: 26.8,
      isHome: false,
      gameStatus: 'completed',
      playerStats: {
        snp: 87,
        tar: 8,
        rec: 6,
        yd: 95,
        ypt: 11.9,
        ypc: 15.8,
        td: 2,
        fum: 0,
        lost: 0
      }
    },
    {
      id: '2',
      week: 2,
      opponent: 'MIA',
      date: '2024-09-15',
      time: '8:27 PM',
      projection: 22.1,
      actualPoints: 18.3,
      isHome: true,
      gameStatus: 'completed',
      playerStats: {
        snp: 92,
        tar: 5,
        rec: 3,
        yd: 42,
        ypt: 8.4,
        ypc: 14.0,
        td: 1,
        fum: 1,
        lost: 0
      }
    },
    {
      id: '3',
      week: 3,
      opponent: 'PIT',
      date: '2024-09-22',
      time: '8:27 PM',
      projection: 25.3,
      isHome: false,
      gameStatus: 'upcoming'
    },
    {
      id: '4',
      week: 4,
      opponent: 'CAR',
      date: '2024-09-29',
      time: '8:27 PM',
      projection: 23.7,
      isHome: true,
      gameStatus: 'upcoming'
    }
  ]

  const mockPlayerList: PlayerListItem[] = [
    {
      id: '1',
      name: 'H. Henry',
      position: 'TE',
      team: 'NE',
      gameInfo: 'Sun 1:00 PM vs LV',
      stats: { 
        fpts: 132,
        proj: 20.2,
        snp: 0,
        tar: 0,
        rec: 0,
        yd: 54,
        ypt: 0,
        ypc: 0,
        td: 0,
        fum: 0,
        lost: 564
      },
      rarity: 'rare',
      contractsRemaining: 5,
      currentSellValue: 150,
      isStarter: true,
      injuryStatus: 'healthy'
    },
    {
      id: '2',
      name: 'J. Johnson',
      position: 'TE',
      team: 'NO',
      gameInfo: 'Sun 1:00 PM vs ARI',
      stats: { 
        fpts: 119,
        proj: 25.6,
        snp: 0,
        tar: 0,
        rec: 0,
        yd: 50,
        ypt: 0,
        ypc: 0,
        td: 0,
        fum: 0,
        lost: 505
      },
      rarity: 'uncommon',
      contractsRemaining: 3,
      currentSellValue: 120,
      isStarter: true,
      injuryStatus: 'questionable'
    },
    {
      id: '3',
      name: 'T. Higbee',
      position: 'TE',
      team: 'LAR',
      gameInfo: 'Sun 4:25 PM vs HOU',
      stats: { 
        fpts: 92,
        proj: 29.5,
        snp: 0,
        tar: 0,
        rec: 0,
        yd: 38,
        ypt: 0,
        ypc: 0,
        td: 0,
        fum: 0,
        lost: 360
      },
      rarity: 'rare',
      contractsRemaining: 2,
      currentSellValue: 135,
      isStarter: false,
      injuryStatus: 'healthy'
    },
    {
      id: '4',
      name: 'N. Gray',
      position: 'TE',
      team: 'KC',
      gameInfo: 'Fri 8:00 PM @ LAC',
      stats: { 
        fpts: 85,
        proj: 22.8,
        snp: 1,
        tar: 1,
        rec: 0,
        yd: 33,
        ypt: 0,
        ypc: 0,
        td: 0,
        fum: 0,
        lost: 335
      },
      rarity: 'epic',
      contractsRemaining: 4,
      currentSellValue: 180,
      isStarter: true,
      injuryStatus: 'healthy'
    },
    {
      id: '5',
      name: 'M. Sanders',
      position: 'RB',
      team: 'DAL',
      gameInfo: 'Thu 8:20 PM @ PHI',
      stats: { 
        fpts: 81,
        proj: 26.2,
        snp: 100,
        tar: 419,
        rec: 2,
        yd: 17,
        ypt: 0,
        ypc: 0,
        td: 0,
        fum: 0,
        lost: 121
      },
      rarity: 'uncommon',
      contractsRemaining: 7,
      currentSellValue: 95,
      isStarter: false,
      injuryStatus: 'questionable'
    }
  ]

  return (
    <StandardLayout>
      <PageHeader 
        title="Design System" 
        description="Component library and design patterns for YAP Sports"
        size="large"
      />
      
      <ContentContainer>
        <div className="py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="text-4xl mb-6" style={{fontFamily: 'var(--font-family-body)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)'}}>
              Bleacher Report Inspired Design
            </div>
            <div className="w-32 h-1 mx-auto mb-6" style={{backgroundColor: 'var(--color-steel)'}}></div>
            <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{color: 'var(--color-text-secondary)'}}>
              Clean, bold typography with sophisticated sports-focused design language 
              inspired by the best in sports media.
            </p>
          </div>
        
        {/* Button Showcase */}
        <Card className="mb-8">
          <SectionHeader title="Interactive Elements" />
          
          
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-6" style={{color: 'var(--color-text-primary)'}}>Core Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              <Button variant="primary">Primary</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-6" style={{color: 'var(--color-text-primary)'}}>Sizes</h3>
            <div className="flex flex-wrap gap-6 items-end">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-6" style={{color: 'var(--color-text-primary)'}}>States</h3>
            <div className="flex flex-wrap gap-6">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
              <Button fullWidth>Full Width Button</Button>
            </div>
          </div>
        </Card>

        {/* Player Card Showcase */}
        <Card className="mb-8">
          <SectionHeader title="Player Card Components" />
          
          <h3 className="text-xl font-semibold mb-4">Rarity Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <PlayerCard
              player={mockPlayer}
              rarity="common"
              stats={mockStats}
              contractsRemaining={5}
              currentSellValue={100}
              onSell={() => alert('Sell clicked!')}
              onAddToLineup={() => alert('Add to lineup clicked!')}
            />
            <PlayerCard
              player={{...mockPlayer, name: 'Derrick Henry'}}
              rarity="uncommon"
              stats={mockStats}
              contractsRemaining={3}
              currentSellValue={250}
            />
            <PlayerCard
              player={{...mockPlayer, name: 'Cooper Kupp'}}
              rarity="rare"
              stats={mockStats}
              contractsRemaining={7}
              currentSellValue={500}
            />
            <PlayerCard
              player={{...mockPlayer, name: 'Travis Kelce'}}
              rarity="epic"
              stats={mockStats}
              contractsRemaining={2}
              currentSellValue={750}
            />
            <PlayerCard
              player={{...mockPlayer, name: 'Patrick Mahomes'}}
              rarity="legendary"
              stats={mockStats}
              contractsRemaining={10}
              currentSellValue={1000}
            />
          </div>

          <h3 className="text-xl font-semibold mb-4">Card Sizes</h3>
          <div className="flex gap-6 items-end">
            <PlayerCard
              player={mockPlayer}
              rarity="rare"
              size="compact"
              stats={mockStats}
              showActions={false}
            />
            <PlayerCard
              player={mockPlayer}
              rarity="rare"
              size="default"
              stats={mockStats}
              showActions={false}
            />
            <PlayerCard
              player={mockPlayer}
              rarity="rare"
              size="large"
              stats={mockStats}
              showActions={false}
            />
          </div>
        </Card>

        {/* Color Palette */}
        <Card>
          <h2 className="text-2xl font-bold mb-6">Color Palette</h2>
          
          <h3 className="text-xl font-semibold mb-4">Primary Colors</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center">
              <div className="w-full h-16 bg-[var(--color-charcoal)] rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Charcoal</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 bg-[var(--color-steel)] rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Steel</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 bg-[var(--color-neon-green)] rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Neon Green</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 bg-[var(--color-warning-orange)] rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Warning Orange</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 bg-[var(--color-danger-red)] rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Danger Red</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4">Rarity Colors</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="w-full h-16 bg-[var(--color-common)] rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Common</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 bg-[var(--color-uncommon)] rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Uncommon</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 bg-[var(--color-rare)] rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Rare</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 bg-[var(--color-epic)] rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Epic</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 bg-[var(--color-legendary)] rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Legendary</p>
            </div>
          </div>
        </Card>

        {/* Player List Component */}
        <Card className="mb-12">
          <h2 className="text-3xl font-bold mb-8" style={{color: 'var(--color-text-primary)'}}>
            Player List Component
          </h2>
          <p className="text-gray-600 mb-6">
            Compact list view for displaying multiple players with stats, status, and actions.
          </p>
          <CollectionListView 
            items={mockPlayerList.map(player => ({
              id: player.id,
              type: 'player' as const,
              name: player.name,
              position: player.position,
              team: player.team,
              gameInfo: player.gameInfo,
              stats: player.stats,
              rarity: player.rarity,
              contractsRemaining: player.contractsRemaining,
              currentSellValue: player.currentSellValue,
              isStarter: player.isStarter,
              injuryStatus: player.injuryStatus
            }))}
            onItemClick={(playerId) => console.log('Selected player:', playerId)}
            showActions={true}
            filterType="players"
          />
        </Card>

        {/* Game Log Component */}
        <Card className="mb-8">
          <SectionHeader title="Game Log Component" />
          <p className="text-gray-600 mb-6">
            Weekly game schedule and performance tracking for individual players.
          </p>
          <GameLog 
            entries={mockGameLogEntries}
            playerName="Josh Allen"
          />
        </Card>

        {/* Typography Showcase */}
        <Card className="mb-8">
          <SectionHeader title="Typography System" />
          
          <div className="space-y-8">
            {/* Headings */}
            <div>
              <h3 className="text-xl font-semibold mb-6" style={{color: 'var(--color-text-primary)'}}>Headings</h3>
              <div className="space-y-4 p-6 rounded-lg" style={{backgroundColor: 'var(--color-midnight)'}}>
                <h1 className="text-4xl font-black text-white tracking-tight" style={{fontFamily: 'var(--font-family-display)'}}>
                  H1 - Hero Headlines (Inter Black)
                </h1>
                <h2 className="text-3xl font-bold text-white tracking-tight" style={{fontFamily: 'var(--font-family-display)'}}>
                  H2 - Section Headers (Inter Bold)
                </h2>
                <h3 className="text-2xl font-semibold text-white tracking-normal" style={{fontFamily: 'var(--font-family-body)'}}>
                  H3 - Subsection Headers (System Bold)
                </h3>
                <h4 className="text-xl font-medium text-white tracking-normal" style={{fontFamily: 'var(--font-family-body)'}}>
                  H4 - Component Headers (System Medium)
                </h4>
              </div>
            </div>

            {/* Body Text */}
            <div>
              <h3 className="text-xl font-semibold mb-6" style={{color: 'var(--color-text-primary)'}}>Body Text</h3>
              <div className="space-y-4 p-6 rounded-lg" style={{backgroundColor: 'var(--color-midnight)'}}>
                <p className="text-lg font-normal text-white leading-relaxed" style={{fontFamily: 'var(--font-family-body)'}}>
                  Large Body - Used for important descriptions and feature explanations. This text should be comfortable to read and draw attention.
                </p>
                <p className="text-base font-normal text-white/90 leading-relaxed" style={{fontFamily: 'var(--font-family-body)'}}>
                  Regular Body - Standard text for most content. This is the primary reading text used throughout the application for descriptions, instructions, and general content.
                </p>
                <p className="text-sm font-medium text-white/80 leading-normal" style={{fontFamily: 'var(--font-family-body)'}}>
                  Small Body - Used for secondary information, captions, and metadata. Often used in cards and smaller components.
                </p>
                <p className="text-xs font-medium text-white/70 uppercase tracking-wide" style={{fontFamily: 'var(--font-family-body)'}}>
                  Micro Text - Labels, tags, and system text
                </p>
              </div>
            </div>

            {/* Player Card Typography */}
            <div>
              <h3 className="text-xl font-semibold mb-6" style={{color: 'var(--color-text-primary)'}}>Player Card Typography</h3>
              <div className="space-y-4 p-6 rounded-lg" style={{backgroundColor: 'var(--color-midnight)'}}>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-white leading-tight tracking-normal drop-shadow-lg">
                    Player Name - Card Default
                  </h3>
                  <h3 className="text-sm font-bold text-white leading-tight tracking-normal drop-shadow-lg">
                    Player Name - Card Compact
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-black text-white tracking-tight drop-shadow-md">287.5</div>
                    <div className="text-xs text-white/70 font-bold tracking-wider uppercase">POINTS</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-white tracking-tight drop-shadow-md">12</div>
                    <div className="text-xs text-white/70 font-bold tracking-wider uppercase">GAMES</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-white tracking-tight drop-shadow-md">23.9</div>
                    <div className="text-xs text-white/70 font-bold tracking-wider uppercase">AVG</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Button Typography */}
            <div>
              <h3 className="text-xl font-semibold mb-6" style={{color: 'var(--color-text-primary)'}}>Button Typography</h3>
              <div className="space-y-4 p-6 rounded-lg" style={{backgroundColor: 'var(--color-midnight)'}}>
                <div className="flex gap-4 flex-wrap">
                  <Button variant="primary">Primary Action</Button>
                  <Button variant="success">Success Action</Button>
                  <Button variant="ghost">Secondary Action</Button>
                </div>
                <p className="text-sm text-white/70">
                  Buttons use <strong>font-black uppercase tracking-wide</strong> for maximum impact and readability
                </p>
              </div>
            </div>

            {/* Usage Guidelines */}
            <div>
              <h3 className="text-xl font-semibold mb-6" style={{color: 'var(--color-text-primary)'}}>Typography Usage Guidelines</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-white">✅ Do</h4>
                  <ul className="text-sm text-white/70 space-y-1">
                    <li>• Use Inter Heavy for hero headlines and main titles</li>
                    <li>• Apply appropriate line heights for readability</li>
                    <li>• Use tracking adjustments for different font weights</li>
                    <li>• Maintain consistent hierarchy throughout pages</li>
                    <li>• Use drop shadows on text over complex backgrounds</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-white">❌ Don&apos;t</h4>
                  <ul className="text-sm text-white/70 space-y-1">
                    <li>• Mix too many font weights on one component</li>
                    <li>• Use light fonts on dark backgrounds without sufficient contrast</li>
                    <li>• Overuse uppercase text - reserve for labels and buttons</li>
                    <li>• Apply excessive letter spacing to body text</li>
                    <li>• Use font sizes smaller than 12px for body content</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>
        </div>
      </ContentContainer>
    </StandardLayout>
  )
}
