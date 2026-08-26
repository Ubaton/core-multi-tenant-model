/**
 * ════════════════════════════════════════════════════════════════════════════
 * VERSION BADGE
 * Sidebar footer attribution + current system version.
 *
 *   [CMG logo]  Powered by CMG | v1.0.0
 *
 * The version comes from package.json and is bumped automatically on push
 * (scripts/bump-version.mjs).
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { cn } from '@/lib/utils';
import { APP_VERSION_LABEL, APP_VERSION_SHORT } from '@/lib/version';

const CMG_URL = 'https://creativemindsgraphics.com/';

/**
 * Empty alt is deliberate: the adjacent text already names the vendor, and it
 * stops alt text from reflowing the footer while the asset loads or if it 404s.
 */
function CmgLogo({ className }: { className?: string }) {
  return (
    <span className={cn('relative block shrink-0 overflow-hidden', className)}>
      {/* Light mode — dark mark */}
      <img
        src="/icons/CMG-Black-Logo.png"
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain object-center dark:hidden"
      />
      {/* Dark mode — light mark */}
      <img
        src="/icons/CMG-White-Logo.png"
        alt=""
        aria-hidden="true"
        className="hidden h-full w-full object-contain object-center dark:block"
      />
    </span>
  );
}

export function VersionBadge({ collapsed }: { collapsed: boolean }) {
  const title = `Powered by Creative Minds Graphics — system version ${APP_VERSION_LABEL}`;

  if (collapsed) {
    return (
      <div className="mt-1 flex flex-col items-center gap-1 border-t border-border/40 pt-2 select-none">
        <a
          href={CMG_URL}
          target="_blank"
          rel="noopener noreferrer"
          title={title}
          aria-label="Powered by Creative Minds Graphics"
          className="rounded opacity-60 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <CmgLogo className="h-4 w-7" />
        </a>
        <span className="text-[9px] font-medium tabular-nums tracking-wide text-muted-foreground/60">
          {APP_VERSION_SHORT}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'mt-1 flex items-center justify-left gap-1.5 border-t border-border/40 px-1 pt-2',
        'select-none whitespace-nowrap text-[10px] leading-none text-muted-foreground/70'
      )}
    >
      <a
        href={CMG_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        className={cn(
          'flex min-w-0 items-center gap-1.5 rounded outline-none',
          'transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60'
        )}
      >
        <CmgLogo className="h-4 w-7 opacity-80" />
        <span>Powered by</span>
        <span className="font-semibold text-foreground/80">CMG</span>
      </a>

      <span aria-hidden="true" className="text-muted-foreground/30">
        |
      </span>

      <span
        className="font-medium tabular-nums tracking-wide"
        title={`System version ${APP_VERSION_LABEL}`}
      >
        {APP_VERSION_LABEL}
      </span>
    </div>
  );
}
