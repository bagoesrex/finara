"use client";

import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  type DehydratedState,
} from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { shouldRetryFinanceRequest } from "@/lib/finance-query";

export function FinanceQueryProvider({
  children,
  dehydratedState,
}: {
  children: ReactNode;
  dehydratedState: DehydratedState;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: shouldRetryFinanceRequest,
            staleTime: 60_000,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  useEffect(
    () => () => {
      queryClient.clear();
    },
    [queryClient],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        {children}
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
