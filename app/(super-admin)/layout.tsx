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
      <div className="h-dvh overflow-hidden bg-muted/30">
        <SuperAdminSidebar />
        <SuperAdminContentWrapper>
          <Header MobileNav={SuperAdminMobileNav} />
          <main className="h-[calc(100dvh-4rem)] py-6 overflow-y-auto overscroll-contain">
            <div className="mx-auto min-h-full w-full px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </SuperAdminContentWrapper>
      </div>
    </SidebarProvider>
  );
}
