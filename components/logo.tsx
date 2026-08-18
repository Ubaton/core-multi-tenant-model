/**
 * ════════════════════════════════════════════════════════════════════════════
 * LOGO
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Single source of brand identity for the navbar, auth pages, and footer.
 *
 * ─ Swapping in a real logo file ──────────────────────────────────────────────
 * There is no logo asset in /public yet, so the mark is the Church glyph in a
 * rounded tile. To use an image instead, drop it in /public and replace the
 * contents of <LogoMark> with:
 *
 *   <Image src="/logo.svg" alt="" width={32} height={32} className={...} />
 *
 * Nothing else needs to change - every surface renders through this file.
 */

import Link from 'next/link';
import { Church } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Organisation name shown beside the mark. */
export const BRAND_NAME = 'Unity Fellowship Church';

type LogoSize = 'sm' | 'md' | 'lg';

const MARK_SIZES: Record<LogoSize, string> = {
  sm: 'size-8 rounded-lg [&_svg]:size-4',
  md: 'size-10 rounded-xl [&_svg]:size-5',
  lg: 'size-12 rounded-xl [&_svg]:size-6',
};

const WORDMARK_SIZES: Record<LogoSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

/**
 * The mark on its own - use when the name is already stated nearby, such as
 * above an auth card heading.
 */
export function LogoMark({
  size = 'sm',
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex items-center justify-center border border-primary/15 bg-primary/10 text-primary',
        MARK_SIZES[size],
        className
      )}
    >
      <Church />
    </span>
  );
}

/**
 * Mark plus wordmark. Renders as a link when `href` is given (the default is
 * the landing page); pass `href={null}` for a plain, non-interactive lockup.
 */
export function Logo({
  size = 'sm',
  href = '/',
  className,
  showWordmark = true,
}: {
  size?: LogoSize;
  href?: string | null;
  className?: string;
  showWordmark?: boolean;
}) {
  const content = (
    <>
      <LogoMark size={size} />
      {showWordmark && (
        <span className={cn('font-semibold tracking-tight', WORDMARK_SIZES[size])}>
          {BRAND_NAME}
        </span>
      )}
    </>
  );

  const classes = cn('inline-flex items-center gap-2.5', className);

  if (href === null) {
    return <span className={classes}>{content}</span>;
  }

  return (
    <Link href={href} className={cn(classes, 'transition-opacity hover:opacity-80')}>
      {content}
    </Link>
  );
}
