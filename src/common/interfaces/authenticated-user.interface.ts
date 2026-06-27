import { OrganizationType } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string;
  organizationType: OrganizationType;
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  organizationType: OrganizationType;
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
}
