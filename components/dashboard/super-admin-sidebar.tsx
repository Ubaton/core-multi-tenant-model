/**
 * ════════════════════════════════════════════════════════════════════════════
 * SUPER ADMIN SIDEBAR NAVIGATION
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Building2, 
  Users, 
  Settings,
  BarChart3,
  Shield,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/super-admin/dashboard', icon: Home },
  { name: 'Tenants', href: '/super-admin/tenants', icon: Building2 },
  { name: 'Users', href: '/super-admin/users', icon: Users },
  { name: 'Messages', href: '/super-admin/communications', icon: MessageSquare },
  { name: 'Platform Stats', href: '/super-admin/stats', icon: BarChart3 },
  { name: 'Access Control', href: '/super-admin/access', icon: Shield },
  { name: 'Settings', href: '/super-admin/settings', icon: Settings },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60 px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <Link href="/super-admin/dashboard" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm ring-1 ring-border">
                <Shield className="h-5 w-5" />
              </div>
              <span className="text-[15px] font-semibold text-foreground">
                Super Admin
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'h-5 w-5 shrink-0',
                              isActive ? 'text-accent-foreground' : 'text-muted-foreground group-hover:text-foreground'
                            )}
                          />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
