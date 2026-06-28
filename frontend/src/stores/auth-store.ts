'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OrganizationType } from '@/lib/org-types';
import type { UserPreferences } from '@/lib/api/users';

export interface AuthUserRole {
  id: string;
  name: string;
  nameAr: string | null;
  permissions: unknown;
}

export interface AuthUser {
  id: string;
  email: string | null;
  username?: string | null;
  loginId?: string | null;
  isFieldAccount?: boolean;
  firstName: string;
  lastName: string;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  organizationId: string;
  isOrgAdmin: boolean;
  isSuperAdmin?: boolean;
  isActive?: boolean;
  avatarUrl?: string | null;
  preferences?: UserPreferences & Record<string, unknown>;
  organization: {
    id: string;
    name: string;
    nameAr?: string | null;
    type: OrganizationType | string;
    slug: string;
  };
  role?: AuthUserRole | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      setSession: (accessToken, user) => set({ accessToken, user }),
      updateUser: (patch) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : null,
        })),
      clearSession: () => set({ accessToken: null, user: null }),
      isAuthenticated: () => Boolean(get().accessToken),
    }),
    { name: 'simp-auth' },
  ),
);
