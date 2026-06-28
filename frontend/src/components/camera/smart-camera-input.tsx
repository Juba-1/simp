'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, MapPin, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/camera/compress';
import { getCurrentPosition } from '@/lib/camera/geolocation';
import { applyWatermark } from '@/lib/camera/watermark';

export interface CameraCaptureResult {
  file: File;
  blob: Blob;
  previewUrl: string;
  gpsLat: number;
  gpsLng: number;
  captureTimestamp: string;
  sizeBytes: number;
}

export interface SmartCameraInputProps {
  projectId: string;
  projectName: string;
  userName: string;
  formInstanceId?: string;
  onCapture: (result: CameraCaptureResult) => void;
  disabled?: boolean;
  className?: string;
}

export function SmartCameraInput({
  projectId,
  projectName,
  userName,
  formInstanceId,
  onCapture,
  disabled = false,
  className,
}: SmartCameraInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error('Only live camera photos are accepted');
      return;
    }

    setIsProcessing(true);

    try {
      const captureTimestamp = new Date();
      const position = await getCurrentPosition();

      const compressed = await compressImage(file);

      const watermarkedBlob = await applyWatermark(compressed, {
        projectName,
        userName,
        captureTimestamp,
        gpsLat: position.lat,
        gpsLng: position.lng,
      });

      const fileName = `simp-${projectId.slice(0, 8)}-${Date.now()}.jpg`;
      const finalFile = new File([watermarkedBlob], fileName, {
        type: 'image/jpeg',
      });

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(watermarkedBlob);
      setPreviewUrl(url);

      onCapture({
        file: finalFile,
        blob: watermarkedBlob,
        previewUrl: url,
        gpsLat: position.lat,
        gpsLng: position.lng,
        captureTimestamp: captureTimestamp.toISOString(),
        sizeBytes: watermarkedBlob.size,
      });

      toast.success(
        `Photo captured (${(watermarkedBlob.size / 1024).toFixed(0)} KB)`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Camera capture failed',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled || isProcessing}
        onChange={handleFileChange}
      />

      <Button
        type="button"
        variant="outline"
        className="h-14 w-full gap-2 border-dashed text-base"
        disabled={disabled || isProcessing}
        onClick={() => inputRef.current?.click()}
      >
        {isProcessing ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Camera className="size-5" />
        )}
        {isProcessing ? 'Processing photo...' : 'Open Live Camera'}
      </Button>

      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Gallery uploads are blocked. GPS coordinates and timestamp are embedded
          as a watermark for anti-fraud verification.
          {formInstanceId ? ` Linked to form ${formInstanceId.slice(0, 8)}…` : ''}
        </p>
      </div>

      {previewUrl && (
        <div className="overflow-hidden rounded-xl border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Captured site photo with watermark"
            className="aspect-video w-full object-cover"
          />
          <div className="flex items-center gap-1.5 border-t px-3 py-2 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            Watermarked · compressed · ready for upload
          </div>
        </div>
      )}
    </div>
  );
}
