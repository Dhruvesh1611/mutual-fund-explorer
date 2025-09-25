import { NextResponse } from 'next/server';
import { getCacheStats } from '../../../lib/cache.js';

export async function GET(request) {
  try {
    const cacheStats = getCacheStats();
    const memoryUsage = process.memoryUsage();
    
    return NextResponse.json({
      cache: cacheStats,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
      uptime: `${Math.round(process.uptime())}s`,
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get performance stats' },
      { status: 500 }
    );
  }
}