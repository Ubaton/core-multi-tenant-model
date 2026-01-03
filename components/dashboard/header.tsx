/**
 * ════════════════════════════════════════════════════════════════════════════
 * HEADER COMPONENT
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Menu, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCurrentUser, useLogout } from '@/lib/client';
import { useUnreadMessageCount } from '@/lib/client/hooks';

type MobileNavComponent = React.ComponentType<{ onNavigate?: () => void }>;

export function Header({
  MobileNav,
}: {
  MobileNav?: MobileNavComponent;
}) {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const pathname = usePathname();
  const router = useRouter();
  const { data: unreadCount, isLoading: isLoadingCount } = useUnreadMessageCount();

  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Determine the messages link based on current path
  const messagesLink = pathname?.startsWith('/super-admin') 
    ? '/super-admin/communications' 
    : '/communications';

  const settingsLink = pathname?.startsWith('/super-admin')
    ? '/super-admin/settings'
    : '/settings';

  // There isn't a dedicated /profile route; the tenant profile lives under Settings.
  const profileLink = pathname?.startsWith('/super-admin')
    ? '/super-admin/settings'
    : '/settings?tab=profile';

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60 px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      {MobileNav ? (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open sidebar">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open sidebar</span>
              </Button>
            }
          />
          <SheetContent className="p-0">
            <div className="flex h-16 items-center justify-end border-b px-4">
              <SheetClose
                render={
                  <Button variant="ghost" size="icon" aria-label="Close sidebar">
                    <X className="h-5 w-5" />
                  </Button>
                }
              />
            </div>
            <MobileNav onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>
      ) : (
        <Button variant="ghost" size="icon" className="lg:hidden" disabled>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open sidebar</span>
        </Button>
      )}

      {/* Separator */}
      <div className="h-6 w-px bg-border lg:hidden" />

      <div className="flex flex-1 justify-end gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Messages/Notifications */}
          <Link href={messagesLink}>
            <Button variant="ghost" size="icon" className="relative">
              <span className="sr-only">View messages</span>
              <Bell className={`h-5 w-5 ${unreadCount && unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`} />
              {typeof unreadCount === 'number' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </Link>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" />

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-x-3 p-1.5 rounded-md hover:bg-accent/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
              <div className="h-8 w-8 rounded-full bg-muted/60 ring-1 ring-border flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              {user && (
                <span className="hidden lg:flex lg:items-center">
                  <span className="text-sm font-medium text-foreground">
                    {user.firstName} {user.lastName}
                  </span>
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(profileLink)}>Your Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(settingsLink)}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout.mutate()}
                className="text-red-600 dark:text-red-400"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
