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
      <div className="min-h-screen bg-muted/30">
        <Sidebar />
        <TenantContentWrapper>
          <Header MobileNav={TenantMobileNav} />
          <main className="py-6">
            <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </TenantContentWrapper>
      </div>
    </SidebarProvider>
  );
}
