import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to YAP Sports</h1>
        <p className="text-xl text-gray-600">
          The ultimate fantasy football experience with real NFL data, strategic gameplay, and competitive rewards.
        </p>
      </div>

      <div className="space-y-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg p-8 border border-gray-700">
          <h2 className="text-3xl font-bold mb-4">🏆 Complete Fantasy Football Platform</h2>
          <p className="text-lg mb-6">
            Open card packs, build strategic lineups, apply conditional tokens, and compete with real NFL performance data.
          </p>
          <div className="space-x-4">
            <Link href="/auth" className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition inline-block">
              Get Started
            </Link>
            <Link href="/dashboard" className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-gray-900 transition inline-block">
              My Dashboard
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
            <div className="text-3xl mb-3">🎒</div>
            <h3 className="text-xl font-semibold mb-2">Pack System</h3>
            <p className="text-gray-600 mb-4">Open card packs to collect real NFL players with strategic card management.</p>
            <Link href="/packs" className="text-gray-700 hover:text-gray-900 font-medium">
              Open Packs →
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-xl font-semibold mb-2">Player Research</h3>
            <p className="text-gray-600 mb-4">Deep dive into player stats, matchup analysis, and performance trends.</p>
            <Link href="/players" className="text-gray-700 hover:text-gray-900 font-medium">
              Research Players →
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
            <div className="text-3xl mb-3">🏈</div>
            <h3 className="text-xl font-semibold mb-2">Strategic Lineups</h3>
            <p className="text-gray-600 mb-4">Build optimal lineups with position constraints and conditional token bonuses.</p>
            <Link href="/lineup" className="text-gray-700 hover:text-gray-900 font-medium">
              Set Lineup →
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-xl font-semibold mb-2">Live Scoring</h3>
            <p className="text-gray-600 mb-4">Real-time scoring based on actual NFL performance with automated rewards.</p>
            <Link href="/team" className="text-gray-700 hover:text-gray-900 font-medium">
              View Team →
            </Link>
          </div>
        </div>

        {/* Fantasy Features */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">🎯 Advanced Fantasy Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-purple-600">🎲 Token System</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Conditional bonuses: "2+ TDs = +10 points"</li>
                <li>• Strategic token application to players</li>
                <li>• Position-specific token recommendations</li>
                <li>• Risk/reward decision making</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3 text-green-600">💰 Economic System</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Contract-based player usage</li>
                <li>• Dynamic card sell values</li>
                <li>• Pack-based acquisition system</li>
                <li>• Coin economy with multiple income sources</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">📈 Real NFL Data</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Live player performance tracking</li>
                <li>• Automated post-game scoring</li>
                <li>• Real team and schedule integration</li>
                <li>• Comprehensive player analytics</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">⚡ Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/packs" className="text-center p-4 bg-white rounded border hover:shadow transition block">
              <div className="text-2xl mb-2">🎒</div>
              <div className="font-medium">Buy Packs</div>
              <div className="text-sm text-gray-600">Get player cards</div>
            </Link>
            <Link href="/players" className="text-center p-4 bg-white rounded border hover:shadow transition block">
              <div className="text-2xl mb-2">👥</div>
              <div className="font-medium">Research Players</div>
              <div className="text-sm text-gray-600">Advanced analytics & stats</div>
            </Link>
            <Link href="/lineup" className="text-center p-4 bg-white rounded border hover:shadow transition block">
              <div className="text-2xl mb-2">🏈</div>
              <div className="font-medium">Set Lineup</div>
              <div className="text-sm text-gray-600">Build your team</div>
            </Link>
            <Link href="/admin/dashboard" className="text-center p-4 bg-white rounded border hover:shadow transition block">
              <div className="text-2xl mb-2">⚙️</div>
              <div className="font-medium">Admin</div>
              <div className="text-sm text-gray-600">Manage platform</div>
            </Link>
          </div>
        </div>

        {/* Status Banner */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="text-green-600 text-xl">✅</div>
            <div>
              <div className="font-semibold text-green-800">Platform Status: Fully Operational</div>
              <div className="text-sm text-green-700">
                NFL data integrated • Live scoring active • Player research available • All systems operational
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
