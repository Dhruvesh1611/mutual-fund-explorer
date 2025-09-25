import { NextResponse } from 'next/server';
import axios from 'axios';
import { getCachedData, setCachedData } from '../../../../../lib/cache.js';
import { calculateReturns } from '../../../../../lib/calculations.js';

const MFAPI_BASE_URL = 'https://api.mfapi.in/mf';
const CACHE_TTL = 1800; // 30 minutes

export async function GET(request, { params }) {
  try {
    const { code } = await params;
    const { searchParams } = new URL(request.url);
    
    if (!code || isNaN(Number(code))) {
      return NextResponse.json(
        { error: 'Invalid scheme code' },
        { status: 400 }
      );
    }

    // Extract query parameters
    const period = searchParams.get('period');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    // Validate parameters
    if (!period && (!fromDate || !toDate)) {
      return NextResponse.json(
        { 
          error: 'Either period (1m|3m|6m|1y) or both from and to dates (YYYY-MM-DD) must be provided' 
        },
        { status: 400 }
      );
    }

    if (period && !['1m', '3m', '6m', '1y'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be one of: 1m, 3m, 6m, 1y' },
        { status: 400 }
      );
    }

    // Create cache key based on parameters
    const cacheKey = period 
      ? `returns_${code}_${period}` 
      : `returns_${code}_${fromDate}_${toDate}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cached: true
      });
    }

    // Get scheme details (NAV data)
    const schemeDetailsCache = getCachedData(`scheme_${code}`);
    let schemeDetails;

    if (schemeDetailsCache) {
      schemeDetails = schemeDetailsCache;
    } else {
      const response = await axios.get(`${MFAPI_BASE_URL}/${code}`, {
        timeout: 15000
      });

      if (response.status !== 200) {
        throw new Error(`MFAPI returned status: ${response.status}`);
      }

      schemeDetails = response.data;
      
      if (schemeDetails.status !== 'SUCCESS') {
        return NextResponse.json(
          { error: 'Scheme not found or invalid' },
          { status: 404 }
        );
      }

      // Cache scheme details
      setCachedData(`scheme_${code}`, schemeDetails, CACHE_TTL);
    }

    // Calculate returns
    const returnsData = calculateReturns(
      schemeDetails.data,
      period,
      fromDate || undefined,
      toDate || undefined
    );

    if (!returnsData) {
      return NextResponse.json(
        { error: 'Unable to calculate returns for the given period' },
        { status: 400 }
      );
    }

    const result = {
      schemeCode: code,
      schemeName: schemeDetails.meta.scheme_name,
      ...returnsData
    };
    
    // Cache the result
    setCachedData(cacheKey, result, CACHE_TTL);

    return NextResponse.json({
      ...result,
      cached: false
    });

  } catch (error) {
    console.error('Error calculating returns:', error);
    
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Scheme not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to calculate returns',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}