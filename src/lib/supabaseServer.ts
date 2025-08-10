import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

/**
 * Creates a Supabase client for use in API routes and Server Actions. It
 * automatically attaches the Authorization header from the incoming request
 * (if any) so that row-level security policies are evaluated in the context
 * of the authenticated user. This implementation avoids relying on
 * `@supabase/ssr`, which may not be available in all environments.
 */
export function createClient() {
  const headerList = headers();
  // Pass through the Authorization header so Supabase knows which user
  // context to use. If there is no header, an empty string is used.
  const authHeader = headerList.get('authorization') || '';
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    },
  );
}