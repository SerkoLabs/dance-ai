import type { PropsWithChildren } from 'react';
import { createContext, useContext } from 'react';

import type { DanceSupabaseClient } from '@/lib/supabase/client';

const SupabaseContext = createContext<DanceSupabaseClient | null>(null);

export function SupabaseProvider({ client, children }: PropsWithChildren<{ client: DanceSupabaseClient }>) {
  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>;
}

export function useSupabase(): DanceSupabaseClient {
  const client = useContext(SupabaseContext);
  if (!client) throw new Error('SupabaseProvider is missing.');
  return client;
}
