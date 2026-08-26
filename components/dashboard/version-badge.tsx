/**
 * ════════════════════════════════════════════════════════════════════════════
 * VERSION BADGE
 * Shows the current system version in the sidebar footer. The value comes from
 * package.json and is bumped automatically on push (scripts/bump-version.mjs).
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { cn } from '@/lib/utils';
import { APP_VERSION_LABEL, APP_VERSION_SHORT } from '@/lib/version';

export function VersionBadge({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center pt-1 select-none',
        'text-[10px] font-medium tracking-wide text-muted-foreground/60'
      )}
      title={`System version ${APP_VERSION_LABEL}`}
    >
      {collapsed ? APP_VERSION_SHORT : APP_VERSION_LABEL}
    </div>
  );
}
