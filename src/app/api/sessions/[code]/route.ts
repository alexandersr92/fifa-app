import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/api/response';

/**
 * GET /api/sessions/[code]
 *
 * Returns basic information about a session identified by its public code. This
 * endpoint is public and does not require authentication. It includes the
 * session metadata as well as the list of players currently registered.
 */
export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const supabase = createClient();
    const { data: session, error } = await supabase
      .from('sessions')
      .select(
        'id, type, title, description, icon_url, code, min_players, max_players, t_format',
      )
      .eq('code', params.code)
      .single();
    if (error || !session) return fail('not_found', 'Session not found', 404);

    const { data: players } = await supabase
      .from('session_players')
      .select('id, display_name')
      .eq('session_id', session.id);
    return ok({
      ...session,
      players_count: players?.length ?? 0,
      players: players ?? [],
    });
  } catch (e: any) {
    return fail('server_error', e?.message ?? 'Unexpected error', 500);
  }
}