import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getPublicSettings } from '../api/catalog';
import type { PublicSettings } from '../api/types';
import { useApi } from '../hooks/useApi';
import { DEFAULT_SETTINGS } from '../lib/defaultSettings';

interface SettingsContextValue {
  settings: PublicSettings;
  loading: boolean;
  error: unknown;
  usingFallback: boolean;
  reload: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, reload } = useApi(
    (signal) => getPublicSettings(signal),
    [],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings: data?.data ?? DEFAULT_SETTINGS,
      loading,
      error,
      usingFallback: !data,
      reload,
    }),
    [data, loading, error, reload],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside SettingsProvider');
  return context;
}

