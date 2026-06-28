import { apiFetch } from './client';

export interface PlatformOrgAdmin {
  id: string;
  username: string | null;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

export interface PlatformOrganization {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
  projectCount: number;
  admin: PlatformOrgAdmin | null;
}

export interface CreatePlatformOrgPayload {
  name: string;
  nameAr?: string;
  type: 'CLIENT' | 'CONSULTANT' | 'MAIN_CONTRACTOR' | 'LABORATORY';
  adminFullName: string;
  adminUsername: string;
  adminPassword: string;
}

export interface CreatePlatformOrgResult {
  organization: {
    id: string;
    name: string;
    type: string;
    slug: string;
  };
  admin: {
    id: string;
    username: string | null;
    firstName: string;
    lastName: string;
    loginId: string;
  };
}

export function fetchPlatformOrganizations(token: string) {
  return apiFetch<PlatformOrganization[]>('/system/organizations', { token });
}

export function createPlatformOrganization(
  token: string,
  payload: CreatePlatformOrgPayload,
) {
  return apiFetch<CreatePlatformOrgResult>('/system/organizations', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function updatePlatformOrganization(
  token: string,
  orgId: string,
  payload: { name?: string; nameAr?: string },
) {
  return apiFetch(`/system/organizations/${orgId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}

export function suspendPlatformOrganization(token: string, orgId: string) {
  return apiFetch<{ success: boolean }>(`/system/organizations/${orgId}/suspend`, {
    method: 'PATCH',
    token,
  });
}

export function deletePlatformOrganization(token: string, orgId: string) {
  return apiFetch<{ success: boolean }>(`/system/organizations/${orgId}`, {
    method: 'DELETE',
    token,
  });
}

export function resetPlatformUserPassword(
  token: string,
  userId: string,
  password: string,
) {
  return apiFetch<{ success: boolean }>(`/system/users/${userId}/password`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ password }),
  });
}
