import { NextResponse } from 'next/server';
import axios from 'axios';
import { getCachedData, setCachedData } from '../../../lib/cache.js';

const MFAPI_BASE_URL = 'https://api.mfapi.in/mf';
const CACHE_KEY = 'all_schemes';
const CACHE_TTL = 7200; // 2 hours (increased cache time)

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || null;
    const search = url.searchParams.get('search') || '';
    
    // Check cache first
    let cachedData = getCachedData(CACHE_KEY);
    
    if (!cachedData) {
      console.log('Fetching fresh data from MFAPI...');
      
      // Fetch from MFAPI.in with timeout
      const response = await axios.get(MFAPI_BASE_URL, {
        timeout: 15000, // Increased timeout
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MutualFundExplorer/1.0'
        }
      });

      if (response.status !== 200) {
        throw new Error(`MFAPI returned status: ${response.status}`);
      }

      cachedData = response.data;
      
      // Cache the data with longer TTL
      setCachedData(CACHE_KEY, cachedData, CACHE_TTL);
      console.log(`Cached ${cachedData.length} schemes`);
    }

    let filteredData = cachedData;

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = cachedData.filter(scheme =>
        scheme.schemeName.toLowerCase().includes(searchLower)
      );
    }

    // Apply limit if provided
    if (limit && limit > 0) {
      filteredData = filteredData.slice(0, limit);
    }

    return NextResponse.json({
      data: filteredData,
      cached: true,
      total: cachedData.length,
      filtered: filteredData.length,
      hasMore: limit ? cachedData.length > limit : false
    });

  } catch (error) {
    console.error('Error fetching schemes:', error);
    
    // Try to return cached data even if it's old
    const staleCache = getCachedData(CACHE_KEY, true); // Allow stale
    if (staleCache) {
      console.log('Returning stale cached data due to error');
      return NextResponse.json({
        data: staleCache.slice(0, 100), // Limit to 100 on error
        cached: true,
        stale: true,
        total: staleCache.length,
        error: 'Using cached data due to API error'
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch mutual fund schemes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}