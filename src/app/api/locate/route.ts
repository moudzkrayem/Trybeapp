import { NextRequest, NextResponse } from 'next/server';

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
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  // Case 1: Reverse geocode coordinates
  if (latParam && lngParam) {
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    // Try Google Maps Geocoding API if key is configured
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (googleApiKey) {
      try {
        const gRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}`
        );
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.results && gData.results.length > 0) {
            const formatted = gData.results[0].formatted_address;
            return NextResponse.json({
              success: true,
              latitude: lat,
              longitude: lng,
              name: formatted,
              source: 'google'
            });
          }
        }
      } catch (err) {
        console.warn('Google reverse geocode error:', err);
      }
    }

    // Fallback: OpenStreetMap Nominatim reverse geocode
    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'User-Agent': 'TrybeApp/1.0 (https://trybe.app)'
          }
        }
      );
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        const displayName = osmData.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        return NextResponse.json({
          success: true,
          latitude: lat,
          longitude: lng,
          name: displayName,
          source: 'nominatim'
        });
      }
    } catch (err) {
      console.warn('Nominatim reverse geocode error:', err);
    }

    return NextResponse.json({
      success: true,
      latitude: lat,
      longitude: lng,
      name: `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      source: 'fallback'
    });
  }

  // Case 2: Geolocation by IP
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '';

    const ipEndpoint = ip && !ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('127.')
      ? `https://ipwho.is/${ip}`
      : 'https://ipwho.is/';

    const ipRes = await fetch(ipEndpoint);
    if (ipRes.ok) {
      const data = await ipRes.json();
      if (data.latitude && data.longitude) {
        const placeName = [data.city, data.region, data.country].filter(Boolean).join(', ');
        return NextResponse.json({
          success: true,
          latitude: data.latitude,
          longitude: data.longitude,
          name: placeName || 'Current Location',
          city: data.city,
          country: data.country,
          source: 'ip'
        });
      }
    }
  } catch (err) {
    console.warn('IP locate error:', err);
  }

  // Final fallback (Central London / Default location if everything fails)
  return NextResponse.json({
    success: true,
    latitude: 51.5074,
    longitude: -0.1278,
    name: 'London, United Kingdom',
    city: 'London',
    country: 'United Kingdom',
    source: 'default'
  });
}
