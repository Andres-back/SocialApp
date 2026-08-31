import { useCallback, useEffect, useState } from 'react';
import type { SystemInstrumentConfigurationData } from '@socialapp/shared';
import { api } from '../../lib/api';
import { systemInstrumentPrompt, type SystemInstrumentKind } from './instrument-catalog';

let cachedConfigurations: SystemInstrumentConfigurationData[] = [];
let cachedAt = 0;

export async function loadSystemInstrumentConfigurations(force = false): Promise<SystemInstrumentConfigurationData[]> {
  if (!force && Date.now() - cachedAt < 15_000) return cachedConfigurations;
  try {
    cachedConfigurations = await api.systemInstruments();
    cachedAt = Date.now();
  } catch {
    // Los textos predeterminados mantienen disponibles los formularios sin conexión.
  }
  return cachedConfigurations;
}

export function invalidateSystemInstrumentConfigurations() {
  cachedAt = 0;
}

export function useSystemInstrument(kind: SystemInstrumentKind) {
  const [configurations, setConfigurations] = useState<SystemInstrumentConfigurationData[]>(cachedConfigurations);
  useEffect(() => { void loadSystemInstrumentConfigurations().then(setConfigurations); }, []);
  return useCallback((id: string) => systemInstrumentPrompt(kind, id, configurations), [kind, configurations]);
}
