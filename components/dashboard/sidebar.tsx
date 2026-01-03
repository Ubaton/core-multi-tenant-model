/**
 * ════════════════════════════════════════════════════════════════════════════
 * SIDEBAR NAVIGATION COMPONENT
 * Permission-aware navigation that hides/disables modules based on user role
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Users, 
  UserPlus, 
  HandHeart, 
  DollarSign, 
  Phone, 
  MessageSquare,
  Settings,
  BarChart3,
  Calendar,
  Lock,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModulePermissions } from '@/lib/client/hooks/use-user-permissions';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  module: string; // Maps to permission module ID
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, module: 'dashboard' },
  { name: 'Members', href: '/members', icon: Users, module: 'members' },
  { name: 'Leads', href: '/leads', icon: UserPlus, module: 'leads' },
  { name: 'Prayer Requests', href: '/prayer-requests', icon: HandHeart, module: 'prayer_requests' },
  { name: 'Offerings', href: '/offerings', icon: DollarSign, module: 'offerings' },
  { name: 'Call Center', href: '/calls', icon: Phone, module: 'calls' },
  { name: 'Communications', href: '/communications', icon: MessageSquare, module: 'communications' },
  { name: 'Services', href: '/services', icon: Calendar, module: 'reports' }, // Using reports module for services
  { name: 'Reports', href: '/reports', icon: BarChart3, module: 'reports' },
  { name: 'Settings', href: '/settings', icon: Settings, module: 'settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isLoading, hasAnyPermission, isModuleLocked, canView } = useModulePermissions();

  // Filter navigation items based on permissions
  const getNavigationItems = () => {
    return navigation.map(item => {
      const locked = isModuleLocked(item.module);
      const hasViewAccess = canView(item.module);
      
      return {
        ...item,
        isLocked: locked,
        isDisabled: !hasViewAccess,
        hasAccess: hasAnyPermission(item.module),
      };
    });
  };

  const navItems = getNavigationItems();

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60 px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm ring-1 ring-border">
                <span className="font-bold text-base">C</span>
              </div>
              <span className="text-[15px] font-semibold text-foreground">
                Unity Fellowship Church
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    
                    // If module is completely locked, hide it from sidebar
                    if (item.isLocked) {
                      return null;
                    }

                    // If user doesn't have view access, show grayed out with lock icon
                    if (item.isDisabled) {
                      return (
                        <li key={item.name}>
                          <div
                            className={cn(
                              'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 cursor-not-allowed',
                              'text-muted-foreground opacity-50'
                            )}
                            title={`You don't have permission to access ${item.name}`}
                          >
                            <item.icon className="h-5 w-5 shrink-0 text-muted-foreground/70" />
                            <span className="flex-1">{item.name}</span>
                            <Lock className="h-4 w-4 text-muted-foreground/70" />
                          </div>
                        </li>
                      );
                    }

                    // Normal accessible item
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
                              isActive
                                ? 'text-accent-foreground'
                                : 'text-muted-foreground group-hover:text-foreground'
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
