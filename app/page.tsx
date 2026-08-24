/**
 * ════════════════════════════════════════════════════════════════════════════
 * LANDING PAGE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Server component - the page is static, so nothing here needs the client
 * bundle.
 */

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  DollarSign,
  Heart,
  Phone,
  Shield,
  Users,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NoiseTexture } from '@/components/ui/noise-texture';
import { Logo, BRAND_NAME } from '@/components/logo';

const features = [
  {
    icon: Users,
    title: 'Member Management',
    description:
      'Track and manage your congregation with detailed member profiles and engagement tracking.',
  },
  {
    icon: Phone,
    title: 'Call Center',
    description:
      'Reach out to members and leads with integrated call logging and follow-up scheduling.',
  },
  {
    icon: Heart,
    title: 'Prayer Requests',
    description:
      'Collect and manage prayer requests from members and visitors with status tracking.',
  },
  {
    icon: DollarSign,
    title: 'Offerings & Tithes',
    description: 'Record and track all financial contributions with detailed reporting.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Gain insights into church growth, engagement, and financial health.',
  },
  {
    icon: Shield,
    title: 'Multi-Tenant Security',
    description: 'Complete data isolation between churches with role-based access control.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo size="sm" />

          <div className="flex items-center gap-2">
            <Link href="/login" className={cn(buttonVariants({ size: 'sm' }))}>
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b">
        <NoiseTexture className="opacity-[0.3] dark:opacity-[0.45]" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-muted)_0%,transparent_65%)]"
        />

        <div className="relative mx-auto max-w-3xl px-6 py-28 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-success" />
            Multi-tenant church platform
          </span>

          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Everything your church runs on,{' '}
            <span className="text-muted-foreground">in one place.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground">
            Members, leads, prayer requests, offerings, and reporting, with complete data
            isolation between congregations.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className={cn(buttonVariants({ size: 'lg' }), 'h-11 w-full sm:w-auto')}
            >
              Sign in
              <ArrowRight className="ml-2 size-4" />
            </Link>
            <Link
              href="/learn-more"
              className={cn(
                buttonVariants({ size: 'lg', variant: 'outline' }),
                'h-11 w-full sm:w-auto'
              )}
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight">Everything you need</h2>
          <p className="mt-3 text-muted-foreground">
            Built specifically for church administration, not adapted from generic CRM
            software.
          </p>
        </div>

        {/* Hairline grid: cells share borders instead of each card drawing its own */}
        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group bg-card p-7 transition-colors hover:bg-accent/40"
            >
              <span className="flex size-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary transition-transform group-hover:scale-105">
                <feature.icon className="size-4.5" />
              </span>
              <h3 className="mt-5 font-medium tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Call to action ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-2xl border bg-card px-6 py-16 text-center">
          <NoiseTexture className="opacity-[0.35] dark:opacity-[0.5]" />
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-20 -top-24 h-56 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="relative">
            <h2 className="text-balance text-3xl font-semibold tracking-tight">
              Ready to transform your church management?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-balance text-muted-foreground">
              Contact us to get your congregation onboarded by our team.
            </p>
            <Link
              href="/learn-more"
              className={cn(buttonVariants({ size: 'lg' }), 'mt-8 h-11')}
            >
              Learn more
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Logo size="sm" />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/learn-more" className="transition-colors hover:text-foreground">
              Learn more
            </Link>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {BRAND_NAME}
          </p>
        </div>
      </footer>
    </div>
  );
}
