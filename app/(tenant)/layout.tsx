/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT DASHBOARD LAYOUT
 * ════════════════════════════════════════════════════════════════════════════
 */

import { Sidebar, TenantMobileNav, TenantContentWrapper } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { SidebarProvider } from '@/context/sidebar-context';

export default function TenantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider storageKey="tenant-sidebar-collapsed">
      <div className="h-dvh overflow-hidden bg-background">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:p-3 focus:ring-2 focus:ring-ring">Skip to content</a>
        <Sidebar />
        <TenantContentWrapper>
          <Header MobileNav={TenantMobileNav} />
          <main id="main-content" tabIndex={-1} className="h-[calc(100dvh-4rem)] min-w-0 overflow-y-auto overscroll-contain py-6">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </TenantContentWrapper>
      </div>
    </SidebarProvider>
  );
}
