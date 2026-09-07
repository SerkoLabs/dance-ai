import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useMemo, useState } from 'react';

import { readPublicConfig } from '@/lib/config/public-config';
import { StartupErrorState } from '@/ui/StateViews';

export type AuthBootstrapState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; userId: string }
  | { status: 'error'; message: string };

export function AppProviders({ children }: PropsWithChildren) {
  const [startupAttempt, setStartupAttempt] = useState(0);
  const queryClient = useMemo(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
    [],
  );
  const config = useMemo(() => readPublicConfig(), [startupAttempt]);

  if (!config.ok) {
    return <StartupErrorState message={config.message} onRetry={() => setStartupAttempt((value) => value + 1)} />;
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
