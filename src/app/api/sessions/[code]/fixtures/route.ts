import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/api/response';

/**
 * GET /api/sessions/[code]/fixtures
 *
 * Returns the list of fixtures (matches) associated with a session. Each fixture
 * includes player and team information to simplify client rendering. This
 * endpoint is public because row-level security on the tables restricts
 * visibility appropriately.
 */
export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const supabase = createClient();
    // Find session by code
    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', params.code)
      .single();
    if (sErr || !session) return fail('not_found', 'Session not found', 404);

    // Select fixtures with nested player and team info
    const { data: fixtures, error } = await supabase
      .from('fixtures')
      .select(
        `
        id, round_name, leg, position, status,
        home_goals, away_goals, went_penalties, home_pen, away_pen,
        home_player:home_player_id ( id, display_name ),
        away_player:away_player_id ( id, display_name ),
        home_team:home_team_id ( id, name, short_name, icon_url, country, stars ),
        away_team:away_team_id ( id, name, short_name, icon_url, country, stars )
      `,
      )
      .eq('session_id', session.id)
      .order('position', { ascending: true });
    if (error) return fail('db_error', error.message, 500);

    return ok(fixtures ?? []);
  } catch (e: any) {
    return fail('server_error', e?.message ?? 'Unexpected error', 500);
  }
}