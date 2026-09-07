import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { PublicConfig } from '@/lib/config/public-config';
import { authStorage } from '@/lib/supabase/auth-storage';
import type { Database } from '@/lib/supabase/database.types';

export type DanceSupabaseClient = SupabaseClient<Database>;

export function createDanceSupabaseClient(config: PublicConfig): DanceSupabaseClient {
  return createClient<Database>(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
