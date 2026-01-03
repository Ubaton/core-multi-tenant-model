/**
 * ════════════════════════════════════════════════════════════════════════════
 * SUPER ADMIN DASHBOARD LAYOUT
 * ════════════════════════════════════════════════════════════════════════════
 */

import { SuperAdminSidebar } from '@/components/dashboard/super-admin-sidebar';
import { Header } from '@/components/dashboard/header';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <SuperAdminSidebar />
      <div className="lg:pl-72">
        <Header />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
