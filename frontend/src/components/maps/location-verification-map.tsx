'use client';

import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import type { MapPin as MapPinType } from '@/lib/forms/extract-locations';
import { useTranslation } from '@/stores/locale-store';
import { Skeleton } from '@/components/ui/skeleton';

const LocationVerificationMapInner = dynamic(
  () =>
    import('./location-verification-map-inner').then(
      (m) => m.LocationVerificationMapInner,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
  },
);

interface LocationVerificationMapProps {
  pins: MapPinType[];
  className?: string;
  showLegend?: boolean;
}

export function LocationVerificationMap({
  pins,
  className,
  showLegend = true,
}: LocationVerificationMapProps) {
  const { t } = useTranslation();

  if (pins.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
        <MapPin className="size-8 opacity-40" />
        <p>{t.commandCenter.noGpsData}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showLegend && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{t.commandCenter.locationVerification}</p>
          <p className="text-xs text-muted-foreground">
            {t.commandCenter.locationVerificationDesc.replace(
              '{count}',
              String(pins.length),
            )}
          </p>
        </div>
      )}
      <LocationVerificationMapInner pins={pins} className={className} />
    </div>
  );
}
