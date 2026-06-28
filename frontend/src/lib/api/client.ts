const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(body, response.status), response.status, body);
  }

  return body as T;
}

/**
 * NestJS surfaces validation failures as `message: string[]`. Flatten those (and a few
 * other shapes) into a single human-readable line so toasts/inline errors are never
 * the generic "[object Object]" or "Request failed".
 */
function extractErrorMessage(body: unknown, status: number): string {
  const fallback = `Request failed with status ${status}`;
  if (!body || typeof body !== 'object') return fallback;

  const { message, error } = body as { message?: unknown; error?: unknown };

  if (Array.isArray(message)) {
    const parts = message.filter((m): m is string => typeof m === 'string');
    if (parts.length > 0) return parts.join(' • ');
  }
  if (typeof message === 'string' && message.trim()) return message;
  if (typeof error === 'string' && error.trim()) return error;

  return fallback;
}
