/**
 * ════════════════════════════════════════════════════════════════════════════
 * LOGIN PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLogin } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Church, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === 'true';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Church className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {justRegistered && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Registration successful! Please sign in with your new account.
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
                  className="text-sm text-primary-600 hover:underline"
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
            <span className="text-gray-500 dark:text-gray-400">
              Don&apos;t have an account?{' '}
            </span>
            <Link href="/register" className="text-primary-600 hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
