/**
 * ════════════════════════════════════════════════════════════════════════════
 * PASSWORD RECOVERY PAGE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * A single page covering the whole recovery flow. The stage is derived from the
 * URL and mutation state rather than stored separately:
 *
 *   /forgot-password                → request a reset link
 *   /forgot-password (after submit) → confirmation
 *   /forgot-password?token=...      → set a new password (link from the email)
 */

'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForgotPassword, useResetPassword, useValidateResetToken } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NoiseTexture } from '@/components/ui/noise-texture';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PASSWORD_RULES = [
  { label: '8+ characters', test: (v: string) => v.length >= 8 },
  { label: 'Uppercase', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Lowercase', test: (v: string) => /[a-z]/.test(v) },
  { label: 'Number', test: (v: string) => /[0-9]/.test(v) },
];

function PasswordRecovery() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const forgotPassword = useForgotPassword();
  const resetPassword = useResetPassword();
  const tokenCheck = useValidateResetToken(token);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  const sent = forgotPassword.data;

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPassword.mutate({ email });
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    const unmet = PASSWORD_RULES.find((rule) => !rule.test(password));
    if (unmet) {
      setFormError(`Password is missing: ${unmet.label.toLowerCase()}`);
      return;
    }

    resetPassword.mutate(
      { token: token!, password },
      {
        onSuccess: () => {
          toast.success('Password reset. Please sign in.');
          router.push('/login');
        },
        onError: (err) => {
          setFormError(err instanceof Error ? err.message : 'Could not reset your password');
        },
      }
    );
  };

  // ── Stage: verifying an incoming reset link ────────────────────────────────
  if (token && tokenCheck.isPending) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Checking your reset link…</p>
        </div>
      </Shell>
    );
  }

  // ── Stage: the link is expired, used, or malformed ─────────────────────────
  if (token && tokenCheck.isError) {
    return (
      <Shell
        title="Link no longer valid"
        description="This reset link has expired or has already been used. Request a fresh one and we will send it right over."
      >
        <Button className="w-full" onClick={() => router.push('/forgot-password')}>
          Request a new link
        </Button>
      </Shell>
    );
  }

  // ── Stage: valid token, choose a new password ──────────────────────────────
  if (token) {
    return (
      <Shell
        title="Choose a new password"
        description="Pick something you have not used here before."
      >
        <form onSubmit={handleReset} className="space-y-5">
          {formError && <Alert>{formError}</Alert>}

          <Field
            id="password"
            label="New password"
            type="password"
            value={password}
            onChange={setPassword}
            disabled={resetPassword.isPending}
            autoFocus
          />

          <Field
            id="confirmPassword"
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={resetPassword.isPending}
          />

          <div className="flex flex-wrap gap-1.5">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(password);
              return (
                <span
                  key={rule.label}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors',
                    met
                      ? 'border-success/30 bg-success/10 text-success'
                      : 'border-border bg-muted/40 text-muted-foreground'
                  )}
                >
                  <Check className={cn('size-3', !met && 'opacity-40')} />
                  {rule.label}
                </span>
              );
            })}
          </div>

          <SubmitButton pending={resetPassword.isPending}>Reset password</SubmitButton>
        </form>
      </Shell>
    );
  }

  // ── Stage: link requested ──────────────────────────────────────────────────
  if (sent) {
    return (
      <Shell
        title="Check your email"
        description={sent.message}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The link expires in 60 minutes and works once. Nothing in your inbox? Check
            spam, or try another address.
          </p>

          {/* Development fallback: only sent when no mail provider is configured */}
          {sent.resetUrl && (
            <div className="space-y-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              <p className="font-medium">No email provider configured</p>
              <Link
                href={sent.resetUrl}
                className="block truncate font-mono text-xs underline underline-offset-2"
              >
                {sent.resetUrl}
              </Link>
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={() => forgotPassword.reset()}>
            Use a different email
          </Button>
        </div>
      </Shell>
    );
  }

  // ── Stage: request a link ──────────────────────────────────────────────────
  return (
    <Shell
      title="Forgot your password?"
      description="Enter the email on your account and we will send you a reset link."
    >
      <form onSubmit={handleRequest} className="space-y-5">
        {forgotPassword.isError && (
          <Alert>
            {forgotPassword.error instanceof Error
              ? forgotPassword.error.message
              : 'Something went wrong. Please try again.'}
          </Alert>
        )}

        <Field
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          disabled={forgotPassword.isPending}
          autoFocus
        />

        <SubmitButton pending={forgotPassword.isPending}>Send reset link</SubmitButton>
      </form>
    </Shell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LAYOUT PRIMITIVES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Shared card frame. Every stage renders through this so the header, spacing,
 * and footer stay identical as the content swaps underneath.
 */
function Shell({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full max-w-md">
      {/* Soft glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -top-10 h-40 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-2xl border bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm">
        <NoiseTexture className="opacity-[0.35] dark:opacity-[0.5]" />

        <div className="relative p-8">
          {/* The logo anchors every stage; the title carries the state */}
          <div className="mb-7 space-y-3 text-center">
            <Logo size="lg" className="mx-auto flex-col gap-2" />
            {title && <h1 className="text-xl font-semibold tracking-tight">{title}</h1>}
            {description && (
              <p className="text-balance text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          {children}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  disabled,
  autoFocus,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder ?? '••••••••'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoFocus={autoFocus}
        disabled={disabled}
        className="h-11"
      />
    </div>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      {children}
    </div>
  );
}

function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      {children}
    </Button>
  );
}

// ════════════════════════════════════════════════════════════════════════════

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Ambient background wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-muted)_0%,transparent_60%)]"
      />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <PasswordRecovery />
      </Suspense>
    </div>
  );
}
