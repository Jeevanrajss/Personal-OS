import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type ModuleId, readEnabledModules, writeEnabledModules } from '@/lib/modules';

interface ModulesContextValue {
  enabled: Set<ModuleId>;
  isEnabled: (id: ModuleId) => boolean;
  setEnabled: (id: ModuleId, on: boolean) => void;
  toggleModule: (id: ModuleId) => void;
}

const ModulesContext = createContext<ModulesContextValue | null>(null);

export function ModulesProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<Set<ModuleId>>(readEnabledModules);

  const isEnabled = useCallback(
    (id: ModuleId) => enabled.has(id),
    [enabled],
  );

  const setEnabled = useCallback((id: ModuleId, on: boolean) => {
    setEnabledState((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      writeEnabledModules(next);
      return next;
    });
  }, []);

  const toggleModule = useCallback((id: ModuleId) => {
    setEnabledState((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      writeEnabledModules(next);
      return next;
    });
  }, []);

  return (
    <ModulesContext.Provider value={{ enabled, isEnabled, setEnabled, toggleModule }}>
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules(): ModulesContextValue {
  const ctx = useContext(ModulesContext);
  if (!ctx) throw new Error('useModules must be used within ModulesProvider');
  return ctx;
}
