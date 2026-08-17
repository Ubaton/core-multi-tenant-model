/**
 * ════════════════════════════════════════════════════════════════════════════
 * FORGOT PASSWORD PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForgotPassword } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Church, MailCheck, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const forgotPassword = useForgotPassword();
  const result = forgotPassword.data;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPassword.mutate({ email });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            {result ? (
              <MailCheck className="h-6 w-6 text-primary" />
            ) : (
              <Church className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {result ? 'Check your email' : 'Forgot your password?'}
          </CardTitle>
          <CardDescription>
            {result
              ? result.message
              : 'Enter the email address on your account and we will send you a reset link.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {result ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The link expires in 60 minutes and can only be used once. If nothing arrives,
                check your spam folder or try again.
              </p>

              {/* Development fallback: shown only when no mail provider is configured */}
              {result.resetUrl && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm space-y-2">
                  <p className="font-medium">No email provider configured</p>
                  <p>Use this link to continue in development:</p>
                  <Link
                    href={result.resetUrl}
                    className="block break-all underline font-mono text-xs"
                  >
                    {result.resetUrl}
                  </Link>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => forgotPassword.reset()}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {forgotPassword.isError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm">
                  {forgotPassword.error instanceof Error
                    ? forgotPassword.error.message
                    : 'Something went wrong. Please try again.'}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  disabled={forgotPassword.isPending}
                />
              </div>

              <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
                {forgotPassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
            </form>
          )}
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
    </div>
  );
}
