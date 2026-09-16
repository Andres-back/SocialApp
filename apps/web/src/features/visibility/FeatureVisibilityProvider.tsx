import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { APP_FEATURES, ROLES, type AppFeatureKey } from '@socialapp/shared';
import { useAuth } from '../auth/useAuth';
import { api } from '../../lib/api';
import { FeatureVisibilityContext } from './feature-visibility-context';

const STORAGE_KEY = 'socialapp.featureVisibility';
const defaults = Object.fromEntries(Object.values(APP_FEATURES).map((key) => [key, true])) as Record<AppFeatureKey, boolean>;

function cachedVisibility() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } as Record<AppFeatureKey, boolean>; }
  catch { return defaults; }
}

export function FeatureVisibilityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [visibility, setVisibility] = useState<Record<AppFeatureKey, boolean>>(cachedVisibility);
  const refresh = useCallback(async () => {
    if (!navigator.onLine) return;
    const items = await api.featureVisibility();
    const next = { ...defaults };
    for (const item of items) next[item.key] = item.enabledForSocialWorker;
    setVisibility(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);
  useEffect(() => {
    const update = () => void refresh().catch(() => undefined);
    update();
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    window.addEventListener('socialapp:features-updated', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); window.removeEventListener('socialapp:features-updated', update); };
  }, [refresh]);
  const value = useMemo(() => ({
    isVisible(key: AppFeatureKey) {
      if (!user?.roles.includes(ROLES.SOCIAL_WORKER) || user.roles.includes(ROLES.ADMIN)) return true;
      return visibility[key] !== false;
    },
    refresh,
  }), [refresh, user, visibility]);
  return <FeatureVisibilityContext.Provider value={value}>{children}</FeatureVisibilityContext.Provider>;
}
