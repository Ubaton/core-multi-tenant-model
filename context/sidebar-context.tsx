/**
 * ════════════════════════════════════════════════════════════════════════════
 * SIDEBAR CONTEXT
 * Manages collapsed/expanded state with localStorage persistence.
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import { readPreference, writePreference, subscribePreferences } from '@/lib/client/browser-preferences';

interface SidebarContextType {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({
  children,
  storageKey = 'sidebar-collapsed',
}: {
  children: React.ReactNode;
  storageKey?: string;
}) {
  const collapsed = useSyncExternalStore(
    subscribePreferences,
    () => readPreference(storageKey, 'false') === 'true',
    () => false,
  );

  const toggle = useCallback(() => {
    writePreference(storageKey, String(readPreference(storageKey, 'false') !== 'true'));
  }, [storageKey]);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
