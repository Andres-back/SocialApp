import { createContext } from 'react';
import type { AppFeatureKey } from '@socialapp/shared';

export type FeatureVisibilityContextValue = { isVisible: (key: AppFeatureKey) => boolean; refresh: () => Promise<void> };
export const FeatureVisibilityContext = createContext<FeatureVisibilityContextValue>({ isVisible: () => true, refresh: async () => undefined });
