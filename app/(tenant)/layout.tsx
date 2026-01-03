/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT DASHBOARD LAYOUT
 * ════════════════════════════════════════════════════════════════════════════
 */

import { Sidebar, TenantMobileNav } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function TenantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar />
      <div className="lg:pl-72">
        <Header MobileNav={TenantMobileNav} />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
