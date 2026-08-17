/**
 * ════════════════════════════════════════════════════════════════════════════
 * RESET PASSWORD PAGE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Reached from the emailed link: /reset-password?token=...
 */

'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useResetPassword, useValidateResetToken } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Church, ShieldAlert, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'One number', test: (v: string) => /[0-9]/.test(v) },
];

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const tokenCheck = useValidateResetToken(token);
  const resetPassword = useResetPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const unmet = PASSWORD_RULES.find((rule) => !rule.test(password));
    if (unmet) {
      setError(`Password requirement not met: ${unmet.label.toLowerCase()}`);
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
          setError(err instanceof Error ? err.message : 'Could not reset your password');
        },
      }
    );
  };

  // ── Missing or rejected token ──────────────────────────────────────────────
  if (!token || tokenCheck.isError) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Link no longer valid</CardTitle>
          <CardDescription>
            This password reset link is invalid, has already been used, or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => router.push('/forgot-password')}>
            Request a new link
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // ── Verifying the token ────────────────────────────────────────────────────
  if (tokenCheck.isPending) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="py-16 flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Checking your reset link...</p>
        </CardContent>
      </Card>
    );
  }

  // ── Valid token: show the form ─────────────────────────────────────────────
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Church className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Choose a new password</CardTitle>
        <CardDescription>Your new password must differ from any you have used here before.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              disabled={resetPassword.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={resetPassword.isPending}
            />
          </div>

          <ul className="space-y-1">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(password);
              return (
                <li
                  key={rule.label}
                  className={`flex items-center gap-2 text-xs ${
                    met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                  }`}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {rule.label}
                </li>
              );
            })}
          </ul>

          <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
            {resetPassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset password
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardContent className="py-16 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
