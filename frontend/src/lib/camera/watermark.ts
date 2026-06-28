export interface WatermarkOptions {
  projectName: string;
  userName: string;
  captureTimestamp: Date;
  gpsLat: number;
  gpsLng: number;
}

function formatWatermarkText(opts: WatermarkOptions): string {
  const dateStr = opts.captureTimestamp.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const gps = `${opts.gpsLat.toFixed(6)}, ${opts.gpsLng.toFixed(6)}`;
  return `${opts.projectName} | ${dateStr} | ${gps} | ${opts.userName}`;
}

function loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for watermarking'));
    };
    img.src = url;
  });
}

export async function applyWatermark(
  file: File | Blob,
  opts: WatermarkOptions,
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(img, 0, 0);

  const text = formatWatermarkText(opts);
  const padding = Math.max(12, Math.round(canvas.width * 0.02));
  const fontSize = Math.max(14, Math.round(canvas.width * 0.028));
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;

  const textMetrics = ctx.measureText(text);
  const bannerHeight = fontSize + padding * 2;
  const bannerY = canvas.height - bannerHeight;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, bannerY, canvas.width, bannerHeight);

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padding, bannerY + bannerHeight / 2);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to export watermarked image'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.88,
    );
  });
}
