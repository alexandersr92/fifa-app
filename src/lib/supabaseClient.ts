import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client configured with environment variables.
 * This client is safe to use on the client side. It stores
 * auth tokens in localStorage and automatically refreshes them.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
);
