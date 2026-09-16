import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser, PermissionCode } from '@socialapp/shared';
import { api, setAccessToken } from '../../lib/api';
import { AuthContext } from './auth-context';
import { db, REPLICA_DATABASE_KEY } from '../../lib/db';
import { prepareReplicaForUser } from './replica-session';

const PROFILE_KEY = 'socialapp.sessionUser';

function readSessionUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function restore() {
      const saved = readSessionUser();
      if (saved) {
        await prepareReplicaForUser(saved);
        if (active) setUser(saved);
      }
      if (!navigator.onLine) return;
      const session = await api.refresh();
      if (!session) {
        if (active) setUser(null);
        sessionStorage.removeItem(PROFILE_KEY);
        return;
      }
      // Shared cookies must not bypass the explicit account switch.
      await prepareReplicaForUser(session.user);
      if (active) {
        setAccessToken(session.accessToken);
        setUser(session.user);
        sessionStorage.setItem(PROFILE_KEY, JSON.stringify(session.user));
      }
    }
    void restore().catch(() => {
      setAccessToken(null);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(email: string, password: string, confirmSwitch = false) {
        const session = await api.login(email, password);
        let databaseName: string;
        try {
          databaseName = await prepareReplicaForUser(session.user, confirmSwitch);
        } catch (error) {
          await api.logout().catch(() => undefined);
          setAccessToken(null);
          throw error;
        }
        setAccessToken(session.accessToken);
        sessionStorage.setItem(REPLICA_DATABASE_KEY, databaseName);
        sessionStorage.setItem(PROFILE_KEY, JSON.stringify(session.user));
        if (databaseName !== db.name) {
          window.location.replace('/');
          return;
        }
        setUser(session.user);
      },
      async logout() {
        try { if (navigator.onLine) await api.logout(); } finally {
          setAccessToken(null);
          setUser(null);
          sessionStorage.removeItem(PROFILE_KEY);
        }
      },
      can(permission: PermissionCode) {
        return user?.permissions.includes(permission) ?? false;
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
