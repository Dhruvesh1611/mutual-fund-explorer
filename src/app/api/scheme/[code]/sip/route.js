import { NextResponse } from 'next/server';
import axios from 'axios';
import { getCachedData, setCachedData } from '../../../../../lib/cache.js';
import { calculateSIP } from '../../../../../lib/calculations.js';

const MFAPI_BASE_URL = 'https://api.mfapi.in/mf';
const CACHE_TTL = 1800; // 30 minutes

export async function POST(request, { params }) {
  try {
    const { code } = await params;
    
    if (!code || isNaN(Number(code))) {
      return NextResponse.json(
        { error: 'Invalid scheme code' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate request body
    if (!body.amount || !body.frequency || !body.from || !body.to) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, frequency, from, to' },
        { status: 400 }
      );
    }

    if (!['monthly', 'weekly', 'daily'].includes(body.frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency. Must be one of: monthly, weekly, daily' },
        { status: 400 }
      );
    }

    if (body.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.from) || !dateRegex.test(body.to)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    if (new Date(body.from) >= new Date(body.to)) {
      return NextResponse.json(
        { error: 'From date must be before to date' },
        { status: 400 }
      );
    }

    // Create cache key based on parameters
    const cacheKey = `sip_${code}_${body.amount}_${body.frequency}_${body.from}_${body.to}`;
    
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

    // Calculate SIP returns
    const sipData = calculateSIP(schemeDetails.data, body);

    // Handle calculation errors or edge cases
    if (sipData.error || sipData.status === 'needs_review') {
      const statusCode = sipData.error ? 400 : 200; // 200 for needs_review, 400 for actual errors
      
      return NextResponse.json({
        schemeCode: code,
        schemeName: schemeDetails.meta.scheme_name,
        request: body,
        ...sipData
      }, { status: statusCode });
    }

    // Successful calculation
    const result = {
      schemeCode: code,
      schemeName: schemeDetails.meta.scheme_name,
      request: body,
      ...sipData
    };
    
    // Only cache successful calculations
    if (sipData.status === 'success') {
      setCachedData(cacheKey, result, CACHE_TTL);
    }

    return NextResponse.json({
      ...result,
      cached: false
    });

  } catch (error) {
    console.error('Error calculating SIP:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Scheme not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to calculate SIP returns',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}