import { apiFetch } from './client';
import type { AuthUser } from '@/stores/auth-store';

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  organizationName: string;
  organizationNameAr?: string;
  organizationType: 'CLIENT';
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export function login(payload: LoginPayload) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function register(payload: RegisterPayload) {
  return apiFetch<AuthResponse & { organization: unknown }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
