export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy?: number;
}

export const DEFAULT_GEO_TIMEOUT_MS = 15_000;

export function getCurrentPosition(
  timeoutMs = DEFAULT_GEO_TIMEOUT_MS,
): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => reject(new Error(err.message || 'Failed to get GPS location')),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}
