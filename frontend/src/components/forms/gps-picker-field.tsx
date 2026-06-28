'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, RefreshCw } from 'lucide-react';
import { getCurrentPosition } from '@/lib/camera/geolocation';
import type { GpsFieldValue } from '@/lib/forms/types';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/stores/locale-store';

interface GpsPickerFieldProps {
  value: GpsFieldValue | null | undefined;
  onChange: (value: GpsFieldValue) => void;
  disabled?: boolean;
}

export function GpsPickerField({ value, onChange, disabled }: GpsPickerFieldProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(!value);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const runCapture = useCallback(async () => {
    if (disabled) return;

    setLoading(true);
    setError(null);

    try {
      const pos = await getCurrentPosition();
      onChange({
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        capturedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.forms.gpsError);
    } finally {
      setLoading(false);
    }
  }, [disabled, onChange, t.forms.gpsError]);

  useEffect(() => {
    if (value || disabled) return;
    void runCapture();
  }, [value, disabled, attempt, runCapture]);

  if (loading) {
    return (
      <div className="flex h-12 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t.forms.gpsCapturing}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setAttempt((n) => n + 1)}
        >
          <RefreshCw className="size-3.5" />
          {t.forms.gpsRetry}
        </Button>
      </div>
    );
  }

  if (!value) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm" dir="ltr">
      <MapPin className="size-4 shrink-0 text-primary" />
      <div className="min-w-0 font-mono text-xs sm:text-sm">
        <p>
          {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
        {value.accuracy !== undefined && (
          <p className="text-muted-foreground">
            ±{Math.round(value.accuracy)}m · {t.commandCenter.gpsVerified}
          </p>
        )}
      </div>
    </div>
  );
}
