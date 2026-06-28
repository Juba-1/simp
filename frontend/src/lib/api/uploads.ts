import { apiFetch } from './client';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export interface UploadMetadata {
  projectId: string;
  formInstanceId?: string;
  gps_lat: number;
  gps_lng: number;
  capture_timestamp: string;
  device_id?: string;
  camera_facing?: string;
}

export interface UploadResponse {
  id: string;
  projectId: string;
  formInstanceId?: string;
  storageKey: string;
  originalFilename: string;
}

export interface FileAttachment {
  id: string;
  projectId: string;
  formInstanceId: string | null;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey?: string;
  gpsLat: string;
  gpsLng: string;
  captureTimestamp: string;
  createdAt: string;
  publicUrl?: string | null;
}

export function fetchProjectAttachments(token: string, projectId: string) {
  return apiFetch<FileAttachment[]>(`/uploads/project/${projectId}`, { token });
}

/** Authenticated blob URL for local/private storage (revoke when unmounting). */
export async function fetchAttachmentObjectUrl(
  token: string,
  attachmentId: string,
): Promise<string> {
  const response = await fetch(`${API_BASE}/uploads/${attachmentId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to load attachment (${response.status})`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function uploadPhoto(
  token: string,
  file: File | Blob,
  fileName: string,
  metadata: UploadMetadata,
): Promise<UploadResponse> {
  const form = new FormData();
  form.append(
    'file',
    file instanceof File ? file : new File([file], fileName, { type: file.type }),
  );
  form.append('projectId', metadata.projectId);
  if (metadata.formInstanceId) {
    form.append('formInstanceId', metadata.formInstanceId);
  }
  form.append('gps_lat', String(metadata.gps_lat));
  form.append('gps_lng', String(metadata.gps_lng));
  form.append('capture_timestamp', metadata.capture_timestamp);
  if (metadata.device_id) form.append('device_id', metadata.device_id);
  if (metadata.camera_facing) form.append('camera_facing', metadata.camera_facing);

  const response = await fetch(`${API_BASE}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (body as { message?: string })?.message ??
      `Upload failed with status ${response.status}`;
    throw new Error(message);
  }

  return body as UploadResponse;
}
