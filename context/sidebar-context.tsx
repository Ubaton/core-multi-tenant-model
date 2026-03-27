/**
 * ════════════════════════════════════════════════════════════════════════════
 * SIDEBAR CONTEXT
 * Manages collapsed/expanded state with localStorage persistence.
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

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
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'true') setCollapsed(true);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // ignore
      }
      return next;
    });
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
