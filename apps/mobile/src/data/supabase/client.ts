import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { publicRuntimeConfig } from '@/config/runtime';
import { type Database } from './database.types';
import { secureSessionStorage } from './secure-session-storage';

const backendConfigured = Boolean(
  publicRuntimeConfig.supabaseUrl && publicRuntimeConfig.supabasePublishableKey,
);

export const supabase: SupabaseClient<Database> | null = backendConfigured
  ? createClient<Database>(
      publicRuntimeConfig.supabaseUrl as string,
      publicRuntimeConfig.supabasePublishableKey as string,
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
          persistSession: true,
          storage: secureSessionStorage,
        },
      },
    )
  : null;

export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Backend configuration is not available in this build.');
  }

  return supabase;
}

export const isBackendConfigured = backendConfigured;
