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
      <div className="min-h-screen bg-muted/30">
        <SuperAdminSidebar />
        <SuperAdminContentWrapper>
          <Header MobileNav={SuperAdminMobileNav} />
          <main className="py-6">
            <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </SuperAdminContentWrapper>
      </div>
    </SidebarProvider>
  );
}
