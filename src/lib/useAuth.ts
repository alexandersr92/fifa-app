// A simple React hook to access the current Supabase session and user.
// It subscribes to auth state changes and exposes the session, user, and
// loading state. Use this hook in client components that need to know
// whether the user is authenticated and to access the access token for
// authenticated API requests.

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface UseAuthResult {
  session: any | null;
  user: any | null;
  loading: boolean;
}

export function useAuth(): UseAuthResult {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Immediately fetch the current session on mount
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };
    getSession();

    // Subscribe to auth state changes. When the user logs in or out,
    // `session` will be updated accordingly.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        setSession(sess);
      },
    );
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}