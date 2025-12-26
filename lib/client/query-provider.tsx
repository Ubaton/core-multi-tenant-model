/**
 * ════════════════════════════════════════════════════════════════════════════
 * QUERY CLIENT PROVIDER
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * TanStack Query provider with default configurations.
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function QueryProvider({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is fresh for 30 seconds
            staleTime: 30 * 1000,
            // Cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Retry failed requests 2 times
            retry: 2,
            // Refetch on window focus for real-time updates
            refetchOnWindowFocus: true,
            // Refetch when reconnecting
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry mutations once
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
