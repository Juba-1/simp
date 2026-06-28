import imageCompression from 'browser-image-compression';

const MAX_SIZE_MB = 1;

export async function compressImage(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85,
  });

  if (compressed.size > MAX_SIZE_MB * 1024 * 1024) {
    return imageCompression(compressed, {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.7,
    });
  }

  return compressed;
}
