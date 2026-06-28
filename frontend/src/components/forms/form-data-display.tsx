'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ImageOff, Loader2, MapPin } from 'lucide-react';
import { GpsMap } from '@/components/maps/gps-map';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  fetchAttachmentObjectUrl,
  type FileAttachment,
} from '@/lib/api/uploads';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface FormDataDisplayProps {
  data: Record<string, unknown>;
  attachments: FileAttachment[];
  liabilityShiftRedAlert: boolean;
}

type PhotoValue = {
  gpsLat: number;
  gpsLng: number;
  fileName?: string;
  captureTimestamp?: string;
  storageKey?: string;
  attachmentId?: string;
  previewUrl?: string;
};

function isPhotoValue(value: unknown): value is PhotoValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'gpsLat' in value &&
    'gpsLng' in value
  );
}

function resolveAttachmentForPhoto(
  photo: PhotoValue,
  attachments: FileAttachment[],
): FileAttachment | undefined {
  if (photo.attachmentId) {
    return attachments.find((a) => a.id === photo.attachmentId);
  }
  if (photo.storageKey) {
    return attachments.find((a) => a.storageKey === photo.storageKey);
  }
  if (photo.fileName) {
    return attachments.find((a) => a.originalFilename === photo.fileName);
  }
  return undefined;
}

function AttachmentImage({
  attachment,
  alt,
  className,
}: {
  attachment: FileAttachment;
  alt: string;
  className?: string;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [src, setSrc] = useState<string | null>(attachment.publicUrl ?? null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(!attachment.publicUrl);

  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;

    async function load() {
      if (attachment.publicUrl) {
        setSrc(attachment.publicUrl);
        setLoading(false);
        return;
      }

      if (!accessToken) {
        setLoading(false);
        setFailed(true);
        return;
      }

      setLoading(true);
      setFailed(false);

      try {
        objectUrl = await fetchAttachmentObjectUrl(accessToken, attachment.id);
        if (!cancelled) {
          setSrc(objectUrl);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setSrc(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [accessToken, attachment.id, attachment.publicUrl]);

  if (loading) {
    return (
      <div
        className={`flex aspect-video items-center justify-center bg-muted/40 ${className ?? ''}`}
      >
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (failed || !src) {
    return (
      <div
        className={`flex aspect-video flex-col items-center justify-center gap-2 bg-muted/40 text-sm text-muted-foreground ${className ?? ''}`}
      >
        <ImageOff className="size-8" />
        <p>{attachment.originalFilename}</p>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- authenticated blob / storage URLs
    <img
      src={src}
      alt={alt}
      className={`aspect-video w-full object-cover ${className ?? ''}`}
    />
  );
}

function EmbeddedPhotoCard({
  fieldKey,
  photo,
  attachment,
}: {
  fieldKey: string;
  photo: PhotoValue;
  attachment?: FileAttachment;
}) {
  const { t } = useTranslation();
  const lat = Number(photo.gpsLat);
  const lng = Number(photo.gpsLng);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {attachment ? (
        <AttachmentImage
          attachment={attachment}
          alt={photo.fileName ?? fieldKey}
        />
      ) : photo.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.previewUrl}
          alt={photo.fileName ?? fieldKey}
          className="aspect-video w-full object-cover"
        />
      ) : (
        <div className="flex aspect-video items-center justify-center bg-muted/40 text-sm text-muted-foreground">
          <MapPin className="me-2 size-5 text-primary" />
          {photo.fileName ?? fieldKey}
        </div>
      )}
      <div className="grid gap-2 p-3 sm:grid-cols-2">
        <div className="space-y-1 text-xs">
          <p className="font-medium">{photo.fileName ?? fieldKey}</p>
          <Badge variant="outline" className="font-mono">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </Badge>
          <p className="text-muted-foreground">{t.commandCenter.gpsVerified}</p>
        </div>
        <GpsMap lat={lat} lng={lng} className="h-32 w-full rounded-md border" />
      </div>
    </div>
  );
}

export function FormDataDisplay({
  data,
  attachments,
  liabilityShiftRedAlert,
}: FormDataDisplayProps) {
  const { t } = useTranslation();

  const photoFieldKeys = new Set(
    Object.entries(data)
      .filter(([, value]) => isPhotoValue(value))
      .map(([key]) => key),
  );

  const entries = Object.entries(data).filter(
    ([key]) => key !== 'liabilityShiftRedAlert' && !photoFieldKeys.has(key),
  );

  const embeddedPhotos = Object.entries(data).filter(([, value]) =>
    isPhotoValue(value),
  ) as Array<[string, PhotoValue]>;

  const unmatchedAttachments = attachments.filter((att) => {
    return !embeddedPhotos.some(([, photo]) => {
      const match = resolveAttachmentForPhoto(photo, [att]);
      return match?.id === att.id;
    });
  });

  return (
    <div className="space-y-6">
      {liabilityShiftRedAlert && (
        <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="text-amber-600" />
          <AlertTitle>{t.commandCenter.liabilityFlagTitle}</AlertTitle>
          <AlertDescription>{t.commandCenter.liabilityFlagBody}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="rounded-lg border bg-muted/20 px-3 py-2"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {key}
            </p>
            <p className="mt-1 text-sm font-medium break-words">
              {formatValue(value)}
            </p>
          </div>
        ))}
      </div>

      {(attachments.length > 0 || embeddedPhotos.length > 0) && (
        <div className="space-y-4">
          <h3 className="font-semibold">{t.commandCenter.photoVerification}</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {embeddedPhotos.map(([key, photo]) => (
              <EmbeddedPhotoCard
                key={key}
                fieldKey={key}
                photo={photo}
                attachment={resolveAttachmentForPhoto(photo, attachments)}
              />
            ))}
            {unmatchedAttachments.map((att) => {
              const lat = Number(att.gpsLat);
              const lng = Number(att.gpsLng);
              return (
                <div
                  key={att.id}
                  className="overflow-hidden rounded-xl border bg-card"
                >
                  <AttachmentImage
                    attachment={att}
                    alt={att.originalFilename}
                  />
                  <div className="grid gap-2 p-3 sm:grid-cols-2">
                    <div className="space-y-1 text-xs">
                      <p className="font-medium">{att.originalFilename}</p>
                      <p className="text-xs text-muted-foreground">
                        {(att.sizeBytes / 1024).toFixed(0)} KB ·{' '}
                        {new Date(att.captureTimestamp).toLocaleString()}
                      </p>
                      <Badge variant="outline" className="font-mono">
                        {lat.toFixed(6)}, {lng.toFixed(6)}
                      </Badge>
                      <p className="text-muted-foreground">
                        {t.commandCenter.gpsVerified}
                      </p>
                    </div>
                    <GpsMap
                      lat={lat}
                      lng={lng}
                      className="h-32 w-full rounded-md border"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    if (isPhotoValue(value)) {
      return `${value.fileName ?? 'Photo'} · GPS ${value.gpsLat.toFixed(4)}, ${value.gpsLng.toFixed(4)}`;
    }
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}
