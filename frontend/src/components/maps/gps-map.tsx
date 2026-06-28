'use client';

import { LocationVerificationMap } from '@/components/maps/location-verification-map';

interface GpsMapProps {
  lat: number;
  lng: number;
  className?: string;
  zoom?: number;
}

export function GpsMap({ lat, lng, className }: GpsMapProps) {
  return (
    <LocationVerificationMap
      pins={[{ lat, lng, label: 'GPS', source: 'gps_picker' }]}
      className={className ?? 'h-48 w-full'}
      showLegend={false}
    />
  );
}
