import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useMemo, useState } from 'react';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { readPublicConfig } from '@/lib/config/public-config';
import { createDanceSupabaseClient } from '@/lib/supabase/client';
import { SupabaseProvider } from '@/lib/supabase/context';
import { StartupErrorState } from '@/ui/StateViews';

export function AppProviders({ children }: PropsWithChildren) {
  const [startupAttempt, setStartupAttempt] = useState(0);
  const queryClient = useMemo(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
    [],
  );
  const config = useMemo(() => readPublicConfig(), [startupAttempt]);
  const supabaseUrl = config.ok ? config.value.supabaseUrl : '';
  const supabasePublishableKey = config.ok ? config.value.supabasePublishableKey : '';
  const supabase = useMemo(
    () =>
      config.ok
        ? createDanceSupabaseClient({ supabaseUrl, supabasePublishableKey })
        : null,
    [config.ok, supabasePublishableKey, supabaseUrl],
  );

  if (!config.ok || !supabase) {
    return (
      <StartupErrorState
        message={config.ok ? 'Supabase istemcisi başlatılamadı.' : config.message}
        onRetry={() => setStartupAttempt((value) => value + 1)}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider client={supabase}>
        <AuthProvider>{children}</AuthProvider>
      </SupabaseProvider>
    </QueryClientProvider>
  );
}
