'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  }

  return (
    <motion.main 
      className="p-8 min-h-screen"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} className="mb-16 text-center">
        <div className="mb-6">
          <h1 className="text-6xl font-black mb-6 text-gradient-primary leading-tight">
            YAP SPORTS
          </h1>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-white to-transparent mb-6"></div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            The ultimate fantasy football experience with real NFL data, strategic card gameplay, and competitive rewards.
          </p>
        </div>
        
        <div className="flex justify-center space-x-6 mt-8">
          <Link href="/auth" className="btn btn-success text-lg px-8 py-4">
            Get Started
          </Link>
          <Link href="/dashboard" className="btn btn-outline text-lg px-8 py-4">
            My Dashboard
          </Link>
        </div>
      </motion.div>

      {/* Core Features Grid */}
      <motion.div variants={itemVariants} className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Core Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <motion.div 
            className="card group cursor-pointer"
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Link href="/packs" className="block h-full">
              <div className="text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">🎒</div>
                <h3 className="text-xl font-bold text-white mb-3">Pack System</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Open strategic card packs to collect real NFL players with dynamic rarity systems.
                </p>
                <div className="mt-4 text-lime-400 text-sm font-medium">
                  Open Packs →
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div 
            className="card group cursor-pointer"
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Link href="/players" className="block h-full">
              <div className="text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">🔍</div>
                <h3 className="text-xl font-bold text-white mb-3">Player Research</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Deep analytics, matchup data, and performance trends for strategic decisions.
                </p>
                <div className="mt-4 text-lime-400 text-sm font-medium">
                  Research Players →
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div 
            className="card group cursor-pointer"
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Link href="/lineup" className="block h-full">
              <div className="text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">🏈</div>
                <h3 className="text-xl font-bold text-white mb-3">Strategic Lineups</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Build optimal lineups with position constraints and conditional token bonuses.
                </p>
                <div className="mt-4 text-lime-400 text-sm font-medium">
                  Set Lineup →
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div 
            className="card group cursor-pointer"
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Link href="/players" className="block h-full">
              <div className="text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">📊</div>
                <h3 className="text-xl font-bold text-white mb-3">Live Scoring</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Real-time scoring based on actual NFL performance with automated rewards.
                </p>
                <div className="mt-4 text-lime-400 text-sm font-medium">
                  View Stats →
                </div>
              </div>
            </Link>
          </motion.div>

        </div>
      </motion.div>

      {/* Advanced Features */}
      <motion.div variants={itemVariants} className="mb-16">
        <div className="card">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Advanced Systems</h2>
          <div className="grid md:grid-cols-3 gap-8">
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-900/30 border border-purple-600/50 mb-4">
                <span className="text-2xl">🎲</span>
              </div>
              <h3 className="text-xl font-bold text-purple-400 mb-4">Token System</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Conditional bonuses: "2+ TDs = +10 points"</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Strategic token application to players</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Position-specific recommendations</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Risk/reward decision making</li>
              </ul>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lime-900/30 border border-lime-600/50 mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-bold text-lime-400 mb-4">Economic System</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center"><span className="text-lime-400 mr-2">•</span> Contract-based player usage</li>
                <li className="flex items-center"><span className="text-lime-400 mr-2">•</span> Dynamic card sell values</li>
                <li className="flex items-center"><span className="text-lime-400 mr-2">•</span> Pack-based acquisition system</li>
                <li className="flex items-center"><span className="text-lime-400 mr-2">•</span> Multiple income sources</li>
              </ul>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-900/30 border border-amber-600/50 mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-xl font-bold text-amber-400 mb-4">Real NFL Data</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center"><span className="text-amber-400 mr-2">•</span> Live player performance tracking</li>
                <li className="flex items-center"><span className="text-amber-400 mr-2">•</span> Automated post-game scoring</li>
                <li className="flex items-center"><span className="text-amber-400 mr-2">•</span> Real team and schedule integration</li>
                <li className="flex items-center"><span className="text-amber-400 mr-2">•</span> Comprehensive analytics</li>
              </ul>
            </div>

          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <Link href="/packs" className="card text-center group cursor-pointer">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">🎒</div>
            <div className="font-bold text-white text-lg">Buy Packs</div>
            <div className="text-sm text-gray-400">Get player cards</div>
          </Link>

          <Link href="/players" className="card text-center group cursor-pointer">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">👥</div>
            <div className="font-bold text-white text-lg">Research</div>
            <div className="text-sm text-gray-400">Advanced analytics</div>
          </Link>

          <Link href="/lineup" className="card text-center group cursor-pointer">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">🏈</div>
            <div className="font-bold text-white text-lg">Set Lineup</div>
            <div className="text-sm text-gray-400">Build your team</div>
          </Link>

          <Link href="/admin/dashboard" className="card text-center group cursor-pointer">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">⚙️</div>
            <div className="font-bold text-white text-lg">Admin</div>
            <div className="text-sm text-gray-400">Manage platform</div>
          </Link>

        </div>
      </motion.div>

      {/* Status Banner */}
      <motion.div variants={itemVariants}>
        <div className="card border-lime-600/50 bg-gradient-to-r from-lime-900/20 to-lime-800/10">
          <div className="flex items-center justify-center space-x-4 text-center">
            <div className="text-lime-400 text-2xl">✅</div>
            <div>
              <div className="font-bold text-lime-300 text-lg">Platform Status: Fully Operational</div>
              <div className="text-sm text-lime-400/80 mt-1">
                NFL data integrated • Live scoring active • Player research available • All systems operational
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
    </motion.main>
  )
}
