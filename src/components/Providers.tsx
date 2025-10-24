// src/components/Providers.tsx
"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

let globalQueryClient: QueryClient | null = null;

/**
 * Providers
 * - client component that mounts QueryClientProvider for any subtree that needs React Query.
 * - uses a single global QueryClient instance so multiple mounts don't create confusing duplicate caches.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState<QueryClient>(() => {
    if (globalQueryClient) return globalQueryClient;
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,

          staleTime: 1000 * 60,
          refetchOnWindowFocus: false,
        },
      },
    });
    globalQueryClient = qc;
    return qc;
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV !== "production" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
