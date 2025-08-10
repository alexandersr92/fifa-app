import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/api/response';

/**
 * GET /api/sessions/[code]/stats
 *
 * Returns aggregated statistics for players within a session using the
 * `session_player_stats` view. No authentication is required because the
 * underlying view respects row-level security policies on its source tables.
 */
export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const supabase = createClient();
    // Find the session id by code
    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', params.code)
      .single();
    if (sErr || !session) return fail('not_found', 'Session not found', 404);

    // Query stats view filtered by session_id
    const { data: stats, error } = await supabase
      .from('session_player_stats')
      .select('*')
      .eq('session_id', session.id);
    if (error) return fail('db_error', error.message, 500);

    return ok(stats ?? []);
  } catch (e: any) {
    return fail('server_error', e?.message ?? 'Unexpected error', 500);
  }
}