/**
 * ════════════════════════════════════════════════════════════════════════════
 * LOGO
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Single source of brand identity for the navbar, auth pages, and footer.
 *
 * ─ Logo asset ────────────────────────────────────────────────────────────────
 * The mark renders /public/UFC-Logo.png. To swap it, drop a new file in /public
 * and update the `src` on the <Image> inside <LogoMark>. Nothing else needs to
 * change - every surface renders through this file.
 */

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Organisation name shown beside the mark. */
export const BRAND_NAME = 'Unity Fellowship Church';

type LogoSize = 'sm' | 'md' | 'lg';

const MARK_SIZES: Record<LogoSize, string> = {
  sm: 'size-8 rounded-lg',
  md: 'size-10 rounded-xl',
  lg: 'size-12 rounded-xl',
};

/** Pixel dimensions for the logo image, keyed by size. */
const MARK_PX: Record<LogoSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
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
        'inline-flex items-center justify-center overflow-hidden',
        MARK_SIZES[size],
        className
      )}
    >
      <Image
        src="/UFC-Logo.png"
        alt=""
        width={MARK_PX[size]}
        height={MARK_PX[size]}
        className="size-full object-contain"
      />
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
