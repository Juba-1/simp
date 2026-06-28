const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export async function downloadFormPdf(token: string, formId: string) {
  const response = await fetch(`${API_BASE}/reports/forms/${formId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      (body as { message?: string })?.message ?? 'PDF download failed',
    );
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition');
  const filename =
    disposition?.match(/filename="(.+)"/)?.[1] ?? `form-${formId}.pdf`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadIpcPdf(token: string, ipcId: string) {
  const response = await fetch(`${API_BASE}/reports/ipc/${ipcId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      (body as { message?: string })?.message ?? 'PDF download failed',
    );
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition');
  const filename =
    disposition?.match(/filename="(.+)"/)?.[1] ?? `ipc-${ipcId}.pdf`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
