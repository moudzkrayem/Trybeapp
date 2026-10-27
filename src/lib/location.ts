/**
 * Utility to reliably acquire user location in web and iframe environments.
 * 1. Attempts HTML5 navigator.geolocation first.
 * 2. If blocked by iframe policy, user permission, or timeout, seamlessly falls back to server IP geolocation.
 * 3. Reverse geocodes coordinates to a human-readable place name.
 */

export interface LocationResult {
  latitude: number;
  longitude: number;
  name: string;
  source: 'gps' | 'ip' | 'fallback';
}

export async function getPreciseLocation(): Promise<LocationResult> {
  // Step 1: Attempt HTML5 Geolocation with timeout
  if (typeof window !== 'undefined' && 'geolocation' in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 60000,
          }
        );
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Reverse geocode to get a readable place name
      try {
        const revRes = await fetch(`/api/locate?lat=${lat}&lng=${lng}`);
        if (revRes.ok) {
          const revData = await revRes.json();
          if (revData.name) {
            return {
              latitude: lat,
              longitude: lng,
              name: revData.name,
              source: 'gps',
            };
          }
        }
      } catch (revErr) {
        console.warn('Reverse geocode error, using coordinates label:', revErr);
      }

      return {
        latitude: lat,
        longitude: lng,
        name: `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        source: 'gps',
      };
    } catch (geoError: any) {
      console.info('HTML5 Geolocation unavailable/denied, falling back to IP geolocation:', geoError?.message || geoError);
    }
  }

  // Step 2: Fallback to Server / IP Geolocation (works seamlessly in iframes)
  try {
    const ipRes = await fetch('/api/locate');
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      if (ipData.latitude && ipData.longitude) {
        return {
          latitude: ipData.latitude,
          longitude: ipData.longitude,
          name: ipData.name || `${ipData.city || 'Local Area'}, ${ipData.country || ''}`,
          source: 'ip',
        };
      }
    }
  } catch (ipErr) {
    console.warn('IP locate endpoint error:', ipErr);
  }

  // Step 3: Default fallback (London)
  return {
    latitude: 51.5074,
    longitude: -0.1278,
    name: 'London, United Kingdom',
    source: 'fallback',
  };
}
