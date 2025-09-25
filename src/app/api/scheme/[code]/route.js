import { NextResponse } from 'next/server';
import axios from 'axios';
import { getCachedData, setCachedData } from '../../../../lib/cache.js';

const MFAPI_BASE_URL = 'https://api.mfapi.in/mf';
const CACHE_TTL = 1800; // 30 minutes

export async function GET(request, { params }) {
  try {
    const { code } = await params;
    
    if (!code || isNaN(Number(code))) {
      return NextResponse.json(
        { error: 'Invalid scheme code' },
        { status: 400 }
      );
    }

    const cacheKey = `scheme_${code}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cached: true
      });
    }

    // Fetch from MFAPI.in
    const response = await axios.get(`${MFAPI_BASE_URL}/${code}`, {
      timeout: 15000
    });

    if (response.status !== 200) {
      throw new Error(`MFAPI returned status: ${response.status}`);
    }

    const schemeDetails = response.data;
    
    if (schemeDetails.status !== 'SUCCESS') {
      return NextResponse.json(
        { error: 'Scheme not found or invalid' },
        { status: 404 }
      );
    }
    
    // Cache the data
    setCachedData(cacheKey, schemeDetails, CACHE_TTL);

    return NextResponse.json({
      ...schemeDetails,
      cached: false
    });

  } catch (error) {
    console.error('Error fetching scheme details:', error);
    
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Scheme not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch scheme details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}