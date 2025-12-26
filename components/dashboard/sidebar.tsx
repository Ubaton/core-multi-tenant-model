/**
 * ════════════════════════════════════════════════════════════════════════════
 * SIDEBAR NAVIGATION COMPONENT
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Members', href: '/members', icon: Users },
  { name: 'Leads', href: '/leads', icon: UserPlus },
  { name: 'Prayer Requests', href: '/prayer-requests', icon: HandHeart },
  { name: 'Offerings', href: '/offerings', icon: DollarSign },
  { name: 'Call Center', href: '/calls', icon: Phone },
  { name: 'Communications', href: '/communications', icon: MessageSquare },
  { name: 'Services', href: '/services', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                ChurchHub
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
                            'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors',
                            isActive
                              ? 'bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'h-5 w-5 shrink-0',
                              isActive
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
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
