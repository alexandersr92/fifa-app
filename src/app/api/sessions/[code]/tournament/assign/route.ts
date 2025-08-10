import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/api/response';
import { getUserIdFromRequest } from '@/lib/api/auth';

/**
 * POST /api/sessions/[code]/tournament/assign
 *
 * Generates a random team assignment for all players in a tournament. This
 * endpoint does not persist the assignment to the database; instead it
 * returns a list of assignments so that the host can decide whether to
 * accept the result before starting the tournament. Only the session owner
 * can call this endpoint.
 */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const supabase = createClient();
    const userId = getUserIdFromRequest(req);
    if (!userId) return fail('unauthorized', 'Authentication required', 401);

    // Retrieve session
    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select('id, type, owner_id, team_filter')
      .eq('code', params.code)
      .single();
    if (sErr || !session) return fail('not_found', 'Session not found', 404);
    if (session.type !== 'tournament')
      return fail('invalid_session_type', 'Only tournaments can assign teams via this endpoint', 400);
    if (session.owner_id !== userId)
      return fail('forbidden', 'Only the session owner can assign teams', 403);

    // Fetch players
    const { data: players } = await supabase
      .from('session_players')
      .select('id, display_name')
      .eq('session_id', session.id);
    if (!players || players.length < 2) return fail('not_enough_players', 'At least two players are required', 409);

    // Fetch all teams
    const { data: teams } = await supabase.from('teams').select('*');
    if (!teams || teams.length < players.length)
      return fail('not_enough_teams', 'Not enough teams available for all players', 409);

    // Apply team filter from session
    const filter = (session.team_filter || {}) as any;
    const filtered = teams.filter((t) => {
      if (filter.minStars && t.stars < filter.minStars) return false;
      if (filter.maxStars && t.stars > filter.maxStars) return false;
      if (Array.isArray(filter.countries) && filter.countries.length && !filter.countries.includes(t.country)) return false;
      return true;
    });
    if (filtered.length < players.length)
      return fail('filter_no_teams', 'Not enough teams match the filter for all players', 409);

    // Shuffle players and teams to randomise assignment
    const shuffle = <T>(arr: T[]) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    };
    const playersArr = [...players];
    const teamsArr = [...filtered];
    shuffle(playersArr);
    shuffle(teamsArr);

    const assignments = playersArr.map((p, idx) => {
      const team = teamsArr[idx];
      return {
        playerId: p.id,
        playerName: p.display_name,
        teamId: team.id,
        teamName: team.name,
        teamShortName: team.short_name,
        teamIconUrl: team.icon_url,
      };
    });

    return ok(assignments);
  } catch (e: any) {
    return fail('server_error', e?.message ?? 'Unexpected error', 500);
  }
}