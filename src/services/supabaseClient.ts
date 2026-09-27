import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
const supabasePublishableKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) || '';

/**
 * Checks whether valid Supabase configuration is present.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseUrl.includes('placeholder')
);

/**
 * Supabase client instance configured using Vite client environment variables.
 * Uses a safe fallback dummy URL if environment variables are not yet configured,
 * preventing initialization crashes while allowing existing application features to run.
 */
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabasePublishableKey : 'placeholder-anon-key'
);
