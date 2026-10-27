import { NextRequest, NextResponse } from 'next/server';

const cache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim() || '';

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const cacheKey = query.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // 1. Try OpenStreetMap Nominatim with dedicated User-Agent
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
      {
        headers: {
          'User-Agent': 'TrybeApp/1.0 (https://trybe.app; contact@trybe.app)',
          'Accept': 'application/json',
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        cache.set(cacheKey, { data, timestamp: Date.now() });
        return NextResponse.json(data);
      }
    }
  } catch (err) {
    console.warn('Nominatim server-side lookup failed:', err);
  }

  // 2. Fallback to Google Geocoding if key is present
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (googleApiKey) {
    try {
      const gRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleApiKey}`
      );
      if (gRes.ok) {
        const gData = await gRes.json();
        if (Array.isArray(gData.results)) {
          const transformed = gData.results.slice(0, 5).map((item: any) => ({
            display_name: item.formatted_address,
            lat: String(item.geometry.location.lat),
            lon: String(item.geometry.location.lng),
          }));
          cache.set(cacheKey, { data: transformed, timestamp: Date.now() });
          return NextResponse.json(transformed);
        }
      }
    } catch (gErr) {
      console.warn('Google Maps geocoding fallback failed:', gErr);
    }
  }

  return NextResponse.json([]);
}
