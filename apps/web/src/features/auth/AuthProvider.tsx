import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser, PermissionCode } from '@socialapp/shared';
import { api, setAccessToken } from '../../lib/api';
import { AuthContext } from './auth-context';
import { db } from '../../lib/db';

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
  const [user, setUser] = useState<AuthUser | null>(() => readSessionUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user && navigator.onLine) {
      setLoading(true);
      api.refresh()
        .then((session) => {
          if (!session) return;
          setAccessToken(session.accessToken);
          setUser(session.user);
          sessionStorage.setItem(PROFILE_KEY, JSON.stringify(session.user));
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(email: string, password: string) {
        const session = await api.login(email, password);
        const owner = await db.metadata.get('replica.owner');
        if (owner && owner.value !== session.user.id) {
          await api.logout().catch(() => undefined);
          throw new Error('Este dispositivo conserva una réplica asignada a otro usuario. Un administrador debe realizar el cambio seguro de usuario después de sincronizar.');
        }
        await db.metadata.put({ key: 'replica.owner', value: session.user.id, updatedAt: new Date().toISOString() });
        setAccessToken(session.accessToken);
        setUser(session.user);
        sessionStorage.setItem(PROFILE_KEY, JSON.stringify(session.user));
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
