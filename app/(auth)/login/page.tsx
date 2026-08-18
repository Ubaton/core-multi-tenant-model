/**
 * ════════════════════════════════════════════════════════════════════════════
 * LOGIN PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLogin } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle } from 'lucide-react';
import { Logo } from '@/components/logo';

function LoginForm() {
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === 'true';
  const isSuperAdminMode = searchParams.get('role') === 'super-admin';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  useEffect(() => {
    if (isSuperAdminMode && !email) {
      setEmail('superadmin@churchhub.com');
    }
  }, [isSuperAdminMode, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <Logo size="lg" className="mx-auto mb-4 flex-col gap-2" />
        <CardTitle className="text-2xl font-bold">
          {isSuperAdminMode ? 'Super Admin Sign in' : 'Welcome back'}
        </CardTitle>
        <CardDescription>
          {isSuperAdminMode
            ? 'Sign in with your Super Admin credentials to access the control center'
            : 'Enter your credentials to access your account'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {justRegistered && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Registration successful! Please sign in with your new account.
          </div>
        )}

        {isSuperAdminMode && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm">
            Super Admin default email is prefilled for convenience.
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={login.isPending}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={login.isPending}
            />
          </div>

          {login.isError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
              {login.error instanceof Error ? login.error.message : 'Login failed. Please try again.'}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Sign in
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">
            Don&apos;t have an account?{' '}
          </span>
          <Link href="/register" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </div>

        {!isSuperAdminMode && (
          <div className="mt-3 text-center text-sm">
            <Link href="/super-admin-sign-in" className="text-primary hover:underline font-medium">
              Super Admin Sign in
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoginFormSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-8 w-48 mx-auto bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-4 w-64 mx-auto bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
