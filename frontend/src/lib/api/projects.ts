import { apiFetch } from './client';

export interface ProjectSummary {
  id: string;
  name: string;
  nameAr?: string | null;
  code: string;
  status: string;
}

export interface ProjectOrganizationMember {
  id: string;
  role: string;
  organization: {
    id: string;
    name: string;
    nameAr: string | null;
    type: string;
  };
}

export interface ProjectDetail extends ProjectSummary {
  description?: string | null;
  ownerOrg?: { id: string; name: string; type: string; slug?: string };
  organizations?: ProjectOrganizationMember[];
}

export interface OrgDirectoryItem {
  id: string;
  name: string;
  nameAr: string | null;
  type: string;
  slug: string;
}

export interface PaginatedProjects {
  data: ProjectSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function fetchProjects(token: string, page = 1, limit = 50) {
  return apiFetch<PaginatedProjects>(`/projects?page=${page}&limit=${limit}`, {
    token,
  });
}

export function fetchProject(token: string, projectId: string) {
  return apiFetch<ProjectDetail>(`/projects/${projectId}`, { token });
}

export interface CreateProjectPayload {
  name: string;
  nameAr?: string;
  code: string;
  description?: string;
  status?: string;
}

export function createProject(token: string, payload: CreateProjectPayload) {
  return apiFetch<ProjectSummary>('/projects', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function searchOrgDirectory(
  token: string,
  type: 'CONSULTANT' | 'MAIN_CONTRACTOR' | 'LABORATORY',
  q?: string,
) {
  const params = new URLSearchParams({ type });
  if (q) params.set('q', q);
  return apiFetch<OrgDirectoryItem[]>(
    `/organizations/directory/search?${params.toString()}`,
    { token },
  );
}

export function assignProjectOrganization(
  token: string,
  projectId: string,
  organizationId: string,
  role: 'CONSULTANT' | 'MAIN_CONTRACTOR' | 'LABORATORY',
) {
  return apiFetch(`/projects/${projectId}/organizations`, {
    method: 'POST',
    token,
    body: JSON.stringify({ organizationId, role }),
  });
}

export function unassignProjectOrganization(
  token: string,
  projectId: string,
  membershipId: string,
) {
  return apiFetch(`/projects/${projectId}/organizations/${membershipId}`, {
    method: 'DELETE',
    token,
  });
}

// ─── User ↔ Project access matrix ─────────────────────────────────────────────

export interface ProjectTeamMember {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
  organizationId: string;
  organizationName: string;
  organizationNameAr: string | null;
  organizationType: string;
  isOrgAdmin: boolean;
  isActive: boolean;
  roleName: string | null;
  roleNameAr: string | null;
  assigned: boolean;
  locked: boolean;
  canManage: boolean;
}

export interface ProjectTeamResponse {
  roster: ProjectTeamMember[];
  availableToAssign: ProjectTeamMember[];
  permissions: {
    canAssignMembers: boolean;
    canLinkSubContractor: boolean;
  };
}

export function fetchProjectTeam(token: string, projectId: string) {
  return apiFetch<ProjectTeamResponse>(`/projects/${projectId}/team`, { token });
}

export function assignProjectUser(
  token: string,
  projectId: string,
  userId: string,
) {
  return apiFetch<{ success: boolean; assigned: boolean }>(
    `/projects/${projectId}/team`,
    { method: 'POST', token, body: JSON.stringify({ userId }) },
  );
}

export function removeProjectUser(
  token: string,
  projectId: string,
  userId: string,
) {
  return apiFetch<{ success: boolean; assigned: boolean }>(
    `/projects/${projectId}/team/${userId}`,
    { method: 'DELETE', token },
  );
}

// ─── Client-driven vendor onboarding ──────────────────────────────────────────

export interface OnboardVendorPayload {
  name: string;
  nameAr?: string;
  type: 'CONSULTANT' | 'MAIN_CONTRACTOR' | 'LABORATORY';
  adminFullName: string;
  adminUsername: string;
  adminPassword: string;
}

export interface OnboardVendorResult {
  organization: { id: string; name: string; type: string; slug: string };
  admin: { id: string; loginId: string; firstName: string; lastName: string };
  membershipId: string;
}

export function onboardVendor(
  token: string,
  projectId: string,
  payload: OnboardVendorPayload,
) {
  return apiFetch<OnboardVendorResult>(`/projects/${projectId}/vendors`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

// ─── Sub-contractors (Main Contractor) ────────────────────────────────────────

export interface SubContractorLinkRow {
  id: string;
  projectId: string;
  projectName: string;
  projectNameAr: string | null;
  projectCode: string;
  subContractor: {
    id: string;
    name: string;
    nameAr: string | null;
    type: string;
    isActive: boolean;
  };
  createdAt: string;
}

export interface ProvisionSubContractorPayload {
  name: string;
  nameAr?: string;
  adminFullName: string;
  adminUsername: string;
  adminPassword: string;
}

export function fetchSubContractors(token: string) {
  return apiFetch<SubContractorLinkRow[]>('/projects/sub-contractors', { token });
}

export function provisionSubContractor(
  token: string,
  projectId: string,
  payload: ProvisionSubContractorPayload,
) {
  return apiFetch(`/projects/${projectId}/sub-contractors/provision`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function linkSubContractorToProject(
  token: string,
  projectId: string,
  subContractorOrgId: string,
) {
  return apiFetch(`/projects/${projectId}/sub-contractors`, {
    method: 'POST',
    token,
    body: JSON.stringify({ subContractorOrgId }),
  });
}

export function resetSubContractorAdminPassword(
  token: string,
  subContractorOrgId: string,
  password: string,
) {
  return apiFetch<{ success: boolean; username: string | null }>(
    `/projects/sub-contractors/${subContractorOrgId}/admin/password`,
    {
      method: 'PATCH',
      token,
      body: JSON.stringify({ password }),
    },
  );
}

/** Unique sub-contractor orgs managed by this Main Contractor (deduped across projects) */
export function dedupeManagedSubContractors(links: SubContractorLinkRow[]) {
  const map = new Map<string, SubContractorLinkRow['subContractor']>();
  for (const row of links) {
    if (!map.has(row.subContractor.id)) {
      map.set(row.subContractor.id, row.subContractor);
    }
  }
  return Array.from(map.values());
}
