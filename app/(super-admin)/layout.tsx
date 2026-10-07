/**
 * ════════════════════════════════════════════════════════════════════════════
 * SUPER ADMIN DASHBOARD LAYOUT
 * ════════════════════════════════════════════════════════════════════════════
 */

import {
  SuperAdminSidebar,
  SuperAdminMobileNav,
  SuperAdminContentWrapper,
} from '@/components/dashboard/super-admin-sidebar';
import { Header } from '@/components/dashboard/header';
import { SidebarProvider } from '@/context/sidebar-context';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="h-dvh overflow-hidden bg-background">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:p-3 focus:ring-2 focus:ring-ring">Skip to content</a>
        <SuperAdminSidebar />
        <SuperAdminContentWrapper>
          <Header MobileNav={SuperAdminMobileNav} />
          <main id="main-content" tabIndex={-1} className="h-[calc(100dvh-4rem)] min-w-0 py-6 overflow-y-auto overscroll-contain">
            <div className="mx-auto min-h-full w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </SuperAdminContentWrapper>
      </div>
    </SidebarProvider>
  );
}
