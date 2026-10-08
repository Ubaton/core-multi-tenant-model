/**
 * ════════════════════════════════════════════════════════════════════════════
 * PUBLIC MEMBER REGISTRATION PAGE (no login)
 * Reached by scanning the church's QR code or opening the shared link.
 * Deliberately has no navigation: the only thing on screen is the form.
 * ════════════════════════════════════════════════════════════════════════════
 */

import type { Metadata } from 'next';
import { findActiveLink } from '@/lib/church-opening/server';
import { RegistrationForm } from './registration-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'VILLAGE OF THE LORD CHURCH OPENING.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function RegisterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await findActiveLink(token);

  if (!link) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">This link is no longer valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please ask the church for a new QR code or link.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">{link.tenantName}</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">VILLAGE OF THE LORD CHURCH OPENING.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please fill in your details. Fields marked * are required.
        </p>
      </header>
      <RegistrationForm token={token} />
    </main>
  );
}
