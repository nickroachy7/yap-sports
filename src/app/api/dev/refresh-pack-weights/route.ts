import { NextRequest, NextResponse } from 'next/server';
import { clearCache } from '@/lib/cache';

/**
 * Clear the pack weighting cache to force recalculation
 * Use this after updating player data or when retired players appear in packs
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Clearing pack weighting cache...');
    
    // Clear entire cache (includes all rarity tiers)
    clearCache();
    
    console.log('✅ Pack weighting cache cleared!');
    console.log('📌 Next pack opening will recalculate weights with current data');
    
    return NextResponse.json({
      success: true,
      message: 'Pack weighting cache cleared successfully',
      note: 'Next pack opening will use fresh performance data from 2024-2025 seasons only'
    });
    
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    return NextResponse.json({ 
      error: 'Failed to clear cache', 
      details: error.message 
    }, { status: 500 });
  }
}

