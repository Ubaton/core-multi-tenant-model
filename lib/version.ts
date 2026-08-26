/**
 * ════════════════════════════════════════════════════════════════════════════
 * SYSTEM VERSION
 * Sourced from package.json at build time (see `env` in next.config.ts) and
 * bumped automatically by scripts/bump-version.mjs from conventional commits.
 * ════════════════════════════════════════════════════════════════════════════
 */

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

/** Display form, e.g. "v1.0.0". */
export const APP_VERSION_LABEL = `v${APP_VERSION}`;

/** Compact form for the collapsed sidebar, e.g. "1.0". */
export const APP_VERSION_SHORT = APP_VERSION.split('.').slice(0, 2).join('.');
