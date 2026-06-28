'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { MapPin } from '@/lib/forms/extract-locations';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();

  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 16);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 });
  }, [map, pins]);

  return null;
}

interface LocationVerificationMapInnerProps {
  pins: MapPin[];
  className?: string;
}

export function LocationVerificationMapInner({
  pins,
  className,
}: LocationVerificationMapInnerProps) {
  if (pins.length === 0) return null;

  const center = pins[0];

  return (
    <div className={className ?? 'h-64 w-full'}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={16}
        className="h-full w-full rounded-lg border"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map((pin, index) => (
          <Marker
            key={`${pin.source}-${pin.label}-${index}`}
            position={[pin.lat, pin.lng]}
          >
            <Popup>
              <span className="text-sm font-medium">{pin.label}</span>
            </Popup>
          </Marker>
        ))}
        <FitBounds pins={pins} />
      </MapContainer>
    </div>
  );
}
