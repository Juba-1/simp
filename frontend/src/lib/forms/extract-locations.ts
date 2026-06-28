import type { FileAttachment } from '@/lib/api/uploads';

export interface MapPin {
  lat: number;
  lng: number;
  label: string;
  source: 'gps_picker' | 'photo' | 'attachment';
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export function extractFormLocations(
  data: Record<string, unknown>,
  attachments: FileAttachment[] = [],
): MapPin[] {
  const pins: MapPin[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (!value || typeof value !== 'object') continue;
    const o = value as Record<string, unknown>;

    if (typeof o.lat === 'number' && typeof o.lng === 'number') {
      if (isValidCoord(o.lat, o.lng)) {
        pins.push({ lat: o.lat, lng: o.lng, label: key, source: 'gps_picker' });
      }
    } else if (typeof o.gpsLat === 'number' && typeof o.gpsLng === 'number') {
      if (isValidCoord(o.gpsLat, o.gpsLng)) {
        pins.push({
          lat: o.gpsLat,
          lng: o.gpsLng,
          label: String(o.fileName ?? key),
          source: 'photo',
        });
      }
    }
  }

  for (const att of attachments) {
    const lat = Number(att.gpsLat);
    const lng = Number(att.gpsLng);
    if (isValidCoord(lat, lng)) {
      pins.push({
        lat,
        lng,
        label: att.originalFilename,
        source: 'attachment',
      });
    }
  }

  return pins;
}
