/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT SIDEBAR NAVIGATION
 * Collapsible, permission-aware navigation for tenant dashboard users.
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
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  LucideIcon,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VersionBadge } from '@/components/dashboard/version-badge';
import { useModulePermissions } from '@/lib/client/hooks/use-user-permissions';
import { useSidebar } from '@/context/sidebar-context';
import { useCurrentUser, useLogout, useTenantProfile } from '@/lib/client';

// ─── Navigation Definition ───────────────────────────────────────────────────

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  module: string;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Home, module: 'dashboard' },
    ],
  },
  {
    label: 'Ministry',
    items: [
      { name: 'Members',         href: '/members',         icon: Users,       module: 'members'          },
      { name: 'Leads',           href: '/leads',           icon: UserPlus,    module: 'leads'            },
      { name: 'Prayer Requests', href: '/prayer-requests', icon: HandHeart,   module: 'prayer_requests'  },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { name: 'Offerings',       href: '/offerings',       icon: DollarSign,  module: 'offerings'        },
      { name: 'Call Center',     href: '/calls',           icon: Phone,       module: 'calls'            },
      { name: 'Communications',  href: '/communications',  icon: MessageSquare, module: 'communications' },
      { name: 'Services',        href: '/services',        icon: Calendar,    module: 'reports'          },
    ],
  },
  {
    label: 'Administration',
    items: [
      { name: 'Reports',  href: '/reports',  icon: BarChart3, module: 'reports'   },
      { name: 'Settings', href: '/settings', icon: Settings,  module: 'settings'  },
    ],
  },
];

// ─── CSS Tooltip ──────────────────────────────────────────────────────────────

function NavTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group/tip relative flex items-center">
      {children}
      <span
        className={cn(
          'pointer-events-none absolute left-full ml-3 z-200',
          'rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-md',
          'whitespace-nowrap',
          'opacity-0 translate-x-1 group-hover/tip:opacity-100 group-hover/tip:translate-x-0',
          'transition-all duration-150 ease-out'
        )}
      >
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
      </span>
    </div>
  );
}

// ─── Single Nav Item ──────────────────────────────────────────────────────────

function NavItem({
  item,
  collapsed,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const { canView, isModuleLocked } = useModulePermissions();

  const locked = isModuleLocked(item.module);
  const hasView = canView(item.module);
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = item.icon;

  // Completely locked → hide
  if (locked) return null;

  // No view access → disabled row (only show when expanded)
  if (!hasView) {
    if (collapsed) return null;

    return (
      <div
        title={`You don't have permission to access ${item.name}`}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 w-full',
          'text-sm font-medium cursor-not-allowed opacity-40',
          'text-muted-foreground'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{item.name}</span>
        <Lock className="h-3.5 w-3.5 shrink-0" />
      </div>
    );
  }

  // Accessible item
  const link = (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'group/link relative flex items-center rounded-lg text-sm font-medium',
        'transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        collapsed
          ? 'h-10 w-10 mx-auto justify-center'
          : 'gap-3 px-3 py-2.5 w-full',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon
        className={cn(
          'shrink-0 transition-transform duration-150',
          collapsed ? 'h-5 w-5' : 'h-4 w-4',
          !isActive && 'group-hover/link:scale-110'
        )}
      />
      {!collapsed && <span className="truncate">{item.name}</span>}
    </Link>
  );

  if (collapsed) {
    return <NavTooltip label={item.name}>{link}</NavTooltip>;
  }

  return link;
}

// ─── Sidebar Inner Content ────────────────────────────────────────────────────

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { toggle } = useSidebar();
  const { data: user } = useCurrentUser();
  const { data: tenant } = useTenantProfile();
  const logout = useLogout();

  const isDesktop = !onNavigate;

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '??';

  const tenantName = tenant?.name ?? 'My Church';
  const tenantInitial = tenantName[0]?.toUpperCase() ?? 'C';

  return (
    <div className="flex h-full flex-col select-none">
      {/* ── Header / Logo ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-2 border-b border-border/60',
          collapsed ? 'justify-center px-4' : 'justify-between px-4'
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <div className="h-8 w-8 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm font-bold text-sm">
            {tenantInitial}
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-tight text-foreground truncate leading-none">
                {tenantName}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                Church Dashboard
              </p>
            </div>
          )}
        </Link>

        {/* Collapse button — desktop expanded only */}
        {isDesktop && !collapsed && (
          <button
            onClick={toggle}
            className={cn(
              'shrink-0 flex h-7 w-7 items-center justify-center rounded-md',
              'text-muted-foreground hover:text-foreground hover:bg-accent',
              'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60'
            )}
            title="Collapse sidebar"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        <div className="space-y-5">
          {navGroups.map((group, gi) => (
            <div key={group.label}>
              {/* Group label */}
              {!collapsed ? (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
                  {group.label}
                </p>
              ) : (
                gi > 0 && (
                  <div className="my-3 mx-auto w-5 h-px bg-border/60" />
                )
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    onClick={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border/60 p-3 space-y-1">
        {/* Expand button — desktop collapsed only */}
        {isDesktop && collapsed && (
          <NavTooltip label="Expand sidebar">
            <button
              onClick={toggle}
              className={cn(
                'flex h-10 w-10 mx-auto items-center justify-center rounded-lg',
                'text-muted-foreground hover:text-foreground hover:bg-accent',
                'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60'
              )}
              title="Expand sidebar"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </NavTooltip>
        )}

        {/* User profile */}
        {collapsed ? (
          <NavTooltip label={user ? `${user.firstName} ${user.lastName}` : 'Account'}>
            <div className="h-10 w-10 mx-auto rounded-lg bg-muted/60 ring-1 ring-border flex items-center justify-center cursor-default overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-10 w-10 object-cover" />
              ) : (
                <span className="text-[11px] font-bold text-foreground/70">{initials}</span>
              )}
            </div>
          </NavTooltip>
        ) : (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            {/* Avatar */}
            <div className="h-8 w-8 shrink-0 rounded-lg bg-muted/60 ring-1 ring-border flex items-center justify-center overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-8 w-8 object-cover" />
              ) : (
                <span className="text-xs font-bold text-foreground/70">{initials}</span>
              )}
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-foreground truncate leading-tight">
                {user ? `${user.firstName} ${user.lastName}` : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight capitalize">
                {user?.role?.replace(/_/g, ' ').toLowerCase() ?? 'Member'}
              </p>
            </div>

            {/* Sign out */}
            <button
              onClick={() => logout.mutate()}
              className={cn(
                'shrink-0 flex h-7 w-7 items-center justify-center rounded-md',
                'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
                'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60'
              )}
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <VersionBadge collapsed={collapsed} />
      </div>
    </div>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

export function Sidebar() {
  const { collapsed } = useSidebar();

  return (
    <aside
      className={cn(
        'hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:flex-col',
        'border-r border-border bg-background',
        'transition-[width] duration-300 ease-in-out will-change-[width]',
        collapsed ? 'lg:w-17' : 'lg:w-64'
      )}
    >
      <SidebarContent collapsed={collapsed} />
    </aside>
  );
}

// ─── Mobile Nav (inside Sheet) ────────────────────────────────────────────────

export function TenantMobileNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-background">
      <SidebarContent collapsed={false} onNavigate={onNavigate} />
    </div>
  );
}

// ─── Content Wrapper ──────────────────────────────────────────────────────────

export function TenantContentWrapper({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div
      className={cn(
        'transition-[padding-left] duration-300 ease-in-out',
        collapsed ? 'lg:pl-17' : 'lg:pl-64'
      )}
    >
      {children}
    </div>
  );
}
