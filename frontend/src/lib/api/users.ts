import { apiFetch } from './client';
import type { FormInstanceRecord } from './forms';

export interface UserRole {
  id: string;
  name: string;
  nameAr: string | null;
  permissions: unknown;
}

export interface TeamMember {
  id: string;
  username: string | null;
  email: string | null;
  loginId: string | null;
  isFieldAccount: boolean;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  organizationId: string;
  isOrgAdmin: boolean;
  isActive: boolean;
  avatarUrl: string | null;
  preferences: Record<string, unknown>;
  lastLoginAt: string | null;
  createdAt: string;
  role: UserRole | null;
}

export interface OrgRole {
  id: string;
  name: string;
  nameAr: string | null;
  permissions: unknown;
  isSystem: boolean;
}

export interface CreateUserPayload {
  fullName: string;
  username: string;
  password: string;
  roleId?: string;
  isOrgAdmin?: boolean;
}

export interface UserPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  slaAlerts?: boolean;
  weeklyDigest?: boolean;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export function fetchTeamMembers(token: string) {
  return apiFetch<TeamMember[]>('/users/organization/members', { token });
}

export function fetchOrgRoles(token: string) {
  return apiFetch<OrgRole[]>('/users/organization/roles', { token });
}

export function createTeamMember(token: string, payload: CreateUserPayload) {
  return apiFetch<{ user: TeamMember }>('/users/organization/members', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function updateTeamMember(
  token: string,
  memberId: string,
  payload: Partial<{
    firstName: string;
    lastName: string;
    roleId: string;
    isOrgAdmin: boolean;
    isActive: boolean;
  }>,
) {
  return apiFetch<TeamMember>(`/users/organization/members/${memberId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}

export function resetTeamMemberPassword(
  token: string,
  memberId: string,
  password: string,
) {
  return apiFetch<{ success: boolean }>(
    `/users/organization/members/${memberId}/password`,
    {
      method: 'PATCH',
      token,
      body: JSON.stringify({ password }),
    },
  );
}

export function updateMyProfile(
  token: string,
  payload: Partial<{
    firstName: string;
    lastName: string;
    firstNameAr: string;
    lastNameAr: string;
    avatarUrl: string;
    preferences: UserPreferences;
  }>,
) {
  return apiFetch<TeamMember>('/users/me/profile', {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}

export async function uploadMyAvatar(token: string, file: File) {
  const form = new FormData();
  form.append('file', file);

  const response = await fetch(`${API_BASE}/users/me/avatar`, {
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

  return body as TeamMember;
}

export interface MemberProjectAccessItem {
  id: string;
  name: string;
  nameAr: string | null;
  code: string;
  status: string;
  assigned: boolean;
}

export interface MemberProjectAccess {
  memberId: string;
  isOrgAdmin: boolean;
  projects: MemberProjectAccessItem[];
}

export function fetchMemberProjects(token: string, memberId: string) {
  return apiFetch<MemberProjectAccess>(
    `/users/organization/members/${memberId}/projects`,
    { token },
  );
}

export function setMemberProjects(
  token: string,
  memberId: string,
  projectIds: string[],
) {
  return apiFetch<{ success: boolean; count: number }>(
    `/users/organization/members/${memberId}/projects`,
    { method: 'PATCH', token, body: JSON.stringify({ projectIds }) },
  );
}

export interface PendingApprovalsResult {
  data: (FormInstanceRecord & {
    project?: { id: string; code: string; name: string; nameAr: string | null };
  })[];
  meta: { total: number };
}

export function fetchPendingApprovals(
  token: string,
  params?: { projectId?: string; limit?: number },
) {
  const search = new URLSearchParams();
  if (params?.projectId) search.set('projectId', params.projectId);
  if (params?.limit) search.set('limit', String(Math.min(params.limit, 100)));
  const qs = search.toString();
  return apiFetch<PendingApprovalsResult>(
    `/forms/instances/pending/approvals${qs ? `?${qs}` : ''}`,
    { token },
  );
}
