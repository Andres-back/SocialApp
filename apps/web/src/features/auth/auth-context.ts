import { createContext } from 'react';
import type { AuthUser, PermissionCode } from '@socialapp/shared';

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login(email: string, password: string, confirmSwitch?: boolean): Promise<void>;
  logout(): Promise<void>;
  can(permission: PermissionCode): boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
